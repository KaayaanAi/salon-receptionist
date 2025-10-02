/**
 * Get Available Slots Tool
 * Returns available time slots for a specific date and service
 */

import { validateDate, validateService } from '../services/validator.js';
import { getAvailableSlots as calculateSlots } from '../services/scheduler.js';
import { formatAvailableSlotsResponse, formatError } from '../utils/responseFormatter.js';

/**
 * Get available time slots for booking
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Available slots response
 */
export async function getAvailableSlots(params) {
  const { tenant_id, date, service_id } = params;

  try {
    // Validate date
    const dateValidation = validateDate(tenant_id, date);
    if (!dateValidation.valid) {
      return formatError(dateValidation.error);
    }

    // Validate service
    const serviceValidation = validateService(tenant_id, service_id);
    if (!serviceValidation.valid) {
      return formatError(serviceValidation.error);
    }

    const { service } = serviceValidation;

    // Calculate available slots
    const slots = await calculateSlots(tenant_id, date, service.duration_minutes);

    // Return formatted response
    return formatAvailableSlotsResponse(slots, date, service);

  } catch (error) {
    console.error('Get available slots error:', error);
    return formatError('حدث خطأ أثناء جلب المواعيد المتاحة');
  }
}

/**
 * MCP Tool Definition
 */
export const getAvailableSlotsTool = {
  name: 'get_available_slots',
  description: 'Get available time slots for a specific date and service',
  inputSchema: {
    type: 'object',
    properties: {
      tenant_id: {
        type: 'string',
        description: 'Salon identifier'
      },
      date: {
        type: 'string',
        description: 'Date to check (YYYY-MM-DD)'
      },
      service_id: {
        type: 'string',
        description: 'Service ID to calculate slot duration'
      }
    },
    required: ['tenant_id', 'date', 'service_id']
  }
};
