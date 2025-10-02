/**
 * Cancel Appointment Tool
 * Cancel an existing appointment with policy enforcement
 */

import { validateBookingId } from '../services/validator.js';
import { formatCancellationResponse, formatError } from '../utils/responseFormatter.js';
import { getTimestamp } from '../utils/dateHelpers.js';
import { loadTenantConfig } from '../services/tenantLoader.js';
import database from '../services/database.js';
import dayjs from 'dayjs';

/**
 * Cancel an appointment
 * @param {Object} params - Cancellation parameters
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelAppointment(params) {
  const { tenant_id, booking_id, cancellation_reason = '' } = params;

  try {
    // Validate booking ID
    const validation = validateBookingId(booking_id);
    if (!validation.valid) {
      return formatError(validation.error);
    }

    // Find appointment
    const appointmentsCol = database.getCollection(tenant_id, 'appointments');
    const appointment = await appointmentsCol.findOne({
      booking_id,
      tenant_id
    });

    if (!appointment) {
      return formatError('رقم الحجز غير موجود');
    }

    // Check if already cancelled
    if (appointment.status === 'cancelled') {
      return formatError('هذا الموعد ملغي مسبقاً');
    }

    // Check cancellation policy
    const config = loadTenantConfig(tenant_id);
    const cancellationHours = config.settings.cancellation_hours_notice || 24;

    const appointmentDateTime = dayjs(`${appointment.date} ${appointment.time}`, 'YYYY-MM-DD HH:mm');
    const now = dayjs();
    const hoursUntilAppointment = appointmentDateTime.diff(now, 'hour', true);

    // First check if appointment is in the past
    if (hoursUntilAppointment < 0) {
      return formatError('لا يمكن إلغاء موعد انتهى بالفعل');
    }

    // Then check cancellation notice
    if (hoursUntilAppointment < cancellationHours) {
      return formatError(
        `يجب الإلغاء قبل ${cancellationHours} ساعة على الأقل من موعد الحجز`
      );
    }

    // Update appointment status
    await appointmentsCol.updateOne(
      { booking_id, tenant_id },
      {
        $set: {
          status: 'cancelled',
          cancelled_at: getTimestamp(),
          cancellation_reason: cancellation_reason.trim(),
          updated_at: getTimestamp()
        }
      }
    );

    // Fetch updated appointment
    const cancelledAppointment = await appointmentsCol.findOne({
      booking_id,
      tenant_id
    });

    return formatCancellationResponse(cancelledAppointment, tenant_id);

  } catch (error) {
    console.error('Cancel appointment error:', error);
    return formatError('حدث خطأ أثناء إلغاء الموعد');
  }
}

/**
 * MCP Tool Definition
 */
export const cancelAppointmentTool = {
  name: 'cancel_appointment',
  description: 'Cancel an appointment',
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
      cancellation_reason: {
        type: 'string',
        description: 'Reason for cancellation (optional)'
      }
    },
    required: ['tenant_id', 'booking_id']
  }
};
