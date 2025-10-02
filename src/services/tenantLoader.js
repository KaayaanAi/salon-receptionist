/**
 * Tenant Configuration Loader
 * Loads and validates tenant configuration files
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for loaded tenant configs
const tenantCache = new Map();

/**
 * Load tenant configuration from JSON file
 * @param {string} tenantId - Tenant identifier (e.g., 'salon-farah')
 * @returns {Object} Tenant configuration object
 * @throws {Error} If tenant config not found or invalid
 */
export function loadTenantConfig(tenantId) {
  // Check cache first
  if (tenantCache.has(tenantId)) {
    return tenantCache.get(tenantId);
  }

  try {
    const configPath = join(__dirname, '../../tenants', `${tenantId}.json`);
    const configData = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Validate required fields
    validateTenantConfig(config, tenantId);

    // Cache the config
    tenantCache.set(tenantId, config);

    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Tenant configuration not found: ${tenantId}`);
    }
    throw new Error(`Failed to load tenant config for ${tenantId}: ${error.message}`);
  }
}

/**
 * Validate tenant configuration structure
 * @param {Object} config - Tenant configuration object
 * @param {string} tenantId - Tenant identifier
 * @throws {Error} If validation fails
 */
function validateTenantConfig(config, tenantId) {
  const required = ['tenant_id', 'salon_info', 'working_hours', 'services', 'settings'];

  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Invalid tenant config for ${tenantId}: missing ${field}`);
    }
  }

  if (config.tenant_id !== tenantId) {
    throw new Error(`Tenant ID mismatch: expected ${tenantId}, got ${config.tenant_id}`);
  }

  if (!Array.isArray(config.services) || config.services.length === 0) {
    throw new Error(`Invalid tenant config for ${tenantId}: services must be a non-empty array`);
  }
}

/**
 * Get service details by service ID
 * @param {string} tenantId - Tenant identifier
 * @param {string} serviceId - Service ID
 * @returns {Object|null} Service object or null if not found
 */
export function getService(tenantId, serviceId) {
  const config = loadTenantConfig(tenantId);
  return config.services.find(s => s.id === serviceId && s.active) || null;
}

/**
 * Get working hours for a specific day
 * @param {string} tenantId - Tenant identifier
 * @param {string} dayName - Day name (lowercase, e.g., 'sunday')
 * @returns {Object} Working hours object { start, end, enabled }
 */
export function getWorkingHours(tenantId, dayName) {
  const config = loadTenantConfig(tenantId);
  return config.working_hours[dayName] || { start: '00:00', end: '00:00', enabled: false };
}

/**
 * Check if a date is blocked for a tenant
 * @param {string} tenantId - Tenant identifier
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {boolean} True if date is blocked
 */
export function isDateBlocked(tenantId, date) {
  const config = loadTenantConfig(tenantId);
  return config.blocked_dates?.includes(date) || false;
}

/**
 * Clear tenant cache (useful for testing or config updates)
 * @param {string} [tenantId] - Optional specific tenant to clear, or clear all if not provided
 */
export function clearCache(tenantId = null) {
  if (tenantId) {
    tenantCache.delete(tenantId);
  } else {
    tenantCache.clear();
  }
}
