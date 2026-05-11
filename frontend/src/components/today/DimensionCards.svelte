<script lang="ts">
  import { selectedAge } from '../../stores/slider';
  import { todayAge, sex, careerField, partnership, kids } from '../../stores/personal';
  import { getStage, getCareerCallout, PARTNERSHIP_NOTES } from '../../data';
  import type { Stage, DimensionContent } from '../../types';

  $: stage = getStage($selectedAge) as Stage;

  $: healthContent = (stage.health.female || stage.health.male)
    ? ($sex === 'female' ? stage.health.female : stage.health.male) ?? stage.health.common!
    : stage.health.common!;

  $: careerCallout = getCareerCallout($selectedAge, $careerField);

  $: loveCallout = (() => {
    const parts: string[] = [];
    if ($partnership && PARTNERSHIP_NOTES[$partnership as Exclude<typeof $partnership, ''>]) {
      parts.push(PARTNERSHIP_NOTES[$partnership as Exclude<typeof $partnership, ''>] ?? '');
    }
    if ($kids > 0 && $todayAge >= 0) {
      const kidAgeAtSelected = $selectedAge - $todayAge;
      if (kidAgeAtSelected >= 0 && kidAgeAtSelected <= 100) {
        const kidCount = $kids === 1 ? 'your child' : `your ${$kids} kids`;
        if ($selectedAge <= $todayAge) {
          parts.push(
            `With ${$kids} kid${$kids > 1 ? 's' : ''}, the next chapters of life have a different shape — equal parts harder and richer in ways that aren't captured in averages.`
          );
        } else {
          parts.push(
            `If your kid${$kids > 1 ? 's are' : ' is'} small now, ${kidCount} will be roughly ${kidAgeAtSelected} when you're ${$selectedAge}. The years go faster than anyone tells you.`
          );
        }
      }
    }
    return parts.join(' ');
  })();

  interface CardSpec {
    dim: 'career' | 'love' | 'health' | 'money' | 'growth';
    icon: string;
    title: string;
    content: DimensionContent;
    callout?: { label: string; text: string } | null;
  }

  $: cards = [
    {
      dim: 'career', icon: '💫', title: 'Career & craft',
      content: stage.career,
      callout: careerCallout ? { label: 'In your field', text: careerCallout } : null,
    },
    {
      dim: 'love', icon: '💞', title: 'Love & connection',
      content: stage.love,
      callout: loveCallout ? { label: 'For you', text: loveCallout } : null,
    },
    {
      dim: 'health', icon: '🌿', title: 'Body & vitality',
      content: healthContent,
      callout: null,
    },
    {
      dim: 'money', icon: '🌟', title: 'Wealth & freedom',
      content: stage.money,
      callout: null,
    },
    {
      dim: 'growth', icon: '🌱', title: 'Becoming yourself',
      content: stage.growth,
      callout: null,
    },
  ] as CardSpec[];
</script>

