// Firebase AI Logic (Gemini) — client-side AI features.
//
// The model returns JSON matching an explicit Schema, so we get structured data
// rather than free text to parse. The prompt-builders and output-normalizers
// are pure and unit-tested; the network call is a thin wrapper. AI output is
// never trusted blindly — every result is validated/clamped before use, and
// stored in its own place (never the snapshots backup buffer).
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { getFirebase } from './firebase';
import { GEMINI_MODEL } from '../config';
import { LIFESPAN } from '../config';
import type { Milestone, WealthKey } from '../types';

let aiInstance: ReturnType<typeof getAI> | null = null;
function aiBackend() {
  const { app } = getFirebase();
  if (!app) throw new Error('Firebase is not configured.');
  // Gemini Developer API backend. It currently serves gemini-3.5-flash (Vertex
  // does not). Billed via the Gemini API on AI Studio — enable pay-as-you-go
  // there (links to the project's Cloud billing) so calls aren't rejected once
  // free credits are exhausted.
  if (!aiInstance) aiInstance = getAI(app, { backend: new GoogleAIBackend() });
  return aiInstance;
}

async function runStructured(
  schema: Schema,
  prompt: string,
  temperature?: number,
): Promise<unknown> {
  const model = getGenerativeModel(aiBackend(), {
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      ...(temperature !== undefined ? { temperature } : {}),
    },
  });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return JSON.parse(result.response.text());
}

// ---- Milestone suggestions ----

const WEALTH_KEYS: readonly WealthKey[] = ['time', 'social', 'mental', 'physical', 'financial'];

const MILESTONE_SCHEMA = Schema.array({
  items: Schema.object({
    properties: {
      label: Schema.string(),
      measure: Schema.string(),
      age: Schema.integer(),
      why: Schema.string(),
      wealthKey: Schema.string(),
      // Grounding: the exact context fact this suggestion grew from. Forces
      // the model to build on the person's real life instead of inventing a
      // persona; the UI shows it as provenance.
      basedOn: Schema.string(),
    },
  }),
});

interface RawAiMilestone {
  label?: unknown; measure?: unknown; age?: unknown; why?: unknown;
  wealthKey?: unknown; basedOn?: unknown;
}

// Everything the prompt can use to personalize suggestions. Only `stage` and
// `currentAge` are required; the rest are best-effort context pulled from the
// user's profile AND their actual activity in the app — evidence of what they
// really do is what keeps suggestions from becoming motivational-poster
// fantasy.
export interface MilestoneContext {
  stage: string;
  currentAge: number;
  role?: string;            // user's own words for what they do
  careerField?: string;     // fallback if no free-text role
  partnership?: string;
  kids?: number;
  aspiration?: string;      // what a meaningful life looks like ~10y out
  priorities?: string[];    // areas they care most about right now
  weakestWealth?: string;   // label of their lowest wealth dimension
  existingMilestones?: string[]; // labels of goals they already have
  completedMilestones?: string[]; // goals they finished — follow-through evidence
  habits?: string[];        // active daily habits — what they actually practice
  recentBooks?: string[];   // recently logged books
  recentJournal?: string[]; // short snippets from recent entries
}

