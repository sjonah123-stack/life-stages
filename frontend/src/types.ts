// Domain types for the whole app. Single source of truth — every store,
// component, and Firestore payload references these.

// ---- Personal / config ----
export type Sex = 'female' | 'male';

export type Theme = 'sunrise' | 'ocean' | 'forest';

export type Country =
  | 'US' | 'CA' | 'UK' | 'AU' | 'DE' | 'FR' | 'JP' | 'IN' | 'BR' | 'MX' | 'OTHER' | '';

export type Partnership =
  | 'single' | 'dating' | 'engaged' | 'married' | 'divorced' | 'widowed' | '';

export type CareerField =
  | 'tech' | 'medicine' | 'science' | 'finance' | 'arts' | 'athletics'
  | 'education' | 'trades' | 'hospitality' | 'public_service' | 'entrepreneurship' | 'other' | '';

export type Smoking = 'never' | 'quit' | 'current' | '';
export type ExerciseLevel = 'never' | 'sometimes' | 'regularly' | 'often' | '';

export type Relation =
  | 'parent' | 'sibling' | 'partner' | 'child'
  | 'grandparent' | 'grandchild' | 'friend' | 'mentor' | 'other' | '';

export type Mood = '' | '😞' | '😕' | '😐' | '🙂' | '😄';

export type DimensionKey = 'career' | 'love' | 'health' | 'money' | 'growth';

// Date stored as 'YYYY-MM-DD' string (parses through parseDOB / formatDOB).
export type DateString = string;

// ---- Journal ----
export interface JournalEntry {
  text: string;
  photo: string; // base64 data URL or '' when no photo
  mood: Mood;
}

// Map of week-start date string → entry
export type Journal = Record<DateString, JournalEntry>;

// Future-self letters keyed by absolute age. Active slots are computed
// dynamically from the user's current age (see letterHorizonsForAge); this
// type is a flat number-keyed map so an old letter "to my 40-year-old self"
// stays its own immutable artifact regardless of which horizons are active.
export type LetterMap = Partial<Record<number, string>>;

// ---- People + interactions ----
export interface Interaction {
  date: DateString;
  topic: string;
}

export interface Person {
  name: string;
  relation: Relation;
  dob: DateString | '';
  interactions?: Interaction[];
}

// ---- Milestones (SMART goals) ----
// SMART = Specific, Measurable, Achievable, Relevant, Time-bound.
//   - `label` covers Specific (what)
//   - `measure` covers Measurable (how you'll know it's done)
//   - `age` covers Time-bound (by when)
//   - `why` covers Relevant (why it matters to you)
//   - Achievable is a self-check, not a stored field
// `measure` and `why` are optional so old entries with just label+age+completed
// still load and render cleanly.
export interface Milestone {
  age: number;
  label: string;
  completed: boolean;
  measure?: string;
  why?: string;
}

// ---- Reading ----
export interface Book {
  title: string;
  author: string;
  age: number;
  takeaway: string;
}

// ---- Rituals ----
// `nextDate` is the as-of-date for the next occurrence. Marking a ritual
// done rolls it forward by floor(365/frequency) days. Optional so old
// docs without it still load — UI falls back to "set a date" prompts.
export interface Ritual {
  name: string;
  frequency: 1 | 2 | 4 | 12; // per year (yearly / twice / quarterly / monthly)
  nextDate?: DateString;     // 'YYYY-MM-DD' of next occurrence
}

// ---- Net worth ----
// Periodic snapshots the user logs to track Financial Wealth. Stored as a
// list, newest first. Amounts are in the user's display currency (USD for
// now; future i18n can extend the type with a currency field).
export interface NetWorthEntry {
  date: DateString;     // 'YYYY-MM-DD' — when the snapshot was as-of
  amount: number;       // total net worth in dollars (can be negative)
  note?: string;        // optional free-text annotation
}

// One savings goal with a target amount and optional deadline. v1 supports
// any number of goals but the UI surfaces the first/primary one.
export interface SavingsGoal {
  id: string;           // stable id, set at creation
  label: string;        // e.g. "Emergency fund" or "House down payment"
  target: number;       // target dollar amount
  deadline?: DateString; // optional 'YYYY-MM-DD'
  createdAt: number;    // Date.now() at creation
}

// ---- Habits ----
// Daily-cadence practices (meditate, gym, no-phone-after-9). Different
// from rituals (annual) and milestones (one-time). Checks are a separate
// list of (habitId, date) tuples — keeps Habit lightweight and makes
// streak/chain math straightforward.
export interface Habit {
  id: string;
  label: string;
  emoji?: string;
  wealthKey?: WealthKey;     // optional: tags the habit to a wealth dimension
  createdAt: number;
  archivedAt?: number;       // soft-archive; archived habits hide from UI but
                             // their history persists for past visualizations
}

