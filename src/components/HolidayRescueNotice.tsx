import { holidayNotices } from '@/lib/rescue-calendar';
import { CalendarDays } from 'lucide-react';
export default function HolidayRescueNotice() {
  const notices = holidayNotices();
  if (!notices.length) return null;
  return <div role="status" className="bg-secondary border-l-4 border-primary px-4 py-3 text-sm space-y-2">{notices.map(([friday,moved])=><p key={friday} className="flex items-start gap-2"><CalendarDays size={18} className="shrink-0 text-primary"/><span><strong>Ünnepi mentési nap: {moved}, 18:00.</strong> A {friday}-i péntek helyett az előző munkanapon mentünk.</span></p>)}</div>;
}