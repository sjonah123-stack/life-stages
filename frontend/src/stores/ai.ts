// AI-generated artifacts that are regenerable on demand, so they live in
// localStorage only (not synced to the cloud doc — no point round-tripping
// derived output, and it keeps the user doc lean).
import { persistedJSON } from './persisted';
import type { JournalInsight, WeeklyReflection, BudgetAdvice } from '../lib/ai';

export interface StoredInsight extends JournalInsight {
  generatedAt: number;
}

export const latestInsight = persistedJSON<StoredInsight | null>('aiInsight', null);

export interface StoredWeeklyReflection extends WeeklyReflection {
  generatedAt: number;
}

export const latestWeeklyReflection =
  persistedJSON<StoredWeeklyReflection | null>('aiWeekly', null);

export interface StoredBudgetAdvice extends BudgetAdvice {
  generatedAt: number;
}

export const latestBudgetAdvice =
  persistedJSON<StoredBudgetAdvice | null>('aiBudgetAdvice', null);