// Build a personalized milestone prompt. The whole point is to feed the model
// the user's actual context so it stops suggesting generic, irrelevant goals
// (e.g. "become a software engineer" to someone in an unrelated field).
export function milestonePrompt(ctx: MilestoneContext): string {
  const { stage, currentAge } = ctx;
  const lines: string[] = [];
  lines.push(
    'You help someone set meaningful, personal life goals using the SMART framework, ' +
    'grounded in the "5 Types of Wealth": time, social, mental, physical, financial.',
  );
  lines.push(`They are ${currentAge} years old, in the life stage: "${stage}".`);

  const facts: string[] = [];
  if (ctx.role) facts.push(`What they do: ${ctx.role}.`);
  else if (ctx.careerField) facts.push(`Career field: ${ctx.careerField}.`);
  if (ctx.partnership) facts.push(`Relationship status: ${ctx.partnership}.`);
  if (typeof ctx.kids === 'number' && ctx.kids > 0) {
    facts.push(`They have ${ctx.kids} ${ctx.kids === 1 ? 'child' : 'children'}.`);
  }
  if (ctx.aspiration) facts.push(`In ~10 years, a meaningful life to them looks like: ${ctx.aspiration}.`);
  if (ctx.priorities?.length) facts.push(`They care most right now about: ${ctx.priorities.join(', ')}.`);
  if (ctx.habits?.length) facts.push(`Daily habits they actually keep: ${ctx.habits.join(', ')}.`);
  if (ctx.recentBooks?.length) facts.push(`Books they read recently: ${ctx.recentBooks.join(', ')}.`);
  if (ctx.completedMilestones?.length) {
    facts.push(`Goals they have already completed: ${ctx.completedMilestones.join(', ')}.`);
  }
  if (ctx.weakestWealth) {
    facts.push(`Their weakest wealth dimension is ${ctx.weakestWealth}; at least one suggestion should help there.`);
  }
  if (facts.length) lines.push('Known facts about this person: ' + facts.join(' '));
  if (ctx.recentJournal?.length) {
    lines.push(
      'Fragments from their recent journal, in their own words: ' +
      ctx.recentJournal.map((t) => `"${t}"`).join(' / ') + '.',
    );
  }

  if (ctx.existingMilestones?.length) {
    lines.push(
      'They already have these goals — do NOT repeat or rephrase them; complement them and fill gaps: ' +
      ctx.existingMilestones.map((m) => `"${m}"`).join(', ') + '.',
    );
  }

  const maxAge = Math.min(currentAge + 5, LIFESPAN);
  lines.push(
    'Suggest exactly 3 milestones. Hard rules: ' +
    '1) Every suggestion must grow out of one of the facts above — quote that fact in basedOn. ' +
    'If the facts are thin, suggest small discovery-sized goals rather than inventing a personality. ' +
    `2) Near-term: age between ${currentAge + 1} and ${maxAge}, and something they could take a first step on this month. ` +
    '3) Calibrate ambition to evidence — extend what they already do by one honest notch. ' +
    'Someone who meditates daily might aim for a weekend retreat; never tell someone with no running habit to run a marathon. ' +
    '4) Banned unless the facts explicitly support them: marathons, writing a book, starting a business, ' +
    'learning a new language, visiting N countries, "financial freedom", and any goal that amounts to becoming a different person. ' +
    '5) The measure must be something the person can count or verify themselves.',
  );
  lines.push(
    'For each: label (specific, under 8 words), measure (how they will know it is done), ' +
    `age (an integer strictly greater than ${currentAge} and at most ${maxAge}), ` +
    'why (one grounded sentence tied to their context), ' +
    'wealthKey (one of: time, social, mental, physical, financial), and ' +
    'basedOn (the fact this grows from, quoted or closely paraphrased).',
  );
  lines.push(
    `Good example: {"label":"Host a monthly dinner for four","measure":"six dinners hosted this year","age":${currentAge + 1},` +
    '"why":"turns the friendships you keep writing about into a standing ritual","wealthKey":"social",' +
    '"basedOn":"journal mentions missing college friends"}. ' +
    'Bad example: {"label":"Run a marathon"} — nothing in the facts involves running; that is a poster, not a plan.',
  );
  lines.push(
    'Tone: grounded, modest, human. If a suggestion would look at home on a motivational poster, replace it.',
  );
  return lines.join(' ');
}

// A suggestion is a Milestone plus its grounding fact (shown as provenance
// in the UI, stripped before the milestone is stored).
export interface AiMilestoneSuggestion extends Milestone {
  basedOn?: string;
}

