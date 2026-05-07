<script lang="ts">
  import { selectedAge } from '../../stores/slider';
  import { todayAge, sex, careerField, partnership, kids } from '../../stores/personal';
  import { getStage, getCareerCallout, PARTNERSHIP_NOTES } from '../../data';
  import type { Stage, DimensionContent } from '../../types';

  $: stage = getStage($selectedAge) as Stage;

  // Health is sex-aware (some stages have only `common`, others have male/female).
  $: healthContent = (stage.health.female || stage.health.male)
    ? ($sex === 'female' ? stage.health.female : stage.health.male) ?? stage.health.common!
    : stage.health.common!;

  $: careerCallout = getCareerCallout($selectedAge, $careerField);

  // Compose love card callout based on partnership + kids.
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

<div class="cards">
  {#each cards as card}
    <div class="card" data-dim={card.dim}>
      <div class="card-icon">{card.icon}</div>
      <div class="card-title">{card.title}</div>
      <div class="card-headline">{card.content.h}</div>
      <div class="card-body">{card.content.b}</div>
      {#if card.callout}
        <div class="card-callout">
          <span class="card-callout-label">{card.callout.label}</span>
          <span>{card.callout.text}</span>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px 22px 24px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--card-color);
    border-radius: 16px 16px 0 0;
  }
  .card[data-dim='career'] { --card-color: var(--career); }
  .card[data-dim='love']   { --card-color: var(--love); }
  .card[data-dim='health'] { --card-color: var(--health); }
  .card[data-dim='money']  { --card-color: var(--money); }
  .card[data-dim='growth'] { --card-color: var(--growth); }
  .card-icon { font-size: 24px; margin-bottom: 10px; }
  .card-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ink-faint);
    margin-bottom: 10px;
    font-weight: 700;
  }
  .card-headline {
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 10px;
    line-height: 1.3;
  }
  .card-body {
    color: var(--ink-dim);
    font-size: 14px;
    line-height: 1.6;
  }
  .card-callout {
    margin-top: 14px;
    padding: 10px 12px;
    background: var(--panel-warm);
    border-left: 3px solid var(--card-color);
    border-radius: 4px;
    font-size: 13px;
    color: var(--ink);
    line-height: 1.5;
  }
  .card-callout-label {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    font-weight: 700;
    margin-bottom: 4px;
  }
</style>
