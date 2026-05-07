<script lang="ts">
  import { rituals } from '../../stores/collections';
  import { todayAge } from '../../stores/personal';
  import { personalHorizon } from '../../stores/derived';
  import { FREQ_LABEL } from '../../config';
  import type { Ritual } from '../../types';

  let nameInput = '';
  let frequencyInput: 1 | 2 | 4 | 12 = 1;

  $: yearsAhead = $todayAge >= 0 ? Math.max(0, $personalHorizon - $todayAge) : 0;

  function addRitual(e: SubmitEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    rituals.update((arr) => [...arr, { name: nameInput.trim(), frequency: frequencyInput }]);
    nameInput = '';
    frequencyInput = 1;
  }

  function removeRitual(i: number) {
    rituals.update((arr) => arr.filter((_, idx) => idx !== i));
  }

  function remaining(r: Ritual): number {
    return Math.round(yearsAhead * (r.frequency || 1));
  }
</script>

<div class="module-section">
  <h2>Rituals worth keeping</h2>
  <p class="sub">
    Things you want to do every year — Thanksgiving with grandma, summer trip with college friends,
    your birthday tradition. We'll show you how many more times you'll likely do each one.
  </p>
  <div class="module-stats">
    <span><span class="stat-num">{$rituals.length}</span>{$rituals.length === 1 ? 'ritual' : 'rituals'} worth keeping</span>
  </div>

  <div class="rituals-list">
    {#if $rituals.length === 0}
      <div class="empty">
        Add one. Even a small annual thing — a hike, a dinner, a phone call — becomes deeply
        meaningful when you can count remaining occurrences.
      </div>
    {:else}
      {#each $rituals as r, i}
        <div class="ritual-row">
          <div class="ritual-info">
            <div class="ritual-name">{r.name}</div>
            <div class="ritual-meta">{FREQ_LABEL[r.frequency] ?? 'yearly'}</div>
          </div>
          <div class="ritual-remaining">~{remaining(r)} more times</div>
          <button class="remove" on:click={() => removeRitual(i)} title="Remove">×</button>
        </div>
      {/each}
    {/if}
  </div>

  <form class="entry-form" on:submit={addRitual}>
    <input type="text" bind:value={nameInput} placeholder="Ritual (e.g. Thanksgiving with family)" maxlength={60} />
    <select bind:value={frequencyInput}>
      <option value={1}>Yearly</option>
      <option value={2}>Twice a year</option>
      <option value={4}>Quarterly</option>
      <option value={12}>Monthly</option>
    </select>
    <button type="submit">Add</button>
  </form>
</div>

<style>
  .module-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 26px 28px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-sm);
  }
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
  .sub { color: var(--ink-dim); margin: 0 0 16px; font-size: 14px; line-height: 1.5; }
  .module-stats {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    color: var(--ink-dim);
    font-size: 13px;
    font-weight: 600;
  }
  .stat-num {
    color: var(--accent);
    font-weight: 700;
    font-size: 18px;
    margin-right: 4px;
  }
  .rituals-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .empty { color: var(--ink-faint); font-size: 13px; font-style: italic; }
  .ritual-row {
    display: flex;
    gap: 14px;
    padding: 12px 14px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    align-items: center;
  }
  .ritual-info { flex: 1; min-width: 0; }
  .ritual-name { font-weight: 700; color: var(--ink); font-size: 15px; }
  .ritual-meta { color: var(--ink-dim); font-size: 12px; margin-top: 2px; }
  .ritual-remaining {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    color: white;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .remove {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .remove:hover { color: var(--love); }

  .entry-form {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .entry-form input[type='text'],
  .entry-form select {
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
</style>
