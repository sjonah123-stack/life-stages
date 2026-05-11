<script lang="ts">
  // Badge grid. Each tile shows an achievement; unlocked ones get color,
  // locked ones stay muted with a 🔒 indicator. Tooltip-friendly via
  // `title` attribute on the tile.
  import { achievements } from '../../stores/achievements';
  import type { Achievement } from '../../stores/achievements';

  $: list = $achievements;
  $: unlockedCount = list.filter((a) => a.unlocked).length;
  $: total = list.length;
  $: byCategory = (() => {
    const map = new Map<Achievement['category'], Achievement[]>();
    for (const a of list) {
      const arr = map.get(a.category) ?? [];
      arr.push(a);
      map.set(a.category, arr);
    }
    return [...map.entries()];
  })();

  const CATEGORY_LABEL: Record<Achievement['category'], string> = {
    journal: 'Journal',
    habits: 'Habits',
    body: 'Body log',
    books: 'Books',
    finance: 'Finance',
    wealth: 'Wealth',
    overall: 'Overall',
  };
</script>

<section class="module-section">
  <div class="head">
    <div>
      <h2>Achievements</h2>
      <p class="sub">
        Badges that mark real progress through the app. They derive from your data — no XP, no
        levels, no streak anxiety. Just markers of where you've been.
      </p>
    </div>
    <div class="counter">
      <span class="counter-num">{unlockedCount}</span>
      <span class="counter-total">/ {total}</span>
    </div>
  </div>

  {#each byCategory as [cat, items]}
    <div class="category">
      <div class="category-label">{CATEGORY_LABEL[cat]}</div>
      <div class="grid">
        {#each items as a (a.id)}
          <div class="tile" class:unlocked={a.unlocked} title={a.description}>
            <div class="tile-emoji">{a.unlocked ? a.emoji : '🔒'}</div>
            <div class="tile-title">{a.title}</div>
            <div class="tile-desc">{a.description}</div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</section>

<style>
  .module-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 22px 26px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-sm);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .sub {
    color: var(--ink-dim);
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    max-width: 540px;
  }
  .counter {
    display: flex;
    align-items: baseline;
    gap: 2px;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .counter-num {
    font-size: 32px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .counter-total {
    font-size: 16px;
    color: var(--ink-faint);
    font-weight: 600;
  }

  .category { margin-top: 18px; }
  .category-label {
    font-size: 11px;
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }
  .tile {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 14px 12px;
    text-align: center;
    opacity: 0.55;
    transition: opacity 0.2s, transform 0.15s;
  }
  .tile.unlocked {
    opacity: 1;
    background: linear-gradient(135deg, rgba(255, 201, 60, 0.12), rgba(255, 140, 97, 0.06));
    border-color: rgba(255, 140, 97, 0.3);
  }
  .tile.unlocked:hover { transform: translateY(-1px); }
  .tile-emoji {
    font-size: 30px;
    line-height: 1;
    margin-bottom: 6px;
  }
  .tile-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.2;
  }
  .tile-desc {
    font-size: 11px;
    color: var(--ink-dim);
    margin-top: 4px;
    line-height: 1.4;
  }
</style>