// Validate/clamp the model's output into real Milestone objects. Drops anything
// malformed; keeps at most 3; ages clamp into the near-term window the prompt
// demands (+1..+5 years). wealthKey is only kept when it's one of the 5 valid
// keys (so the existing untyped callers/tests stay unaffected).
export function normalizeAiMilestones(raw: unknown, currentAge: number): AiMilestoneSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const maxAge = Math.min(currentAge + 5, LIFESPAN);
  const out: AiMilestoneSuggestion[] = [];
  for (const item of raw as RawAiMilestone[]) {
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    if (!label) continue;
    let age = Math.round(Number(item?.age));
    if (!Number.isFinite(age)) age = currentAge + 1;
    age = Math.min(maxAge, Math.max(currentAge + 1, age));
    const wealthKey =
      typeof item?.wealthKey === 'string' && WEALTH_KEYS.includes(item.wealthKey as WealthKey)
        ? (item.wealthKey as WealthKey)
        : undefined;
    const basedOn = typeof item?.basedOn === 'string' ? item.basedOn.trim() : '';
    out.push({
      age,
      label,
      completed: false,
      measure: typeof item?.measure === 'string' ? item.measure.trim() : undefined,
      why: typeof item?.why === 'string' ? item.why.trim() : undefined,
      ...(wealthKey ? { wealthKey } : {}),
      ...(basedOn ? { basedOn } : {}),
    });
    if (out.length === 3) break;
  }
  return out;
}

export async function suggestMilestones(ctx: MilestoneContext): Promise<AiMilestoneSuggestion[]> {
  // Lower temperature than default — suggestions should be grounded and
  // repeatable-ish, not creative writing.
  const raw = await runStructured(MILESTONE_SCHEMA, milestonePrompt(ctx), 0.7);
  return normalizeAiMilestones(raw, ctx.currentAge);
}

// ---- Journal insights ----

const INSIGHT_SCHEMA = Schema.object({
  properties: {
    themes: Schema.array({ items: Schema.string() }),
    reflection: Schema.string(),
  },
});

export interface JournalInsight { themes: string[]; reflection: string; }

export function journalInsightPrompt(entries: string[]): string {
  const body = entries
    .slice(-30)
    .map((t, i) => `Entry ${i + 1}: ${t.replace(/\s+/g, ' ').trim()}`)
    .join('\n');
  return [
    'Below are recent journal entries from one person.',
    'Identify up to 4 recurring themes (short noun phrases) and write a warm,',
    'non-judgemental 2–3 sentence reflection that names a pattern worth noticing.',
    'Do not invent facts not present in the entries.\n\n' + body,
  ].join(' ');
}

export function normalizeInsight(raw: unknown): JournalInsight {
  const r = (raw ?? {}) as { themes?: unknown; reflection?: unknown };
  const themes = Array.isArray(r.themes)
    ? r.themes.filter((t): t is string => typeof t === 'string' && t.trim() !== '').slice(0, 4)
    : [];
  const reflection = typeof r.reflection === 'string' ? r.reflection.trim() : '';
  return { themes, reflection };
}

export async function analyzeJournal(entries: string[]): Promise<JournalInsight> {
  const raw = await runStructured(INSIGHT_SCHEMA, journalInsightPrompt(entries));
  return normalizeInsight(raw);
}

// ---- Reflective prompts ----

const PROMPTS_SCHEMA = Schema.array({ items: Schema.string() });

export function reflectivePromptsPrompt(stage: string, recent: string[]): string {
  const context = recent.length
    ? ` Recent entries touched on: ${recent.slice(-5).map((t) => t.slice(0, 120)).join(' / ')}.`
    : '';
  return [
    `Write 3 short, open-ended journaling prompts for someone in the life stage "${stage}".`,
    'Each is one sentence, invites honest reflection, and is gently specific — not generic.',
    context,
  ].join(' ');
}

export function normalizePrompts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .map((p) => p.trim())
    .slice(0, 3);
}

