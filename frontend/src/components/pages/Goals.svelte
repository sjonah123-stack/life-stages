<script lang="ts">
  import { milestones, bestYear, hardestYear } from '../../stores/collections';
  import { todayAge } from '../../stores/personal';
  import { SLIDER_MAX } from '../../config';
  import PageHeader from '../shared/PageHeader.svelte';

  let labelInput = '';
  let ageInput: number | undefined;
  let completedInput = false;

  function add(e: SubmitEvent) {
    e.preventDefault();
    if (!labelInput.trim() || ageInput == null || ageInput < 0 || ageInput > SLIDER_MAX) return;
    const completed = completedInput || ($todayAge >= 0 && ageInput <= $todayAge);
    milestones.update((arr) => {
      const next = [...arr, { age: ageInput!, label: labelInput.trim(), completed }];
      next.sort((a, b) => a.age - b.age);
      return next;
    });
    labelInput = '';
    ageInput = undefined;
    completedInput = false;
  }

  function remove(idx: number) {
    milestones.update((arr) => arr.filter((_, i) => i !== idx));
  }
</script>

<section class="page">
  <PageHeader
    title="Goals & milestones"
    subtitle="Things you're aiming toward. They show up as pins on your timeline on the Today page."
  />

  <div class="module-section">
    <h2>Things you're looking forward to</h2>
    <p class="sub">
      Add experiences, trips, milestones — they show up as pins on your timeline. Saved on this
      device, and synced to your account once you sign in.
    </p>
    <div class="milestone-list">
      {#if $milestones.length === 0}
        <div class="empty">Nothing yet — what are you looking forward to?</div>
      {:else}
        {#each $milestones as m, i}
          <span class="milestone-chip" class:done={m.completed}>
            <span class="age">{m.age}</span>
            <span class="label">{m.label}</span>
            <button class="remove" on:click={() => remove(i)} title="Remove">×</button>
          </span>
        {/each}
      {/if}
    </div>
    <form class="entry-form" on:submit={add}>
      <input type="text" bind:value={labelInput} placeholder="What's the milestone? (e.g. Trip to Japan)" maxlength={48} />
      <input type="number" bind:value={ageInput} placeholder="Age" min="0" max={SLIDER_MAX} />
      <label class="check"><input type="checkbox" bind:checked={completedInput} /> Already done</label>
      <button type="submit">Add</button>
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
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    min-height: 24px;
  }
  .empty { color: var(--ink-faint); font-size: 13px; font-style: italic; }
  .milestone-chip {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 10px 6px 14px;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .milestone-chip.done {
    background: linear-gradient(135deg, rgba(244, 184, 96, 0.18), rgba(255, 140, 97, 0.10));
  }
  .milestone-chip.done .age { color: var(--past); }
  .milestone-chip.done::before { content: '✓ '; color: var(--past); font-weight: 700; }
  .milestone-chip .age { font-weight: 700; color: var(--accent); }
  .milestone-chip .label { color: var(--ink); }
  .milestone-chip .remove {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
  }
  .milestone-chip .remove:hover { color: var(--love); }

  .entry-form {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .entry-form input[type='text'],
  .entry-form input[type='number'] {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    min-height: 38px;
  }
  .entry-form input[type='text'] { flex: 1; min-width: 200px; }
  .entry-form input[type='number'] { width: 80px; }
  .entry-form .check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-dim);
    font-size: 13px;
    cursor: pointer;
  }
  .entry-form button {
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

  .year-tags {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding: 12px 0;
    margin-top: 16px;
    border-top: 1px dashed var(--border);
  }
  .field { display: inline-flex; flex-direction: column; gap: 4px; }
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
