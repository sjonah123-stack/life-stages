<script lang="ts">
  import {
    dob, sex, country, partnership, kids, careerField,
    role, aspiration,
    smoker, exerciseLevel, sleepHours, familyLongevity,
  } from '../../stores/personal';
  import { personalHorizon } from '../../stores/derived';
  import { formatDOB } from '../../utils';
  import { exportStateAsJson, importStateFromJson } from '../../stores/cloud-sync';
  import { openTour } from '../../stores/tour';
  import PageHeader from '../shared/PageHeader.svelte';

  import { dobInvalid, numberInvalid } from '../../lib/validate';

  const today = formatDOB(new Date());

  let importMsg = '';

  // ---- Buffered numeric/date edits ----
  // These fields feed live math (ages, horizon), so a wrong value is never
  // committed to the store: the field turns red and holds the draft until
  // it's fixed (or blanked, where blank is a legal "unset"). A null draft
  // means the input is tracking the store (so cloud sync still flows in).
  let dobDraft: string | null = null;
  let kidsDraft: string | null = null;
  let sleepDraft: string | null = null;
  let longevityDraft: string | null = null;

  $: dobBad = dobDraft !== null && (dobDraft === '' || dobInvalid(dobDraft));
  $: kidsBad = kidsDraft !== null && numberInvalid(kidsDraft, 0, 12);
  $: sleepBad = sleepDraft !== null && numberInvalid(sleepDraft, 3, 14);
  $: longevityBad = longevityDraft !== null && numberInvalid(longevityDraft, 50, 110);

  function onDobInput(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    dobDraft = v;
    if (v && !dobInvalid(v)) { dob.set(v); dobDraft = null; }
  }

  function bufferNumber(
    store: { set(v: number): void },
    min: number,
    max: number,
    assign: (draft: string | null) => void,
  ) {
    return (e: Event) => {
      const v = (e.currentTarget as HTMLInputElement).value;
      if (v === '') { store.set(0); assign(null); return; }
      const n = parseFloat(v);
      if (!numberInvalid(n, min, max)) { store.set(n); assign(null); }
      else assign(v);
    };
  }
  const onKidsInput = bufferNumber(kids, 0, 12, (d) => (kidsDraft = d));
  const onSleepInput = bufferNumber(sleepHours, 3, 14, (d) => (sleepDraft = d));
  const onLongevityInput = bufferNumber(familyLongevity, 50, 110, (d) => (longevityDraft = d));

  function downloadBackup(): void {
    const blob = new Blob([exportStateAsJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-stages-backup-${formatDOB(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const ok = confirm(
      'Restore from this backup?\n\nIt replaces your current data on this device ' +
        '(and syncs up if you\'re signed in). Your existing data is backed up in the ' +
        'cloud version history first.'
    );
    if (!ok) { input.value = ''; return; }
    try {
      const text = await file.text();
      importMsg = importStateFromJson(text)
        ? 'Restored ✓'
        : "That file isn't a valid life-stages backup.";
    } catch {
      importMsg = "Couldn't read that file.";
    }
    input.value = '';
  }
</script>

<section class="page">
  <PageHeader
    title="Settings"
    subtitle="Personalize the dashboard. Most fields drive the cards & math; the lifestyle inputs stay on this device only."
  />

  <div class="personalize">
    <div class="personalize-row">
      <div class="field">
        <span class="field-label">Birthdate</span>
        <input type="date" value={dobDraft ?? $dob} max={today} on:input={onDobInput} class:invalid={dobBad} />
        {#if dobBad}
          <span class="field-error" role="alert">
            {dobDraft === '' ? 'Birthdate is required.' : 'Pick a real date in the past.'}
          </span>
        {/if}
      </div>
      <div class="field">
        <span class="field-label">You are</span>
        <div class="sex-toggle">
          <button type="button" class:active={$sex === 'female'} on:click={() => sex.set('female')}>Female</button>
          <button type="button" class:active={$sex === 'male'} on:click={() => sex.set('male')}>Male</button>
        </div>
      </div>
    </div>

    <details class="personalize-section" open>
      <summary>More about you</summary>
      <div class="personalize-row">
        <div class="field">
          <span class="field-label">Country</span>
          <select bind:value={$country}>
            <option value="">—</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="UK">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="JP">Japan</option>
            <option value="IN">India</option>
            <option value="BR">Brazil</option>
            <option value="MX">Mexico</option>
            <option value="OTHER">Elsewhere</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">Partnership</span>
          <select bind:value={$partnership}>
            <option value="">—</option>
            <option value="single">Single</option>
            <option value="dating">Dating</option>
            <option value="engaged">Engaged</option>
            <option value="married">Married / partnered</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">Children</span>
          <input type="number" value={kidsDraft ?? ($kids || '')} min="0" max="12" placeholder="0" on:input={onKidsInput} class:invalid={kidsBad} />
          {#if kidsBad}<span class="field-error" role="alert">0–12</span>{/if}
        </div>
        <div class="field">
          <span class="field-label">Career field</span>
          <select bind:value={$careerField}>
            <option value="">—</option>
            <option value="tech">Tech / software</option>
            <option value="medicine">Medicine / healthcare</option>
            <option value="science">Science / research</option>
            <option value="finance">Finance / business</option>
            <option value="arts">Arts / creative</option>
            <option value="athletics">Athletics / sport</option>
            <option value="education">Education / teaching</option>
            <option value="trades">Trades / skilled labor</option>
            <option value="hospitality">Hospitality / service</option>
            <option value="public_service">Public service / nonprofit</option>
            <option value="entrepreneurship">Entrepreneurship</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div class="personalize-row personalize-free">
        <div class="field field-wide">
          <span class="field-label">What you do (in your words)</span>
          <input
            type="text"
            bind:value={$role}
            placeholder="e.g. commercial real estate investor"
            maxlength="120"
          />
        </div>
        <div class="field field-wide">
          <span class="field-label">A meaningful life in ~10 years looks like…</span>
          <textarea
            bind:value={$aspiration}
            rows="2"
            placeholder="A sentence or two — used to personalize your AI suggestions"
            maxlength="400"
          ></textarea>
        </div>
      </div>
    </details>

    <details class="personalize-section" open>
      <summary>🔒 Private (only on this device)</summary>
      <div class="personalize-row personalize-private">
        <div class="private-label">
          <span class="lock">🔒</span>
          <span>Private — saved on this device only, never in your share link</span>
        </div>
        <div class="field">
          <span class="field-label">Smoking</span>
          <select bind:value={$smoker}>
            <option value="">—</option>
            <option value="never">Never smoked</option>
            <option value="quit">Quit</option>
            <option value="current">Currently smoke</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">Exercise</span>
          <select bind:value={$exerciseLevel}>
            <option value="">—</option>
            <option value="never">Rarely</option>
            <option value="sometimes">Sometimes</option>
            <option value="regularly">3–5×/week</option>
            <option value="often">5+×/week</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">Sleep hrs</span>
          <input type="number" value={sleepDraft ?? ($sleepHours || '')} min="3" max="14" step="0.5" placeholder="7" on:input={onSleepInput} class:invalid={sleepBad} />
          {#if sleepBad}<span class="field-error" role="alert">3–14 hrs</span>{/if}
        </div>
        <div class="field">
          <span class="field-label" title="Average age at death of grandparents/parents who've passed, or current age if living">Family longevity</span>
          <input type="number" value={longevityDraft ?? ($familyLongevity || '')} min="50" max="110" placeholder="—" on:input={onLongevityInput} class:invalid={longevityBad} />
          {#if longevityBad}<span class="field-error" role="alert">50–110</span>{/if}
        </div>
        <div class="horizon-display" title="Personalized horizon adjusts the 'ahead' stats">
          <div>Your horizon</div>
          <div class="num">{$personalHorizon} <span class="unit">yrs</span></div>
        </div>
      </div>
    </details>
  </div>

  <div class="data-card">
    <div class="data-head">
      <h2>Your data</h2>
      <p>Download a complete backup any time, or restore from one. Your data also
        syncs to the cloud and keeps a rolling version history.</p>
    </div>
    <div class="data-actions">
      <button type="button" class="data-btn" on:click={downloadBackup}>Download backup</button>
      <label class="data-btn ghost">
        Restore from file
        <input type="file" accept="application/json,.json" on:change={handleImportFile} hidden />
      </label>
      {#if importMsg}<span class="import-msg">{importMsg}</span>{/if}
    </div>
  </div>

  <p class="tour-replay">
    New here, or forgot where things live?
    <button type="button" class="tour-link" on:click={openTour}>Replay the app tour</button>
  </p>
</section>

<style>
  .tour-replay {
    margin: 20px 0 0;
    text-align: center;
    font-size: 13px;
    color: var(--ink-faint);
  }
  .tour-link {
    background: none;
    border: none;
    color: var(--accent);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .tour-link:hover { text-decoration: underline; }

  .personalize {
    margin-bottom: 32px;
    padding: 18px 22px 16px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
  }
  .data-card {
    padding: 22px 22px 24px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
  }
  .data-head h2 {
    font-family: var(--serif);
    font-size: 24px;
    font-weight: 500;
    margin: 0 0 6px;
    color: var(--ink);
  }
  .data-head p {
    margin: 0 0 18px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-dim);
    max-width: 56ch;
  }
  .data-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .data-btn {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 600;
    padding: 10px 18px;
    border-radius: 999px;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: #F4F0E8;
    transition: opacity 0.15s;
  }
  .data-btn:hover { opacity: 0.85; }
  .data-btn.ghost {
    background: transparent;
    color: var(--ink);
    border-color: var(--border);
  }
  .import-msg {
    font-size: 13px;
    color: var(--ink-dim);
  }
  .personalize-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
  }
  .field {
    display: inline-flex;
    flex-direction: column;
    gap: 4px;
  }
  .field-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
  }
  .personalize input[type='date'],
  .personalize input[type='number'],
  .personalize input[type='text'],
  .personalize textarea,
  .personalize select {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    color: var(--ink);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 14px;
    min-height: 38px;
  }
  .personalize input[type='number'] { width: 86px; }
  .personalize select { cursor: pointer; }
  .personalize textarea { resize: vertical; line-height: 1.4; }
  .personalize-free { margin-top: 14px; align-items: stretch; }
  .field-wide { flex: 1 1 260px; }
  .field-wide input[type='text'],
  .field-wide textarea { width: 100%; box-sizing: border-box; }

  .sex-toggle {
    display: inline-flex;
    background: var(--panel-warm);
    border-radius: 10px;
    padding: 3px;
    border: 1px solid var(--border);
  }
  .sex-toggle button {
    border: none;
    background: transparent;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-dim);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s;
    font-family: inherit;
  }
  .sex-toggle button.active {
    background: var(--accent);
    color: var(--bg-1);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent);
  }

  details.personalize-section {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed var(--border);
  }
  details.personalize-section[open] { padding-bottom: 4px; }
  details.personalize-section > summary {
    cursor: pointer;
    list-style: none;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--ink-faint);
    margin-bottom: 12px;
    user-select: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 0.15s;
  }
  details.personalize-section > summary::-webkit-details-marker { display: none; }
  details.personalize-section > summary::before {
    content: '›';
    display: inline-block;
    transition: transform 0.15s;
    color: var(--accent);
    font-weight: 700;
  }
  details.personalize-section[open] > summary::before { transform: rotate(90deg); }
  details.personalize-section:hover > summary { color: var(--ink-dim); }

  .personalize-private {
    background: linear-gradient(135deg, var(--panel-warm), color-mix(in srgb, var(--money) 8%, transparent));
    border-radius: 12px;
    padding: 14px 16px;
    margin-top: 12px;
    border-top: 0;
  }
  .private-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-dim);
    font-weight: 600;
    width: 100%;
    margin-bottom: 8px;
    letter-spacing: 0.02em;
  }
  .private-label .lock { font-size: 13px; }

  .horizon-display {
    margin-left: auto;
    align-self: flex-end;
    background: linear-gradient(135deg, var(--accent), var(--money));
    color: var(--bg-1);
    padding: 9px 14px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1.2;
    text-align: right;
    min-height: 38px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .horizon-display .num { font-size: 18px; }
  .horizon-display .unit { font-size: 12px; opacity: 0.85; }
</style>
