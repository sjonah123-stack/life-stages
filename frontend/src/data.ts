// Stage data, prompts, and reference tables.
// Mirrored from the legacy single-file build, now typed. The per-stage
// dimension content (career/love/health/money/growth/goodNews) was removed
// with the Today-page de-bloat — stages are now just the timeline labels.
import type { Country, CountryNote, Relation, Stage } from './types';

// ---- Country-specific ----
export const COUNTRY_NOTES: Partial<Record<Country, CountryNote>> = {
  US: { lifeExp: { male: 76, female: 81 }, retireMedian: 64 },
  CA: { lifeExp: { male: 80, female: 84 }, retireMedian: 64 },
  UK: { lifeExp: { male: 79, female: 83 }, retireMedian: 65 },
  AU: { lifeExp: { male: 81, female: 85 }, retireMedian: 65 },
  DE: { lifeExp: { male: 78, female: 83 }, retireMedian: 64 },
  FR: { lifeExp: { male: 79, female: 85 }, retireMedian: 62 },
  JP: { lifeExp: { male: 81, female: 87 }, retireMedian: 69 },
  IN: { lifeExp: { male: 70, female: 73 }, retireMedian: 60 },
  BR: { lifeExp: { male: 73, female: 79 }, retireMedian: 62 },
  MX: { lifeExp: { male: 73, female: 78 }, retireMedian: 65 },
};

export const RELATION_LABEL: Partial<Record<Exclude<Relation, ''>, string>> = {
  parent: 'Parent', sibling: 'Sibling', partner: 'Partner', child: 'Child',
  grandparent: 'Grandparent', grandchild: 'Grandchild',
  friend: 'Friend', mentor: 'Mentor', other: 'Other'
};

// ---- Writing prompts ----
export const PROMPTS: string[] = [
  "Who made you laugh this week?",
  "What surprised you?",
  "Something small that mattered?",
  "What did you learn?",
  "Who do you want to thank?",
  "What's been on your mind lately?",
  "A moment you wish you could keep?",
  "What did you avoid?",
  "When did you feel most yourself?",
  "What are you reading or thinking about?",
  "What's one thing you're proud of?",
  "Who reached out to you recently?",
  "What did you eat that was good?",
  "What music has been with you?",
  "A photo you wish you'd taken?",
  "What was hard?",
  "What was easy that wasn't always?",
  "Where did you go that felt new?",
  "What did your body need this week?",
  "Something you said no to?",
  "Something you said yes to?",
  "What do you hope for next week?",
  "Who do you miss?",
  "What's making you nervous?",
  "What's making you grateful?",
  "Did you make anyone's day?",
  "Did anyone make yours?",
  "What would your future self thank you for?",
  "What did you notice in a stranger?",
  "What do you want to remember about right now?"
];

// ---- Stages ----
export const STAGES: Stage[] = [
  { range: [0, 2], name: "Spark", poetic: "Pure beginning. Everything is new." },
  { range: [3, 5], name: "Wonder", poetic: "The age when imagination is a superpower." },
  { range: [6, 12], name: "Adventure", poetic: "The healthiest, most resilient decade you'll have." },
  { range: [13, 17], name: "Becoming", poetic: "Finding out who you are by trying everything on." },
  { range: [18, 22], name: "Launching", poetic: "The world cracks open. So do you." },
  { range: [23, 29], name: "Building", poetic: "The decade where compounding starts to show." },
  { range: [30, 39], name: "Flourishing", poetic: "When 'who am I' becomes 'what do I want?'" },
  { range: [40, 49], name: "Hitting your stride", poetic: "Mastery, leverage, and a clearer voice." },
  { range: [50, 59], name: "Harvesting", poetic: "What you've built starts paying real dividends." },
  { range: [60, 69], name: "Reinvention", poetic: "The data says these may be your happiest years." },
  { range: [70, 79], name: "Wisdom years", poetic: "The view is wider, and surprisingly bright." },
  { range: [80, 100], name: "The long view", poetic: "If you make it here, you've already won something rare." },
];

export function getStage(age: number): Stage {
  return STAGES.find(s => age >= s.range[0] && age <= s.range[1]) ?? STAGES[STAGES.length - 1];
}

let lastPromptIdx = -1;
export function pickPrompt(): string {
  if (PROMPTS.length === 0) return '';
  let idx: number;
  do { idx = Math.floor(Math.random() * PROMPTS.length); }
  while (PROMPTS.length > 1 && idx === lastPromptIdx);
  lastPromptIdx = idx;
  return PROMPTS[idx];
}
