<script lang="ts">
  // Export milestones + rituals + savings-goal deadlines as a .ics file.
  // No backend, no auth — pure client-side blob download. Works with
  // Apple Calendar, Google Calendar, Outlook, etc.
  import { milestones } from '../../stores/collections';
  import { savingsGoals } from '../../stores/financial';
  import { rituals } from '../../stores/collections';
  import { birthdate } from '../../stores/personal';
  import { buildIcs, countExportable } from '../../lib/ics';
  import { formatDOB } from '../../utils';

  $: count = countExportable({
    milestones: $milestones,
    rituals: $rituals,
    savingsGoals: $savingsGoals,
    birthdate: $birthdate,
  });

  let lastDownload = '';

  function download() {
    const text = buildIcs({
      milestones: $milestones,
      rituals: $rituals,
      savingsGoals: $savingsGoals,
      birthdate: $birthdate,
    });
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-stages-${formatDOB(new Date())}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke after a tick so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    lastDownload = new Date().toLocaleTimeString();
  }
</script>

<div class="export-block">
  <div class="export-info">
    <div class="export-title">📅 Export to your calendar</div>
    <div class="export-sub">
      Download an .ics file with {count} {count === 1 ? 'event' : 'events'}
      (milestones, rituals, savings deadlines). Works with Apple Calendar, Google Calendar, and Outlook.
    </div>
    {#if lastDownload}
      <div class="export-flash">Downloaded at {lastDownload} ✓</div>
    {/if}
  </div>
  <button class="export-btn" type="button" on:click={download} disabled={count === 0}>
    Download .ics
  </button>
</div>

<style>
  .export-block {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding: 14px 18px;
    background: var(--panel-warm);
    border: 1px dashed var(--border);
    border-radius: 12px;
    margin-top: 12px;
  }
  .export-info { flex: 1; min-width: 220px; }
  .export-title {
    font-weight: 700;
    color: var(--ink);
    font-size: 14px;
    margin-bottom: 3px;
  }
  .export-sub {
    color: var(--ink-dim);
    font-size: 13px;
    line-height: 1.45;
  }
  .export-flash {
    color: var(--health);
    font-size: 12px;
    font-weight: 700;
    margin-top: 4px;
  }
  .export-btn {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 9px 18px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .export-btn:hover:not(:disabled) { opacity: 0.92; }
  .export-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
