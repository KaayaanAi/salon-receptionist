/**
 * Update Appointment Tool
 * Modify an existing appointment
 */

import dayjs from 'dayjs';
import { validateBookingId, validateDate, validateTime, validateService } from '../services/validator.js';
import { isSlotAvailable, calculateEndTime } from '../services/scheduler.js';
import { formatUpdateResponse, formatError } from '../utils/responseFormatter.js';
import { getTimestamp } from '../utils/dateHelpers.js';
import database from '../services/database.js';

/**
 * Update an existing appointment
 * @param {Object} params - Update parameters
 * @returns {Promise<Object>} Update result
 */
export async function updateAppointment(params) {
  const {
    tenant_id,
    booking_id,
    new_date,
    new_time,
    new_service_id,
    new_notes
  } = params;

  try {
    // Validate booking ID
    const bookingValidation = validateBookingId(booking_id);
    if (!bookingValidation.valid) {
      return formatError(bookingValidation.error);
    }

    // Find existing appointment
    const appointmentsCol = database.getCollection(tenant_id, 'appointments');
    const appointment = await appointmentsCol.findOne({
      booking_id,
      tenant_id
    });

    if (!appointment) {
      return formatError('رقم الحجز غير موجود');
    }

    // Can't update cancelled appointments
    if (appointment.status === 'cancelled') {
      return formatError('لا يمكن تعديل موعد ملغي');
    }

    // Prepare update object
    const updates = {
      updated_at: getTimestamp()
    };

    // Update date and/or time
    if (new_date || new_time) {
      const targetDate = new_date || appointment.date;
      const targetTime = new_time || appointment.time;
      const serviceDuration = new_service_id
        ? (await getServiceDuration(tenant_id, new_service_id))
        : appointment.service_duration;

      // Validate new date
      if (new_date) {
        const dateValidation = validateDate(tenant_id, new_date);
        if (!dateValidation.valid) {
          return formatError(dateValidation.error);
        }

        // Validate new time
        const timeValidation = validateTime(tenant_id, targetTime, dateValidation.dayName);
        if (!timeValidation.valid) {
          return formatError(timeValidation.error);
        }

        updates.date = new_date;
      }

      if (new_time) {
        updates.time = new_time;
      }

      // Check slot availability (exclude current appointment)
      const slotCheck = await isSlotAvailableExcluding(
        tenant_id,
        targetDate,
        targetTime,
        serviceDuration,
        booking_id
      );

      if (!slotCheck.available) {
        return formatError(slotCheck.error);
      }

      updates.end_time = calculateEndTime(targetTime, serviceDuration);
    }

    // Update service
    if (new_service_id) {
      const serviceValidation = validateService(tenant_id, new_service_id);
      if (!serviceValidation.valid) {
        return formatError(serviceValidation.error);
      }

      updates.service_id = new_service_id;
      updates.service_name = serviceValidation.service.name;
      updates.service_duration = serviceValidation.service.duration_minutes;

      // Recalculate end time
      const targetTime = updates.time || appointment.time;
      updates.end_time = calculateEndTime(targetTime, serviceValidation.service.duration_minutes);
    }

    // Update notes
    if (new_notes !== undefined) {
      updates.notes = new_notes.trim();
    }

    // Apply updates
    await appointmentsCol.updateOne(
      { booking_id, tenant_id },
      { $set: updates }
    );

    // Fetch updated appointment
    const updatedAppointment = await appointmentsCol.findOne({
      booking_id,
      tenant_id
    });

    return formatUpdateResponse(updatedAppointment, tenant_id);

  } catch (error) {
    console.error('Update appointment error:', error);
    return formatError('حدث خطأ أثناء تحديث الموعد');
  }
}

/**
 * Get service duration
 * @param {string} tenantId - Tenant identifier
 * @param {string} serviceId - Service ID
 * @returns {Promise<number>} Duration in minutes
 */
async function getServiceDuration(tenantId, serviceId) {
  const serviceValidation = validateService(tenantId, serviceId);
  if (!serviceValidation.valid) {
    throw new Error('Invalid service');
  }
  return serviceValidation.service.duration_minutes;
}

/**
 * Check slot availability excluding a specific appointment
 * @param {string} tenantId - Tenant identifier
 * @param {string} date - Date string
 * @param {string} time - Time string
 * @param {number} duration - Duration in minutes
 * @param {string} excludeBookingId - Booking ID to exclude
 * @returns {Promise<{available: boolean, error?: string}>}
 */
async function isSlotAvailableExcluding(tenantId, date, time, duration, excludeBookingId) {
  const appointmentsCol = database.getCollection(tenantId, 'appointments');

  const existingAppointments = await appointmentsCol.find({
    date,
    status: { $in: ['confirmed', 'pending'] },
    booking_id: { $ne: excludeBookingId }
  }).toArray();

  const slotStart = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
  const slotEnd = slotStart.add(duration, 'minute');

  for (const apt of existingAppointments) {
    const aptStart = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
    const aptEnd = dayjs(`${apt.date} ${apt.end_time}`, 'YYYY-MM-DD HH:mm');

    if (
      (slotStart.isSameOrAfter(aptStart) && slotStart.isBefore(aptEnd)) ||
      (slotEnd.isAfter(aptStart) && slotEnd.isSameOrBefore(aptEnd)) ||
      (slotStart.isSameOrBefore(aptStart) && slotEnd.isSameOrAfter(aptEnd))
    ) {
      return {
        available: false,
        error: 'عذراً، هذا الموعد محجوز مسبقاً'
      };
    }
  }

  return { available: true };
}

/**
 * MCP Tool Definition
 */
export const updateAppointmentTool = {
  name: 'update_appointment',
  description: 'Update an existing appointment',
  inputSchema: {
    type: 'object',
    properties: {
      tenant_id: {
        type: 'string',
        description: 'Salon identifier'
      },
      booking_id: {
        type: 'string',
        description: 'Booking ID'
      },
      new_date: {
        type: 'string',
        description: 'New appointment date (YYYY-MM-DD, optional)'
      },
      new_time: {
        type: 'string',
        description: 'New appointment time (HH:MM, optional)'
      },
      new_service_id: {
        type: 'string',
        description: 'New service ID (optional)'
      },
      new_notes: {
        type: 'string',
        description: 'New notes (optional)'
      }
    },
    required: ['tenant_id', 'booking_id']
  }
};
