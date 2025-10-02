/**
 * Find Appointment Tool
 * Search for appointments by booking ID or phone number
 */

import { validateBookingId, validatePhone } from '../services/validator.js';
import { formatFindResponse, formatError } from '../utils/responseFormatter.js';
import database from '../services/database.js';

/**
 * Find appointment(s) by booking ID or phone number
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Find result
 */
export async function findAppointment(params) {
  const { tenant_id, booking_id, phone_number } = params;

  try {
    const appointmentsCol = database.getCollection(tenant_id, 'appointments');
    let query = { tenant_id };

    // Search by booking ID
    if (booking_id) {
      const validation = validateBookingId(booking_id);
      if (!validation.valid) {
        return formatError(validation.error);
      }

      query.booking_id = booking_id;
      const appointment = await appointmentsCol.findOne(query);

      if (!appointment) {
        return formatError('رقم الحجز غير موجود');
      }

      return formatFindResponse([appointment], tenant_id);
    }

    // Search by phone number
    if (phone_number) {
      const phoneValidation = validatePhone(phone_number);
      if (!phoneValidation.valid) {
        return formatError(phoneValidation.error);
      }

      query.phone_number = phoneValidation.formatted;

      // Get future and recent past appointments (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const minDate = sevenDaysAgo.toISOString().split('T')[0];

      query.date = { $gte: minDate };

      const appointments = await appointmentsCol
        .find(query)
        .sort({ date: -1, time: -1 })
        .toArray();

      return formatFindResponse(appointments, tenant_id);
    }

    return formatError('يجب تحديد رقم الحجز أو رقم الهاتف');

  } catch (error) {
    console.error('Find appointment error:', error);
    return formatError('حدث خطأ أثناء البحث');
  }
}

/**
 * MCP Tool Definition
 */
export const findAppointmentTool = {
  name: 'find_appointment',
  description: 'Find appointment by booking ID or phone number',
  inputSchema: {
    type: 'object',
    properties: {
      tenant_id: {
        type: 'string',
        description: 'Salon identifier'
      },
      booking_id: {
        type: 'string',
        description: 'Booking ID (optional)'
      },
      phone_number: {
        type: 'string',
        description: 'Customer phone number (optional)'
      }
    },
    required: ['tenant_id']
  }
};
