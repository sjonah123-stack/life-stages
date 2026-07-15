<script lang="ts">
  // Global toast stack — mounted once in App.svelte, outside <main> so it
  // survives page switches. Bottom-center, editorial styling: paper card,
  // serif title, quiet sans body. Click anywhere on a toast to dismiss.
  import { fly, fade } from 'svelte/transition';
  import { toasts, dismissToast } from '../../stores/toasts';
  import { motionDuration } from '../../lib/motion';
</script>

<div class="toast-host" aria-live="polite">
  {#each $toasts as t (t.id)}
    <button
      class="toast"
      class:achievement={t.kind === 'achievement'}
      type="button"
      in:fly={{ y: 16, duration: motionDuration(260) }}
      out:fade={{ duration: motionDuration(180) }}
      on:click={() => dismissToast(t.id)}
      title="Dismiss"
    >
      {#if t.emoji}<span class="toast-emoji">{t.emoji}</span>{/if}
      <span class="toast-text">
        <span class="toast-title">{t.title}</span>
        {#if t.body}<span class="toast-body">{t.body}</span>{/if}
      </span>
    </button>
  {/each}
</div>

<style>
  .toast-host {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    z-index: 9500;
    width: min(420px, calc(100vw - 32px));
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    text-align: left;
    padding: 14px 18px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    cursor: pointer;
    font-family: inherit;
  }
  .toast.achievement {
    background:
      radial-gradient(
        ellipse at top right,
        color-mix(in srgb, var(--accent) 14%, transparent) 0%,
        transparent 60%
      ),
      var(--panel);
  }
  .toast-emoji {
    font-size: 26px;
    line-height: 1;
    flex-shrink: 0;
  }
  .toast-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .toast-title {
    font-family: var(--serif);
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
    line-height: 1.2;
  }
  .toast-body {
    font-size: 12.5px;
    color: var(--ink-dim);
    line-height: 1.4;
  }
</style>
