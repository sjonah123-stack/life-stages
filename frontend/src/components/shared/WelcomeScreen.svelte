<script lang="ts">
  // First-run onboarding wizard. Shown while the app is in blank-state (no DOB).
  // Collects the context that makes the rest of the app — especially the AI
  // suggestions — feel personal: birthdate, what you do, your situation, and
  // what a meaningful life looks like to you. Everything except DOB is optional
  // and can be edited later in Settings. DOB is committed last so setting it
  // (which exits blank-state and mounts the app) only happens on "Finish".
  import {
    sex, role, careerField, partnership, kids, aspiration, setDOBFromString,
  } from '../../stores/personal';
  import { formatDOB } from '../../utils';

  const today = formatDOB(new Date());

  let step = 1;
  const TOTAL = 3;
  let dobInput = '';

  function next() { if (step < TOTAL) step += 1; }
  function back() { if (step > 1) step -= 1; }

  function finish() {
    if (!dobInput) { step = 1; return; }
    // Commit DOB last — this flips blank-state and mounts the dashboard.
    setDOBFromString(dobInput);
  }
</script>

<section class="welcome-screen">
  <div class="steps" aria-hidden="true">
    {#each Array(TOTAL) as _, i}
      <span class="dot" class:active={i + 1 === step} class:done={i + 1 < step}></span>
    {/each}
  </div>

  {#if step === 1}
    <h1>Your one extraordinary life</h1>
    <p>
      An interactive dashboard that walks through every year of your life — slider, journal,
      milestones, and AI that learns what matters to you. First, when were you born?
    </p>
    <div class="field-stack">
      <label class="wlabel" for="dob-input">Your birthdate</label>
      <input id="dob-input" type="date" bind:value={dobInput} max={today} required />

      <span class="wlabel">You are</span>
      <div class="sex-toggle">
        <button type="button" class:active={$sex === 'female'} on:click={() => sex.set('female')}>Female</button>
        <button type="button" class:active={$sex === 'male'} on:click={() => sex.set('male')}>Male</button>
      </div>
    </div>
    <div class="actions">
      <button class="primary" type="button" on:click={next} disabled={!dobInput}>Continue</button>
    </div>
    <div class="welcome-or">or</div>
    <div class="welcome-signin">
      <span class="accent">Sign in with Google</span> from the top right to load existing data.
    </div>

  {:else if step === 2}
    <h2 class="wtitle">A little about you</h2>
    <p class="wsub">This is what makes your suggestions personal. All optional — edit anytime in Settings.</p>
    <div class="field-stack">
      <label class="wlabel" for="role-input">What you do (in your words)</label>
      <input id="role-input" type="text" bind:value={$role} maxlength="120"
        placeholder="e.g. commercial real estate investor" />

      <label class="wlabel" for="career-input">Career field</label>
      <select id="career-input" bind:value={$careerField}>
        <option value="">—</option>
        <option value="tech">Tech / software</option>
        <option value="medicine">Medicine / healthcare</option>
        <option value="science">Science / research</option>
        <option value="finance">Finance / business</option>
        <option value="arts">Arts / creative</option>
        <option value="athletics">Athletics / sport</option>
        <option value="education">Education / teaching</option>
        <option value="trades">Trades / skilled labor</option>
        <option value="hospitality">Hospitality / service</option>
        <option value="public_service">Public service / nonprofit</option>
        <option value="entrepreneurship">Entrepreneurship</option>
        <option value="other">Other</option>
      </select>

      <div class="two-col">
        <div>
          <label class="wlabel" for="partner-input">Partnership</label>
          <select id="partner-input" bind:value={$partnership}>
            <option value="">—</option>
            <option value="single">Single</option>
            <option value="dating">Dating</option>
            <option value="engaged">Engaged</option>
            <option value="married">Married / partnered</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
        <div>
          <label class="wlabel" for="kids-input">Children</label>
          <input id="kids-input" type="number" bind:value={$kids} min="0" max="12" placeholder="0" />
        </div>
      </div>
    </div>
    <div class="actions">
      <button class="ghost" type="button" on:click={back}>Back</button>
      <button class="primary" type="button" on:click={next}>Continue</button>
    </div>

  {:else}
    <h2 class="wtitle">What are you building toward?</h2>
    <p class="wsub">In ~10 years, what does a meaningful life look like to you? One or two sentences — your AI suggestions will build on it.</p>
    <div class="field-stack">
      <textarea bind:value={$aspiration} rows="4" maxlength="400"
        placeholder="e.g. Financial freedom from my portfolio, present for my kids, still learning."></textarea>
    </div>
    <div class="actions">
      <button class="ghost" type="button" on:click={back}>Back</button>
      <button class="primary" type="button" on:click={finish}>Finish & open my dashboard</button>
    </div>
  {/if}
</section>

<style>
  .welcome-screen {
    max-width: 560px;
    margin: 64px auto 80px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 22px;
    box-shadow: var(--shadow-md);
    padding: 40px 40px 34px;
    text-align: center;
  }
  .steps {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 22px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--border);
    transition: all 0.2s;
  }
  .dot.active { background: var(--accent); transform: scale(1.25); }
  .dot.done { background: var(--accent); opacity: 0.5; }
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
  .wtitle {
    font-family: var(--serif);
    font-size: 30px;
    font-weight: 500;
    margin: 0 0 10px;
    color: var(--ink);
  }
  .welcome-screen p, .wsub {
    color: var(--ink-dim);
    font-size: 16px;
    line-height: 1.55;
    margin: 0 0 22px;
  }
  .wsub { font-size: 14px; }
  .field-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    margin-bottom: 24px;
  }
  .wlabel {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
    margin-top: 6px;
  }
  .two-col {
    display: flex;
    gap: 12px;
  }
  .two-col > div { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .welcome-screen input[type='date'],
  .welcome-screen input[type='text'],
  .welcome-screen input[type='number'],
  .welcome-screen select,
  .welcome-screen textarea {
    background: var(--panel-warm);
    border: 1px solid var(--border);
    color: var(--ink);
    border-radius: 12px;
    padding: 12px 14px;
    font-family: inherit;
    font-size: 15px;
    min-height: 46px;
    width: 100%;
    box-sizing: border-box;
  }
  .welcome-screen textarea { resize: vertical; line-height: 1.45; min-height: 96px; }
  .welcome-screen select { cursor: pointer; }
  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    align-items: center;
  }
  .actions button {
    border: none;
    border-radius: 12px;
    padding: 12px 22px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    min-height: 46px;
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }
  .actions .primary {
    background: linear-gradient(135deg, var(--accent), var(--future-3));
    color: var(--bg-1);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 32%, transparent);
  }
  .actions .primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .actions .primary:disabled { opacity: 0.5; cursor: default; }
  .actions .ghost {
    background: transparent;
    color: var(--ink-dim);
    border: 1px solid var(--border);
  }
  .sex-toggle {
    display: inline-flex;
    background: var(--panel-warm);
    border-radius: 10px;
    padding: 3px;
    border: 1px solid var(--border);
    width: fit-content;
  }
  .sex-toggle button {
    border: none;
    background: transparent;
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-dim);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s;
    font-family: inherit;
  }
  .sex-toggle button.active {
    background: var(--accent);
    color: var(--bg-1);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent);
  }
  .welcome-or {
    margin: 20px 0 14px;
    color: var(--ink-faint);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }
  .welcome-signin { color: var(--ink-dim); font-size: 14px; }
  .welcome-signin :global(.accent) { color: var(--accent); font-weight: 600; }
  .accent { color: var(--accent); font-weight: 600; }
</style>
