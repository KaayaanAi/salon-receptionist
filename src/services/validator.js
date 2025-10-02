/**
 * Input Validation Service
 * Validates phone numbers, dates, times, and service IDs
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import { getService, getWorkingHours, isDateBlocked, loadTenantConfig } from './tenantLoader.js';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);

/**
 * Validate Kuwait phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {{valid: boolean, formatted?: string, error?: string}}
 */
export function validatePhone(phoneNumber) {
  try {
    const phone = parsePhoneNumberFromString(phoneNumber, 'KW');

    if (!phone) {
      return {
        valid: false,
        error: 'رقم الهاتف غير صحيح'
      };
    }

    if (!phone.isValid()) {
      return {
        valid: false,
        error: 'رقم الهاتف غير صحيح'
      };
    }

    if (phone.country !== 'KW') {
      return {
        valid: false,
        error: 'يجب أن يكون رقم هاتف كويتي (+965)'
      };
    }

    return {
      valid: true,
      formatted: phone.format('E.164') // Returns +965XXXXXXXX
    };
  } catch (error) {
    return {
      valid: false,
      error: 'رقم الهاتف غير صحيح'
    };
  }
}

/**
 * Validate date
 * @param {string} tenantId - Tenant identifier
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {{valid: boolean, dayName?: string, error?: string}}
 */
export function validateDate(tenantId, date) {
  // Parse date
  const dateObj = dayjs(date, 'YYYY-MM-DD', true);

  if (!dateObj.isValid()) {
    return {
      valid: false,
      error: 'التاريخ غير صحيح'
    };
  }

  // Check if date is in the past
  const today = dayjs().startOf('day');
  if (dateObj.isBefore(today)) {
    return {
      valid: false,
      error: 'لا يمكن الحجز في تاريخ سابق'
    };
  }

  // Check advance booking limit
  const config = loadTenantConfig(tenantId);
  const maxAdvanceDays = config.settings.advance_booking_days || 30;
  const maxDate = today.add(maxAdvanceDays, 'day');
  if (dateObj.isAfter(maxDate)) {
    return {
      valid: false,
      error: `لا يمكن الحجز لأكثر من ${maxAdvanceDays} يوماً مقدماً`
    };
  }

  // Check if date is blocked
  if (isDateBlocked(tenantId, date)) {
    return {
      valid: false,
      error: 'هذا التاريخ غير متاح للحجز'
    };
  }

  const dayName = dateObj.format('dddd').toLowerCase();

  return {
    valid: true,
    dayName
  };
}

/**
 * Validate time against working hours
 * @param {string} tenantId - Tenant identifier
 * @param {string} time - Time string (HH:MM)
 * @param {string} dayName - Day of week (lowercase)
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTime(tenantId, time, dayName) {
  // Parse time
  const timeObj = dayjs(time, 'HH:mm', true);

  if (!timeObj.isValid()) {
    return {
      valid: false,
      error: 'الوقت غير صحيح'
    };
  }

  // Get working hours for this day
  const workingHours = getWorkingHours(tenantId, dayName);

  if (!workingHours.enabled) {
    return {
      valid: false,
      error: 'الصالون مغلق في هذا اليوم'
    };
  }

  const startTime = dayjs(workingHours.start, 'HH:mm');
  const endTime = dayjs(workingHours.end, 'HH:mm');

  if (timeObj.isBefore(startTime) || timeObj.isSameOrAfter(endTime)) {
    return {
      valid: false,
      error: `يرجى اختيار وقت ضمن ساعات العمل (${workingHours.start} - ${workingHours.end})`
    };
  }

  return {
    valid: true
  };
}

/**
 * Validate service ID
 * @param {string} tenantId - Tenant identifier
 * @param {string} serviceId - Service ID
 * @returns {{valid: boolean, service?: Object, error?: string}}
 */
export function validateService(tenantId, serviceId) {
  const service = getService(tenantId, serviceId);

  if (!service) {
    return {
      valid: false,
      error: 'الخدمة غير متوفرة'
    };
  }

  return {
    valid: true,
    service
  };
}

/**
 * Validate booking ID format
 * @param {string} bookingId - Booking ID to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateBookingId(bookingId) {
  // Format: BK-{tenant_id}-{YYYYMMDD}-{seq}
  const pattern = /^BK-[a-z0-9-]+-\d{8}-\d{3}$/;

  if (!pattern.test(bookingId)) {
    return {
      valid: false,
      error: 'رقم الحجز غير صحيح'
    };
  }

  return {
    valid: true
  };
}

/**
 * Validate all booking inputs
 * @param {Object} params - Booking parameters
 * @returns {{valid: boolean, errors?: string[], data?: Object}}
 */
export function validateBookingInput(params) {
  const { tenant_id, customer_name, phone_number, service_id, date, time } = params;
  const errors = [];
  const data = {};

  // Validate phone
  const phoneValidation = validatePhone(phone_number);
  if (!phoneValidation.valid) {
    errors.push(phoneValidation.error);
  } else {
    data.phone_number = phoneValidation.formatted;
  }

  // Validate date
  const dateValidation = validateDate(tenant_id, date);
  if (!dateValidation.valid) {
    errors.push(dateValidation.error);
  } else {
    data.dayName = dateValidation.dayName;
  }

  // Validate time (only if date is valid)
  if (dateValidation.valid) {
    const timeValidation = validateTime(tenant_id, time, dateValidation.dayName);
    if (!timeValidation.valid) {
      errors.push(timeValidation.error);
    }
  }

  // Validate service
  const serviceValidation = validateService(tenant_id, service_id);
  if (!serviceValidation.valid) {
    errors.push(serviceValidation.error);
  } else {
    data.service = serviceValidation.service;
  }

  // Validate customer name
  if (!customer_name || customer_name.trim().length < 2) {
    errors.push('الرجاء إدخال اسم العميل');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    data
  };
}
