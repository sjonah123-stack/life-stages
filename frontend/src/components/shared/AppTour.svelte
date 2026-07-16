<script lang="ts">
  // First-time app tour — a calm, editorial card sequence introducing the
  // five pages. Auto-opens once after the welcome wizard (see stores/tour);
  // replayable from Settings. No spotlight/coach-mark machinery: a simple
  // stepped card is robust on mobile and doesn't break when pages change.
  import { fade, fly } from 'svelte/transition';
  import { tourOpen, completeTour } from '../../stores/tour';
  import { motionDuration } from '../../lib/motion';

  interface TourStep {
    eyebrow: string;
    title: string;
    body: string;
    glyph: 'slider' | 'flame' | 'pen' | 'flag' | 'coins' | 'bars';
  }

  const STEPS: TourStep[] = [
    {
      eyebrow: 'Today',
      title: 'Walk the years.',
      body:
        'The slider on Today moves through every age of your life — drag it forward to preview ' +
        'what a chapter might hold, back to see what is already yours. Underneath it: your daily ' +
        'check-in and habits.',
      glyph: 'slider',
    },
    {
      eyebrow: 'The daily loop',
      title: 'Small checkmarks, long streaks.',
      body:
        'Check off habits with one tap — streaks build day by day, and milestones earn a little ' +
        'confetti. Log sleep and movement in the daily check-in; trends appear on Progress.',
      glyph: 'flame',
    },
    {
      eyebrow: 'Journal',
      title: 'One honest note a week.',
      body:
        'Write about any week of your life — this one, or one decades away. Moods build a ' +
        'sparkline, and old entries resurface on their anniversaries.',
      glyph: 'pen',
    },
    {
      eyebrow: 'Goals & Finance',
      title: 'Aim, then budget for it.',
      body:
        'Goals hold your milestones and habits. Finance is budget-first: set category targets, ' +
        'log spending, and pay yourself first — the Savings category fills your goals. After a ' +
        'month, the AI coach reviews your numbers.',
      glyph: 'coins',
    },
    {
      eyebrow: 'Progress',
      title: 'It compounds.',
      body:
        'Badges, personal bests, and your 5 Types of Wealth over time all live on Progress. ' +
        'Tip: on your phone, swipe left or right anywhere to move between pages.',
      glyph: 'bars',
    },
  ];

  let step = 0;
  $: current = STEPS[step];
  $: last = step === STEPS.length - 1;

  function next() {
    if (last) finish();
    else step += 1;
  }
  function back() {
    if (step > 0) step -= 1;
  }
  function finish() {
    completeTour();
    step = 0;
  }
  function onKeydown(e: KeyboardEvent) {
    if (!$tourOpen) return;
    if (e.key === 'Escape') finish();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') back();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if $tourOpen}
  <div
    class="backdrop"
    transition:fade={{ duration: motionDuration(200) }}
    role="dialog"
    aria-modal="true"
    aria-label="App tour"
  >
    <div class="card" transition:fly={{ y: 24, duration: motionDuration(280) }}>
      {#key step}
        <div class="step" in:fade={{ duration: motionDuration(180) }}>
          <div class="glyph" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              {#if current.glyph === 'slider'}
                <path d="M6 24h36" />
                <circle cx="19" cy="24" r="6" fill="var(--panel)" />
                <path d="M6 34h10M6 14h22" opacity="0.35" />
              {:else if current.glyph === 'flame'}
                <path d="M24 7c4 6-9 11-9 20a9 9 0 0 0 18 0c0-4.4-2.2-7.8-4.6-10.4-.6 2.4-2 4-3.4 4.6 1.4-4.6 1.4-9.6-1-14.2z" />
              {:else if current.glyph === 'pen'}
                <path d="M10 38l2.5-8.5L31 11l6 6-18.5 18.5L10 38z" />
                <path d="M27 15l6 6" />
              {:else if current.glyph === 'coins'}
                <circle cx="24" cy="24" r="16" />
                <path d="M24 15.5v17" />
                <path d="M29.2 18.6c-1-1.7-3-2.8-5.2-2.8-3 0-5.4 1.8-5.4 4.2s2 3.4 5.4 4c3.4.6 5.4 1.6 5.4 4s-2.4 4.2-5.4 4.2c-2.2 0-4.2-1.1-5.2-2.8" />
              {:else if current.glyph === 'bars'}
                <path d="M10 38V26M20 38V18M30 38V22M40 38V10" />
              {/if}
            </svg>
          </div>
          <div class="eyebrow-modern">{current.eyebrow}</div>
          <h2>{current.title}</h2>
          <p>{current.body}</p>
        </div>
      {/key}

      <div class="dots" aria-hidden="true">
        {#each STEPS as _, i}
          <button class="dot" class:active={i === step} type="button" on:click={() => (step = i)} tabindex="-1"></button>
        {/each}
      </div>

      <div class="controls">
        <button class="skip" type="button" on:click={finish}>
          {last ? '' : 'Skip'}
        </button>
        <div class="nav">
          {#if step > 0}
            <button class="btn ghost" type="button" on:click={back}>Back</button>
          {/if}
          <button class="btn primary" type="button" on:click={next}>
            {last ? 'Start living it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: color-mix(in srgb, var(--ink) 42%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .card {
    width: min(460px, 100%);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    padding: 32px 30px 24px;
  }
  .step { min-height: 240px; }
  .glyph {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background:
      radial-gradient(ellipse at top right, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 65%),
      var(--panel-warm);
    border: 1px solid var(--border);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .glyph svg { width: 30px; height: 30px; }
  h2 {
    font-family: var(--serif);
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 8px 0 10px;
    color: var(--ink);
  }
  p {
    color: var(--ink-dim);
    font-size: 14.5px;
    line-height: 1.6;
    margin: 0;
  }
  .dots {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin: 18px 0 16px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: var(--border);
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .dot.active {
    background: var(--accent);
    transform: scale(1.25);
  }
  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .skip {
    background: none;
    border: none;
    color: var(--ink-faint);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 4px;
  }
  .skip:hover { color: var(--ink-dim); }
  .nav { display: flex; gap: 8px; }
  @media (max-width: 420px) {
    .card { padding: 26px 22px 20px; }
    .step { min-height: 280px; }
    h2 { font-size: 26px; }
  }
</style>
