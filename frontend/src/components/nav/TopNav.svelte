<script lang="ts">
  import { currentPage, TAB_PAGES, PAGE_LABELS } from '../../lib/router';
  import { isBlankState } from '../../stores/personal';
  import AuthPill from './AuthPill.svelte';
</script>

<nav class="top-nav">
  <div class="top-nav-inner">
    <a href="#/today" class="brand">
      <span class="brand-mark">L</span>
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
      {#if !$isBlankState}
        <a href="#/settings" class="icon-btn" title="Settings" aria-label="Settings">⚙</a>
      {/if}
      <AuthPill />
    </div>
  </div>
</nav>

<style>
  .top-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(244, 240, 232, 0.82);
    backdrop-filter: saturate(140%) blur(22px);
    -webkit-backdrop-filter: saturate(140%) blur(22px);
    border-bottom: 1px solid var(--border);
  }
  .top-nav-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 14px 32px;
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    font-family: var(--serif);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
    white-space: nowrap;
    margin-right: auto;
  }
  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--ink);
    color: #F4F0E8;
    font-family: var(--serif);
    font-size: 17px;
    font-weight: 600;
    margin-right: 10px;
  }
  .nav-tabs {
    display: flex;
    gap: 2px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px;
    box-shadow: var(--shadow-sm);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .nav-tabs::-webkit-scrollbar { display: none; }
  .nav-tab {
    background: transparent;
    border: none;
    padding: 8px 16px;
    border-radius: 999px;
    cursor: pointer;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-dim);
    transition: all 0.15s;
    white-space: nowrap;
  }
  .nav-tab:hover { color: var(--ink); }
  .nav-tab.active {
    background: var(--ink);
    color: #F4F0E8;
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

  /* Mobile: brand + auth share the first row; the tab strip drops to its own
     full-width row with all five tabs evenly spread (no hidden overflow —
     "Progress" used to be silently clipped off the right edge). */
  @media (max-width: 640px) {
    .top-nav-inner { padding: 10px 14px; gap: 10px; }
    .nav-tabs {
      order: 3;
      flex-basis: 100%;
      overflow-x: visible;
    }
    .nav-tab {
      flex: 1;
      text-align: center;
      padding: 8px 2px;
      font-size: 12.5px;
    }
  }
</style>
