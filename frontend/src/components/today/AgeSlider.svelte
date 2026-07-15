<script lang="ts">
  import { selectedAge, markSliderUserTouched, isToday } from '../../stores/slider';
  import { todayAge } from '../../stores/personal';
  import { currentStage } from '../../stores/derived';
  import { SLIDER_MAX } from '../../config';

  $: age = $selectedAge;
  $: stage = $currentStage;
  $: livedPct = (Math.min(age, SLIDER_MAX) / SLIDER_MAX) * 100;
  $: nowMarkerPct = $todayAge >= 0 ? ($todayAge / SLIDER_MAX) * 100 : -1;

  function onInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    selectedAge.set(v);
    markSliderUserTouched();
  }

  function jumpToToday() {
    if ($todayAge >= 0) {
      selectedAge.set($todayAge);
      markSliderUserTouched();
    }
  }
</script>

<div class="age-block glass-tinted" style="--lived-pct: {livedPct}%">
  <div class="top-row">
    <div class="age-display">
      <div class="age-num">{age}</div>
      <div class="age-meta">
        <div class="age-label">years</div>
        {#if !$isToday && $todayAge >= 0}
          <button class="jump-today" type="button" on:click={jumpToToday}>
            ← back to today ({$todayAge})
          </button>
        {/if}
      </div>
    </div>

    {#if stage}
      <div class="stage-block">
        <div class="stage-pill">{stage.name}</div>
        <div class="poetic-line">{stage.poetic}</div>
      </div>
    {/if}
  </div>

  <div class="slider-track-wrap">
    {#if nowMarkerPct >= 0}
      <div
        class="now-marker"
        style="left: calc({nowMarkerPct}% + {(0.5 - nowMarkerPct / 100) * 28}px)"
      >
        <span class="now-pulse"></span>
        <span class="now-label">today</span>
      </div>
    {/if}
    <input
      type="range"
      min="0"
      max={SLIDER_MAX}
      step="1"
      value={age}
      on:input={onInput}
      aria-label="Age slider"
    />
    <div class="ticks">
      <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
    </div>
  </div>
</div>

<style>
  .age-block {
    --tint: var(--accent);
    border-radius: 28px;
    padding: 36px 36px 30px;
    position: relative;
    overflow: hidden;
  }
  @media (max-width: 540px) {
    .age-block { padding: 26px 22px 24px; border-radius: 22px; }
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 10px;
    position: relative;
  }

  .age-display {
    display: flex;
    align-items: baseline;
    gap: 16px;
    position: relative;
  }
  .age-num {
    font-family: var(--serif);
    font-size: clamp(80px, 15vw, 132px);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 0.92;
    background: linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 55%, var(--accent-deep) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    /* Subtle warm glow behind the number. */
    filter: drop-shadow(0 4px 14px rgba(181, 101, 74, 0.16));
  }
  .age-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .age-label {
    font-size: 20px;
    color: var(--ink-dim);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .jump-today {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
    text-align: left;
    letter-spacing: 0.01em;
    transition: opacity 0.15s;
  }
  .jump-today:hover { opacity: 0.7; }

  .stage-block {
    max-width: 280px;
    text-align: right;
  }
  @media (max-width: 640px) {
    .stage-block { text-align: left; max-width: 100%; }
  }

  .stage-pill {
    display: inline-block;
    background: linear-gradient(135deg, var(--past), var(--accent));
    color: var(--bg-1);
    padding: 7px 18px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--accent-soft) 35%, transparent), 0 1px 0 rgba(255, 255, 255, 0.4) inset;
  }
  .poetic-line {
    color: var(--ink-dim);
    font-size: 14px;
    margin-top: 10px;
    font-style: italic;
    line-height: 1.45;
  }

  .slider-track-wrap {
    position: relative;
    padding: 38px 0 6px;
    margin-top: 8px;
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    background: transparent;
    margin: 0;
    position: relative;
    z-index: 3;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 10px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--past) 0%,
      var(--past) var(--lived-pct, 25%),
      rgba(255, 255, 255, 0.5) var(--lived-pct, 25%),
      rgba(255, 255, 255, 0.5) 100%
    );
    box-shadow:
      inset 0 1px 2px rgba(44, 24, 16, 0.1),
      0 1px 0 rgba(255, 255, 255, 0.6);
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 30% 30%, white, #fff8f0);
    box-shadow:
      0 0 0 5px color-mix(in srgb, var(--accent) 22%, transparent),
      0 6px 18px rgba(206, 108, 74, 0.32),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
    margin-top: -10px;
    cursor: grab;
    border: 2px solid var(--accent);
    transition: transform 0.12s ease;
  }
  input[type='range']:hover::-webkit-slider-thumb { transform: scale(1.06); }
  input[type='range']:active::-webkit-slider-thumb { cursor: grabbing; transform: scale(1.12); }
  input[type='range']::-moz-range-track {
    height: 10px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--past) 0%,
      var(--past) var(--lived-pct, 25%),
      rgba(255, 255, 255, 0.5) var(--lived-pct, 25%),
      rgba(255, 255, 255, 0.5) 100%
    );
  }
  input[type='range']::-moz-range-thumb {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--accent);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 22%, transparent), 0 6px 18px rgba(206, 108, 74, 0.32);
    cursor: grab;
  }
  .ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    color: var(--ink-faint);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  /* Today marker — pulsing dot + small label above the track. */
  .now-marker {
    position: absolute;
    top: 24px;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .now-pulse {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--now);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-soft) 25%, transparent), 0 0 12px color-mix(in srgb, var(--accent-soft) 55%, transparent);
    animation: now-pulse 2.4s ease-in-out infinite;
  }
  @keyframes now-pulse {
    0%, 100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-soft) 18%, transparent), 0 0 12px color-mix(in srgb, var(--accent-soft) 40%, transparent); }
    50%      { box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent-soft) 30%, transparent), 0 0 18px color-mix(in srgb, var(--accent-soft) 65%, transparent); }
  }
  @media (prefers-reduced-motion: reduce) {
    .now-pulse { animation: none; }
  }
  .now-label {
    position: absolute;
    top: -18px;
    font-size: 10px;
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    white-space: nowrap;
  }
</style>
