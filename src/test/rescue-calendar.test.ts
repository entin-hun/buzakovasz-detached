import { describe, it, expect } from 'vitest';
import { rescueDay, upcomingRescueDays, currentRescueDay, holidayNotices, isRescueDate, forRescueDay } from '@/lib/rescue-calendar';
describe('Hungarian rescue schedule', () => {
  const exceptions = [['2026-01-02','2025-12-31'],['2026-04-03','2026-04-02'],['2026-05-01','2026-04-30'],['2026-08-21','2026-08-19'],['2026-10-23','2026-10-22'],['2026-12-25','2026-12-23'],['2027-01-01','2026-12-31'],['2027-03-26','2027-03-25'],['2027-08-20','2027-08-19']];
  it.each(exceptions)('%s moves to preceding working day %s', (friday, moved) => expect(rescueDay(friday)).toBe(moved));
  it('allows the moved day until Budapest 18:00', () => {
    expect(upcomingRescueDays(1, new Date('2026-10-22T15:59:59Z'))).toEqual(['2026-10-22']);
    expect(upcomingRescueDays(1, new Date('2026-10-22T16:00:00Z'))).toEqual(['2026-10-30']);
  });
  it('rolls coverage at Budapest 20:00 on rescue day', () => {
    expect(currentRescueDay(new Date('2026-10-22T17:59:00Z'))).toBe('2026-10-22');
    expect(currentRescueDay(new Date('2026-10-22T18:00:00Z'))).toBe('2026-10-30');
  });
  it('announces changes from seven days before, including rescue day', () => {
    expect(holidayNotices(new Date('2026-10-15T10:00:00Z'))).toContainEqual(['2026-10-23','2026-10-22']);
    expect(holidayNotices(new Date('2026-10-14T10:00:00Z'))).toEqual([]);
  });
  it('rejects holiday Friday but allows moved Thursday', () => {
    expect(isRescueDate('2026-10-23')).toBe(false);
    expect(isRescueDate('2026-10-22')).toBe(true);
  });
  it('counts only the selected week and recurring commitments', () => {
    const items = [{ aktiv:true, tipus:'egyszeri', datum:'2026-10-22' }, {aktiv:true,tipus:'egyszeri',datum:'2026-10-30'}, {aktiv:true,tipus:'allandó',datum:null}];
    expect(forRescueDay(items,'2026-10-22')).toEqual([items[0],items[2]]);
  });
});