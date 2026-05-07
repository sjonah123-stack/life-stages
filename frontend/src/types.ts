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

// ---- Places ----
export interface Place {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  year: number; // user's age when they were there
  note: string;
}

// ---- Milestones ----
export interface Milestone {
  age: number;
  label: string;
  completed: boolean;
}

// ---- Reading ----
export interface Book {
  title: string;
  author: string;
  age: number;
  takeaway: string;
}

// ---- Rituals ----
export interface Ritual {
  name: string;
  frequency: 1 | 2 | 4 | 12; // per year (yearly / twice / quarterly / monthly)
}

// ---- Personal settings (the personalize panel) ----
export interface PersonalSettings {
  dob: DateString;
  sex: Sex;
  theme: Theme;
  country: Country;
  partnership: Partnership;
  kids: number;
  careerField: CareerField;
  retirementAge: number;
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
  places: Place[];
  people: Person[];
  books: Book[];
  rituals: Ritual[];
  // New (v2): list of saved results, newest first.
  assessmentResults?: AssessmentResult[];
  // Legacy (v1): single result. Read on load for migration; not written anymore.
  assessmentResult?: AssessmentResult | null;
  updated: number;
}

// ---- Country reference ----
export interface CountryNote {
  lifeExp: { male: number; female: number };
  retireMedian: number;
}
