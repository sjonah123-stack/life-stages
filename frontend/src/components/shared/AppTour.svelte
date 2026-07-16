<script lang="ts">
  // First-time app tour — a guided walkthrough that visits each page for
  // real. A compact coach card docks at the bottom while the tour
  // navigates to the page, scrolls to the section it's describing, and
  // rings it with a soft highlight (elements opt in via data-tour
  // attributes; a missing anchor degrades to scroll-to-top, so page
  // changes can't break the tour). An invisible shield blocks page
  // interaction so the steps stay in sync. Auto-opens once after the
  // welcome wizard (stores/tour); replayable from Settings.
  import { fade, fly } from 'svelte/transition';
  import { tourOpen, completeTour } from '../../stores/tour';
  import { navigate, currentPage, type Page } from '../../lib/router';
  import { motionDuration, prefersReducedMotion } from '../../lib/motion';

  interface TourStep {
    page: Page;
    target?: string; // data-tour anchor on that page
    eyebrow: string;
    title: string;
    body: string;
  }

  const STEPS: TourStep[] = [
    {
      page: 'today',
      target: 'slider',
      eyebrow: 'Today · 1 of 3',
      title: 'Your whole life, on one line.',
      body:
        'This slider is the heart of the app: every age from 0 to 100. Drag it forward to ' +
        'preview a future chapter, back to revisit one you\'ve lived. It always snaps home to today.',
    },
    {
      page: 'today',
      target: 'daily',
      eyebrow: 'Today · 2 of 3',
      title: 'The daily loop.',
      body:
        'Log sleep and movement in the daily check-in, and tap habits done as you go. ' +
        'Streaks grow day by day — crossing a milestone earns confetti. This is the part ' +
        'worth coming back to every day.',
    },
    {
      page: 'today',
      target: 'wealth',
      eyebrow: 'Today · 3 of 3',
      title: 'The 5 Types of Wealth.',
      body:
        'Money is only one of five wealths — time, social, mental, and physical matter just as ' +
        'much. Take the 3-minute assessment here: your answers blend with what you actually do ' +
        'in the app to score each dimension on a radar, with suggestions for whichever is ' +
        'lowest. Retake it every few months to watch the balance shift.',
    },
    {
      page: 'journal',
      target: 'composer',
      eyebrow: 'Journal',
      title: 'One honest note a week.',
      body:
        'Write about this week — or pick any date and write about any week of your life. ' +
        'Tag a mood, lean on a prompt if you\'re stuck. Entries resurface on their ' +
        'anniversaries, and AI can name the patterns once a few exist.',
    },
    {
      page: 'goals',
      target: 'milestones',
      eyebrow: 'Goals · 1 of 2',
      title: 'Milestones, made specific.',
      body:
        'Goals here are SMART by design: what, how you\'ll measure it, by when, and why it ' +
        'matters. They pin to your timeline on Today, and AI can suggest some that actually ' +
        'fit your life.',
    },
    {
      page: 'goals',
      target: 'habits',
      eyebrow: 'Goals · 2 of 2',
      title: 'Habits build the chain.',
      body:
        'Add the small daily practices you want to keep. Each day you check one off, the ' +
        '28-day chain fills in — and the streak on Today grows with it.',
    },
    {
      page: 'finance',
      target: 'budget',
      eyebrow: 'Finance · 1 of 2',
      title: 'Budget the month.',
      body:
        'Set a target per category, then log spending and income as they happen. Bars fill ' +
        'toward each target — and "Savings" is a category on purpose: pay yourself first, and ' +
        'those transfers fill your savings goal. After a month, the AI coach can review your ' +
        'numbers and suggest a plan.',
    },
    {
      page: 'finance',
      target: 'giving',
      eyebrow: 'Finance · 2 of 2',
      title: 'Give some back.',
      body:
        'The giving tracker keeps a gentle annual target of 10% of your income. Log gifts as ' +
        'they happen and watch the year fill in.',
    },
    {
      page: 'progress',
      eyebrow: 'Progress',
      title: 'Watch it compound.',
      body:
        'Badges, personal bests, body trends, and your wealth balance over time all gather ' +
        'here. One last tip: on your phone, swipe left or right anywhere to move between ' +
        'pages. That\'s the tour — start living it.',
    },
  ];

  let step = 0;
  let highlighted: HTMLElement | null = null;
  $: current = STEPS[step];
  $: last = step === STEPS.length - 1;

  function clearHighlight() {
    highlighted?.classList.remove('tour-highlight');
    highlighted = null;
  }

  // Navigate to the step's page, then scroll to + highlight its anchor.
  // The delay lets the page transition mount the new DOM first.
  function showStep() {
    clearHighlight();
    if ($currentPage !== current.page) navigate(current.page);
    setTimeout(() => {
      const el = current.target
        ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`)
        : null;
      if (el) {
        // Class first: .tour-highlight carries scroll-margin-top so the
        // section clears the sticky nav when scrolled into view.
        el.classList.add('tour-highlight');
        highlighted = el;
        el.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      } else {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }, 320);
  }

  // Re-run on open and on every step change.
  $: if ($tourOpen && current) {
    void step;
    showStep();
  }

  function next() {
    if (last) finish();
    else step += 1;
  }
  function back() {
    if (step > 0) step -= 1;
  }
  function finish() {
    clearHighlight();
    completeTour();
    step = 0;
    navigate('today');
    window.scrollTo({ top: 0 });
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
  <!-- Invisible shield: keeps the page visible but not interactive, so the
       walkthrough stays in sync with what the card describes. -->
  <div class="shield" transition:fade={{ duration: motionDuration(150) }}></div>

  <div
    class="coach"
    transition:fly={{ y: 24, duration: motionDuration(280) }}
    role="dialog"
    aria-modal="true"
    aria-label="App tour"
  >
    {#key step}
      <div class="step" in:fade={{ duration: motionDuration(160) }}>
        <div class="eyebrow-modern">{current.eyebrow}</div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
      </div>
    {/key}

    <div class="foot">
      <button class="skip" type="button" on:click={finish}>{last ? '' : 'Skip tour'}</button>
      <div class="dots" aria-hidden="true">
        {#each STEPS as _, i}
          <span class="dot" class:active={i === step}></span>
        {/each}
      </div>
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
{/if}

<style>
  .shield {
    position: fixed;
    inset: 0;
    z-index: 8900;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
  .coach {
    position: fixed;
    /* Centered via auto margins, not transform — svelte's fly transition
       writes an inline transform that would override translateX(-50%). */
    left: 12px;
    right: 12px;
    margin-inline: auto;
    bottom: max(16px, env(safe-area-inset-bottom));
    z-index: 9000;
    width: min(480px, calc(100vw - 24px));
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: 18px 20px 14px;
  }
  h2 {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 6px 0 6px;
    color: var(--ink);
  }
  p {
    color: var(--ink-dim);
    font-size: 13.5px;
    line-height: 1.55;
    margin: 0;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
  }
  .skip {
    background: none;
    border: none;
    color: var(--ink-faint);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 0;
    min-width: 58px;
    text-align: left;
  }
  .skip:hover { color: var(--ink-dim); }
  .dots { display: flex; gap: 5px; }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--border);
    transition: background 0.15s, transform 0.15s;
  }
  .dot.active {
    background: var(--accent);
    transform: scale(1.3);
  }
  .nav { display: flex; gap: 8px; }
  @media (max-width: 480px) {
    .coach { padding: 16px 16px 12px; }
    h2 { font-size: 19px; }
    .skip { min-width: 44px; }
  }
</style>
