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

async function runStructured(schema: Schema, prompt: string): Promise<unknown> {
  const model = getGenerativeModel(aiBackend(), {
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
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
    },
  }),
});

interface RawAiMilestone { label?: unknown; measure?: unknown; age?: unknown; why?: unknown; wealthKey?: unknown; }

// Everything the prompt can use to personalize suggestions. Only `stage` and
// `currentAge` are required; the rest are best-effort context pulled from the
// user's profile. The more that's present, the less generic the output.
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
  if (ctx.weakestWealth) {
    facts.push(`Their weakest wealth dimension is ${ctx.weakestWealth}; at least one suggestion should help there.`);
  }
  if (facts.length) lines.push('About this person: ' + facts.join(' '));

  if (ctx.existingMilestones?.length) {
    lines.push(
      'They already have these goals — do NOT repeat or rephrase them; complement them and fill gaps: ' +
      ctx.existingMilestones.map((m) => `"${m}"`).join(', ') + '.',
    );
  }

  lines.push(
    'Suggest exactly 3 milestones specific to THIS person — not generic advice that could apply to anyone. ' +
    'Build on their actual role, relationships, and aspirations.',
  );
  lines.push(
    'For each: label (specific, under 8 words), measure (how they know it is done), ' +
    `age (an integer strictly greater than ${currentAge} and at most ${LIFESPAN}), ` +
    'why (one grounded sentence tied to their context), and ' +
    'wealthKey (one of: time, social, mental, physical, financial).',
  );
  lines.push(
    `Good example: {"label":"Mentor two juniors","measure":"both lead a shipped project","age":${currentAge + 2},` +
    '"why":"deepens your leadership in the work you already do","wealthKey":"mental"}.',
  );
  lines.push('Avoid vague platitudes and goals unrelated to their stated life.');
  return lines.join(' ');
}

// Validate/clamp the model's output into real Milestone objects. Drops anything
// malformed; keeps at most 3. wealthKey is only kept when it's one of the 5
// valid keys (so the existing untyped callers/tests stay unaffected).
export function normalizeAiMilestones(raw: unknown, currentAge: number): Milestone[] {
  if (!Array.isArray(raw)) return [];
  const out: Milestone[] = [];
  for (const item of raw as RawAiMilestone[]) {
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    if (!label) continue;
    let age = Math.round(Number(item?.age));
    if (!Number.isFinite(age)) age = currentAge + 1;
    age = Math.min(LIFESPAN, Math.max(currentAge + 1, age));
    const wealthKey =
      typeof item?.wealthKey === 'string' && WEALTH_KEYS.includes(item.wealthKey as WealthKey)
        ? (item.wealthKey as WealthKey)
        : undefined;
    out.push({
      age,
      label,
      completed: false,
      measure: typeof item?.measure === 'string' ? item.measure.trim() : undefined,
      why: typeof item?.why === 'string' ? item.why.trim() : undefined,
      ...(wealthKey ? { wealthKey } : {}),
    });
    if (out.length === 3) break;
  }
  return out;
}

export async function suggestMilestones(ctx: MilestoneContext): Promise<Milestone[]> {
  const raw = await runStructured(MILESTONE_SCHEMA, milestonePrompt(ctx));
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
