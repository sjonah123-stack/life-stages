<script lang="ts">
  import { journal } from '../../stores/collections';
  import { birthdate } from '../../stores/personal';
  import { getEntry, weekKey, deleteEntry, weekStartDate } from '../../stores/journal-helpers';
  import { parseDOB, ageInYears, formatDOB, escapeHtml, debounce } from '../../utils';
  import { MOOD_OPTIONS } from '../../config';
  import type { Mood } from '../../types';

  export let onEditEntry: (key: string) => void = () => {};

  let yearFilter: number | 'all' = 'all';
  let moodFilter: Mood | 'all' = 'all';
  let searchQuery = '';
  let searchInput = '';
  const updateSearch = debounce((v: string) => { searchQuery = v; }, 200);

  // Build the visible entries list reactively from the journal store + filters.
  $: allEntries = Object.entries($journal)
    .map(([k]) => [k, getEntry(k)] as const)
    .filter(([, e]) => (e.text && e.text.trim()) || e.photo)
    .sort((a, b) => b[0].localeCompare(a[0]));

  $: years = (() => {
    const set = new Set<number>();
    for (const [k] of allEntries) {
      const d = parseDOB(k);
      if (d) set.add(d.getFullYear());
    }
    return [...set].sort((a, b) => b - a);
  })();

  $: moodsPresent = (() => {
    const set = new Set<Mood>();
    for (const [, e] of allEntries) if (e.mood) set.add(e.mood);
    return MOOD_OPTIONS.filter((m) => set.has(m));
  })();

  $: q = searchQuery.trim().toLowerCase();

  $: visibleEntries = allEntries.filter(([k, e]) => {
    if (yearFilter !== 'all') {
      const d = parseDOB(k);
      if (!d || d.getFullYear() !== yearFilter) return false;
    }
    if (moodFilter !== 'all' && e.mood !== moodFilter) return false;
    if (q && !(e.text || '').toLowerCase().includes(q)) return false;
    return true;
  });

  function ageFor(key: string): number {
    const d = parseDOB(key);
    if (!d || !$birthdate) return -1;
    return ageInYears(d, $birthdate);
  }

  function dateStrFor(key: string): string {
    const d = parseDOB(key);
    if (!d) return key;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function onDelete(key: string) {
    if (!confirm("Delete this entry permanently? This can't be undone.")) return;
    deleteEntry(key);
  }
</script>

<div class="entry-search-wrap">
  <input
    type="search"
    class="entry-search"
    placeholder="Search your entries…"
    autocomplete="off"
    bind:value={searchInput}
    on:input={(e) => updateSearch((e.target as HTMLInputElement).value)}
  />
  {#if searchInput}
    <button
      type="button"
      class="entry-search-clear"
      on:click={() => { searchInput = ''; searchQuery = ''; }}
      aria-label="Clear search"
    >×</button>
  {/if}
</div>

<div class="entries-feed-header">
  <span class="label"><span class="count">{visibleEntries.length}</span> entries</span>
  {#if years.length > 1}
    <div class="year-filter">
      <button class="year-chip" class:active={yearFilter === 'all'} on:click={() => (yearFilter = 'all')}>All</button>
      {#each years as y}
        <button class="year-chip" class:active={yearFilter === y} on:click={() => (yearFilter = y)}>{y}</button>
      {/each}
    </div>
  {/if}
  {#if moodsPresent.length >= 2 || moodFilter !== 'all'}
    <div class="year-filter">
      <button class="year-chip" class:active={moodFilter === 'all'} on:click={() => (moodFilter = 'all')}>Any mood</button>
      {#each moodsPresent as m}
        <button class="year-chip" class:active={moodFilter === m} on:click={() => (moodFilter = m)}>{m}</button>
      {/each}
    </div>
  {/if}
</div>

<div class="entries-feed">
  {#if visibleEntries.length === 0}
    <div class="entries-empty">
      {#if allEntries.length === 0}
        No entries yet. Write your first one above — even a single sentence becomes precious in 10 years.
      {:else if q}
        No entries match "{q}". Try another search.
      {:else}
        No entries match those filters. Try resetting them.
      {/if}
    </div>
  {:else}
    {#each visibleEntries as [key, e]}
      <div class="entry-card" on:click={() => onEditEntry(key)} role="button" tabindex="0">
        {#if e.photo}
          <img class="photo-thumb" src={e.photo} alt="" />
        {:else}
          <div class="photo-placeholder">📝</div>
        {/if}
        <div class="body">
          <div class="meta">
            <span class="date">{dateStrFor(key)}</span>
            <span class="age-pill">Age {ageFor(key)}</span>
            {#if e.mood}<span class="mood-emoji">{e.mood}</span>{/if}
          </div>
          <div class="preview" class:italic={!e.text || !e.text.trim()}>
            {e.text && e.text.trim() ? e.text : '(photo only)'}
          </div>
        </div>
        <div class="actions" on:click|stopPropagation>
          <button class="edit" on:click={() => onEditEntry(key)}>Edit</button>
          <button class="delete" on:click={() => onDelete(key)}>Delete</button>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .entry-search-wrap {
    position: relative;
    margin-bottom: 14px;
  }
  .entry-search {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 38px 10px 38px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .entry-search:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(255, 140, 97, 0.15);
  }
  .entry-search-wrap::before {
    content: '🔍';
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    opacity: 0.6;
    pointer-events: none;
  }
  .entry-search-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 18px;
    padding: 4px 10px;
    border-radius: 8px;
    line-height: 1;
  }
  .entry-search-clear:hover { color: var(--love); }
  .entries-feed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin: 12px 0 14px;
  }
  .label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
  }
  .label .count { color: var(--accent); font-weight: 800; }
  .year-filter { display: flex; gap: 4px; flex-wrap: wrap; }
  .year-chip {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink-dim);
    transition: all 0.15s;
    font-family: inherit;
  }
  .year-chip:hover { border-color: var(--accent); color: var(--accent); }
  .year-chip.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .entries-feed { display: flex; flex-direction: column; gap: 8px; }
  .entry-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    gap: 14px;
    cursor: pointer;
    transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
    align-items: flex-start;
  }
  .entry-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
    border-color: rgba(255, 140, 97, 0.25);
  }
  .photo-thumb,
  .photo-placeholder {
    width: 76px;
    height: 76px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .photo-thumb { object-fit: cover; background: var(--panel-warm); }
  .photo-placeholder {
    background: linear-gradient(135deg, var(--panel-warm), var(--bg-2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    opacity: 0.5;
  }
  .body { flex: 1; min-width: 0; }
  .meta {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 6px;
    color: var(--ink-faint);
    font-size: 12px;
    font-weight: 600;
  }
  .date { color: var(--ink-dim); font-weight: 700; }
  .age-pill {
    background: rgba(255, 140, 97, 0.12);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .mood-emoji {
    font-size: 14px;
    line-height: 1;
    margin-left: auto;
    opacity: 0.95;
  }
  .preview {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.5;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }
  .preview.italic { color: var(--ink-faint); font-style: italic; }
  .actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
  }
  .actions button {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 5px 10px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink-dim);
    transition: all 0.15s;
  }
  .edit:hover {
    background: rgba(255, 140, 97, 0.1);
    color: var(--accent);
    border-color: var(--accent);
  }
  .delete:hover {
    background: rgba(255, 107, 157, 0.08);
    color: var(--love);
    border-color: var(--love);
  }
  .entries-empty {
    color: var(--ink-faint);
    font-size: 14px;
    font-style: italic;
    text-align: center;
    padding: 32px 16px;
    background: var(--panel-warm);
    border-radius: 14px;
    border: 1px dashed var(--border);
  }
</style>
