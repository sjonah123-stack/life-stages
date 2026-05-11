<script lang="ts">
  // Celebration card surfaced on Today during the ±7-day window around
  // the user's birthday. Pulls together the year-in-review stats and any
  // future-self letters whose target age matches the moment.
  import { isAnniversaryWindow, celebrationAge, yearInReview } from '../../stores/anniversary';

  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });

  function ordinalSuffix(n: number): string {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  $: hasContent = (
    $yearInReview.journal.count > 0 ||
    $yearInReview.booksRead > 0 ||
    $yearInReview.milestonesCompleted.length > 0 ||
    $yearInReview.givingTotal > 0 ||
    $yearInReview.relevantLetters.length > 0
  );

  function moodEmoji(avg: number | null): string {
    if (avg == null) return '';
    if (avg < 1.75) return '😞';
    if (avg < 2.5) return '😕';
    if (avg < 3.5) return '😐';
    if (avg < 4.25) return '🙂';
    return '😄';
  }

  let expandedLetterAge: number | null = null;
  function toggleLetter(age: number) {
    expandedLetterAge = expandedLetterAge === age ? null : age;
  }
</script>

{#if $isAnniversaryWindow && $celebrationAge > 0}
  <section class="anniversary-card glass-tinted" style="--tint: var(--now);">
    <div class="header">
      <div class="confetti">🎉</div>
      <div>
        <div class="eyebrow">A YEAR AT {$celebrationAge - 1}</div>
        <h2>Happy {$celebrationAge}{ordinalSuffix($celebrationAge)}, you.</h2>
      </div>
    </div>

    {#if hasContent}
      <div class="stats">
        {#if $yearInReview.journal.count > 0}
          <div class="stat">
            <span class="stat-num">{$yearInReview.journal.count}</span>
            <span class="stat-label">journal {$yearInReview.journal.count === 1 ? 'entry' : 'entries'}</span>
            {#if $yearInReview.journal.avgMood !== null}
              <span class="stat-extra">{moodEmoji($yearInReview.journal.avgMood)} avg</span>
            {/if}
          </div>
        {/if}
        {#if $yearInReview.journal.longestStreakWeeks > 1}
          <div class="stat">
            <span class="stat-num">{$yearInReview.journal.longestStreakWeeks}</span>
            <span class="stat-label">week streak</span>
          </div>
        {/if}
        {#if $yearInReview.booksRead > 0}
          <div class="stat">
            <span class="stat-num">{$yearInReview.booksRead}</span>
            <span class="stat-label">{$yearInReview.booksRead === 1 ? 'book' : 'books'} read</span>
          </div>
        {/if}
        {#if $yearInReview.milestonesCompleted.length > 0}
          <div class="stat">
            <span class="stat-num">{$yearInReview.milestonesCompleted.length}</span>
            <span class="stat-label">{$yearInReview.milestonesCompleted.length === 1 ? 'milestone' : 'milestones'} done</span>
          </div>
        {/if}
        {#if $yearInReview.givingTotal > 0}
          <div class="stat">
            <span class="stat-num">{fmt.format($yearInReview.givingTotal)}</span>
            <span class="stat-label">given</span>
            {#if $yearInReview.givingTargetMet}
              <span class="stat-extra success">✓ 10%</span>
            {/if}
          </div>
        {/if}
      </div>

      {#if $yearInReview.milestonesCompleted.length > 0}
        <div class="milestones-list">
          <div class="section-label">Milestones you completed</div>
          {#each $yearInReview.milestonesCompleted as m}
            <div class="milestone-pill">✓ {m.label}</div>
          {/each}
        </div>
      {/if}

      {#if $yearInReview.relevantLetters.length > 0}
        <div class="letters-block">
          <div class="section-label">A letter you wrote, for now</div>
          {#each $yearInReview.relevantLetters as l}
            <button class="letter-reveal" type="button" on:click={() => toggleLetter(l.age)}>
              <div class="letter-head">
                <span class="letter-age">For age {l.age}</span>
                <span class="letter-toggle">{expandedLetterAge === l.age ? '−' : '+'}</span>
              </div>
              {#if expandedLetterAge === l.age}
                <div class="letter-body">{l.text}</div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    {:else}
      <p class="empty-prose">
        Hit the journal or set a milestone this year to fill out this card next time around.
        For now: enjoy the day.
      </p>
    {/if}
  </section>
{/if}

<style>
  .anniversary-card {
    border-radius: 22px;
    padding: 26px 28px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .anniversary-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--now), var(--accent), var(--love));
    border-radius: 22px 22px 0 0;
  }
  .header {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 18px;
  }
  .confetti {
    font-size: 36px;
    line-height: 1;
    flex-shrink: 0;
  }
  .eyebrow {
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    margin-bottom: 4px;
  }
  h2 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    color: var(--ink);
  }
  .empty-prose {
    color: var(--ink-dim);
    font-size: 14px;
    line-height: 1.55;
    margin: 0;
    max-width: 540px;
  }
  .stats {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 80px;
  }
  .stat-num {
    font-size: 26px;
    font-weight: 800;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .stat-label {
    font-size: 11px;
    color: var(--ink-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }
  .stat-extra {
    font-size: 12px;
    color: var(--ink-faint);
    margin-top: 2px;
  }
  .stat-extra.success { color: var(--health); font-weight: 700; }
  .section-label {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .milestones-list {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed rgba(255, 140, 97, 0.3);
  }
  .milestone-pill {
    display: inline-block;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 5px 12px;
    margin: 0 6px 6px 0;
    font-size: 13px;
    color: var(--ink);
    font-weight: 600;
  }
  .letters-block {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed rgba(255, 140, 97, 0.3);
  }
  .letter-reveal {
    display: block;
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 8px;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .letter-reveal:hover { border-color: var(--accent); }
  .letter-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .letter-age {
    font-weight: 700;
    color: var(--ink);
    font-size: 14px;
  }
  .letter-toggle {
    color: var(--accent);
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
  }
  .letter-body {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--border);
    color: var(--ink-dim);
    font-size: 14px;
    line-height: 1.55;
    white-space: pre-wrap;
  }
</style>
