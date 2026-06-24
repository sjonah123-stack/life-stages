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
import type { Milestone } from '../types';

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

const MILESTONE_SCHEMA = Schema.array({
  items: Schema.object({
    properties: {
      label: Schema.string(),
      measure: Schema.string(),
      age: Schema.integer(),
      why: Schema.string(),
    },
  }),
});

interface RawAiMilestone { label?: unknown; measure?: unknown; age?: unknown; why?: unknown; }

export function milestonePrompt(stage: string, currentAge: number): string {
  return [
    'You help someone set life goals using the SMART framework.',
    `They are ${currentAge} years old, in the life stage: "${stage}".`,
    'Suggest exactly 3 meaningful, positive, achievable milestones for the years ahead.',
    'For each: label (specific, under 8 words), measure (how they know it is done),',
    `age (an integer target age strictly greater than ${currentAge} and at most ${LIFESPAN}),`,
    'why (one sentence on why it matters). Be grounded and personal, not generic platitudes.',
  ].join(' ');
}

// Validate/clamp the model's output into real Milestone objects. Drops anything
// malformed; keeps at most 3.
export function normalizeAiMilestones(raw: unknown, currentAge: number): Milestone[] {
  if (!Array.isArray(raw)) return [];
  const out: Milestone[] = [];
  for (const item of raw as RawAiMilestone[]) {
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    if (!label) continue;
    let age = Math.round(Number(item?.age));
    if (!Number.isFinite(age)) age = currentAge + 1;
    age = Math.min(LIFESPAN, Math.max(currentAge + 1, age));
    out.push({
      age,
      label,
      completed: false,
      measure: typeof item?.measure === 'string' ? item.measure.trim() : undefined,
      why: typeof item?.why === 'string' ? item.why.trim() : undefined,
    });
    if (out.length === 3) break;
  }
  return out;
}

export async function suggestMilestones(stage: string, currentAge: number): Promise<Milestone[]> {
  const raw = await runStructured(MILESTONE_SCHEMA, milestonePrompt(stage, currentAge));
  return normalizeAiMilestones(raw, currentAge);
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