<section class="dimensions">
  <header class="section-head">
    <div class="eyebrow-modern">The five dimensions</div>
    <h2>What this age tends to ask of a life</h2>
  </header>

  <div class="cards">
    {#each cards as card}
      <article class="card glass" data-dim={card.dim}>
        <div class="card-halo" aria-hidden="true"></div>
        <div class="card-head">
          <div class="card-icon">
            <span class="icon-glyph">{card.icon}</span>
          </div>
          <div class="card-title-stack">
            <div class="card-title">{card.title}</div>
            <div class="card-rule" aria-hidden="true"></div>
          </div>
        </div>
        <div class="card-headline">{card.content.h}</div>
        <div class="card-body">{card.content.b}</div>
        {#if card.callout}
          <div class="card-callout">
            <span class="card-callout-label">{card.callout.label}</span>
            <span>{card.callout.text}</span>
          </div>
        {/if}
      </article>
    {/each}
  </div>
</section>

<style>
  .dimensions { margin-bottom: 32px; }

  .section-head { margin-bottom: 18px; }
  .section-head h2 {
    margin: 8px 0 0;
    font-size: clamp(22px, 4vw, 30px);
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.15;
    color: var(--ink);
    max-width: 720px;
  }

  /* Asymmetric bento — career spans 2 columns on wide viewports as the
     "feature" card; the rest fill in around it. Collapses gracefully. */
  .cards {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
  }
  .cards .card { grid-column: span 2; }
  .cards .card[data-dim='career'] { grid-column: span 3; }
  .cards .card[data-dim='love']   { grid-column: span 3; }
  .cards .card[data-dim='growth'] { grid-column: span 6; }

  @media (max-width: 960px) {
    .cards { grid-template-columns: repeat(2, 1fr); }
    .cards .card,
    .cards .card[data-dim='career'],
    .cards .card[data-dim='love'] { grid-column: span 1; }
    .cards .card[data-dim='growth'] { grid-column: span 2; }
  }
  @media (max-width: 560px) {
    .cards { grid-template-columns: 1fr; }
    .cards .card,
    .cards .card[data-dim='growth'] { grid-column: span 1; }
  }

  /* Per-dimension accent colors. Each card pulls its accent into the
     halo, icon backdrop, and the top gradient bar. */
  .card[data-dim='career'] { --dim-color: var(--career); --dim-color-2: var(--future-3); }
  .card[data-dim='love']   { --dim-color: var(--love);   --dim-color-2: var(--accent); }
  .card[data-dim='health'] { --dim-color: var(--health); --dim-color-2: var(--career); }
  .card[data-dim='money']  { --dim-color: var(--money);  --dim-color-2: var(--accent); }
  .card[data-dim='growth'] { --dim-color: var(--growth); --dim-color-2: var(--love); }

  .card {
    position: relative;
    border-radius: 22px;
    padding: 26px 26px 28px;
    overflow: hidden;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .card:hover {
    transform: translateY(-3px);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.7) inset,
      0 20px 44px -10px rgba(44, 24, 16, 0.18),
      0 6px 16px -4px rgba(44, 24, 16, 0.08);
  }

  /* Soft radial halo in the corner — gives each card its own color identity
     without dominating the surface. */
  .card-halo {
    position: absolute;
    top: -40%;
    right: -30%;
    width: 70%;
    height: 120%;
    background: radial-gradient(circle, var(--dim-color) 0%, transparent 65%);
    opacity: 0.22;
    filter: blur(10px);
    pointer-events: none;
    z-index: 0;
  }

  /* Top gradient stripe — replaces the old flat color band with a softer one. */
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--dim-color), var(--dim-color-2));
    border-radius: 22px 22px 0 0;
    z-index: 2;
  }

  .card > :not(.card-halo) { position: relative; z-index: 1; }

  .card-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }
  .card-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3)),
      linear-gradient(135deg, var(--dim-color), var(--dim-color-2));
    background-blend-mode: overlay, normal;
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow:
      0 4px 12px -2px color-mix(in srgb, var(--dim-color) 35%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.7) inset;
    flex-shrink: 0;
  }
  .icon-glyph {
    font-size: 22px;
    line-height: 1;
    filter: saturate(1.15);
  }
  .card-title-stack {
    flex: 1;
    min-width: 0;
  }
  .card-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-faint);
    font-weight: 700;
    margin-bottom: 6px;
  }
  .card-rule {
    height: 2px;
    width: 28px;
    background: linear-gradient(90deg, var(--dim-color), transparent);
    border-radius: 2px;
  }
  .card-headline {
    font-size: clamp(17px, 1.6vw, 19px);
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 12px;
    line-height: 1.25;
    letter-spacing: -0.015em;
  }
  .card-body {
    color: var(--ink-dim);
    font-size: 14.5px;
    line-height: 1.6;
  }
  .card-callout {
    margin-top: 16px;
    padding: 12px 14px;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.2)),
      color-mix(in srgb, var(--dim-color) 8%, var(--panel-warm));
    background-blend-mode: overlay, normal;
    border-left: 3px solid var(--dim-color);
    border-radius: 4px 10px 10px 4px;
    font-size: 13.5px;
    color: var(--ink);
    line-height: 1.5;
  }
  .card-callout-label {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ink-faint);
    font-weight: 700;
    margin-bottom: 4px;
  }
</style>
