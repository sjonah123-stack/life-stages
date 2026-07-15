<script lang="ts">
  import { journal } from '../../stores/collections';
  import { birthdate } from '../../stores/personal';
  import { getEntry, dateToWeekStart } from '../../stores/journal-helpers';
  import { parseDOB, formatDOB, ageInYears } from '../../utils';

  // Composer passes its currently-loaded week key (YYYY-MM-DD of week start).
  // We look up the same calendar-week in prior years and surface the oldest
  // hit. Using dateToWeekStart ensures we hit the exact birthdate-anchored
  // week that contains the same calendar date a year ago, even when that
  // week-start is several days off from the calendar date itself.
  export let currentKey: string = '';

  interface PriorEntry {
    yearsAgo: number;
    key: string;
    preview: string;
    age: number;
    dateStr: string;
    hasPhoto: boolean;
  }

  function findOldestPrior(
    key: string,
    journalMap: Record<string, unknown>,
    birth: Date | null,
  ): PriorEntry | null {
    if (!key || !birth) return null;
    const current = parseDOB(key);
    if (!current) return null;
    let oldest: PriorEntry | null = null;
    for (let y = 1; y <= 10; y++) {
      const probe = new Date(current);
      probe.setFullYear(probe.getFullYear() - y);
      const weekStart = dateToWeekStart(probe);
      const probedKey = formatDOB(weekStart);
      if (!(probedKey in journalMap)) continue;
      const e = getEntry(probedKey);
      if (!e.text?.trim() && !e.photo) continue;
      const text = e.text?.trim() || '';
      const preview = text
        ? (text.length > 140 ? text.slice(0, 140) + '…' : text)
        : '(photo entry)';
      oldest = {
        yearsAgo: y,
        key: probedKey,
        preview,
        age: ageInYears(weekStart, birth),
        dateStr: weekStart.toLocaleDateString(undefined, {
          month: 'long', day: 'numeric', year: 'numeric',
        }),
        hasPhoto: !!e.photo,
      };
    }
    return oldest;
  }

  $: prior = findOldestPrior(currentKey, $journal as Record<string, unknown>, $birthdate);

  function loadPrior() {
    if (!prior) return;
    window.dispatchEvent(new CustomEvent('journal:load', { detail: { key: prior.key } }));
  }
</script>

{#if prior}
  <div
    class="on-this-day"
    role="button"
    tabindex="0"
    on:click={loadPrior}
    on:keydown={(e) => { if (e.key === 'Enter') loadPrior(); }}
  >
    <div class="left">
      <span class="icon">📅</span>
      <div class="text">
        <div class="head">
          <span class="years-ago">
            {prior.yearsAgo === 1 ? '1 year ago' : `${prior.yearsAgo} years ago`}
          </span>
          <span class="meta">· {prior.dateStr} · age {prior.age}</span>
        </div>
        <div class="preview">"{prior.preview}"</div>
      </div>
    </div>
    <span class="cta">open ↗</span>
  </div>
{/if}

<style>
  .on-this-day {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--growth) 10%, transparent),
      color-mix(in srgb, var(--growth) 7%, transparent)
    );
    border: 1px solid color-mix(in srgb, var(--growth) 25%, transparent);
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: transform 0.12s, box-shadow 0.12s;
  }
  .on-this-day:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  .left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
  }
  .icon { font-size: 22px; flex-shrink: 0; }
  .text { min-width: 0; flex: 1; }
  .head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
  }
  .years-ago {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 800;
    color: var(--growth);
  }
  .meta {
    font-size: 11px;
    color: var(--ink-faint);
    font-weight: 600;
  }
  .preview {
    color: var(--ink);
    font-size: 13px;
    line-height: 1.4;
    font-style: italic;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cta {
    font-size: 11px;
    color: var(--ink-faint);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }
</style>
