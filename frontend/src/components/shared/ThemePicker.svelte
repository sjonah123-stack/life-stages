<script lang="ts">
  import { theme } from '../../stores/personal';
  import type { Theme } from '../../types';

  const options: { value: Theme; emoji: string; label: string }[] = [
    { value: 'sunrise', emoji: '☀️', label: 'Sunrise' },
    { value: 'ocean',   emoji: '🌊', label: 'Ocean' },
    { value: 'forest',  emoji: '🌲', label: 'Forest' },
  ];
</script>

<div class="theme-picker">
  {#each options as opt}
    <button
      type="button"
      title={opt.label}
      aria-label={`${opt.label} theme`}
      aria-pressed={$theme === opt.value}
      class:active={$theme === opt.value}
      on:click={() => theme.set(opt.value)}
    >
      {opt.emoji}
    </button>
  {/each}
</div>

<style>
  .theme-picker {
    display: inline-flex;
    background: var(--panel-warm);
    border-radius: 10px;
    padding: 3px;
    border: 1px solid var(--border);
    height: 38px;
  }
  button {
    border: none;
    background: transparent;
    padding: 0 12px;
    font-size: 16px;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;
  }
  button.active {
    background: var(--accent);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
</style>
