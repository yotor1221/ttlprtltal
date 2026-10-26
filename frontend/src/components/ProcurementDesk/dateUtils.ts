/**
 * Format a YYYY-MM-DD string into UK long format: "Wednesday, 15 January 2026"
 */
export function formatUKDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a YYYY-MM-DD string into compact format for select options: "15 Jan 2026 • Thu"
 */
export function formatSelectOption(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
  return `${day} Jan ${year} • ${dayName}`;
}