export async function generatePrompts(stage: string, recent: string[]): Promise<string[]> {
  const raw = await runStructured(PROMPTS_SCHEMA, reflectivePromptsPrompt(stage, recent));
  return normalizePrompts(raw);
}

// ---- Weekly reflection ----
// A short, personal weekly check-in across journal + habits + wealth balance,
// with one concrete focus for the week ahead. Like journal insights, the output
// is regenerable and stored locally (never in the cloud doc / snapshots buffer).

const WEEKLY_SCHEMA = Schema.object({
  properties: {
    reflection: Schema.string(),
    focus: Schema.string(),
    wealthKey: Schema.string(),
  },
});

export interface WeeklyReflection {
  reflection: string;
  focus: string;
  wealthKey?: WealthKey;
}

export interface WeeklyContext {
  stage: string;
  recentEntries: string[];    // recent journal text (most recent last)
  habitCheckins: number;      // count of habit check-ins in the last 7 days
  weakestWealth?: string;     // label of the lowest wealth dimension
}

export function weeklyReflectionPrompt(ctx: WeeklyContext): string {
  const lines: string[] = [];
  lines.push(
    'You are a warm, grounded weekly check-in for one person, framed around the ' +
    '"5 Types of Wealth" (time, social, mental, physical, financial). Be specific and ' +
    'non-judgemental; never invent facts not present below.',
  );
  lines.push(`They are in the life stage: "${ctx.stage}".`);
  lines.push(`In the last 7 days they logged ${ctx.habitCheckins} habit check-in(s).`);
  if (ctx.weakestWealth) lines.push(`Their lowest wealth dimension right now is ${ctx.weakestWealth}.`);
  if (ctx.recentEntries.length) {
    const body = ctx.recentEntries
      .slice(-8)
      .map((t, i) => `Entry ${i + 1}: ${t.replace(/\s+/g, ' ').trim()}`)
      .join('\n');
    lines.push('Recent journal entries:\n' + body);
  } else {
    lines.push('They have not journaled recently.');
  }
  lines.push(
    'Write: reflection (2-3 warm sentences naming a real pattern from the week), ' +
    'focus (one concrete, doable focus for the coming week), and ' +
    'wealthKey (which of time/social/mental/physical/financial the focus serves).',
  );
  return lines.join(' ');
}

export function normalizeWeeklyReflection(raw: unknown): WeeklyReflection {
  const r = (raw ?? {}) as { reflection?: unknown; focus?: unknown; wealthKey?: unknown };
  const reflection = typeof r.reflection === 'string' ? r.reflection.trim() : '';
  const focus = typeof r.focus === 'string' ? r.focus.trim() : '';
  const wealthKey =
    typeof r.wealthKey === 'string' && WEALTH_KEYS.includes(r.wealthKey as WealthKey)
      ? (r.wealthKey as WealthKey)
      : undefined;
  return { reflection, focus, ...(wealthKey ? { wealthKey } : {}) };
}

export async function reflectOnWeek(ctx: WeeklyContext): Promise<WeeklyReflection> {
  const raw = await runStructured(WEEKLY_SCHEMA, weeklyReflectionPrompt(ctx));
  return normalizeWeeklyReflection(raw);
}

// ---- Budget coach ----
// Reviews the user's logged months of cash flow (numbers only — no notes,
// no recipients) and suggests a concrete improvement plan. Regenerable,
// cached locally like the other AI artifacts.

const BUDGET_ADVICE_SCHEMA = Schema.object({
  properties: {
    observations: Schema.array({ items: Schema.string() }),
    recommendations: Schema.array({
      items: Schema.object({
        properties: {
          category: Schema.string(),
          advice: Schema.string(),
        },
      }),
    }),
    suggestedPlan: Schema.array({
      items: Schema.object({
        properties: {
          category: Schema.string(),
          amount: Schema.integer(),
        },
      }),
    }),
  },
});

export interface BudgetAdvice {
  observations: string[];
  recommendations: { category: string; advice: string }[];
  suggestedPlan: { category: string; amount: number }[];
}

