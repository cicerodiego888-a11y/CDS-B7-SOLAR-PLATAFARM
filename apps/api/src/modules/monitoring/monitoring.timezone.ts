export type HistoryPeriod =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'previousMonth'
  | 'custom';

export type HistoryGranularity = 'HOUR' | 'DAY' | 'MONTH';

export const HISTORY_PERIODS: HistoryPeriod[] = [
  'today',
  'yesterday',
  'last7days',
  'last30days',
  'thisMonth',
  'previousMonth',
  'custom',
];

export const HISTORY_GRANULARITIES: HistoryGranularity[] = ['HOUR', 'DAY', 'MONTH'];
export const MAX_HISTORY_DAYS = 366;

export function monitoringTimeZone() {
  return process.env.MONITORING_TIMEZONE?.trim() || 'America/Sao_Paulo';
}

export function zonedParts(date: Date, timeZone = monitoringTimeZone()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = read('hour');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: hour === 24 ? 0 : hour,
    minute: read('minute'),
    second: read('second'),
  };
}

export function timeZoneOffsetMs(date: Date, timeZone = monitoringTimeZone()) {
  const zoned = zonedParts(date, timeZone);
  const asUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
  return asUtc - date.getTime();
}

export function zonedDate(timeZone: string, year: number, month: number, day: number, hour = 0, minute = 0) {
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  return new Date(utc.getTime() - timeZoneOffsetMs(utc, timeZone));
}

export function startOfZonedDay(date: Date, timeZone = monitoringTimeZone()) {
  const parts = zonedParts(date, timeZone);
  return zonedDate(timeZone, parts.year, parts.month, parts.day);
}

export function addZonedDays(date: Date, days: number, timeZone = monitoringTimeZone()) {
  const parts = zonedParts(date, timeZone);
  const utcNoon = Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0);
  return startOfZonedDay(new Date(utcNoon), timeZone);
}

export function periodRange(period: HistoryPeriod, now = new Date(), timeZone = monitoringTimeZone(), custom?: { start?: Date; end?: Date }) {
  const today = startOfZonedDay(now, timeZone);
  const tomorrow = addZonedDays(today, 1, timeZone);
  if (period === 'yesterday') {
    return { from: addZonedDays(today, -1, timeZone), to: today };
  }
  if (period === 'last7days') {
    return { from: addZonedDays(today, -6, timeZone), to: tomorrow };
  }
  if (period === 'last30days') {
    return { from: addZonedDays(today, -29, timeZone), to: tomorrow };
  }
  if (period === 'thisMonth') {
    const parts = zonedParts(today, timeZone);
    return { from: zonedDate(timeZone, parts.year, parts.month, 1), to: tomorrow };
  }
  if (period === 'previousMonth') {
    const parts = zonedParts(today, timeZone);
    const thisMonth = zonedDate(timeZone, parts.year, parts.month, 1);
    const prev = addZonedDays(thisMonth, -1, timeZone);
    const prevParts = zonedParts(prev, timeZone);
    return { from: zonedDate(timeZone, prevParts.year, prevParts.month, 1), to: thisMonth };
  }
  if (period === 'custom') {
    if (!custom?.start || !custom.end) {
      return { from: today, to: tomorrow };
    }
    const from = startOfZonedDay(custom.start, timeZone);
    const to = addZonedDays(startOfZonedDay(custom.end, timeZone), 1, timeZone);
    return { from, to };
  }
  return { from: today, to: tomorrow };
}

export function previousPeriodRange(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - duration), to: from };
}

export function defaultGranularity(period: HistoryPeriod, from: Date, to: Date): HistoryGranularity {
  if (period === 'today' || period === 'yesterday') return 'HOUR';
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days > 62) return 'MONTH';
  return 'DAY';
}

export function bucketKey(date: Date, granularity: HistoryGranularity, timeZone = monitoringTimeZone()) {
  const parts = zonedParts(date, timeZone);
  if (granularity === 'HOUR') {
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}`;
  }
  if (granularity === 'MONTH') {
    return `${parts.year}-${pad(parts.month)}`;
  }
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function bucketLabel(date: Date, granularity: HistoryGranularity, timeZone = monitoringTimeZone()) {
  if (granularity === 'HOUR') {
    return `${String(zonedParts(date, timeZone).hour).padStart(2, '0')}h`;
  }
  if (granularity === 'MONTH') {
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone });
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}
