<script lang="ts">
  import { tick } from 'svelte';
  import { todayAge, birthdate } from '../../stores/personal';
  import { selectedAge } from '../../stores/slider';
  import { people } from '../../stores/collections';
  import { RELATION_LABEL } from '../../data';
  import { parseDOB, ageOnDate, formatDOB } from '../../utils';
  import type { Person, Interaction, Relation } from '../../types';

  export let person: Person;
  export let index: number;

  let expanded = false;
  let intDate: string = formatDOB(new Date());
  let intTopic: string = '';
  let topicInput: HTMLInputElement | null = null;

  const today = formatDOB(new Date());

  $: dob = person.dob ? parseDOB(person.dob) : null;
  $: ageNow = dob ? ageOnDate(dob, new Date()) : null;
  $: relationLabel = person.relation && RELATION_LABEL[person.relation as Exclude<Relation, ''>]
    ? RELATION_LABEL[person.relation as Exclude<Relation, ''>]
    : (person.relation || '');
  $: initial = (person.name?.[0] || '?').toUpperCase();

  // Last-chat freshness label.
  $: last = (() => {
    const list = person.interactions || [];
    if (!list.length) return null;
    return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  })();

  function daysAgo(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const d = parseDOB(dateStr);
    if (!d) return null;
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((t.getTime() - d.getTime()) / 86400000));
  }
  function freshnessLabel(dateStr: string | null | undefined): { text: string; cls: string } {
    const days = daysAgo(dateStr);
    if (days === null) return { text: 'Never logged a chat', cls: 'stale' };
    if (days === 0) return { text: 'Last chat: today ✓', cls: 'fresh' };
    if (days === 1) return { text: 'Last chat: yesterday', cls: 'fresh' };
    if (days < 14) return { text: `Last chat: ${days} days ago`, cls: 'fresh' };
    if (days < 60) return { text: `Last chat: ${days} days ago`, cls: 'ok' };
    if (days < 180) return { text: `Last chat: ${Math.floor(days/30)} months ago`, cls: 'stale' };
    return { text: `Last chat: ${Math.floor(days/365 * 10)/10}+ years ago`, cls: 'stale' };
  }
  $: fresh = freshnessLabel(last?.date);

  // "At your X: they're Y" projection (only if we have both dobs).
  $: ageThen = (() => {
    if (!dob || !$birthdate) return null;
    if ($selectedAge === $todayAge) return null;
    const userAtSelected = new Date($birthdate.getTime());
    userAtSelected.setFullYear(userAtSelected.getFullYear() + $selectedAge);
    return ageOnDate(dob, userAtSelected);
  })();

  function toggle() { expanded = !expanded; }

  async function logChat() {
    expanded = true;
    await tick();
    topicInput?.focus();
  }

  function addInteraction() {
    if (!intTopic.trim()) return;
    people.update((arr) => {
      const next = [...arr];
      const p = { ...next[index] };
      p.interactions = [...(p.interactions || []), { date: intDate, topic: intTopic.trim() }];
      next[index] = p;
      return next;
    });
    intTopic = '';
    intDate = formatDOB(new Date());
  }

  function removeInteraction(target: Interaction) {
    people.update((arr) => {
      const next = [...arr];
      const p = { ...next[index] };
      p.interactions = (p.interactions || []).filter(
        (it) => !(it.date === target.date && it.topic === target.topic)
      );
      next[index] = p;
      return next;
    });
  }

  function removePerson() {
    if (!confirm('Remove this person and all their chat history?')) return;
    people.update((arr) => arr.filter((_, i) => i !== index));
  }

  $: sortedInteractions = [...(person.interactions || [])].sort(
    (a, b) => (b.date || '').localeCompare(a.date || '')
  );
</script>

