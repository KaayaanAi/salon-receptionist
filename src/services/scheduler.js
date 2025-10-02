/**
 * Appointment Scheduler Service
 * Handles slot calculation and booking collision detection
 */

import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import { getWorkingHours, loadTenantConfig } from './tenantLoader.js';
import database from './database.js';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/**
 * Calculate available time slots for a given date and service
 * @param {string} tenantId - Tenant identifier
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {number} serviceDuration - Service duration in minutes
 * @returns {Promise<string[]>} Array of available time slots (HH:MM format)
 */
export async function getAvailableSlots(tenantId, date, serviceDuration) {
  // Get day of week
  const dateObj = dayjs(date);
  const dayName = dateObj.format('dddd').toLowerCase();

  // Get working hours
  const workingHours = getWorkingHours(tenantId, dayName);

  if (!workingHours.enabled) {
    return [];
  }

  // Get tenant settings
  const config = loadTenantConfig(tenantId);
  const slotDuration = config.settings.slot_duration_minutes || 30;

  // Generate all possible slots
  const slots = [];
  let currentTime = dayjs(`${date} ${workingHours.start}`, 'YYYY-MM-DD HH:mm');
  const endTime = dayjs(`${date} ${workingHours.end}`, 'YYYY-MM-DD HH:mm');

  // Subtract service duration from end time to ensure appointment can fit
  const lastSlotTime = endTime.subtract(serviceDuration, 'minute');

  while (currentTime.isBefore(lastSlotTime) || currentTime.isSame(lastSlotTime)) {
    slots.push(currentTime.format('HH:mm'));
    currentTime = currentTime.add(slotDuration, 'minute');
  }

  // Get existing appointments for this date
  const appointmentsCol = database.getCollection(tenantId, 'appointments');
  const existingAppointments = await appointmentsCol.find({
    date,
    status: { $in: ['confirmed', 'pending'] }
  }).toArray();

  // Filter out unavailable slots
  const availableSlots = slots.filter(slot => {
    return !isSlotConflicting(slot, serviceDuration, existingAppointments, date);
  });

  return availableSlots;
}

/**
 * Check if a time slot conflicts with existing appointments
 * @param {string} time - Time slot (HH:MM)
 * @param {number} duration - Duration in minutes
 * @param {Array} existingAppointments - Array of existing appointments
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {boolean} True if slot conflicts
 */
function isSlotConflicting(time, duration, existingAppointments, date) {
  const slotStart = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
  const slotEnd = slotStart.add(duration, 'minute');

  for (const apt of existingAppointments) {
    const aptStart = dayjs(`${date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
    const aptEnd = dayjs(`${date} ${apt.end_time}`, 'YYYY-MM-DD HH:mm');

    // Check for any overlap
    if (
      (slotStart.isSameOrAfter(aptStart) && slotStart.isBefore(aptEnd)) ||
      (slotEnd.isAfter(aptStart) && slotEnd.isSameOrBefore(aptEnd)) ||
      (slotStart.isSameOrBefore(aptStart) && slotEnd.isSameOrAfter(aptEnd))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a specific time slot is available
 * @param {string} tenantId - Tenant identifier
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} time - Time string (HH:MM)
 * @param {number} duration - Duration in minutes
 * @returns {Promise<{available: boolean, error?: string}>}
 */
export async function isSlotAvailable(tenantId, date, time, duration) {
  const appointmentsCol = database.getCollection(tenantId, 'appointments');

  const existingAppointments = await appointmentsCol.find({
    date,
    status: { $in: ['confirmed', 'pending'] }
  }).toArray();

  const isConflicting = isSlotConflicting(time, duration, existingAppointments);

  if (isConflicting) {
    return {
      available: false,
      error: 'عذراً، هذا الموعد محجوز مسبقاً'
    };
  }

  return {
    available: true
  };
}

/**
 * Calculate end time based on start time and duration
 * @param {string} startTime - Start time (HH:MM)
 * @param {number} duration - Duration in minutes
 * @returns {string} End time (HH:MM)
 */
export function calculateEndTime(startTime, duration) {
  const start = dayjs(startTime, 'HH:mm');
  const end = start.add(duration, 'minute');
  return end.format('HH:mm');
}

/**
 * Generate unique booking ID
 * Format: BK-{tenant_id}-{YYYYMMDD}-{seq}
 * @param {string} tenantId - Tenant identifier
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Promise<string>} Booking ID
 */
export async function generateBookingId(tenantId, date) {
  const appointmentsCol = database.getCollection(tenantId, 'appointments');

  // Get the date in YYYYMMDD format
  const dateStr = date.replace(/-/g, '');

  // Find the highest sequence number for this date
  const prefix = `BK-${tenantId}-${dateStr}-`;
  // Escape regex special characters
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingBookings = await appointmentsCol.find({
    booking_id: { $regex: `^${escapedPrefix}` }
  }).sort({ booking_id: -1 }).limit(1).toArray();

  let sequence = 1;
  if (existingBookings.length > 0) {
    const lastId = existingBookings[0].booking_id;
    const lastSeq = parseInt(lastId.split('-').pop());
    sequence = lastSeq + 1;
  }

  const seqStr = sequence.toString().padStart(3, '0');
  return `${prefix}${seqStr}`;
}
