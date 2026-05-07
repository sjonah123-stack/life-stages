<script lang="ts">
  import { onDestroy } from 'svelte';
  import { letters } from '../../stores/collections';
  import { todayAge } from '../../stores/personal';
  import { letterHorizonsForAge } from '../../stores/journal-helpers';
  import { debounce } from '../../utils';

  // Three rotating placeholders cycled by slot index, not pinned to fixed ages.
  const PLACEHOLDERS = [
    "Hey, you. Here's what's been worth it. Here's what didn't matter as much as it felt like. Here's what I wish I'd known sooner...",
    "Halfway through this stretch. The people who've stuck around. The work that aged well. What I'd tell you to keep going on...",
    "Now I can see the shape of it. The chapters. What was a gift. What I'd do again...",
  ];

  $: activeAges = letterHorizonsForAge($todayAge);
  $: archivedAges = Object.keys($letters)
    .map((k) => parseInt(k, 10))
    .filter((a) => Number.isFinite(a) && !activeAges.includes(a))
    .sort((a, b) => a - b);

  function framingFor(target: number, age: number): string {
    if (age < 0) return `to your ${target}-year-old self`;
    const delta = target - age;
    if (delta <= 0) return `you wrote this at age ${target}`;
    if (delta <= 5) return `${delta} ${delta === 1 ? 'year' : 'years'} from now`;
    return `to your ${target}-year-old self`;
  }

  // Per-age local buffer + 600ms debounced flush. Avoids hammering the store
  // (and Firestore via cloud-sync) on every keystroke.
  const buffers: Record<number, string> = {};
  const flushers: Record<number, (val: string) => void> = {};

  function flusherFor(age: number) {
    if (!flushers[age]) {
      flushers[age] = debounce((val: string) => {
        letters.update((l) => {
          const next = { ...l };
          if (val) next[age] = val;
          else delete next[age];
          return next;
        });
      }, 600);
    }
    return flushers[age];
  }

  function bufferValue(age: number, stored: string | undefined): string {
    if (buffers[age] !== undefined) return buffers[age];
    return stored ?? '';
  }

  function onLetterInput(age: number, val: string) {
    buffers[age] = val;
    flusherFor(age)(val);
  }

  function flushNow(age: number) {
    if (buffers[age] === undefined) return;
    letters.update((l) => {
      const next = { ...l };
      const val = buffers[age];
      if (val) next[age] = val;
      else delete next[age];
      return next;
    });
  }

  function meta(age: number): string {
    const t = $letters[age];
    return t ? `${t.length} chars` : 'empty';
  }

  onDestroy(() => {
    for (const age of Object.keys(buffers).map(Number)) flushNow(age);
  });
</script>

<div class="future-letters">
  <h2>Letters from your future self</h2>
  <p class="sub">
    Write notes from older versions of you back to where you are now. Slots shift as you age,
    but each saved letter stays anchored to the age you wrote it for. Saved on this device + your
    cloud sync. 🔒
  </p>

  {#each activeAges as age, idx (age)}
    <details class="letter-block">
      <summary>
        <span><span class="age-label">At {age}</span> — {framingFor(age, $todayAge)}</span>
        <span class="letter-meta">{meta(age)}</span>
      </summary>
      <textarea
        placeholder={PLACEHOLDERS[idx % PLACEHOLDERS.length]}
        value={bufferValue(age, $letters[age])}
        on:input={(e) => onLetterInput(age, (e.target as HTMLTextAreaElement).value)}
        on:blur={() => flushNow(age)}
      ></textarea>
    </details>
  {/each}

  {#if archivedAges.length > 0}
    <details class="archive">
      <summary>
        <span class="archive-label">Other letters you've saved</span>
        <span class="letter-meta">{archivedAges.length}</span>
      </summary>
      {#each archivedAges as age (age)}
        <details class="letter-block archived">
          <summary>
            <span><span class="age-label">At {age}</span> — {framingFor(age, $todayAge)}</span>
            <span class="letter-meta">{meta(age)}</span>
          </summary>
          <textarea
            value={bufferValue(age, $letters[age])}
            on:input={(e) => onLetterInput(age, (e.target as HTMLTextAreaElement).value)}
            on:blur={() => flushNow(age)}
          ></textarea>
        </details>
      {/each}
    </details>
  {/if}
</div>

<style>
  .future-letters {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 26px 28px;
    margin-top: 24px;
    box-shadow: var(--shadow-sm);
  }
  h2 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
  }
  .sub {
    color: var(--ink-dim);
    margin: 0 0 16px;
    font-size: 14px;
    line-height: 1.5;
  }
  .letter-block {
    margin-bottom: 12px;
    padding: 14px 16px;
    background: var(--panel-warm);
    border-radius: 12px;
  }
  .letter-block.archived {
    background: var(--panel);
    border: 1px dashed var(--border);
  }
  summary {
    cursor: pointer;
    font-weight: 700;
    font-size: 15px;
    color: var(--ink);
    display: flex;
    justify-content: space-between;
    align-items: center;
    list-style: none;
    gap: 10px;
  }
  summary::-webkit-details-marker { display: none; }
  .age-label { color: var(--accent); font-weight: 800; }
  .letter-meta {
    color: var(--ink-faint);
    font-size: 11px;
    font-weight: 600;
  }
  .archive {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px dashed var(--border);
  }
  .archive > summary { font-size: 13px; font-weight: 600; color: var(--ink-dim); margin-bottom: 8px; }
  .archive-label {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 11px;
    color: var(--ink-faint);
    font-weight: 700;
  }
  textarea {
    width: 100%;
    min-height: 100px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink);
    resize: vertical;
    margin-top: 10px;
  }
  textarea:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
