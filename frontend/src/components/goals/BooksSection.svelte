<script lang="ts">
  // Books log. Moved from the standalone Reading page (deleted) into the
  // Goals page as a section. Gained Open Library lookup so logging a book
  // by title auto-fills author + cover thumbnail.
  import { books } from '../../stores/collections';
  import { todayAge } from '../../stores/personal';
  import { searchBooks, type OpenLibraryResult } from '../../lib/openLibrary';

  let titleInput = '';
  let authorInput = '';
  let takeawayInput = '';
  let coverUrl = '';

  // Lookup state
  let looking = false;
  let lookupResults: OpenLibraryResult[] = [];
  let lookupError = '';

  $: total = $books.length;
  $: thisYear = $todayAge >= 0 ? $books.filter((b) => b.age === $todayAge).length : 0;

  // Group entries by age desc for the list view.
  $: grouped = (() => {
    const map = new Map<number, { idx: number; title: string; author: string; takeaway: string; coverUrl?: string }[]>();
    $books.forEach((b, idx) => {
      const arr = map.get(b.age) ?? [];
      arr.push({
        idx, title: b.title, author: b.author, takeaway: b.takeaway,
        ...(b.coverUrl ? { coverUrl: b.coverUrl } : {}),
      });
      map.set(b.age, arr);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  })();

  function add(e: SubmitEvent) {
    e.preventDefault();
    if (!titleInput.trim()) return;
    // Age is auto-set from `$todayAge`. The grouped-by-age display still
    // works for older entries; new entries land under today's age year.
    const age = $todayAge >= 0 ? $todayAge : 0;
    books.update((arr) => [
      ...arr,
      {
        title: titleInput.trim(),
        author: authorInput.trim(),
        age,
        takeaway: takeawayInput.trim(),
        ...(coverUrl ? { coverUrl } : {}),
      },
    ]);
    titleInput = '';
    authorInput = '';
    takeawayInput = '';
    coverUrl = '';
    lookupResults = [];
    lookupError = '';
  }

  function remove(idx: number) {
    books.update((arr) => arr.filter((_, i) => i !== idx));
  }

  async function runLookup() {
    if (!titleInput.trim()) {
      lookupError = 'Type a title first.';
      return;
    }
    looking = true;
    lookupError = '';
    const results = await searchBooks(titleInput.trim(), 5);
    looking = false;
    if (results.length === 0) {
      lookupError = 'No matches — fill in author manually.';
      lookupResults = [];
      return;
    }
    lookupResults = results;
  }

  function pickResult(r: OpenLibraryResult) {
    titleInput = r.title;
    authorInput = r.author;
    coverUrl = r.coverUrl ?? '';
    lookupResults = [];
    lookupError = '';
  }

  function cancelLookup() {
    lookupResults = [];
    lookupError = '';
  }
</script>

<section class="module-section">
  <h2>What you've been reading</h2>
  <p class="sub">
    A line per book. Logged with the age you read it, with optional one-sentence takeaway.
    Type a title and hit Look up — author and cover auto-fill from Open Library.
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
              {#if b.coverUrl}
                <img class="book-cover" src={b.coverUrl} alt="" loading="lazy" />
              {:else}
                <div class="book-cover placeholder">📖</div>
              {/if}
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
    <div class="title-row">
      <input
        type="text"
        bind:value={titleInput}
        placeholder="Book title"
        maxlength={80}
      />
      <button type="button" class="lookup-btn" on:click={runLookup} disabled={looking}>
        {looking ? '…' : '🔍 Look up'}
      </button>
    </div>

    {#if lookupResults.length > 0}
      <div class="lookup-results">
        <div class="lookup-head">
          <span>Pick one to auto-fill:</span>
          <button type="button" class="link-btn" on:click={cancelLookup}>cancel</button>
        </div>
        {#each lookupResults as r (r.workKey)}
          <button type="button" class="lookup-result" on:click={() => pickResult(r)}>
            {#if r.coverUrl}
              <img class="result-cover" src={r.coverUrl} alt="" loading="lazy" />
            {:else}
              <div class="result-cover placeholder">📖</div>
            {/if}
            <div class="result-info">
              <div class="result-title">{r.title}</div>
              <div class="result-author">{r.author || 'Unknown author'}{r.firstPublishedYear ? ` · ${r.firstPublishedYear}` : ''}</div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
    {#if lookupError}
      <div class="lookup-error">{lookupError}</div>
    {/if}

    <div class="rest-row">
      <input
        type="text"
        bind:value={authorInput}
        placeholder="Author (optional)"
        maxlength={60}
      />
      <input
        type="text"
        bind:value={takeawayInput}
        placeholder="One-line takeaway (optional)"
        maxlength={120}
      />
      <button type="submit">Add</button>
    </div>
  </form>
</section>

<style>
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
    padding: 10px 0;
    border-top: 1px solid var(--border);
    align-items: flex-start;
  }
  .book-row:first-of-type { border-top: none; }
  .book-cover {
    width: 36px;
    height: 54px;
    object-fit: cover;
    border-radius: 4px;
    background: var(--panel-warm);
    flex-shrink: 0;
    border: 1px solid var(--border);
  }
  .book-cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: var(--ink-faint);
  }
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
    flex-direction: column;
    gap: 10px;
  }
  .title-row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .title-row input {
    flex: 1;
    min-width: 200px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    min-height: 38px;
  }
  .lookup-btn {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-dim);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .lookup-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .lookup-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .lookup-results {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .lookup-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .link-btn {
    background: none;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }
  .link-btn:hover { color: var(--love); }
  .lookup-result {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 8px 10px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s;
  }
  .lookup-result:hover { border-color: var(--accent); }
  .result-cover {
    width: 32px;
    height: 48px;
    object-fit: cover;
    border-radius: 3px;
    background: var(--panel-warm);
    flex-shrink: 0;
    border: 1px solid var(--border);
  }
  .result-cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: var(--ink-faint);
  }
  .result-info { flex: 1; min-width: 0; }
  .result-title {
    font-weight: 600;
    color: var(--ink);
    font-size: 13px;
    line-height: 1.3;
  }
  .result-author { color: var(--ink-dim); font-size: 12px; margin-top: 2px; }
  .lookup-error {
    color: var(--love);
    font-size: 12px;
    padding: 4px 0;
  }

  .rest-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .rest-row input[type='text'],
  .rest-row input[type='number'] {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    min-height: 38px;
  }
  .rest-row input[type='text'] { flex: 1; min-width: 140px; }
  .rest-row input[type='number'] { width: 80px; }
  .rest-row button {
    background: var(--accent);
    color: var(--bg-1);
    border: none;
    border-radius: 10px;
    padding: 9px 18px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
