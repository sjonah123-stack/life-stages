<script lang="ts">
  import { letters } from '../../stores/collections';

  type LetterAge = 40 | 60 | 80;
  const ages: { age: LetterAge; tagline: string; placeholder: string }[] = [
    {
      age: 40,
      tagline: "what you'd want yourself to know",
      placeholder:
        "Hey, you. Here's what's been worth it. Here's what didn't matter as much as it felt like. Here's what I wish I'd known sooner...",
    },
    {
      age: 60,
      tagline: "what's mattered most",
      placeholder:
        "Halfway through this third act. The people who've stuck around. The work that aged well. What I'd tell you to keep going on...",
    },
    {
      age: 80,
      tagline: 'looking back at the whole thing',
      placeholder:
        "Now I can see the shape of it. The chapters. What was a gift. What I'd do again...",
    },
  ];

  function meta(age: LetterAge): string {
    const t = $letters[age];
    return t ? `${t.length} chars` : 'empty';
  }

  function setLetter(age: LetterAge, val: string) {
    letters.update((l) => {
      const next = { ...l };
      if (val) next[age] = val;
      else delete next[age];
      return next;
    });
  }
</script>

<div class="future-letters">
  <h2>Letters from your future self</h2>
  <p class="sub">
    Write notes from the version of you at 40, 60, and 80 — back to where you are now. They'll
    surface when you slide to those ages on the Today page. Saved on this device only. 🔒
  </p>
  {#each ages as a}
    <details class="letter-block">
      <summary>
        <span><span class="age-label">At {a.age}</span> — {a.tagline}</span>
        <span class="letter-meta">{meta(a.age)}</span>
      </summary>
      <textarea
        placeholder={a.placeholder}
        value={$letters[a.age] ?? ''}
        on:input={(e) => setLetter(a.age, (e.target as HTMLTextAreaElement).value)}
      ></textarea>
    </details>
  {/each}
</div>

<style>
  .future-letters {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 26px 28px;
    margin-top: 24px;
    box-shadow: var(--shadow-sm);
  }
  h2 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
  }
  .sub {
    color: var(--ink-dim);
    margin: 0 0 16px;
    font-size: 14px;
    line-height: 1.5;
  }
  .letter-block {
    margin-bottom: 12px;
    padding: 14px 16px;
    background: var(--panel-warm);
    border-radius: 12px;
  }
  summary {
    cursor: pointer;
    font-weight: 700;
    font-size: 15px;
    color: var(--ink);
    display: flex;
    justify-content: space-between;
    align-items: center;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  .age-label { color: var(--accent); font-weight: 800; }
  .letter-meta {
    color: var(--ink-faint);
    font-size: 11px;
    font-weight: 600;
  }
  textarea {
    width: 100%;
    min-height: 100px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink);
    resize: vertical;
    margin-top: 10px;
  }
  textarea:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
