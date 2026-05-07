<script lang="ts">
  import { people } from '../../stores/collections';
  import { formatDOB } from '../../utils';
  import type { Relation } from '../../types';
  import PersonRow from './PersonRow.svelte';

  let nameInput = '';
  let relationInput: Relation = '';
  let dobInput = '';
  const today = formatDOB(new Date());

  $: totalChats = $people.reduce((sum, p) => sum + (p.interactions?.length ?? 0), 0);

  function addPerson(e: SubmitEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    people.update((arr) => [
      ...arr,
      { name: nameInput.trim(), relation: relationInput, dob: dobInput },
    ]);
    nameInput = '';
    relationInput = '';
    dobInput = '';
  }
</script>

<div class="module-section">
  <h2>People who shape your life</h2>
  <p class="sub">
    The most underused dimension of any life dashboard. Add the people who matter — when you slide
    through ages, you'll see how old they'll be at each one.
  </p>
  <div class="module-stats">
    <span><span class="stat-num">{$people.length}</span>{$people.length === 1 ? 'person' : 'people'} tracked</span>
    <span><span class="stat-num">{totalChats}</span>chats logged</span>
  </div>

  <div class="people-list">
    {#if $people.length === 0}
      <div class="empty">No one yet — start with the people who matter most.</div>
    {:else}
      {#each $people as person, i (person.name + i)}
        <PersonRow {person} index={i} />
      {/each}
    {/if}
  </div>

  <form class="entry-form" on:submit={addPerson}>
    <input type="text" bind:value={nameInput} placeholder="Name" maxlength={40} />
    <select bind:value={relationInput}>
      <option value="">Relationship…</option>
      <option value="parent">Parent</option>
      <option value="sibling">Sibling</option>
      <option value="partner">Partner / Spouse</option>
      <option value="child">Child</option>
      <option value="grandparent">Grandparent</option>
      <option value="grandchild">Grandchild</option>
      <option value="friend">Friend</option>
      <option value="mentor">Mentor</option>
      <option value="other">Other</option>
    </select>
    <input type="date" bind:value={dobInput} max={today} />
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
  .people-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .empty {
    color: var(--ink-faint);
    font-size: 13px;
    font-style: italic;
  }

  .entry-form {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-top: 10px;
  }
  .entry-form input[type='text'],
  .entry-form input[type='date'],
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
  .entry-form input[type='text'] { flex: 1; min-width: 140px; }
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
  .entry-form button:hover { opacity: 0.92; }
</style>
