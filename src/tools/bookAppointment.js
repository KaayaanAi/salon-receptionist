/**
 * Book Appointment Tool
 * Creates a new appointment with validation and collision detection
 */

import { validateBookingInput } from '../services/validator.js';
import { isSlotAvailable, calculateEndTime, generateBookingId } from '../services/scheduler.js';
import { formatBookingSuccess, formatError } from '../utils/responseFormatter.js';
import { getTimestamp } from '../utils/dateHelpers.js';
import database from '../services/database.js';

/**
 * Book a new appointment
 * @param {Object} params - Booking parameters
 * @returns {Promise<Object>} Booking result
 */
export async function bookAppointment(params) {
  const {
    tenant_id,
    customer_name,
    phone_number,
    service_id,
    date,
    time,
    notes = ''
  } = params;

  try {
    // Validate all inputs
    const validation = validateBookingInput(params);
    if (!validation.valid) {
      return formatError(validation.errors);
    }

    const { service, phone_number: formattedPhone } = validation.data;

    // Check slot availability
    const slotCheck = await isSlotAvailable(
      tenant_id,
      date,
      time,
      service.duration_minutes
    );

    if (!slotCheck.available) {
      return formatError(slotCheck.error);
    }

    // Calculate end time
    const endTime = calculateEndTime(time, service.duration_minutes);

    // Generate unique booking ID
    const bookingId = await generateBookingId(tenant_id, date);

    // Create appointment object
    const appointment = {
      booking_id: bookingId,
      tenant_id,
      customer_name: customer_name.trim(),
      phone_number: formattedPhone,
      service_id,
      service_name: service.name,
      service_duration: service.duration_minutes,
      date,
      time,
      end_time: endTime,
      status: 'confirmed',
      notes: notes.trim(),
      created_at: getTimestamp(),
      updated_at: getTimestamp(),
      cancelled_at: null,
      cancellation_reason: null
    };

    // Save to database
    const appointmentsCol = database.getCollection(tenant_id, 'appointments');
    await appointmentsCol.insertOne(appointment);

    // Return success response
    return formatBookingSuccess(appointment, tenant_id);

  } catch (error) {
    console.error('Book appointment error:', error);
    return formatError('حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى');
  }
}

/**
 * MCP Tool Definition
 */
export const bookAppointmentTool = {
  name: 'book_appointment',
  description: 'Book a new appointment for a customer at a salon',
  inputSchema: {
    type: 'object',
    properties: {
      tenant_id: {
        type: 'string',
        description: "Salon identifier (e.g., 'salon-farah')"
      },
      customer_name: {
        type: 'string',
        description: "Customer's full name in Arabic"
      },
      phone_number: {
        type: 'string',
        description: 'Kuwait phone number format: +965XXXXXXXX'
      },
      service_id: {
        type: 'string',
        description: "Service ID from tenant config (e.g., 'SRV-002')"
      },
      date: {
        type: 'string',
        description: 'Appointment date (YYYY-MM-DD)'
      },
      time: {
        type: 'string',
        description: 'Appointment time (HH:MM in 24h format)'
      },
      notes: {
        type: 'string',
        description: 'Optional notes from customer'
      }
    },
    required: ['tenant_id', 'customer_name', 'phone_number', 'service_id', 'date', 'time']
  }
};