export interface HabitCheck {
  habitId: string;
  date: DateString;          // 'YYYY-MM-DD' — the day the habit was done
}

// ---- Body / daily check-in ----
// One entry per day with optional weight/sleep/workout fields. Each field
// is optional so users can log just sleep on some days, just weight on
// others. Same-date overwrites (one entry per day).
export interface BodyEntry {
  date: DateString;
  weight?: number;           // pounds (USD-anchored; user can input kg externally)
  sleepHours?: number;       // hours of sleep the night before
  workoutMinutes?: number;   // minutes of intentional movement
  note?: string;
}

// ---- Charitable giving ----
// Each gift logged with a date and amount. The app's worldview includes
// a 10%-of-net-worth annual baseline target — see GivingSection for how
// the target is computed and surfaced.
export interface GivingEntry {
  date: DateString;     // when given
  amount: number;       // dollars
  recipient?: string;   // optional org/cause
}

// ---- Personal settings (the personalize panel) ----
// `retirementAge` is intentionally absent — the app's worldview doesn't
// treat retirement as a goal to plan toward. Old user docs may still
// have a `retirementAge` field; CloudPayload below tolerates that on
// read but nothing writes it after the Finance-page refactor.
export interface PersonalSettings {
  dob: DateString;
  sex: Sex;
  theme: Theme;
  country: Country;
  partnership: Partnership;
  kids: number;
  careerField: CareerField;
  // Private (localStorage only, never URL)
  smoker: Smoking;
  exerciseLevel: ExerciseLevel;
  sleepHours: number;
  familyLongevity: number;
  // Goals
  priorities: DimensionKey[];
  bestYear: number;
  hardestYear: number;
}

// ---- Stage data ----
export interface DimensionContent {
  h: string;
  b: string;
}

export interface HealthContent {
  common?: DimensionContent;
  female?: DimensionContent;
  male?: DimensionContent;
}

export interface Stage {
  range: [number, number];
  name: string;
  poetic: string;
  career: DimensionContent;
  love: DimensionContent;
  health: HealthContent;
  money: DimensionContent;
  growth: DimensionContent;
  goodNews: string;
}

// ---- 5 Types of Wealth assessment ----
export type WealthKey = 'time' | 'social' | 'mental' | 'physical' | 'financial';

export interface SurveyAnswer {
  questionId: string;        // e.g. 'time-1', 'social-2'
  value: 1 | 2 | 3 | 4 | 5;  // Likert
}

// v2 adds `id` and `completedRecommendations` so a saved result can have its
// recommendations checked off. Older v1 entries (single-result era) are
// migrated to v2 at read time — see stores/assessment.ts.
export interface AssessmentResult {
  v: 2;
  id: string;                // stable id, set at submission
  takenAt: number;           // Date.now() at submission
  answers: SurveyAnswer[];
  selfScores: Record<WealthKey, number>;  // 0-100, derived from answers
  // recId (RecommendationId from data/assessment.ts) → ISO date when checked off.
  // Typed as plain string here because importing data/ from types/ would
  // create a circular dep; consumers tighten via assertions / the toggle helper.
  completedRecommendations: Record<string, string>;
}

export type WealthScores = Record<WealthKey, number>;

// ---- Cloud sync payload (what we write to Firestore) ----
export interface CloudPayload extends Partial<PersonalSettings> {
  v: number;
  milestones: Milestone[];
  journal: Journal;
  letters: LetterMap;
  people: Person[];
  books: Book[];
  rituals: Ritual[];
  // New (v2): list of saved results, newest first.
  assessmentResults?: AssessmentResult[];
  // Legacy (v1): single result. Read on load for migration; not written anymore.
  assessmentResult?: AssessmentResult | null;
  // Finance page (v1).
  netWorthEntries?: NetWorthEntry[];
  savingsGoals?: SavingsGoal[];
  savingsRate?: number;
  givingEntries?: GivingEntry[];
  // Habits (v1).
  habits?: Habit[];
  habitChecks?: HabitCheck[];
  // Daily body / health log (v1).
  bodyEntries?: BodyEntry[];
  // Legacy: `retirementAge` was a PersonalSettings field before the Finance
  // refactor. Old user docs may still carry it; we accept it on read so they
  // don't break, but never write it back. Drop entirely after a few months.
  retirementAge?: number;
  updated: number;
}

// ---- Country reference ----
export interface CountryNote {
  lifeExp: { male: number; female: number };
  retireMedian: number;
}
