// src/utils/timezoneUtils.ts

export function getTimeForTimezone(tz: string): { display: string; ampm: string } {
  if (!tz) return { display: '--:--', ampm: '' };
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(new Date());

    const hour   = parts.find(p => p.type === 'hour')?.value ?? '--';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '--';
    const ampm   = parts.find(p => p.type === 'dayPeriod')?.value ?? '';
    return { display: `${hour}:${minute}`, ampm };
  } catch {
    return { display: '--:--', ampm: '' };
  }
}

export function getTimeDifference(tz: string): string {
  if (!tz) return '';
  try {
    const now = new Date();

    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const localFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const tzParts    = tzFormatter.formatToParts(now);
    const localParts = localFormatter.formatToParts(now);

    const tzH  = parseInt(tzParts.find(p => p.type === 'hour')?.value ?? '0');
    const tzM  = parseInt(tzParts.find(p => p.type === 'minute')?.value ?? '0');
    const lcH  = parseInt(localParts.find(p => p.type === 'hour')?.value ?? '0');
    const lcM  = parseInt(localParts.find(p => p.type === 'minute')?.value ?? '0');

    let diffMins = (tzH * 60 + tzM) - (lcH * 60 + lcM);

    if (diffMins > 720)  diffMins -= 1440;
    if (diffMins < -720) diffMins += 1440;

    if (diffMins === 0) return 'Local time zone';

    const abs   = Math.abs(diffMins);
    const hrs   = Math.floor(abs / 60);
    const mins  = abs % 60;
    const label = hrs > 0
      ? mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`
      : `${mins} min`;

    return diffMins > 0 ? `${label} ahead` : `${label} behind`;
  } catch {
    return '';
  }
}

export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}