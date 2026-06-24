// AI-generated artifacts that are regenerable on demand, so they live in
// localStorage only (not synced to the cloud doc — no point round-tripping
// derived output, and it keeps the user doc lean).
import { persistedJSON } from './persisted';
import type { JournalInsight } from '../lib/ai';

export interface StoredInsight extends JournalInsight {
  generatedAt: number;
}

export const latestInsight = persistedJSON<StoredInsight | null>('aiInsight', null);
