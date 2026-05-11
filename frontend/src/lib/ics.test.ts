// Tests for the iCalendar generator. The most important things to pin:
//   - escaping (especially the destructive ones: `;`, `,`, `\n`, `\`)
//   - all-day DATE format (no Z, no T)
//   - DTEND-exclusive semantics (single-day event → DTEND = DTSTART + 1)
//   - line folding at 75-char boundary with leading-space continuation
//   - RRULE for each ritual frequency
//   - stable UIDs (same input → same UID)
//   - skip behavior: completed milestones, rituals without nextDate, etc.
import { describe, expect, it } from 'vitest';
import { buildIcs, countExportable, milestoneEvent, milestoneCheckInEvents, ritualEvent, savingsGoalEvent } from './ics';
import type { Milestone, Ritual, SavingsGoal } from '../types';

const FROZEN = new Date(Date.UTC(2026, 4, 11, 12, 34, 56));

function buildSimple(opts: Partial<Parameters<typeof buildIcs>[0]> = {}): string {
  return buildIcs({
    milestones: [],
    rituals: [],
    savingsGoals: [],
    birthdate: null,
    now: FROZEN,
    ...opts,
  });
}

describe('buildIcs — envelope', () => {
  it('emits a minimal valid VCALENDAR even with no events', () => {
    const ics = buildSimple();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:');
    expect(ics).toContain('END:VCALENDAR');
    // No events.
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('uses CRLF line endings (RFC 5545 §3.1)', () => {
    const ics = buildSimple();
    expect(ics).toContain('\r\n');
    // No bare LF: every \n is preceded by \r.
    for (let i = 0; i < ics.length; i++) {
      if (ics[i] === '\n') expect(ics[i - 1]).toBe('\r');
    }
  });
});

describe('milestoneEvent', () => {
  const bd = new Date(2002, 11, 4); // Dec 4 2002

  it('returns an event for an uncompleted milestone with the right age-date', () => {
    const m: Milestone = { age: 28, label: 'Run a half marathon', completed: false };
    const ev = milestoneEvent(m, bd, 0);
    expect(ev).not.toBeNull();
    expect(ev!.summary).toBe('Run a half marathon');
    expect(ev!.startDate.getFullYear()).toBe(2030); // 2002 + 28
    expect(ev!.startDate.getMonth()).toBe(11);
    expect(ev!.startDate.getDate()).toBe(4);
  });

  it('skips completed milestones', () => {
    const m: Milestone = { age: 23, label: 'Past goal', completed: true };
    expect(milestoneEvent(m, bd, 0)).toBeNull();
  });

  it('builds description from measure + why when both present', () => {
    const m: Milestone = {
      age: 28,
      label: 'X',
      completed: false,
      measure: 'half marathon under 2:00',
      why: 'rebuild after the injury',
    };
    const ev = milestoneEvent(m, bd, 0)!;
    expect(ev.description).toContain('How: half marathon under 2:00');
    expect(ev.description).toContain('Why: rebuild after the injury');
  });

  it('omits description when no measure/why', () => {
    const m: Milestone = { age: 28, label: 'Bare goal', completed: false };
    const ev = milestoneEvent(m, bd, 0)!;
    expect(ev.description).toBeUndefined();
  });

  it('produces a stable, slug-derived UID', () => {
    const m: Milestone = { age: 28, label: 'Run a half marathon!!', completed: false };
    const ev = milestoneEvent(m, bd, 0)!;
    // Same input → same UID across re-exports (no random/Date.now).
    expect(ev.uid).toBe('milestone-28-run-a-half-marathon@life-stages');
    const ev2 = milestoneEvent(m, bd, 7)!;
    expect(ev2.uid).toBe(ev.uid);
  });
});

describe('ritualEvent', () => {
  it('skips rituals without a nextDate', () => {
    const r: Ritual = { name: 'X', frequency: 1 };
    expect(ritualEvent(r, 0)).toBeNull();
  });

  it('yearly → FREQ=YEARLY', () => {
    const r: Ritual = { name: 'Thanksgiving', frequency: 1, nextDate: '2026-11-26' };
    const ev = ritualEvent(r, 0)!;
    expect(ev.rrule).toBe('FREQ=YEARLY');
  });

  it('twice-yearly → FREQ=MONTHLY;INTERVAL=6', () => {
    const r: Ritual = { name: 'X', frequency: 2, nextDate: '2026-06-01' };
    expect(ritualEvent(r, 0)!.rrule).toBe('FREQ=MONTHLY;INTERVAL=6');
  });

  it('quarterly → FREQ=MONTHLY;INTERVAL=3', () => {
    const r: Ritual = { name: 'X', frequency: 4, nextDate: '2026-01-01' };
    expect(ritualEvent(r, 0)!.rrule).toBe('FREQ=MONTHLY;INTERVAL=3');
  });

  it('monthly → FREQ=MONTHLY', () => {
    const r: Ritual = { name: 'X', frequency: 12, nextDate: '2026-05-15' };
    expect(ritualEvent(r, 0)!.rrule).toBe('FREQ=MONTHLY');
  });

  it('emoji-prefixes the summary so it stands out in calendar app', () => {
    const r: Ritual = { name: 'Thanksgiving', frequency: 1, nextDate: '2026-11-26' };
    expect(ritualEvent(r, 0)!.summary).toBe('🔁 Thanksgiving');
  });
});

describe('savingsGoalEvent', () => {
  it('skips goals without a deadline', () => {
    const g: SavingsGoal = { id: 'g1', label: 'Emergency fund', target: 10000, createdAt: 1 };
    expect(savingsGoalEvent(g)).toBeNull();
  });

  it('produces a single-day event at the deadline', () => {
    const g: SavingsGoal = {
      id: 'g1',
      label: 'House down payment',
      target: 50000,
      deadline: '2030-01-01',
      createdAt: 1,
    };
    const ev = savingsGoalEvent(g)!;
    expect(ev.startDate.getFullYear()).toBe(2030);
    expect(ev.summary).toBe('💰 House down payment');
  });
});

describe('text escaping', () => {
  it('escapes semicolons, commas, and newlines in summaries', () => {
    const m: Milestone = {
      age: 28,
      label: 'Sell; buy, and ship\nfast',
      completed: false,
    };
    const ics = buildIcs({
      milestones: [m],
      rituals: [],
      savingsGoals: [],
      birthdate: new Date(2002, 11, 4),
      now: FROZEN,
    });
    expect(ics).toContain('SUMMARY:Sell\\; buy\\, and ship\\nfast');
  });

  it('escapes backslashes', () => {
    const m: Milestone = {
      age: 28,
      label: 'Path\\to\\victory',
      completed: false,
    };
    const ics = buildIcs({
      milestones: [m],
      rituals: [],
      savingsGoals: [],
      birthdate: new Date(2002, 11, 4),
      now: FROZEN,
    });
    expect(ics).toContain('SUMMARY:Path\\\\to\\\\victory');
  });
});

describe('all-day event format', () => {
  it('uses DTSTART;VALUE=DATE:YYYYMMDD (no T, no Z)', () => {
    const m: Milestone = { age: 28, label: 'X', completed: false };
    const ics = buildIcs({
      milestones: [m],
      rituals: [],
      savingsGoals: [],
      birthdate: new Date(2002, 11, 4),
      now: FROZEN,
    });
    expect(ics).toContain('DTSTART;VALUE=DATE:20301204');
  });

  it('DTEND is exclusive (DTSTART + 1 day for a one-day event)', () => {
    const m: Milestone = { age: 28, label: 'X', completed: false };
    const ics = buildIcs({
      milestones: [m],
      rituals: [],
      savingsGoals: [],
      birthdate: new Date(2002, 11, 4),
      now: FROZEN,
    });
    expect(ics).toContain('DTEND;VALUE=DATE:20301205');
  });
});

describe('line folding (75-octet limit)', () => {
  it('folds long SUMMARY lines with CRLF + leading space', () => {
    const longLabel = 'a'.repeat(200);
    const m: Milestone = { age: 28, label: longLabel, completed: false };
    const ics = buildIcs({
      milestones: [m],
      rituals: [],
      savingsGoals: [],
      birthdate: new Date(2002, 11, 4),
      now: FROZEN,
    });
    // Folded continuation lines start with a single space.
    expect(ics).toMatch(/\r\n /);
    // No raw line exceeds 75 chars (count after splitting on CRLF).
    for (const line of ics.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});

describe('countExportable + buildIcs filtering', () => {
  it('counts only events that would actually emit', () => {
    const milestones: Milestone[] = [
      { age: 28, label: 'Active', completed: false },
      { age: 25, label: 'Past', completed: true }, // skipped
    ];
    const rituals: Ritual[] = [
      { name: 'With date', frequency: 1, nextDate: '2026-11-26' },
      { name: 'No date', frequency: 1 }, // skipped
    ];
    const savingsGoals: SavingsGoal[] = [
      { id: 'g1', label: 'With deadline', target: 1000, deadline: '2030-01-01', createdAt: 1 },
      { id: 'g2', label: 'No deadline', target: 1000, createdAt: 1 }, // skipped
    ];
    expect(countExportable({
      milestones, rituals, savingsGoals,
      birthdate: new Date(2002, 11, 4),
    })).toBe(3);

    const ics = buildIcs({
      milestones, rituals, savingsGoals,
      birthdate: new Date(2002, 11, 4),
      now: FROZEN,
    });
    // Three events expected.
    const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventCount).toBe(3);
  });

  it('milestones produce 0 events when no birthdate is set', () => {
    const milestones: Milestone[] = [
      { age: 28, label: 'X', completed: false },
    ];
    expect(countExportable({
      milestones, rituals: [], savingsGoals: [],
      birthdate: null,
    })).toBe(0);
  });
});

describe('milestone targetDate override', () => {
  const bd = new Date(2002, 11, 4);

  it('uses targetDate when set, ignoring age', () => {
    const m: Milestone = {
      age: 30, // would normally place at 2032-12-04
      label: 'X',
      completed: false,
      targetDate: '2027-07-04', // overrides → July 4 2027
    };
    const ev = milestoneEvent(m, bd, 0)!;
    expect(ev.startDate.getFullYear()).toBe(2027);
    expect(ev.startDate.getMonth()).toBe(6); // July
    expect(ev.startDate.getDate()).toBe(4);
  });

  it('falls back to age-derived date when targetDate is malformed', () => {
    const m: Milestone = {
      age: 30,
      label: 'X',
      completed: false,
      targetDate: 'not-a-date',
    };
    const ev = milestoneEvent(m, bd, 0)!;
    expect(ev.startDate.getFullYear()).toBe(2032); // age 30
  });

  it('emits the targetDate in the all-day DATE format', () => {
    const m: Milestone = {
      age: 30,
      label: 'X',
      completed: false,
      targetDate: '2027-07-04',
    };
    const ics = buildIcs({
      milestones: [m],
      rituals: [],
      savingsGoals: [],
      birthdate: bd,
      now: FROZEN,
    });
    expect(ics).toContain('DTSTART;VALUE=DATE:20270704');
  });
});

describe('milestone wealthKey', () => {
  const bd = new Date(2002, 11, 4);

  it('appends "Dimension: <wealthKey>" to the description', () => {
    const m: Milestone = {
      age: 28,
      label: 'X',
      completed: false,
      wealthKey: 'physical',
    };
    const ev = milestoneEvent(m, bd, 0)!;
    expect(ev.description).toContain('Dimension: physical');
  });

  it('omits when no wealthKey', () => {
    const m: Milestone = { age: 28, label: 'X', completed: false };
    const ev = milestoneEvent(m, bd, 0)!;
    expect(ev.description).toBeUndefined();
  });
});

describe('milestoneCheckInEvents', () => {
  const bd = new Date(2002, 11, 4);
  // Fixed "now" for deterministic test arithmetic.
  const now = new Date(2026, 4, 11);

  it('returns [] when checkInIntervalDays is absent', () => {
    const m: Milestone = { age: 28, label: 'X', completed: false, targetDate: '2027-01-01' };
    expect(milestoneCheckInEvents(m, bd, 0, now)).toEqual([]);
  });

  it('returns [] when completed', () => {
    const m: Milestone = {
      age: 23, label: 'X', completed: true,
      targetDate: '2027-01-01', checkInIntervalDays: 30,
    };
    expect(milestoneCheckInEvents(m, bd, 0, now)).toEqual([]);
  });

  it('emits a single recurring event with proper RRULE', () => {
    const m: Milestone = {
      age: 28, label: 'Half marathon', completed: false,
      targetDate: '2027-05-11', checkInIntervalDays: 30,
    };
    const evs = milestoneCheckInEvents(m, bd, 0, now);
    expect(evs).toHaveLength(1);
    expect(evs[0].summary).toBe('📋 Check-in: Half marathon');
    // RRULE: DAILY interval=30, UNTIL is day before target (2027-05-10).
    expect(evs[0].rrule).toBe('FREQ=DAILY;INTERVAL=30;UNTIL=20270510');
  });

  it('emits [] when the target is already in the past', () => {
    const m: Milestone = {
      age: 28, label: 'X', completed: false,
      targetDate: '2020-01-01', checkInIntervalDays: 30,
    };
    expect(milestoneCheckInEvents(m, bd, 0, now)).toEqual([]);
  });

  it('emits [] when the interval is longer than the remaining window', () => {
    const m: Milestone = {
      age: 28, label: 'X', completed: false,
      targetDate: '2026-05-20', // 9 days away from FROZEN(2026-05-11)
      checkInIntervalDays: 30,  // too long
    };
    expect(milestoneCheckInEvents(m, bd, 0, now)).toEqual([]);
  });

  it('is included in buildIcs and counted by countExportable', () => {
    const m: Milestone = {
      age: 28, label: 'Half marathon', completed: false,
      targetDate: '2027-05-11', checkInIntervalDays: 30,
    };
    const input = {
      milestones: [m],
      rituals: [],
      savingsGoals: [],
      birthdate: bd,
      now,
    };
    // 1 milestone event + 1 check-in series = 2 exportable events.
    expect(countExportable(input)).toBe(2);
    const ics = buildIcs(input);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(ics).toContain('SUMMARY:📋 Check-in: Half marathon');
  });
});
