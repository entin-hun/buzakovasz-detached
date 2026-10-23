export * from '../../supabase/functions/_shared/rescue-calendar';
import { currentRescueDay, rescueDay } from '../../supabase/functions/_shared/rescue-calendar';
export function forRescueDay<T extends { aktiv: boolean; tipus: string; datum: string | null }>(items: T[], date = currentRescueDay()): T[] {
  return items.filter(c => c.aktiv && (c.tipus === 'allandó' || (c.datum !== null && rescueDay(c.datum) === date)));
}