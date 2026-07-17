import { describe, it, expect } from 'vitest';
import {
  cleanAmount,
  amountInvalid,
  numberInvalid,
  dateInvalid,
  dateOutOfRange,
  dobInvalid,
} from './validate';

describe('cleanAmount', () => {
  it('parses plain and formatted amounts', () => {
    expect(cleanAmount('1200')).toBe(1200);
    expect(cleanAmount('$1,200.50')).toBe(1200.5);
    expect(cleanAmount(' 45 ')).toBe(45);
  });
  it('returns null for blank', () => {
    expect(cleanAmount('')).toBeNull();
    expect(cleanAmount('  ')).toBeNull();
  });
  it('returns NaN for garbage', () => {
    expect(cleanAmount('abc')).toBeNaN();
  });
});

describe('amountInvalid', () => {
  it('blank is never invalid', () => {
    expect(amountInvalid('')).toBe(false);
  });
  it('positive amounts are valid', () => {
    expect(amountInvalid('50')).toBe(false);
    expect(amountInvalid('$2,000')).toBe(false);
  });
  it('zero, negatives, and garbage are invalid', () => {
    expect(amountInvalid('0')).toBe(true);
    expect(amountInvalid('-10')).toBe(true);
    expect(amountInvalid('abc')).toBe(true);
  });
});

describe('numberInvalid', () => {
  it('blank / null / undefined are never invalid', () => {
    expect(numberInvalid(null, 0, 12)).toBe(false);
    expect(numberInvalid(undefined, 0, 12)).toBe(false);
    expect(numberInvalid('', 0, 12)).toBe(false);
  });
  it('in-range values are valid, bounds inclusive', () => {
    expect(numberInvalid(0, 0, 12)).toBe(false);
    expect(numberInvalid(12, 0, 12)).toBe(false);
    expect(numberInvalid('7', 3, 14)).toBe(false);
  });
  it('out-of-range and non-numeric are invalid', () => {
    expect(numberInvalid(-1, 0, 12)).toBe(true);
    expect(numberInvalid(13, 0, 12)).toBe(true);
    expect(numberInvalid(99, 0, 12)).toBe(true);
    expect(numberInvalid('abc', 0, 12)).toBe(true);
  });
});

describe('dateInvalid', () => {
  it('blank is never invalid', () => {
    expect(dateInvalid('')).toBe(false);
  });
  it('real dates are valid', () => {
    expect(dateInvalid('2020-06-15')).toBe(false);
  });
  it('malformed strings are invalid', () => {
    expect(dateInvalid('06/15/2020')).toBe(true);
    expect(dateInvalid('2020-6-15')).toBe(true);
    expect(dateInvalid('banana')).toBe(true);
  });
  it('pre-1900 dates are invalid', () => {
    expect(dateInvalid('1899-12-31')).toBe(true);
  });
  it('future dates are invalid only when disallowed', () => {
    expect(dateInvalid('2999-01-01', true)).toBe(false);
    expect(dateInvalid('2999-01-01', false)).toBe(true);
  });
});

describe('dateOutOfRange', () => {
  it('blank and malformed are not range errors', () => {
    expect(dateOutOfRange('', '2020-01-01', '2030-01-01')).toBe(false);
    expect(dateOutOfRange('nope', '2020-01-01', '2030-01-01')).toBe(false);
  });
  it('inside the range is fine, bounds inclusive', () => {
    expect(dateOutOfRange('2025-06-01', '2020-01-01', '2030-01-01')).toBe(false);
    expect(dateOutOfRange('2020-01-01', '2020-01-01', '2030-01-01')).toBe(false);
    expect(dateOutOfRange('2030-01-01', '2020-01-01', '2030-01-01')).toBe(false);
  });
  it('outside the range is flagged', () => {
    expect(dateOutOfRange('2019-12-31', '2020-01-01', '2030-01-01')).toBe(true);
    expect(dateOutOfRange('2031-01-01', '2020-01-01', '2030-01-01')).toBe(true);
  });
  it('bounds are optional', () => {
    expect(dateOutOfRange('2999-01-01', '2020-01-01', undefined)).toBe(false);
    expect(dateOutOfRange('2019-01-01', undefined, '2030-01-01')).toBe(false);
  });
});

describe('dobInvalid', () => {
  it('blank is never invalid', () => {
    expect(dobInvalid('')).toBe(false);
  });
  it('a normal birthdate is valid', () => {
    expect(dobInvalid('2002-12-04')).toBe(false);
  });
  it('future dates, pre-1900, and malformed are invalid', () => {
    expect(dobInvalid('2999-01-01')).toBe(true);
    expect(dobInvalid('1850-01-01')).toBe(true);
    expect(dobInvalid('12/04/2002')).toBe(true);
  });
});
