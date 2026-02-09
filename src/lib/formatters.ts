/**
 * Date and number formatting utilities using Intl API
 * Following Web Interface Guidelines for i18n
 */

type DateStyle = "full" | "long" | "medium" | "short";

/**
 * Format a date using Intl.DateTimeFormat
 * @param date - Date to format
 * @param locale - Locale string (e.g., 'sk', 'en')
 * @param options - Intl.DateTimeFormatOptions or preset style
 */
export function formatDate(
  date: Date | string | number,
  locale: string = "sk",
  options: Intl.DateTimeFormatOptions | DateStyle = "long",
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (typeof options === "string") {
    return new Intl.DateTimeFormat(locale, { dateStyle: options }).format(
      dateObj,
    );
  }

  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a date with time using Intl.DateTimeFormat
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string = "sk",
  dateStyle: DateStyle = "medium",
  timeStyle: DateStyle = "short",
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle }).format(
    dateObj,
  );
}

/**
 * Format a relative date range (e.g., "15. jan - 21. jan 2026")
 */
export function formatDateRange(
  startDate: Date | string | number,
  endDate: Date | string | number,
  locale: string = "sk",
): string {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
  });

  if (formatter.formatRange) {
    return formatter.formatRange(start, end);
  }

  // Fallback for older browsers
  const endFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(start)} - ${endFormatter.format(end)}`;
}

/**
 * Format a number using Intl.NumberFormat
 */
export function formatNumber(
  value: number,
  locale: string = "sk",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency using Intl.NumberFormat
 */
export function formatCurrency(
  value: number,
  locale: string = "sk",
  currency: string = "EUR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}
