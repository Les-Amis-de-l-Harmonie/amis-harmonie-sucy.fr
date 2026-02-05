/**
 * Date utility functions for the application
 */

/**
 * Check if an event date is in the past
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if the event date is before today
 */
export function isEventPast(dateStr: string): boolean {
  const eventDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

/**
 * Format a date in French long format with day name
 * Example: "Dimanche 15 janvier 2024"
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string in French
 */
export function formatDateFrench(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  const dayName = days[date.getDay()];
  const dayNum = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName} ${dayNum} ${month} ${year}`;
}

/**
 * Format a date in French short format
 * Example: "15/01/2024"
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string in French short format
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR");
}

/**
 * Format a date in French long format without day name
 * Example: "15 janvier 2024"
 * @param dateStr - Date string in YYYY-MM-DD format or null
 * @returns Formatted date string or "—" if null
 */
export function formatDateLong(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
