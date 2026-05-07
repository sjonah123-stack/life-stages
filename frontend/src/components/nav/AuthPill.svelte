<script lang="ts">
  import { currentUser, signInWithGoogle, signOut, syncStatus, syncMessage } from '../../stores/auth';
  import { isFirebaseConfigured } from '../../lib/firebase';
  import { escapeHtml } from '../../utils';

  $: configured = isFirebaseConfigured();
  $: user = $currentUser;
  $: avatar = user?.photoURL ?? '';
  $: fullName = user?.displayName ?? user?.email ?? 'You';
  $: firstName = fullName.includes('@') ? fullName.split('@')[0] : fullName.split(' ')[0];
  $: initial = (firstName[0] || 'Y').toUpperCase();
</script>

{#if !configured}
  <!-- Firebase not configured — render nothing. -->
{:else if !user}
  <button class="signin-btn" on:click={signInWithGoogle}>
    <span class="g-icon"></span>Sign in with Google
  </button>
{:else}
  <span class="auth-pill">
    {#if avatar}
      <img src={avatar} alt="" referrerpolicy="no-referrer" />
    {:else}
      <span class="avatar-fallback">{initial}</span>
    {/if}
    <span>{firstName}</span>
    <button class="signout" on:click={signOut} title="Sign out">×</button>
  </span>
{/if}

{#if $syncStatus && $syncMessage}
  <span class="sync-status {$syncStatus}">{$syncMessage}</span>
{/if}

<style>
  .signin-btn {
    background: white;
    color: #3c4043;
    border: 1px solid #dadce0;
    border-radius: 10px;
    padding: 7px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    transition: background 0.15s, box-shadow 0.15s;
  }
  .signin-btn:hover { background: #f8f9fa; box-shadow: 0 1px 3px rgba(60, 64, 67, 0.15); }
  .g-icon {
    width: 18px;
    height: 18px;
    background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='%234285F4' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/><path fill='%2334A853' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/><path fill='%23FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'/><path fill='%23EA4335' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/></svg>") no-repeat center / contain;
  }

  .auth-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--panel-warm);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 12px 4px 4px;
    height: 38px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-dim);
  }
  .auth-pill img,
  .auth-pill .avatar-fallback {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .auth-pill .avatar-fallback {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .auth-pill .signout {
    background: transparent;
    border: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
  }
  .auth-pill .signout:hover { color: var(--love); }

  .sync-status {
    color: var(--ink-faint);
    font-size: 11px;
    font-style: italic;
    align-self: center;
  }
  .sync-status.syncing { color: var(--accent); }
  .sync-status.synced { color: var(--health); }
  .sync-status.error { color: var(--love); }
</style>
