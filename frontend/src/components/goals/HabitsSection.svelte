<script lang="ts">
  import { tick } from 'svelte';
  import { slide } from 'svelte/transition';
  import {
    activeHabits,
    checkKeys,
    streakFor,
    chainFor,
    addHabit,
    deleteHabit,
  } from '../../stores/habits';
  import { toggleHabitWithCelebration } from '../../lib/habit-celebration';
  import { motionDuration } from '../../lib/motion';
  import FlameIcon from '../shared/FlameIcon.svelte';
  import WealthIcon from '../shared/WealthIcon.svelte';
  import { formatDOB } from '../../utils';
  import type { WealthKey } from '../../types';

  // Add-habit form
  let formOpen = false;
  let labelInput = '';
  let emojiInput = '';
  let wealthInput: WealthKey | '' = '';
  let labelEl: HTMLInputElement | null = null;
  let formError = '';

  $: today = formatDOB(new Date());
  $: list = $activeHabits;
  $: keys = $checkKeys;

  async function openForm() {
    formOpen = true;
    labelInput = '';
    emojiInput = '';
    wealthInput = '';
    formError = '';
    await tick();
    labelEl?.focus();
  }

  function closeForm() {
    formOpen = false;
    formError = '';
  }

  function submit() {
    const label = labelInput.trim();
    if (!label) {
      formError = 'Give the habit a name.';
      return;
    }
    addHabit({
      label,
      ...(emojiInput.trim() ? { emoji: emojiInput.trim() } : {}),
      ...(wealthInput ? { wealthKey: wealthInput as WealthKey } : {}),
    });
    closeForm();
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete "${label}" and its full history?`)) return;
    deleteHabit(id);
  }
</script>

<section class="module-section">
  <h2>Daily habits</h2>
  <p class="sub">
    Small daily practices — meditation, gym, no-phone-after-9. Different from milestones
    (one-time). Streak counts consecutive days; the chain shows your last 28 days.
  </p>

  {#if list.length === 0}
    <div class="empty">
      Add a habit. Even one "yes" a day builds the muscle. The chain visualizes what you've kept.
    </div>
  {:else}
    <div class="habit-list">
      {#each list as h (h.id)}
        {@const checkedToday = keys.has(`${h.id}|${today}`)}
        {@const streak = streakFor(h.id, keys)}
        {@const chain = chainFor(h.id, keys, 28)}
        <div class="habit-row" transition:slide|local={{ duration: motionDuration(180) }}>
          <button
            class="check-toggle"
            class:checked={checkedToday}
            type="button"
            aria-label={checkedToday ? 'Mark not done today' : 'Mark done today'}
            aria-pressed={checkedToday}
            on:click={(e) => toggleHabitWithCelebration(h, checkedToday, e.currentTarget)}
          >
            {#if checkedToday}✓{/if}
          </button>
          <div class="habit-body">
            <div class="habit-head">
              {#if h.emoji}<span class="habit-emoji">{h.emoji}</span>{/if}
              <span class="habit-label">{h.label}</span>
              {#if h.wealthKey}
                <span class="wealth-tag wealth-{h.wealthKey}">
                  <WealthIcon key={h.wealthKey} size={11} />
                  {h.wealthKey}
                </span>
              {/if}
              {#if streak > 0}
                <span class="streak"><FlameIcon /> {streak}-day{streak === 1 ? '' : 's'}</span>
              {/if}
            </div>
            <div class="chain">
              {#each chain as cell}
                <div
                  class="chain-cell"
                  class:done={cell.done}
                  class:today={cell.date === today}
                  title="{cell.date}{cell.done ? ' ✓' : ''}"
                ></div>
              {/each}
            </div>
          </div>
          <button
            class="remove"
            type="button"
            on:click={() => handleDelete(h.id, h.label)}
            aria-label="Delete habit"
          >×</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if !formOpen}
    <div class="actions">
      <button type="button" class="add-btn" on:click={openForm}>+ Add habit</button>
    </div>
  {:else}
    <form class="form" transition:slide|local={{ duration: motionDuration(180) }} on:submit|preventDefault={submit}>
      <div class="form-row">
        <label class="field">
          <span>Habit</span>
          <input
            type="text"
            bind:value={labelInput}
            bind:this={labelEl}
            placeholder="e.g. Meditate 10 minutes"
            maxlength={60}
            required
          />
        </label>
        <label class="field emoji-field">
          <span>Emoji</span>
          <input
            type="text"
            bind:value={emojiInput}
            placeholder="🧘"
            maxlength={2}
          />
        </label>
      </div>
      <label class="field">
        <span>Wealth dimension (optional)</span>
        <select bind:value={wealthInput}>
          <option value="">— none —</option>
          <option value="time">Time</option>
          <option value="social">Social</option>
          <option value="mental">Mental</option>
          <option value="physical">Physical</option>
          <option value="financial">Financial</option>
        </select>
      </label>
      {#if formError}
        <div class="form-error" role="alert">{formError}</div>
      {/if}
      <div class="form-actions">
        <button class="btn ghost" type="button" on:click={closeForm}>Cancel</button>
        <button class="btn primary" type="submit">Add habit</button>
      </div>
    </form>
  {/if}
</section>

<style>
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .sub { color: var(--ink-dim); margin: 0 0 18px; font-size: 14px; line-height: 1.5; }
  .empty {
    color: var(--ink-faint);
    font-size: 13px;
    font-style: italic;
    margin-bottom: 16px;
  }

  .habit-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }
  .habit-row {
    display: flex;
    gap: 14px;
    padding: 12px 14px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    align-items: flex-start;
  }
  .check-toggle {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: var(--panel);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    margin-top: 2px;
    color: var(--bg-1);
    font-size: 16px;
    font-weight: 800;
    line-height: 1;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
  }
  .check-toggle:hover { border-color: var(--accent); }
  .check-toggle.checked {
    background: var(--accent);
    border-color: var(--accent);
    animation: check-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .check-toggle.checked { animation: none; }
  }
  .habit-body { flex: 1; min-width: 0; }
  .habit-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .habit-emoji { font-size: 18px; }
  .habit-label {
    font-weight: 700;
    color: var(--ink);
    font-size: 15px;
  }
  .wealth-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 2px 8px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--ink-dim);
  }
  .streak {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-radius: var(--radius-pill);
    padding: 3px 10px;
  }

  .chain {
    display: flex;
    gap: 3px;
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  .chain-cell {
    width: 10px;
    height: 18px;
    border-radius: 3px;
    background: var(--panel);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }
  .chain-cell.done {
    background: var(--accent);
    border-color: var(--accent);
  }
  .chain-cell.today {
    box-shadow: 0 0 0 1.5px var(--ink-dim);
  }
  .chain-cell.today.done {
    box-shadow: 0 0 0 1.5px var(--ink);
  }

  .remove {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1;
    align-self: flex-start;
  }
  .remove:hover { color: var(--love); }

  .actions { margin-top: 4px; }
  .add-btn {
    display: block;
    width: 100%;
    padding: 12px 16px;
    background: var(--panel-warm);
    border: 1px dashed var(--border);
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-dim);
    transition: all 0.15s;
  }
  .add-btn:hover { border-color: var(--accent); color: var(--accent); }

  .form {
    margin-top: 12px;
    padding: 16px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .form-row { display: grid; grid-template-columns: 1fr 90px; gap: 12px; }
  @media (max-width: 480px) {
    .form-row { grid-template-columns: 1fr; }
  }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field span {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .field input,
  .field select {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--panel);
  }
  .field input:focus, .field select:focus {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
    border-color: var(--accent);
  }
  .emoji-field input { text-align: center; font-size: 18px; }
  .form-error {
    color: var(--love);
    font-size: 13px;
    background: color-mix(in srgb, var(--love) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--love) 30%, transparent);
    border-radius: var(--radius-xs);
    padding: 8px 12px;
  }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
</style>
