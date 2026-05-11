// RFC 5545 iCalendar (.ics) generator. Pure functions — no DOM, no I/O.
// Used by CalendarExportButton on the Goals page to export milestones,
// rituals, and savings-goal deadlines to a single file the user can
// import into Apple Calendar, Google Calendar, Outlook, etc.
//
// Spec hot-spots intentionally handled:
//   - text escaping: backslash, semicolon, comma, newline
//   - line folding: max 75 octets per line, CRLF + space continuation
//   - all-day events: DTSTART;VALUE=DATE:YYYYMMDD with exclusive DTEND
//   - stable UIDs so re-import doesn't duplicate
import type { Milestone, Ritual, SavingsGoal } from '../types';

const PRODID = '-//Life Stages//life-stages-90806.web.app//EN';

// ---- Text escaping (per RFC 5545 §3.3.11) ----
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// ---- Date helpers ----

// All-day DATE format: YYYYMMDD (no dashes, no time component).
function fmtAllDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// DTSTAMP / event creation timestamp: UTC, full timestamp with 'Z'.
function fmtUtcStamp(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const se = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${mo}${da}T${h}${mi}${se}Z`;
}

// Date the user reaches `age`, anchored to their birthday. Uses setDate
// arithmetic so DST doesn't shift anything.
function ageDate(birthdate: Date, age: number): Date {
  const out = new Date(birthdate);
  out.setFullYear(birthdate.getFullYear() + age);
  return out;
}

// Add N days to a date (DST-safe via setDate).
function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// Parse a 'YYYY-MM-DD' string into a local-midnight Date. Returns null
// for malformed input — same logic shape as the wider codebase's parseDOB,
// but doesn't reject future or pre-1900 dates (calendars are timeless).
function parseYmd(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  if (isNaN(d.getTime())) return null;
  return d;
}

// ---- Line folding (RFC 5545 §3.1) ----
// "Lines of text SHOULD NOT be longer than 75 octets, excluding the
// line break." We fold at 75 *characters* — close enough for ASCII-heavy
// content; UTF-8 multi-byte chars could push us slightly over the octet
// budget but no major calendar app rejects on that.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      out.push(line.slice(i, i + 75));
      i += 75;
    } else {
      out.push(' ' + line.slice(i, i + 74)); // continuation line: leading space
      i += 74;
    }
  }
  return out.join('\r\n');
}

// ---- Event builders ----

interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  // All-day: provide DATE-only start; if `endDate` omitted, ends the
  // next day (single-day all-day event).
  startDate: Date;
  endDate?: Date;
  // Optional recurrence rule body (without the "RRULE:" prefix).
  rrule?: string;
  status?: 'CONFIRMED' | 'COMPLETED' | 'TENTATIVE';
}

function eventLines(e: IcsEvent, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${fmtAllDay(e.startDate)}`,
    `DTEND;VALUE=DATE:${fmtAllDay(e.endDate ?? addDays(e.startDate, 1))}`,
    `SUMMARY:${escapeText(e.summary)}`,
  ];
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  if (e.rrule) lines.push(`RRULE:${e.rrule}`);
  if (e.status) lines.push(`STATUS:${e.status}`);
  lines.push('END:VEVENT');
  return lines;
}

// ---- Public: build per-domain events ----

export function milestoneEvent(
  m: Milestone,
  birthdate: Date,
  index: number,
): IcsEvent | null {
  if (m.completed) return null; // past + done; no calendar value
  const start = ageDate(birthdate, m.age);
  // Description = "How: <measure>\nWhy: <why>" omitting absent fields.
  const descParts: string[] = [];
  if (m.measure) descParts.push(`How: ${m.measure}`);
  if (m.why) descParts.push(`Why: ${m.why}`);
  // Stable UID: tie to (age, label) so re-export doesn't create dupes.
  const slug = m.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return {
    uid: `milestone-${m.age}-${slug || index}@life-stages`,
    summary: m.label,
    description: descParts.length ? descParts.join('\n') : undefined,
    startDate: start,
    status: 'CONFIRMED',
  };
}

export function ritualEvent(r: Ritual, index: number): IcsEvent | null {
  // No nextDate → we don't know when to schedule. Skip.
  const start = parseYmd(r.nextDate);
  if (!start) return null;
  // RRULE per RFC 5545. YEARLY for 1×/yr, MONTHLY with INTERVAL for 2/4/12.
  let rrule = '';
  if (r.frequency === 1) rrule = 'FREQ=YEARLY';
  else if (r.frequency === 2) rrule = 'FREQ=MONTHLY;INTERVAL=6';
  else if (r.frequency === 4) rrule = 'FREQ=MONTHLY;INTERVAL=3';
  else if (r.frequency === 12) rrule = 'FREQ=MONTHLY';
  const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return {
    uid: `ritual-${slug || index}@life-stages`,
    summary: `🔁 ${r.name}`,
    description: `Ritual · ${rrule.includes('YEARLY') ? 'yearly' : rrule.includes('INTERVAL=6') ? 'twice a year' : rrule.includes('INTERVAL=3') ? 'quarterly' : 'monthly'}`,
    startDate: start,
    rrule,
    status: 'CONFIRMED',
  };
}

export function savingsGoalEvent(g: SavingsGoal): IcsEvent | null {
  if (!g.deadline) return null;
  const start = parseYmd(g.deadline);
  if (!start) return null;
  return {
    uid: `savings-goal-${g.id}@life-stages`,
    summary: `💰 ${g.label}`,
    description: `Savings goal deadline · target $${g.target.toLocaleString()}`,
    startDate: start,
    status: 'CONFIRMED',
  };
}

// ---- Public: assemble a full VCALENDAR string ----

export interface BuildIcsInput {
  milestones: Milestone[];
  rituals: Ritual[];
  savingsGoals: SavingsGoal[];
  birthdate: Date | null;
  now?: Date; // for testing
}

export function buildIcs(input: BuildIcsInput): string {
  const stamp = fmtUtcStamp(input.now ?? new Date());
  const events: IcsEvent[] = [];

  if (input.birthdate) {
    input.milestones.forEach((m, i) => {
      const ev = milestoneEvent(m, input.birthdate!, i);
      if (ev) events.push(ev);
    });
  }
  input.rituals.forEach((r, i) => {
    const ev = ritualEvent(r, i);
    if (ev) events.push(ev);
  });
  input.savingsGoals.forEach((g) => {
    const ev = savingsGoalEvent(g);
    if (ev) events.push(ev);
  });

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Life Stages',
    'X-WR-CALDESC:Your goals, rituals, and savings deadlines from Life Stages.',
  ];
  for (const ev of events) {
    lines.push(...eventLines(ev, stamp));
  }
  lines.push('END:VCALENDAR');

  // Fold each line, then join with CRLF (spec requires CRLF, not LF).
  return lines.map(fold).join('\r\n');
}

// Convenience: count exportable events (events that buildIcs would emit).
// Lets the UI show "Export 8 events" without re-running the full build.
export function countExportable(input: BuildIcsInput): number {
  let n = 0;
  if (input.birthdate) {
    for (const m of input.milestones) {
      if (milestoneEvent(m, input.birthdate, 0)) n++;
    }
  }
  for (let i = 0; i < input.rituals.length; i++) {
    if (ritualEvent(input.rituals[i], i)) n++;
  }
  for (const g of input.savingsGoals) {
    if (savingsGoalEvent(g)) n++;
  }
  return n;
}
