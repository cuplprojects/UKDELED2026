/**
 * Shared date formatting and validation utilities for consistent dd-mm-yyyy handling
 * regardless of the user's browser or OS locale.
 */

/**
 * Converts a date string (YYYY-MM-DD, ISO timestamp, or dd-mm-yyyy) into dd-mm-yyyy.
 * Returns "" if input is empty.
 */
export function formatDateToDDMMYYYY(value) {
  if (!value) return "";
  const str = String(value).trim().split("T")[0].split(" ")[0];

  // Already dd-mm-yyyy or dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`;
  }

  // ISO yyyy-mm-dd or yyyy/mm/dd
  const ymdMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
  }

  return str;
}

/**
 * Parses a dd-mm-yyyy (or yyyy-mm-dd) string and validates calendar accuracy.
 * Returns ISO "YYYY-MM-DD" string if valid, or "" if incomplete/invalid.
 */
export function parseDDMMYYYYToISO(value, { minYear = 1940, maxYear = 2030 } = {}) {
  if (!value) return "";
  const str = String(value).trim().split("T")[0].split(" ")[0];

  let day, month, year;

  const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else {
    const ymdMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (!ymdMatch) return "";
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  }

  if (year < minYear || year > maxYear || month < 1 || month > 12 || day < 1 || day > 31) {
    return "";
  }

  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return "";
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Formats raw typed/pasted input into a masked dd-mm-yyyy string while typing.
 */
export function maskDDMMYYYYInput(raw) {
  if (!raw) return "";
  const trimmed = String(raw).trim();

  // Handle pasted ISO YYYY-MM-DD or YYYY/MM/DD
  const isoPaste = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoPaste) {
    return `${isoPaste[3]}-${isoPaste[2]}-${isoPaste[1]}`;
  }

  const digits = trimmed.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

