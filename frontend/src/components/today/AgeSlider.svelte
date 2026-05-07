<script lang="ts">
  import { selectedAge, markSliderUserTouched } from '../../stores/slider';
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
</script>

<div class="age-block" style="--lived-pct: {livedPct}%">
  <div class="age-display">
    <div class="age-num">{age}</div>
    <div class="age-label">years old</div>
  </div>
  {#if stage}
    <div class="stage-pill">{stage.name}</div>
    <div class="poetic-line">{stage.poetic}</div>
  {/if}

  <div class="slider-track-wrap">
    {#if nowMarkerPct >= 0}
      <div
        class="now-marker"
        style="left: calc({nowMarkerPct}% + {(0.5 - nowMarkerPct / 100) * 28}px)"
      ></div>
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
    background: var(--panel);
    border-radius: 22px;
    padding: 36px 32px 28px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-md);
    position: relative;
    overflow: hidden;
  }
  .age-block::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at top right, rgba(255, 201, 60, 0.18), transparent 60%);
    pointer-events: none;
  }
  .age-display {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 4px;
    position: relative;
  }
  .age-num {
    font-size: 96px;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    background: linear-gradient(135deg, var(--accent) 0%, var(--future-3) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .age-label {
    font-size: 20px;
    color: var(--ink-dim);
    font-weight: 500;
  }
  .stage-pill {
    display: inline-block;
    background: linear-gradient(135deg, var(--past) 0%, var(--accent) 100%);
    color: white;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
    letter-spacing: 0.02em;
    box-shadow: 0 2px 8px rgba(244, 184, 96, 0.3);
    position: relative;
  }
  .poetic-line {
    color: var(--ink-dim);
    font-size: 15px;
    margin-top: 6px;
    margin-bottom: 18px;
    font-style: italic;
    position: relative;
  }
  .slider-track-wrap { position: relative; padding: 32px 0 6px; }
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
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(
      to right,
      var(--past) 0%,
      var(--past) var(--lived-pct, 25%),
      var(--future-1) var(--lived-pct, 25%),
      var(--future-3) 100%
    );
    box-shadow: inset 0 1px 2px rgba(44, 24, 16, 0.06);
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 0 0 4px rgba(255, 140, 97, 0.25), 0 4px 14px rgba(206, 108, 74, 0.25);
    margin-top: -10px;
    cursor: grab;
    border: 2px solid var(--accent);
    transition: transform 0.1s;
  }
  input[type='range']::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.1); }
  input[type='range']::-moz-range-track {
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(
      to right,
      var(--past) 0%,
      var(--past) var(--lived-pct, 25%),
      var(--future-1) var(--lived-pct, 25%),
      var(--future-3) 100%
    );
  }
  input[type='range']::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--accent);
    box-shadow: 0 0 0 4px rgba(255, 140, 97, 0.25), 0 4px 14px rgba(206, 108, 74, 0.25);
    cursor: grab;
  }
  .ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    color: var(--ink-faint);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .now-marker {
    position: absolute;
    top: 22px;
    width: 3px;
    height: 32px;
    background: var(--now);
    transform: translateX(-50%);
    box-shadow: 0 0 12px rgba(255, 201, 60, 0.5);
    border-radius: 2px;
    pointer-events: none;
    z-index: 1;
  }
  .now-marker::after {
    content: 'today';
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
</style>
