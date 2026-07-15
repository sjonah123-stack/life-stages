// 5 Types of Wealth — survey questions, wealth metadata, and the curated
// recommendation library. Static content, no runtime dependencies.
import type { WealthKey } from '../types';

export interface SurveyQuestion {
  id: string;          // e.g. 'time-1'
  wealth: WealthKey;
  prompt: string;
}

export interface WealthMeta {
  key: WealthKey;
  label: string;
  description: string;
}

export interface Recommendation {
  id: string;          // stable, e.g. 'time-set-dob' — used for completion tracking
  text: string;
  href: string;        // hash route, e.g. '#/journal'
}

// Union of every concrete recommendation id, derived from RECOMMENDATIONS
// below so adding/renaming an entry there propagates type errors to every
// consumer (toggleRecommendation, completedRecommendations, etc.).
export type RecommendationId =
  (typeof RECOMMENDATIONS)[WealthKey][number]['id'];

// ---- Wealth metadata (rendering order = order in this array) ----

export const WEALTHS: WealthMeta[] = [
  {
    key: 'time',
    label: 'Time Wealth',
    description: 'Freedom over how you spend your time. Presence in your daily life.',
  },
  {
    key: 'social',
    label: 'Social Wealth',
    description: 'The depth and warmth of your relationships. Who you know and how known you are.',
  },
  {
    key: 'mental',
    label: 'Mental Wealth',
    description: 'Mental clarity, learning, and a sense of purpose.',
  },
  {
    key: 'physical',
    label: 'Physical Wealth',
    description: "Your body's health, energy, and resilience.",
  },
  {
    key: 'financial',
    label: 'Financial Wealth',
    description: 'Enough money that it isn\'t a stressor. Building toward freedom.',
  },
];

// ---- 15 survey questions, 3 per wealth ----

export const SURVEY: SurveyQuestion[] = [
  // Time
  { id: 'time-1', wealth: 'time', prompt: 'I have control over how I spend most of my time.' },
  { id: 'time-2', wealth: 'time', prompt: "I'm present and engaged in my daily life rather than rushing through it." },
  { id: 'time-3', wealth: 'time', prompt: 'I feel I have enough time for the things that matter most to me.' },
  { id: 'time-4', wealth: 'time', prompt: 'I rarely reach the end of a day wondering where the time went.' },

  // Social
  { id: 'social-1', wealth: 'social', prompt: 'I have at least three people I could call when I\'m struggling.' },
  { id: 'social-2', wealth: 'social', prompt: 'I see or talk to the people I care about regularly.' },
  { id: 'social-3', wealth: 'social', prompt: 'I feel known and accepted by the people closest to me.' },
  { id: 'social-4', wealth: 'social', prompt: "I'm satisfied with the amount of quality time I spend with people I love." },

  // Mental
  { id: 'mental-1', wealth: 'mental', prompt: 'I feel mentally clear and engaged most days.' },
  { id: 'mental-2', wealth: 'mental', prompt: "I'm regularly learning something that interests me." },
  { id: 'mental-3', wealth: 'mental', prompt: 'I have a sense of purpose and direction in my life.' },
  { id: 'mental-4', wealth: 'mental', prompt: 'I make space for reflection, stillness, or creative thought.' },

  // Physical
  { id: 'physical-1', wealth: 'physical', prompt: 'I feel physically energetic most days.' },
  { id: 'physical-2', wealth: 'physical', prompt: 'My sleep is restorative.' },
  { id: 'physical-3', wealth: 'physical', prompt: 'I move my body in ways that feel good.' },
  { id: 'physical-4', wealth: 'physical', prompt: 'I have the energy outside of work to do the things I enjoy.' },

  // Financial
  { id: 'financial-1', wealth: 'financial', prompt: 'I have enough financial cushion that money is rarely a stressor.' },
  { id: 'financial-2', wealth: 'financial', prompt: "I'm building toward financial freedom (whatever that means to me)." },
  { id: 'financial-3', wealth: 'financial', prompt: 'I spend in ways that align with my values.' },
  { id: 'financial-4', wealth: 'financial', prompt: 'I have a clear picture of where my money goes each month.' },
];

export const LIKERT_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Strongly disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly agree',
};

// ---- Recommendation library — surfaced when score < 60 ----

export const RECOMMENDATIONS = {
  time: [
    { id: 'time-set-dob', text: 'Set your birthdate so the timeline can anchor to it.', href: '#/settings' },
    { id: 'time-add-milestones', text: 'Add 3 milestones you\'re looking forward to.', href: '#/goals' },
    { id: 'time-journal-streak', text: 'Start a 7-day journal streak.', href: '#/journal' },
  ],
  social: [
    { id: 'social-add-ritual', text: 'Add an annual ritual that matters to you.', href: '#/goals' },
    { id: 'social-journal-relationships', text: 'Journal about a relationship worth nurturing.', href: '#/journal' },
    { id: 'social-future-letter', text: 'Write a future letter to someone you care about.', href: '#/journal' },
  ],
  mental: [
    { id: 'mental-first-entry', text: 'Write your first journal entry.', href: '#/journal' },
    { id: 'mental-log-books', text: 'Log 3 books you\'ve read recently.', href: '#/reading' },
    { id: 'mental-future-letter', text: 'Write a letter from your 60-year-old self.', href: '#/journal' },
  ],
  physical: [
    { id: 'physical-lifestyle', text: 'Fill in your lifestyle inputs (sleep, exercise, smoking).', href: '#/settings' },
    { id: 'physical-mood-track', text: 'Track your weekly mood for 4 weeks to spot patterns.', href: '#/journal' },
    { id: 'physical-longevity', text: 'Set your family longevity for a personalized horizon.', href: '#/settings' },
  ],
  financial: [
    { id: 'financial-career', text: 'Pick your career field.', href: '#/settings' },
    { id: 'financial-track', text: 'Add a monthly net-worth check-in.', href: '#/finance' },
    { id: 'financial-goal', text: 'Set a savings goal you\'re working toward.', href: '#/finance' },
    { id: 'financial-give', text: 'Log a charitable gift this year.', href: '#/finance' },
  ],
} as const satisfies Record<WealthKey, readonly Recommendation[]>;

// ---- Score computation from survey answers ----

export function computeSelfScores(answers: { questionId: string; value: number }[]): Record<WealthKey, number> {
  const sums: Record<WealthKey, number> = { time: 0, social: 0, mental: 0, physical: 0, financial: 0 };
  const counts: Record<WealthKey, number> = { time: 0, social: 0, mental: 0, physical: 0, financial: 0 };
  for (const a of answers) {
    const q = SURVEY.find((q) => q.id === a.questionId);
    if (!q) continue;
    sums[q.wealth] += a.value;
    counts[q.wealth] += 1;
  }
  // Normalize each wealth by its actual answered-question count (scale 1-5 →
  // max = count × 5) so the survey can carry any number of questions per wealth
  // without skewing scores. Was hardcoded /15 (3 questions); now count-driven.
  const result: Record<WealthKey, number> = { time: 0, social: 0, mental: 0, physical: 0, financial: 0 };
  for (const key of Object.keys(sums) as WealthKey[]) {
    if (counts[key] === 0) continue;
    result[key] = Math.round((sums[key] / (counts[key] * 5)) * 100);
  }
  return result;
}
