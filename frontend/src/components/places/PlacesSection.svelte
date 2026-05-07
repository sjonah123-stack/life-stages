<script lang="ts">
  import { places } from '../../stores/collections';
  import { selectedAge } from '../../stores/slider';
  import { geocode } from '../../lib/geocode';
  import { SLIDER_MAX } from '../../config';
  import PlacesMap from './PlacesMap.svelte';

  let queryInput = '';
  let yearInput: number | undefined;
  let noteInput = '';
  let busy = false;
  let geoStatus = '';

  $: countries = (() => {
    const set = new Set<string>();
    for (const p of $places) {
      const c = p.displayName?.split(',').pop()?.trim();
      if (c) set.add(c);
    }
    return set.size;
  })();

  async function addPlace(e: SubmitEvent) {
    e.preventDefault();
    if (!queryInput.trim() || yearInput == null || yearInput < 0 || yearInput > SLIDER_MAX) return;
    busy = true;
    geoStatus = 'Looking up location…';
    try {
      const r = await geocode(queryInput.trim());
      places.update((arr) => {
        const next = [
          ...arr,
          {
            name: queryInput.trim(),
            displayName: r.displayName,
            lat: r.lat,
            lng: r.lng,
            year: yearInput!,
            note: noteInput.trim(),
          },
        ];
        next.sort((a, b) => a.year - b.year);
        return next;
      });
      queryInput = ''; yearInput = undefined; noteInput = '';
      geoStatus = '';
    } catch (err) {
      geoStatus = `Couldn't find "${queryInput}". Try with country name.`;
    } finally {
      busy = false;
    }
  }

  function removePlace(idx: number) {
    places.update((arr) => arr.filter((_, i) => i !== idx));
  }

  function flyTo(idx: number) {
    const p = $places[idx];
    if (!p) return;
    window.dispatchEvent(new CustomEvent('places:fly', { detail: { lat: p.lat, lng: p.lng } }));
  }
</script>

<div class="places-section">
  <h2>Places that became part of you</h2>
  <p class="sub">
    Add cities and countries that shaped you, with the year you were there. Each shows up as a pin
    on the map. Slide to a year and the matching places highlight.
  </p>
  <div class="module-stats">
    <span><span class="stat-num">{$places.length}</span>place{$places.length === 1 ? '' : 's'}</span>
    <span><span class="stat-num">{countries}</span>{countries === 1 ? 'country' : 'countries'}</span>
  </div>

  <PlacesMap />

  <form class="entry-form" on:submit={addPlace}>
    <input type="text" bind:value={queryInput} placeholder="City, country (e.g. Tokyo, Japan)" maxlength={80} />
    <input type="number" bind:value={yearInput} placeholder="Age" min="0" max={SLIDER_MAX} />
    <input type="text" bind:value={noteInput} placeholder="Optional note" maxlength={60} />
    <button type="submit" disabled={busy}>Add place</button>
    {#if geoStatus}<span class="geo-status">{geoStatus}</span>{/if}
  </form>

  <div class="places-list">
    {#if $places.length === 0}
      <div class="empty">No places yet — add a city you've loved.</div>
    {:else}
      {#each $places as p, i}
        <span class="place-chip" class:highlighted={p.year === $selectedAge} on:click={() => flyTo(i)}>
          <span class="age">{p.year}</span>
          <span>{p.name}</span>
          <button class="remove" on:click|stopPropagation={() => removePlace(i)} title="Remove">×</button>
        </span>
      {/each}
    {/if}
  </div>
</div>

<style>
  .places-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 26px 28px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-sm);
  }
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
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
  .entry-form {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;
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
  }
  .entry-form input[type='text'] { flex: 1; min-width: 200px; }
  .entry-form input[type='number'] { width: 90px; }
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
  .entry-form button:disabled { opacity: 0.6; cursor: wait; }
  .geo-status { font-size: 12px; color: var(--ink-faint); }
  .places-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .empty { color: var(--ink-faint); font-size: 13px; font-style: italic; }
  .place-chip {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 10px 6px 14px;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .place-chip:hover { background: rgba(255, 140, 97, 0.08); }
  .place-chip.highlighted {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .place-chip.highlighted .age { color: white; opacity: 0.85; }
  .place-chip .age { font-weight: 700; color: var(--accent); }
  .place-chip .remove {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
  }
  .place-chip .remove:hover { color: var(--love); }
</style>
