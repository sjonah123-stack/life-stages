<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { birthdate } from '../../stores/personal';
  import {
    getEntry, setEntry, deleteEntry,
    weekKey, weekStartDate, weekRangeStr, ageAtWeek, dateToWeekStart,
    currentWeekIndex, TOTAL_WEEKS,
  } from '../../stores/journal-helpers';
  import { formatDOB, parseDOB } from '../../utils';
  import { resizeImage, imageErrorMessage } from '../../lib/image';
  import { pickPrompt } from '../../data';
  import { MOOD_OPTIONS } from '../../config';
  import type { Mood } from '../../types';
  import OnThisDayBanner from './OnThisDayBanner.svelte';

  // Editor state
  let dateInput: string = '';
  let textValue: string = '';
  let photo: string = '';
  let mood: Mood = '';
  let promptText = pickPrompt();
  let status: string = '';
  let photoError: string = '';
  let isExisting = false;
  let textareaEl: HTMLTextAreaElement | null = null;
  let composerEl: HTMLDivElement | null = null;

  async function handleLoadEvent(e: Event) {
    const ev = e as CustomEvent<{ key: string }>;
    if (!ev.detail?.key) return;
    dateInput = ev.detail.key;
    loadFromDate();
    // Wait for the textarea to repaint with the new content, then scroll +
    // focus together. Avoids the brief "old text" flash the prior 300ms
    // setTimeout caused.
    await tick();
    composerEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    textareaEl?.focus({ preventScroll: true });
  }

  onMount(() => {
    dateInput = formatDOB(new Date());
    loadFromDate();
    window.addEventListener('journal:load', handleLoadEvent);
  });

  $: weekIdx = (() => {
    const b = $birthdate;
    if (!b || !dateInput) return -1;
    const d = parseDOB(dateInput);
    if (!d) return -1;
    return Math.floor((dateToWeekStart(d).getTime() - b.getTime()) / 86400000 / 7);
  })();
  $: weekRange = weekIdx >= 0 ? weekRangeStr(weekIdx) : '—';
  $: ageThis  = weekIdx >= 0 ? ageAtWeek(weekIdx)  : -1;
  $: ageStr = ageThis >= 0 && ageThis <= 110 ? `Age ${ageThis}` : '—';
  $: words = textValue.trim() ? textValue.trim().split(/\s+/).filter(Boolean).length : 0;
  $: readMin = Math.max(1, Math.round(words / 220));
  $: showPrompt = !textValue.trim();
  $: today = formatDOB(new Date());
  // Clamp the earliest date you can pick to your birthdate. Without this,
  // user could write a journal entry dated "before they were born".
  $: earliestDate = $birthdate ? formatDOB($birthdate) : '1900-01-01';

  function loadFromDate() {
    if (weekIdx < 0) return;
    const e = getEntry(weekKey(weekIdx));
    textValue = e.text;
    photo = e.photo;
    mood = e.mood;
    isExisting = !!(e.text || e.photo || e.mood);
    if (!e.text) promptText = pickPrompt();
  }

  $: { dateInput; loadFromDate(); }

  // ---- Auto-save ----
  // 1.5s pause-debounce + 30s max-wait. Without the max-wait, a user typing
  // continuously for minutes would never trigger a save until they paused —
  // a real data-loss risk on unexpected reload.
  const PAUSE_MS = 1500;
  const MAX_WAIT_MS = 30000;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    if (!textValue.trim() && !photo && !mood) {
      // Empty entry — nothing to save, clear any pending timers.
      if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
      if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = null; }
      return;
    }
    // Reset pause timer on every keystroke.
    if (pauseTimer) clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      doSave(true);
    }, PAUSE_MS);
    // Start the max-wait clock if it isn't already running.
    if (!maxWaitTimer) {
      maxWaitTimer = setTimeout(() => {
        maxWaitTimer = null;
        doSave(true);
      }, MAX_WAIT_MS);
    }
  }
  function cancelSaveTimers() {
    if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
    if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = null; }
  }
  function doSave(silent: boolean) {
    if (weekIdx < 0) return;
    cancelSaveTimers();
    const key = weekKey(weekIdx);
    setEntry(key, { text: textValue.trim(), photo, mood });
    isExisting = !!(textValue.trim() || photo || mood);
    status = silent ? 'Auto-saved' : 'Saved ✓';
    setTimeout(() => { status = ''; }, 2400);
  }

  // "Log entry" — explicit user action: flush save, then point the composer at
  // the next week without an entry (today onwards). The reactive
  // `$: { dateInput; loadFromDate(); }` block clears the visible textarea/
  // photo/mood for the new week so the user can immediately start writing
  // again. Critically, by moving dateInput to a different week, future typing
  // can't overwrite the entry we just logged.
  function logAndStartNew() {
    if (weekIdx < 0) return;
    const hadContent = !!(textValue.trim() || photo || mood);
    if (hadContent) doSave(false);
    const todayIdx = currentWeekIndex();
    if (todayIdx < 0) return;
    let nextIdx = todayIdx;
    while (nextIdx < TOTAL_WEEKS) {
      const e = getEntry(weekKey(nextIdx));
      if (!e.text && !e.photo && !e.mood) break;
      nextIdx++;
    }
    if (nextIdx >= TOTAL_WEEKS) nextIdx = todayIdx;
    dateInput = formatDOB(weekStartDate(nextIdx));
    if (hadContent) {
      status = 'Logged ✓';
      setTimeout(() => { status = ''; }, 2400);
    }
  }
  function doDelete() {
    if (!confirm('Delete this entry?')) return;
    if (weekIdx < 0) return;
    deleteEntry(weekKey(weekIdx));
    textValue = '';
    photo = '';
    mood = '';
    isExisting = false;
    status = 'Deleted';
    setTimeout(() => { status = ''; }, 2400);
  }
  function reset() {
    dateInput = formatDOB(new Date());
    loadFromDate();
  }

  function onTextInput() {
    if (!textValue.trim()) promptText = pickPrompt();
    scheduleSave();
  }

  async function onPhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    photoError = '';
    try {
      photo = await resizeImage(file);
      scheduleSave();
    } catch (err) {
      photoError = imageErrorMessage(err);
    }
    (e.target as HTMLInputElement).value = '';
  }
  function removePhoto() {
    photo = '';
    scheduleSave();
  }

  function setMood(m: Mood) {
    mood = mood === m ? '' : m;
    scheduleSave();
  }

  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      logAndStartNew();
    }
  }

  onDestroy(() => {
    cancelSaveTimers();
    window.removeEventListener('journal:load', handleLoadEvent);
  });
