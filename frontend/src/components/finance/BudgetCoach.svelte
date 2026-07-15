<script lang="ts">
  // AI budget coach — reviews logged months of cash flow (numbers only;
  // notes and recipients never leave the device) and suggests a concrete
  // plan. Signed-in only (billing), cached locally, regenerable. Unlocks
  // once at least one *prior* month has data — one month of history is
  // the minimum for advice that isn't guesswork.
  import {
    cashflowEntries,
    budgetPlan,
    savingsGoals,
    setBudgetPlan,
    savedTowardGoal,
    monthKey,
    summarizeMonth,
    expensesByCategory,
  } from '../../stores/financial';
  import { currentUser } from '../../stores/auth';
  import { adviseOnBudget, type BudgetMonthSummary } from '../../lib/ai';
  import { latestBudgetAdvice } from '../../stores/ai';
  import { pushToast } from '../../stores/toasts';
  import { formatDOB } from '../../utils';

  let loading = false;
  let error = '';

  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  $: thisMonth = monthKey(formatDOB(new Date()));

  // All months with data, oldest first.
  $: dataMonths = [...new Set($cashflowEntries.map((e) => monthKey(e.date)))].sort();
  $: priorMonths = dataMonths.filter((m) => m < thisMonth);
  $: unlocked = priorMonths.length >= 1;

  function buildMonths(): BudgetMonthSummary[] {
    return dataMonths.map((m) => {
      const s = summarizeMonth($cashflowEntries, m);
      return {
        month: m,
        income: s.income,
        expenses: s.expenses,
        categories: expensesByCategory($cashflowEntries, m),
      };
    });
  }

  async function review() {
    loading = true;
    error = '';
    try {
      const goal = $savingsGoals[0];
      const result = await adviseOnBudget({
        months: buildMonths(),
        ...($budgetPlan.expectedIncome ? { expectedIncome: $budgetPlan.expectedIncome } : {}),
        budget: Object.entries($budgetPlan.categories)
          .filter((e): e is [string, number] => typeof e[1] === 'number')
          .map(([category, amount]) => ({ category, amount })),
        ...(goal
          ? {
              savingsGoal: {
                label: goal.label,
                target: goal.target,
                saved: savedTowardGoal($cashflowEntries, goal.createdAt),
              },
            }
          : {}),
      });
      latestBudgetAdvice.set({ ...result, generatedAt: Date.now() });
    } catch {
      error = 'AI is unavailable right now. (Firebase AI Logic must be enabled.)';
    } finally {
      loading = false;
    }
  }

  function applySuggestedPlan() {
    const advice = $latestBudgetAdvice;
    if (!advice || advice.suggestedPlan.length === 0) return;
    const categories: Record<string, number> = {};
    for (const p of advice.suggestedPlan) categories[p.category] = p.amount;
    setBudgetPlan({
      ...($budgetPlan.expectedIncome ? { expectedIncome: $budgetPlan.expectedIncome } : {}),
      categories,
    });
    pushToast({
      kind: 'info',
      emoji: '📒',
      title: 'Budget updated',
      body: 'The suggested plan is now your budget.',
    });
  }
</script>

<div class="coach">
  <div class="head">
    <div class="eyebrow-modern">AI budget coach</div>
    {#if $currentUser && unlocked}
      <button class="review-btn" type="button" on:click={review} disabled={loading}>
        {loading ? 'Reviewing…' : $latestBudgetAdvice ? 'Refresh' : '✦ Review my spending'}
      </button>
    {/if}
  </div>

  {#if !$currentUser}
    <p class="muted">Sign in and log a month of spending to get a personal read on your budget.</p>
  {:else if !unlocked}
    <p class="muted">
      Keep logging — once a full month is on the books, AI can review your
      patterns and suggest a plan.
    </p>
  {:else if error}
    <p class="muted">{error}</p>
  {:else if $latestBudgetAdvice}
    {#each $latestBudgetAdvice.observations as o}
      <p class="observation">{o}</p>
    {/each}
    {#if $latestBudgetAdvice.recommendations.length > 0}
      <ul class="recs">
        {#each $latestBudgetAdvice.recommendations as r}
          <li><span class="rec-cat">{r.category}</span> {r.advice}</li>
        {/each}
      </ul>
    {/if}
    {#if $latestBudgetAdvice.suggestedPlan.length > 0}
      <div class="plan">
        <div class="plan-head">
          <span class="plan-label">Suggested monthly plan</span>
          <button class="apply-btn" type="button" on:click={applySuggestedPlan}>
            Use as my budget
          </button>
        </div>
        <div class="plan-chips">
          {#each $latestBudgetAdvice.suggestedPlan as p}
            <span class="chip">{p.category} <strong>{fmt.format(p.amount)}</strong></span>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <p class="muted">
      Tap "Review my spending" for observations on your months so far and a
      suggested plan. Only category totals are shared — never your notes.
    </p>
  {/if}
</div>

<style>
  .coach {
    margin-top: 20px;
    padding: 16px 18px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .review-btn {
    flex-shrink: 0;
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .review-btn:hover:not(:disabled) { background: var(--accent); color: var(--bg-1); }
  .review-btn:disabled { opacity: 0.6; cursor: default; }
  .muted { font-size: 13px; color: var(--ink-faint); margin: 0; line-height: 1.5; }
  .observation {
    font-family: var(--serif);
    font-size: 17px;
    line-height: 1.5;
    font-style: italic;
    color: var(--ink);
    margin: 0 0 6px;
  }
  .recs {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .recs li {
    font-size: 13.5px;
    color: var(--ink);
    line-height: 1.5;
  }
  .rec-cat {
    display: inline-block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--accent-deep);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border-radius: var(--radius-pill);
    padding: 2px 8px;
    margin-right: 6px;
  }
  .plan { margin-top: 14px; }
  .plan-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .plan-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--accent-deep);
  }
  .apply-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 4px;
  }
  .apply-btn:hover { text-decoration: underline; }
  .plan-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font-size: 12px;
    color: var(--ink-dim);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
  }
  .chip strong { color: var(--ink); font-variant-numeric: tabular-nums; }
</style>
