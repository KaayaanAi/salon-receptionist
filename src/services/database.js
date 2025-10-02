/**
 * MongoDB Database Connection Manager
 * Handles connection pooling and collection access for multi-tenant system
 */

import { MongoClient } from 'mongodb';

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  /**
   * Connect to MongoDB
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.client) {
      return; // Already connected
    }

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'salon_bookings';

    try {
      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      this.db = this.client.db(dbName);

      console.error(`✅ Connected to MongoDB: ${dbName}`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get a collection for a specific tenant
   * @param {string} tenantId - Tenant identifier
   * @param {string} collectionName - Collection name (without prefix)
   * @returns {import('mongodb').Collection}
   */
  getCollection(tenantId, collectionName) {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const fullCollectionName = `${tenantId}_${collectionName}`;
    return this.db.collection(fullCollectionName);
  }

  /**
   * Create indexes for a tenant's collections
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<void>}
   */
  async createIndexes(tenantId) {
    try {
      const appointmentsCol = this.getCollection(tenantId, 'appointments');

      // Create indexes
      await appointmentsCol.createIndex({ booking_id: 1 }, { unique: true });
      await appointmentsCol.createIndex({ phone_number: 1 });
      await appointmentsCol.createIndex({ date: 1, time: 1 });
      await appointmentsCol.createIndex({ tenant_id: 1, date: 1 });
      await appointmentsCol.createIndex({ status: 1 });

      console.error(`✅ Indexes created for tenant: ${tenantId}`);
    } catch (error) {
      console.error(`❌ Index creation failed for ${tenantId}:`, error.message);
    }
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.error('✅ MongoDB connection closed');
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.client !== null && this.db !== null;
  }
}

// Singleton instance
const database = new Database();

export default database;
