<script lang="ts">
  import { setDOBFromString } from '../../stores/personal';
  import { formatDOB } from '../../utils';

  let dobInput: string = '';
  const today = formatDOB(new Date());

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!dobInput) return;
    setDOBFromString(dobInput);
  }
</script>

<section class="welcome-screen">
  <h1>Your one extraordinary life</h1>
  <p>
    An interactive dashboard that walks through every year of your life — slider, journal,
    photos, milestones. To start, tell us when you were born.
  </p>
  <form class="welcome-form" on:submit={handleSubmit}>
    <input
      type="date"
      bind:value={dobInput}
      max={today}
      required
      aria-label="Your birthdate"
    />
    <button type="submit">Get started</button>
  </form>
  <div class="welcome-or">or</div>
  <div class="welcome-signin">
    <span class="accent">Sign in with Google</span> from the top right to load your existing data.
  </div>
</section>

<style>
  .welcome-screen {
    max-width: 560px;
    margin: 64px auto 80px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 22px;
    box-shadow: var(--shadow-md);
    padding: 44px 40px 36px;
    text-align: center;
  }
  .welcome-screen h1 {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 14px;
    line-height: 1.1;
    background: linear-gradient(135deg, var(--accent) 0%, var(--future-3) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .welcome-screen p {
    color: var(--ink-dim);
    font-size: 16px;
    line-height: 1.55;
    margin: 0 0 22px;
  }
  .welcome-form {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
  }
  .welcome-form input[type='date'] {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    color: var(--ink);
    border-radius: 12px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 16px;
    min-height: 46px;
  }
  .welcome-form button {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 22px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    min-height: 46px;
    box-shadow: 0 4px 14px rgba(255, 140, 97, 0.32);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .welcome-form button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(255, 140, 97, 0.4);
  }
  .welcome-or {
    margin: 20px 0 14px;
    color: var(--ink-faint);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }
  .welcome-signin {
    color: var(--ink-dim);
    font-size: 14px;
  }
  .welcome-signin :global(.accent) { color: var(--accent); font-weight: 600; }
  .accent { color: var(--accent); font-weight: 600; }
</style>
