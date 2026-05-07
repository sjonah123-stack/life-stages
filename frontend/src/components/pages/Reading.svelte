<script lang="ts">
  import { books } from '../../stores/collections';
  import { todayAge } from '../../stores/personal';
  import { SLIDER_MAX } from '../../config';
  import PageHeader from '../shared/PageHeader.svelte';

  let titleInput = '';
  let authorInput = '';
  let ageInput: number | undefined;
  let takeawayInput = '';

  $: total = $books.length;
  $: thisYear = $todayAge >= 0 ? $books.filter((b) => b.age === $todayAge).length : 0;

  // Group entries by age desc for the list view.
  $: grouped = (() => {
    const map = new Map<number, { idx: number; title: string; author: string; takeaway: string }[]>();
    $books.forEach((b, idx) => {
      const arr = map.get(b.age) ?? [];
      arr.push({ idx, title: b.title, author: b.author, takeaway: b.takeaway });
      map.set(b.age, arr);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  })();

  function add(e: SubmitEvent) {
    e.preventDefault();
    if (!titleInput.trim() || ageInput == null || ageInput < 0 || ageInput > SLIDER_MAX) return;
    books.update((arr) => [
      ...arr,
      {
        title: titleInput.trim(),
        author: authorInput.trim(),
        age: ageInput!,
        takeaway: takeawayInput.trim(),
      },
    ]);
    titleInput = '';
    authorInput = '';
    ageInput = undefined;
    takeawayInput = '';
  }

  function remove(idx: number) {
    books.update((arr) => arr.filter((_, i) => i !== idx));
  }
</script>

<section class="page">
  <PageHeader
    title="Reading"
    subtitle="A line per book. Logged with the age you read it. A private library you'll be glad you kept."
  />

  <div class="module-section">
    <h2>What you've been reading</h2>
    <p class="sub">
      A line per book. Logged with the age you read it, with optional one-sentence takeaway.
    </p>
    <div class="module-stats">
      <span><span class="stat-num">{total}</span>{total === 1 ? 'book' : 'books'} read</span>
      <span><span class="stat-num">{thisYear}</span>this year</span>
    </div>

    <div class="reading-list">
      {#if total === 0}
        <div class="empty">No books logged yet. The first one is the hardest.</div>
      {:else}
        {#each grouped as [age, group]}
          <div class="reading-year-group">
            <div class="reading-year-label">
              <span class="age-tag">Age {age}</span>
              <span class="count">· {group.length} {group.length === 1 ? 'book' : 'books'}</span>
            </div>
            {#each group as b}
              <div class="book-row">
                <div class="book-info">
                  <div class="book-title">{b.title}</div>
                  {#if b.author}<div class="book-author">{b.author}</div>{/if}
                  {#if b.takeaway}<div class="book-takeaway">"{b.takeaway}"</div>{/if}
                </div>
                <button class="remove" on:click={() => remove(b.idx)} title="Remove">×</button>
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    </div>

    <form class="entry-form" on:submit={add}>
      <input type="text" bind:value={titleInput} placeholder="Book title" maxlength={80} />
      <input type="text" bind:value={authorInput} placeholder="Author (optional)" maxlength={60} />
      <input type="number" bind:value={ageInput} placeholder="Age" min="0" max={SLIDER_MAX} />
      <input type="text" bind:value={takeawayInput} placeholder="One-line takeaway (optional)" maxlength={120} />
      <button type="submit">Add</button>
    </form>
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
  .stat-num { color: var(--accent); font-weight: 700; font-size: 18px; margin-right: 4px; }

  .reading-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
  .empty { color: var(--ink-faint); font-size: 13px; font-style: italic; }
  .reading-year-group { margin-top: 12px; }
  .reading-year-group:first-child { margin-top: 0; }
  .reading-year-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
    margin-bottom: 6px;
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .age-tag { color: var(--accent); }
  .count { color: var(--ink-dim); font-weight: 600; }
  .book-row {
    display: flex;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--border);
    align-items: flex-start;
  }
  .book-row:first-of-type { border-top: none; }
  .book-info { flex: 1; min-width: 0; }
  .book-title { font-weight: 600; color: var(--ink); font-size: 14px; }
  .book-author { color: var(--ink-dim); font-size: 13px; }
  .book-takeaway {
    color: var(--ink-dim);
    font-size: 13px;
    font-style: italic;
    margin-top: 4px;
    line-height: 1.45;
  }
  .book-row .remove {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    align-self: center;
    border-radius: 4px;
  }
  .book-row .remove:hover { color: var(--love); }

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
  .entry-form input[type='text'] { flex: 1; min-width: 140px; }
  .entry-form input[type='number'] { width: 80px; }
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