export interface BudgetMonthSummary {
  month: string; // 'YYYY-MM'
  income: number;
  expenses: number;
  categories: { category: string; total: number }[];
}

export interface BudgetContext {
  months: BudgetMonthSummary[]; // oldest first, only months with data
  expectedIncome?: number;
  budget?: { category: string; amount: number }[]; // current plan, if set
  savingsGoal?: { label: string; target: number; saved: number };
}

export function budgetCoachPrompt(ctx: BudgetContext): string {
  const lines: string[] = [];
  lines.push(
    'You are a practical, non-judgemental budget coach for one person. ' +
    'Only use the numbers below — never invent amounts or categories. ' +
    'Dollar amounts are USD per month.',
  );
  for (const m of ctx.months.slice(-6)) {
    const cats = m.categories.map((c) => `${c.category} $${Math.round(c.total)}`).join(', ');
    lines.push(
      `Month ${m.month}: income $${Math.round(m.income)}, spent $${Math.round(m.expenses)}` +
      (cats ? ` (${cats})` : '') + '.',
    );
  }
  if (ctx.expectedIncome) lines.push(`They expect about $${Math.round(ctx.expectedIncome)} of income per month.`);
  if (ctx.budget?.length) {
    lines.push(
      'Their current budget targets: ' +
      ctx.budget.map((b) => `${b.category} $${Math.round(b.amount)}`).join(', ') + '.',
    );
  }
  if (ctx.savingsGoal) {
    lines.push(
      `They are saving toward "${ctx.savingsGoal.label}" ($${Math.round(ctx.savingsGoal.saved)} of ` +
      `$${Math.round(ctx.savingsGoal.target)} so far). "Savings" is a budget category — money set aside counts there.`,
    );
  }
  lines.push(
    'Write: observations (2-3 short sentences naming real patterns in the numbers), ' +
    'recommendations (2-4 items, each with the category it targets and one specific, doable change), ' +
    'and suggestedPlan (a monthly dollar target per spending category they actually use, ' +
    'including Savings, that adds up to less than their income).',
  );
  return lines.join('\n');
}

export function normalizeBudgetAdvice(raw: unknown): BudgetAdvice {
  const r = (raw ?? {}) as {
    observations?: unknown;
    recommendations?: unknown;
    suggestedPlan?: unknown;
  };
  const observations = Array.isArray(r.observations)
    ? r.observations
        .filter((o): o is string => typeof o === 'string' && o.trim() !== '')
        .map((o) => o.trim())
        .slice(0, 3)
    : [];
  const recommendations = Array.isArray(r.recommendations)
    ? r.recommendations
        .map((item) => {
          const it = (item ?? {}) as { category?: unknown; advice?: unknown };
          const category = typeof it.category === 'string' ? it.category.trim() : '';
          const advice = typeof it.advice === 'string' ? it.advice.trim() : '';
          return category && advice ? { category, advice } : null;
        })
        .filter((x): x is { category: string; advice: string } => x !== null)
        .slice(0, 4)
    : [];
  const suggestedPlan = Array.isArray(r.suggestedPlan)
    ? r.suggestedPlan
        .map((item) => {
          const it = (item ?? {}) as { category?: unknown; amount?: unknown };
          const category = typeof it.category === 'string' ? it.category.trim() : '';
          const amount = Math.round(Number(it.amount));
          return category && Number.isFinite(amount) && amount > 0
            ? { category, amount }
            : null;
        })
        .filter((x): x is { category: string; amount: number } => x !== null)
        .slice(0, 12)
    : [];
  return { observations, recommendations, suggestedPlan };
}

export async function adviseOnBudget(ctx: BudgetContext): Promise<BudgetAdvice> {
  const raw = await runStructured(BUDGET_ADVICE_SCHEMA, budgetCoachPrompt(ctx));
  return normalizeBudgetAdvice(raw);
}
