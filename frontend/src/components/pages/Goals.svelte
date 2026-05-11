<script lang="ts">
  import { milestones, bestYear, hardestYear } from '../../stores/collections';
  import { todayAge } from '../../stores/personal';
  import { SLIDER_MAX } from '../../config';
  import PageHeader from '../shared/PageHeader.svelte';
  import BooksSection from '../goals/BooksSection.svelte';
  import RitualsSection from '../goals/RitualsSection.svelte';

  // SMART milestone form — Specific (label), Measurable (measure),
  // Time-bound (age), Relevant (why), Achievable is a self-check.
  let labelInput = '';
  let ageInput: number | undefined;
  let measureInput = '';
  let whyInput = '';
  let completedInput = false;

  function add(e: SubmitEvent) {
    e.preventDefault();
    if (!labelInput.trim() || ageInput == null || ageInput < 0 || ageInput > SLIDER_MAX) return;
    const completed = completedInput || ($todayAge >= 0 && ageInput <= $todayAge);
    milestones.update((arr) => {
      const next = [
        ...arr,
        {
          age: ageInput!,
          label: labelInput.trim(),
          completed,
          ...(measureInput.trim() ? { measure: measureInput.trim() } : {}),
          ...(whyInput.trim() ? { why: whyInput.trim() } : {}),
        },
      ];
      next.sort((a, b) => a.age - b.age);
      return next;
    });
    labelInput = '';
    ageInput = undefined;
    measureInput = '';
    whyInput = '';
    completedInput = false;
  }

  function remove(idx: number) {
    milestones.update((arr) => arr.filter((_, i) => i !== idx));
  }

  function toggleCompleted(idx: number) {
    milestones.update((arr) =>
      arr.map((m, i) => (i === idx ? { ...m, completed: !m.completed } : m)),
    );
  }
</script>

<section class="page">
  <PageHeader
    title="Goals"
    subtitle="What you're aiming toward, the rituals you're keeping, what you've been reading, and the years that mattered."
  />

  <div class="module-section">
    <h2>Things you're looking forward to</h2>
    <p class="sub">
      Written in SMART format: Specific (what), Measurable (how you'll know), by-when (age),
      and Relevant (why it matters). They show up as pins on your timeline.
    </p>

    <div class="milestone-list">
      {#if $milestones.length === 0}
        <div class="empty">Nothing yet — what are you looking forward to?</div>
      {:else}
        {#each $milestones as m, i (m.age + '|' + m.label)}
          <div class="milestone-card" class:done={m.completed}>
            <button
              class="check-toggle"
              class:checked={m.completed}
              type="button"
              aria-label={m.completed ? 'Mark as not done' : 'Mark as done'}
              aria-pressed={m.completed}
              on:click={() => toggleCompleted(i)}
            >
              {#if m.completed}✓{/if}
            </button>
            <div class="milestone-body">
              <div class="milestone-head">
                <span class="milestone-label">{m.label}</span>
                <span class="milestone-age">by age {m.age}</span>
              </div>
              {#if m.measure}
                <div class="milestone-line"><span class="line-tag">How</span> {m.measure}</div>
              {/if}
              {#if m.why}
                <div class="milestone-line"><span class="line-tag">Why</span> {m.why}</div>
              {/if}
            </div>
            <button class="remove" type="button" on:click={() => remove(i)} title="Remove" aria-label="Remove milestone">×</button>
          </div>
        {/each}
      {/if}
    </div>

    <form class="entry-form" on:submit={add}>
      <label class="field full">
        <span>Specific — what's the goal?</span>
        <input type="text" bind:value={labelInput} placeholder="e.g. Run a half-marathon" maxlength={80} required />
      </label>
      <div class="form-row">
        <label class="field">
          <span>Measurable — how you'll know</span>
          <input type="text" bind:value={measureInput} placeholder="e.g. 13.1 mi under 2:00" maxlength={120} />
        </label>
        <label class="field">
          <span>By age</span>
          <input type="number" bind:value={ageInput} placeholder="—" min="0" max={SLIDER_MAX} required />
        </label>
      </div>
      <label class="field full">
        <span>Relevant — why does it matter?</span>
        <input type="text" bind:value={whyInput} placeholder="e.g. proof I rebuilt my health after the injury" maxlength={140} />
      </label>
      <div class="form-foot">
        <label class="check"><input type="checkbox" bind:checked={completedInput} /> Already done</label>
        <button type="submit">Add milestone</button>
      </div>
    </form>

    <div class="year-tags">
      <div class="field">
        <span class="field-label">✨ Best year so far</span>
        <input type="number" bind:value={$bestYear} min="0" max={SLIDER_MAX} placeholder="—" />
      </div>
      <div class="field">
        <span class="field-label">💪 Hardest year (you made it)</span>
        <input type="number" bind:value={$hardestYear} min="0" max={SLIDER_MAX} placeholder="—" />
      </div>
    </div>
  </div>

  <RitualsSection />

  <BooksSection />
</section>

<style>
  .module-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 26px 28px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-sm);
  }
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .sub { color: var(--ink-dim); margin: 0 0 18px; font-size: 14px; line-height: 1.5; }

  .milestone-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
  }
  .empty { color: var(--ink-faint); font-size: 13px; font-style: italic; }

  .milestone-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: background 0.15s;
  }
  .milestone-card.done {
    background: linear-gradient(135deg, rgba(244, 184, 96, 0.10), rgba(255, 140, 97, 0.06));
  }

  .check-toggle {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 1.5px solid var(--border);
    background: var(--panel);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    margin-top: 2px;
    color: white;
    font-size: 14px;
    font-weight: 800;
    line-height: 1;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
  }
  .check-toggle:hover { border-color: var(--accent); }
  .check-toggle.checked {
    background: var(--accent);
    border-color: var(--accent);
  }

  .milestone-body { flex: 1; min-width: 0; }
  .milestone-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .milestone-label {
    font-weight: 700;
    color: var(--ink);
    font-size: 15px;
  }
  .milestone-age {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--accent);
    flex-shrink: 0;
  }
  .milestone-line {
    color: var(--ink-dim);
    font-size: 13px;
    line-height: 1.45;
    margin-top: 4px;
  }
  .line-tag {
    display: inline-block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--ink-faint);
    margin-right: 4px;
  }

  .remove {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 18px;
    padding: 0 4px;
    line-height: 1;
    align-self: flex-start;
    margin-top: 2px;
  }
  .remove:hover { color: var(--love); }

  .entry-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 10px;
  }
  @media (max-width: 540px) {
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
  .field input[type='text'],
  .field input[type='number'] {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    min-height: 38px;
  }
  .field input:focus {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
    border-color: var(--accent);
  }
  .form-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  .check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-dim);
    font-size: 13px;
    cursor: pointer;
  }
  .entry-form button[type='submit'] {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 9px 18px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .entry-form button[type='submit']:hover { opacity: 0.92; }

  .year-tags {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding: 12px 0;
    margin-top: 16px;
    border-top: 1px dashed var(--border);
  }
  .year-tags .field { display: inline-flex; flex-direction: column; gap: 4px; }
  .field-label {
    font-size: 11px;
    color: var(--ink-faint);
    font-weight: 600;
  }
  .year-tags input[type='number'] {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    width: 86px;
  }
</style>
