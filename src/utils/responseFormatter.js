/**
 * Response Formatter
 * Formats API responses for MCP tools (Arabic/English bilingual)
 */

import { formatDateArabic, getDayNameArabic } from './dateHelpers.js';
import { loadTenantConfig } from '../services/tenantLoader.js';

/**
 * Format successful booking response
 * @param {Object} appointment - Appointment object
 * @param {string} tenantId - Tenant identifier
 * @returns {Object} Formatted response
 */
export function formatBookingSuccess(appointment, tenantId) {
  const config = loadTenantConfig(tenantId);

  return {
    success: true,
    booking_id: appointment.booking_id,
    message: `تم حجز موعدك بنجاح في ${config.salon_info.name}`,
    details: {
      customer_name: appointment.customer_name,
      service: appointment.service_name,
      date: formatDateArabic(appointment.date),
      day: getDayNameArabic(appointment.date),
      time: appointment.time,
      duration: `${appointment.service_duration} دقيقة`,
      salon_name: config.salon_info.name,
      salon_phone: config.salon_info.phone,
      booking_id: appointment.booking_id
    }
  };
}

/**
 * Format available slots response
 * @param {Array<string>} slots - Array of time slots
 * @param {string} date - Date string
 * @param {Object} service - Service object
 * @returns {Object} Formatted response
 */
export function formatAvailableSlotsResponse(slots, date, service) {
  return {
    success: true,
    date: formatDateArabic(date),
    day: getDayNameArabic(date),
    service: `${service.name} (${service.duration_minutes} دقيقة)`,
    available_slots: slots,
    total_available: slots.length,
    message: slots.length > 0
      ? `يوجد ${slots.length} موعد متاح`
      : 'لا توجد مواعيد متاحة في هذا التاريخ'
  };
}

/**
 * Format appointment details
 * @param {Object} appointment - Appointment object
 * @param {string} tenantId - Tenant identifier
 * @returns {Object} Formatted appointment
 */
export function formatAppointmentDetails(appointment, tenantId) {
  const config = loadTenantConfig(tenantId);

  return {
    booking_id: appointment.booking_id,
    customer_name: appointment.customer_name,
    phone_number: appointment.phone_number,
    service: appointment.service_name,
    date: formatDateArabic(appointment.date),
    day: getDayNameArabic(appointment.date),
    time: appointment.time,
    end_time: appointment.end_time,
    duration: `${appointment.service_duration} دقيقة`,
    status: getStatusArabic(appointment.status),
    salon_name: config.salon_info.name,
    salon_phone: config.salon_info.phone,
    notes: appointment.notes || ''
  };
}

/**
 * Format find appointment response
 * @param {Array<Object>} appointments - Array of appointments
 * @param {string} tenantId - Tenant identifier
 * @returns {Object} Formatted response
 */
export function formatFindResponse(appointments, tenantId) {
  if (appointments.length === 0) {
    return {
      success: false,
      message: 'رقم الحجز غير موجود',
      appointments: []
    };
  }

  return {
    success: true,
    total: appointments.length,
    appointments: appointments.map(apt => formatAppointmentDetails(apt, tenantId))
  };
}

/**
 * Format cancellation response
 * @param {Object} appointment - Cancelled appointment
 * @param {string} tenantId - Tenant identifier
 * @returns {Object} Formatted response
 */
export function formatCancellationResponse(appointment, tenantId) {
  const config = loadTenantConfig(tenantId);

  return {
    success: true,
    message: 'تم إلغاء الموعد بنجاح',
    booking_id: appointment.booking_id,
    details: {
      customer_name: appointment.customer_name,
      service: appointment.service_name,
      date: formatDateArabic(appointment.date),
      time: appointment.time,
      salon_name: config.salon_info.name,
      cancelled_at: new Date().toISOString()
    }
  };
}

/**
 * Format update response
 * @param {Object} appointment - Updated appointment
 * @param {string} tenantId - Tenant identifier
 * @returns {Object} Formatted response
 */
export function formatUpdateResponse(appointment, tenantId) {
  const config = loadTenantConfig(tenantId);

  return {
    success: true,
    message: 'تم تحديث الموعد بنجاح',
    booking_id: appointment.booking_id,
    details: formatAppointmentDetails(appointment, tenantId)
  };
}

/**
 * Format error response
 * @param {string|Array<string>} errors - Error message(s)
 * @returns {Object} Error response
 */
export function formatError(errors) {
  const errorArray = Array.isArray(errors) ? errors : [errors];

  return {
    success: false,
    errors: errorArray,
    message: errorArray[0] // First error as main message
  };
}

/**
 * Get status in Arabic
 * @param {string} status - Status code
 * @returns {string} Arabic status
 */
function getStatusArabic(status) {
  const statusMap = {
    confirmed: 'مؤكد',
    pending: 'قيد الانتظار',
    cancelled: 'ملغي',
    completed: 'مكتمل',
    'no-show': 'لم يحضر'
  };

  return statusMap[status] || status;
}
