import { describe, it, expect } from 'vitest';
import { currentSeasonId, previousSeasonId } from './seasons';

describe('currentSeasonId', () => {
  it('formats as YYYY-MM', () => {
    expect(currentSeasonId(new Date('2026-07-12T12:00:00Z'))).toBe('2026-07');
  });

  it('pads single-digit months', () => {
    expect(currentSeasonId(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01');
  });
});

describe('previousSeasonId', () => {
  it('is the calendar month before the given date', () => {
    expect(previousSeasonId(new Date('2026-07-12T00:00:00Z'))).toBe('2026-06');
  });

  it('rolls back across a year boundary (Jan -> previous Dec)', () => {
    expect(previousSeasonId(new Date('2026-01-15T00:00:00Z'))).toBe('2025-12');
  });
});
