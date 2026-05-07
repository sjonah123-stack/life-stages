<script lang="ts">
  import { currentPage, TAB_PAGES, PAGE_LABELS } from '../../lib/router';
  import { isBlankState } from '../../stores/personal';
  import ThemePicker from '../shared/ThemePicker.svelte';
</script>

<nav class="top-nav">
  <div class="top-nav-inner">
    <a href="#/today" class="brand">
      <span class="brand-mark"></span>
      Your Life
    </a>
    {#if !$isBlankState}
      <div class="nav-tabs" role="tablist">
        {#each TAB_PAGES as p}
          <a href={`#/${p}`} class="nav-tab" class:active={$currentPage === p}>{PAGE_LABELS[p]}</a>
        {/each}
      </div>
    {/if}
    <div class="nav-right">
      <ThemePicker />
      {#if !$isBlankState}
        <a href="#/settings" class="icon-btn" title="Settings" aria-label="Settings">⚙</a>
      {/if}
      <span id="authSlot"><!-- sign-in slot, wired up in Phase 13 --></span>
    </div>
  </div>
</nav>

<style>
  .top-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 247, 232, 0.85);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid var(--border);
  }
  :global(body.theme-ocean) .top-nav { background: rgba(232, 244, 255, 0.85); }
  :global(body.theme-forest) .top-nav { background: rgba(240, 247, 232, 0.85); }
  .top-nav-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 12px 32px;
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }
  .brand {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    white-space: nowrap;
    margin-right: auto;
  }
  .brand-mark {
    display: inline-block;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    margin-right: 8px;
    vertical-align: middle;
  }
  .nav-tabs {
    display: flex;
    gap: 2px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px;
    box-shadow: var(--shadow-sm);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .nav-tabs::-webkit-scrollbar { display: none; }
  .nav-tab {
    background: transparent;
    border: none;
    padding: 7px 14px;
    border-radius: 999px;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-dim);
    transition: all 0.15s;
    white-space: nowrap;
  }
  .nav-tab:hover { color: var(--ink); }
  .nav-tab.active {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    color: white;
    box-shadow: 0 2px 8px rgba(255, 140, 97, 0.3);
  }
  .nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
  }
  .icon-btn {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--ink-dim);
    font-size: 17px;
    transition: all 0.15s;
    box-shadow: var(--shadow-sm);
  }
  .icon-btn:hover { color: var(--accent); transform: rotate(20deg); }
</style>