</script>

<div class="journal-composer" class:editing={isExisting} bind:this={composerEl}>
  <div class="composer-meta">
    <input type="date" bind:value={dateInput} min={earliestDate} max={today} />
    <div class="week-info">
      <span class="age-tag">{ageStr}</span>
      <span>{weekRange}</span>
    </div>
    <div class="mood-picker" title="How was this week?">
      {#each MOOD_OPTIONS as m}
        <button type="button" class:selected={mood === m} on:click={() => setMood(m)}>{m}</button>
      {/each}
    </div>
    {#if isExisting}<span class="editing-tag">Editing</span>{/if}
  </div>

  <OnThisDayBanner currentKey={weekIdx >= 0 ? weekKey(weekIdx) : ''} />

  {#if showPrompt}
    <div class="composer-prompt">
      <span>💡</span>
      <span class="prompt-text">{promptText}</span>
      <button type="button" class="reroll" title="New prompt" on:click={() => promptText = pickPrompt()}>🎲</button>
    </div>
  {/if}

  <textarea
    class="composer-textarea"
    placeholder="What's on your mind? What happened this week? Big things, small things — write what's true."
    maxlength={5000}
    bind:value={textValue}
    bind:this={textareaEl}
    on:input={onTextInput}
    on:keydown={onKey}
  ></textarea>

  <div class="composer-photo-strip">
    <label class="composer-photo-add">
      📸 <span>{photo ? 'Change photo' : 'Add photo'}</span>
      <input type="file" accept="image/*" on:change={onPhotoChange} />
    </label>
    {#if photo}
      <img class="composer-photo-thumb" src={photo} alt="" />
      <button type="button" class="cancel-btn" on:click={removePhoto}>Remove photo</button>
    {/if}
  </div>

  {#if photoError}
    <div class="photo-error" role="alert">
      <span>⚠️</span>
      <span>{photoError}</span>
      <button type="button" class="photo-error-dismiss" on:click={() => photoError = ''} aria-label="Dismiss">×</button>
    </div>
  {/if}

  <div class="composer-actions">
    <button type="button" class="save-btn" on:click={logAndStartNew}>
      Log entry
    </button>
    <button type="button" class="cancel-btn" on:click={reset}>Reset</button>
    {#if isExisting}
      <button type="button" class="delete-btn" on:click={doDelete}>Delete</button>
    {/if}
    {#if words > 0}
      <span class="composer-meter">{words} {words === 1 ? 'word' : 'words'} · {readMin} min read</span>
    {/if}
    <span class="composer-status">{status}</span>
  </div>
</div>

<style>
  .journal-composer {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 18px 20px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-md);
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .journal-composer.editing {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(255, 140, 97, 0.15), var(--shadow-md);
  }
  .composer-meta {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .composer-meta input[type='date'] {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
  }
  .week-info { font-size: 13px; color: var(--ink-dim); }
  .age-tag {
    background: var(--accent);
    color: white;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 11px;
    margin-right: 6px;
  }
  .mood-picker {
    display: inline-flex;
    gap: 2px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px;
  }
  .mood-picker button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 18px;
    line-height: 1;
    transition: transform 0.15s, background 0.15s;
    opacity: 0.55;
    font-family: inherit;
  }
  .mood-picker button:hover { opacity: 1; transform: scale(1.15); }
  .mood-picker button.selected {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    opacity: 1;
    box-shadow: 0 2px 6px rgba(255, 140, 97, 0.3);
  }
  .editing-tag {
    margin-left: auto;
    font-size: 11px;
    color: var(--accent);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .composer-prompt {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 201, 60, 0.12);
    border: 1px solid rgba(255, 201, 60, 0.3);
    border-radius: 999px;
    padding: 5px 10px 5px 14px;
    font-size: 13px;
    color: var(--ink);
    margin-bottom: 10px;
    max-width: 100%;
  }
  .prompt-text { color: var(--ink); font-style: italic; flex: 1; min-width: 0; }
  .reroll {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 6px;
    transition: transform 0.2s;
    line-height: 1;
  }
  .reroll:hover { transform: rotate(90deg); }
  .composer-textarea {
    width: 100%;
    min-height: 120px;
    background: transparent;
    border: none;
    padding: 8px 0;
    font-family: inherit;
    font-size: 16px;
    line-height: 1.55;
    color: var(--ink);
    resize: vertical;
  }
  .composer-textarea:focus { outline: none; }
  .composer-photo-strip {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .composer-photo-thumb {
    width: 72px;
    height: 72px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid var(--border);
  }
  .composer-photo-add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--panel-warm);
    border: 1px dashed var(--border);
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
    color: var(--ink-dim);
    transition: all 0.15s;
  }
  .composer-photo-add:hover { border-color: var(--accent); color: var(--accent); }
  .composer-photo-add input[type='file'] { display: none; }
  .composer-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed var(--border);
    flex-wrap: wrap;
  }
  .save-btn {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .save-btn:hover { opacity: 0.92; }
  .cancel-btn {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
  }
  .cancel-btn:hover { color: var(--love); }
  .delete-btn {
    background: transparent;
    color: var(--ink-faint);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .delete-btn:hover { color: var(--love); border-color: var(--love); }
  .composer-meter {
    color: var(--ink-faint);
    font-size: 12px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .composer-status {
    margin-left: auto;
    color: var(--ink-faint);
    font-size: 12px;
    font-style: italic;
    transition: opacity 0.4s;
  }
  .photo-error {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 10px 14px;
    background: rgba(255, 107, 157, 0.08);
    border: 1px solid rgba(255, 107, 157, 0.3);
    border-radius: 10px;
    color: var(--ink);
    font-size: 13px;
    line-height: 1.4;
  }
  .photo-error-dismiss {
    margin-left: auto;
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 18px;
    padding: 0 4px;
    line-height: 1;
    font-family: inherit;
  }
  .photo-error-dismiss:hover { color: var(--love); }
</style>
