/**
 * Date and Time Helper Utilities
 * Handles Kuwait timezone operations using dayjs
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// Set default timezone to Kuwait
dayjs.tz.setDefault('Asia/Kuwait');

/**
 * Get current date in Kuwait timezone
 * @returns {string} Date string (YYYY-MM-DD)
 */
export function getCurrentDate() {
  return dayjs().tz('Asia/Kuwait').format('YYYY-MM-DD');
}

/**
 * Get current time in Kuwait timezone
 * @returns {string} Time string (HH:mm)
 */
export function getCurrentTime() {
  return dayjs().tz('Asia/Kuwait').format('HH:mm');
}

/**
 * Get current datetime in Kuwait timezone
 * @returns {Object} Dayjs object in Kuwait timezone
 */
export function now() {
  return dayjs().tz('Asia/Kuwait');
}

/**
 * Parse date string in Kuwait timezone
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {Object} Dayjs object
 */
export function parseDate(dateStr) {
  return dayjs.tz(dateStr, 'YYYY-MM-DD', 'Asia/Kuwait');
}

/**
 * Parse time string
 * @param {string} timeStr - Time string (HH:mm)
 * @returns {Object} Dayjs object
 */
export function parseTime(timeStr) {
  return dayjs(timeStr, 'HH:mm');
}

/**
 * Format date for display (Arabic-friendly)
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export function formatDateArabic(dateStr) {
  const date = parseDate(dateStr);
  return date.format('DD/MM/YYYY');
}

/**
 * Get day name in Arabic
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Arabic day name
 */
export function getDayNameArabic(dateStr) {
  const date = parseDate(dateStr);
  const dayNumber = date.day();

  const arabicDays = [
    'الأحد',    // Sunday
    'الإثنين',  // Monday
    'الثلاثاء', // Tuesday
    'الأربعاء', // Wednesday
    'الخميس',   // Thursday
    'الجمعة',   // Friday
    'السبت'     // Saturday
  ];

  return arabicDays[dayNumber];
}

/**
 * Check if date is today
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean}
 */
export function isToday(dateStr) {
  const date = parseDate(dateStr);
  const today = now().startOf('day');
  return date.isSame(today, 'day');
}

/**
 * Check if date is in the future
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean}
 */
export function isFutureDate(dateStr) {
  const date = parseDate(dateStr);
  const today = now().startOf('day');
  return date.isAfter(today, 'day');
}

/**
 * Get ISO timestamp for Kuwait timezone
 * @returns {string} ISO 8601 timestamp
 */
export function getTimestamp() {
  return now().toISOString();
}

/**
 * Calculate days until appointment
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {number} Number of days
 */
export function daysUntil(dateStr) {
  const date = parseDate(dateStr);
  const today = now().startOf('day');
  return date.diff(today, 'day');
}

/**
 * Add minutes to time string
 * @param {string} timeStr - Time string (HH:mm)
 * @param {number} minutes - Minutes to add
 * @returns {string} New time string (HH:mm)
 */
export function addMinutesToTime(timeStr, minutes) {
  const time = parseTime(timeStr);
  return time.add(minutes, 'minute').format('HH:mm');
}