<div class="person-row" class:expanded>
  <div class="person-summary" on:click={toggle} role="button" tabindex="0"
       on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); }}>
    <div class="person-avatar">{initial}</div>
    <div class="person-text">
      <div class="person-name-line">
        <span class="name">{person.name}</span>
        {#if relationLabel}<span class="relation">{relationLabel}</span>{/if}
      </div>
      <div class="person-meta">
        {#if ageNow !== null}<span>{ageNow} yrs</span>{/if}
        <span class={fresh.cls}>{fresh.text}</span>
        {#if ageThen !== null && ageThen >= 0}
          <span class="age-then">At your {$selectedAge}: they're {ageThen}</span>
        {/if}
      </div>
    </div>
    <div class="person-actions" on:click|stopPropagation>
      <button class="log-chat-btn" on:click={logChat} title="Log a chat">+ Chat</button>
      <button class="remove" on:click={removePerson} title="Remove">×</button>
    </div>
  </div>
  {#if expanded}
    <div class="person-details">
      <div class="person-details-inner">
        {#if sortedInteractions.length === 0}
          <div class="interactions-empty">
            No chats logged yet. The first time you log one, you start a record you'll be glad you have.
          </div>
        {:else}
          <div class="interactions-list">
            {#each sortedInteractions as it}
              <div class="interaction">
                <span class="date">
                  {#if it.date}
                    {new Date(it.date).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'2-digit'})}
                  {:else}—{/if}
                </span>
                <span class="topic">{it.topic}</span>
                <button class="remove-int" on:click={() => removeInteraction(it)} title="Remove">×</button>
              </div>
            {/each}
          </div>
        {/if}
        <div class="interaction-form">
          <input type="date" bind:value={intDate} max={today} />
          <input
            type="text"
            placeholder="What did you talk about?"
            maxlength={120}
            bind:value={intTopic}
            bind:this={topicInput}
            on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInteraction(); } }}
          />
          <button type="button" on:click={addInteraction}>Save chat</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .person-row {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: background 0.15s;
  }
  .person-row.expanded { background: var(--panel); box-shadow: var(--shadow-sm); }
  .person-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    cursor: pointer;
  }
  .person-summary:hover { background: rgba(0, 0, 0, 0.02); border-radius: 12px; }
  .person-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--love));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
    text-transform: uppercase;
  }
  .person-text { flex: 1; min-width: 0; }
  .person-name-line {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .name { font-weight: 700; font-size: 14px; color: var(--ink); }
  .relation {
    font-size: 10px;
    color: var(--love);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }
  .person-meta {
    font-size: 12px;
    color: var(--ink-dim);
    margin-top: 2px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .person-meta .stale { color: var(--love); font-weight: 600; }
  .person-meta .fresh { color: var(--health); font-weight: 600; }
  .person-meta .ok    { color: var(--accent); font-weight: 600; }
  .age-then { color: var(--accent); font-weight: 600; }
  .person-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .person-actions button {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink-dim);
    transition: all 0.15s;
    font-family: inherit;
  }
  .person-actions button:hover {
    background: rgba(255, 140, 97, 0.08);
    color: var(--accent);
    border-color: var(--accent);
  }
  .person-actions .remove:hover {
    color: var(--love);
    border-color: var(--love);
    background: rgba(255, 107, 157, 0.06);
  }
  .person-details { padding: 0 14px 14px; }
  .person-details-inner {
    border-top: 1px dashed var(--border);
    padding-top: 12px;
  }
  .interactions-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .interaction {
    display: flex;
    gap: 12px;
    padding: 6px 0;
    font-size: 13px;
    border-top: 1px solid var(--border);
    align-items: flex-start;
  }
  .interaction:first-child { border-top: none; }
  .interaction .date {
    color: var(--ink-faint);
    font-weight: 600;
    min-width: 70px;
    flex-shrink: 0;
  }
  .interaction .topic {
    flex: 1;
    color: var(--ink);
    line-height: 1.45;
  }
  .interaction .remove-int {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 14px;
    padding: 0 4px;
  }
  .interaction .remove-int:hover { color: var(--love); }
  .interactions-empty {
    color: var(--ink-faint);
    font-size: 12px;
    font-style: italic;
    padding: 4px 0;
  }
  .interaction-form { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .interaction-form input[type='date'] {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    font-family: inherit;
    font-size: 13px;
  }
  .interaction-form input[type='text'] {
    flex: 1;
    min-width: 160px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    font-family: inherit;
    font-size: 13px;
  }
  .interaction-form button {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 6px 14px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
