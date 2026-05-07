<script lang="ts">
  import { SURVEY, LIKERT_LABELS, computeSelfScores, WEALTHS } from '../../data/assessment';
  import { submitAssessment } from '../../stores/assessment';
  import type { SurveyAnswer, AssessmentResult, WealthKey } from '../../types';

  export let onCancel: () => void;

  // One answer per question, indexed by question id.
  let answers: Record<string, 1 | 2 | 3 | 4 | 5> = {};
  let idx = 0;

  $: q = SURVEY[idx];
  $: progress = ((idx + 1) / SURVEY.length) * 100;
  $: wealth = WEALTHS.find((w) => w.key === q.wealth);
  $: selectedValue = answers[q.id] ?? null;

  function pick(value: 1 | 2 | 3 | 4 | 5) {
    answers = { ...answers, [q.id]: value };
    // Auto-advance
    if (idx < SURVEY.length - 1) {
      setTimeout(() => idx++, 180);
    }
  }
  function next() { if (idx < SURVEY.length - 1) idx++; }
  function prev() { if (idx > 0) idx--; }

  $: canFinish =
    SURVEY.every((q) => answers[q.id] != null);

  function finish() {
    const surveyAnswers: SurveyAnswer[] = SURVEY.map((q) => ({
      questionId: q.id,
      value: answers[q.id]!,
    }));
    const selfScores = computeSelfScores(surveyAnswers) as Record<WealthKey, number>;
    const result: AssessmentResult = {
      v: 1,
      takenAt: Date.now(),
      answers: surveyAnswers,
      selfScores,
    };
    submitAssessment(result);
  }
</script>

<div class="survey-card">
  <div class="header">
    <button class="cancel" on:click={onCancel}>✕ Cancel</button>
    <div class="progress">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
    <span class="counter">{idx + 1} / {SURVEY.length}</span>
  </div>

  {#if wealth}
    <div class="wealth-tag">
      <span class="emoji">{wealth.emoji}</span>
      <span class="label">{wealth.label}</span>
    </div>
  {/if}

  <h2 class="prompt">{q.prompt}</h2>

  <div class="likert">
    {#each [1, 2, 3, 4, 5] as v}
      <button
        class="likert-option"
        class:selected={selectedValue === v}
        on:click={() => pick(v as 1 | 2 | 3 | 4 | 5)}
      >
        <span class="num">{v}</span>
        <span class="lbl">{LIKERT_LABELS[v as 1 | 2 | 3 | 4 | 5]}</span>
      </button>
    {/each}
  </div>

  <div class="nav">
    <button class="nav-btn" disabled={idx === 0} on:click={prev}>← Back</button>
    {#if idx < SURVEY.length - 1}
      <button class="nav-btn primary" disabled={selectedValue == null} on:click={next}>
        Next →
      </button>
    {:else}
      <button class="nav-btn primary" disabled={!canFinish} on:click={finish}>
        See my results
      </button>
    {/if}
  </div>
</div>

<style>
  .survey-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 22px 26px 26px;
    box-shadow: var(--shadow-md);
    max-width: 640px;
    margin: 8px auto 0;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }
  .cancel {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
  }
  .cancel:hover { color: var(--love); }
  .progress {
    flex: 1;
    height: 6px;
    background: var(--panel-warm);
    border-radius: 999px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--future-3));
    transition: width 0.25s;
  }
  .counter {
    font-size: 12px;
    color: var(--ink-faint);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .wealth-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--panel-warm);
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-dim);
    margin-bottom: 16px;
  }
  .prompt {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.3;
    margin: 0 0 22px;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .likert {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
  }
  .likert-option {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
  }
  .likert-option:hover { border-color: var(--accent); }
  .likert-option.selected {
    background: linear-gradient(135deg, rgba(255, 140, 97, 0.12), rgba(255, 107, 157, 0.08));
    border-color: var(--accent);
  }
  .likert-option .num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--ink-dim);
  }
  .likert-option.selected .num {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .likert-option .lbl {
    font-size: 14px;
    color: var(--ink);
    font-weight: 500;
  }
  .nav {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .nav-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 16px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink-dim);
  }
  .nav-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
  .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .nav-btn.primary {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .nav-btn.primary:hover:not(:disabled) {
    background: var(--accent);
    opacity: 0.92;
  }
</style>
