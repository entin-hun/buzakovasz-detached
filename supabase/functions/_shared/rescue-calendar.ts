// Statutory holidays: https://njt.hu/jogszabaly/2012-1-00-00 (§102)
// Transferred rest days 2026: https://njt.hu/eli/R/2025/NGM/10
// No unverified 2027 transferred rest days are assumed.
export const RESCUE_EXCEPTIONS: Record<string, string> = {
  '2026-01-02': '2025-12-31',
  '2026-04-03': '2026-04-02',
  '2026-05-01': '2026-04-30',
  '2026-08-21': '2026-08-19',
  '2026-10-23': '2026-10-22',
  '2026-12-25': '2026-12-23',
  '2027-01-01': '2026-12-31',
  '2027-03-26': '2027-03-25',
  '2027-08-20': '2027-08-19',
};
export const rescueDay = (friday: string) => RESCUE_EXCEPTIONS[friday] ?? friday;
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function budapestNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (key: string) => parts.find(p => p.type === key)?.value ?? '';
  return { date: `${part('year')}-${part('month')}-${part('day')}`, hour: Number(part('hour')) };
}
export function weekFriday(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, (5 - day + 7) % 7);
}
export function currentRescueDay(now = new Date()) {
  const local = budapestNow(now);
  let friday = weekFriday(local.date);
  const date = rescueDay(friday);
  if (local.date > date || (local.date === date && local.hour >= 20)) friday = addDays(friday, 7);
  return rescueDay(friday);
}
export function upcomingRescueDays(count = 8, now = new Date()) {
  const local = budapestNow(now);
  let friday = weekFriday(local.date);
  const dates: string[] = [];
  while (dates.length < count) {
    const date = rescueDay(friday);
    if (date > local.date || (date === local.date && local.hour < 18)) dates.push(date);
    friday = addDays(friday, 7);
  }
  return dates;
}
export function holidayNotices(now = new Date()) {
  const { date } = budapestNow(now);
  return Object.entries(RESCUE_EXCEPTIONS).filter(([, moved]) => date >= addDays(moved, -7) && date <= moved);
}
export function isRescueDate(date: string) {
  return rescueDay(weekFriday(date)) === date;
}