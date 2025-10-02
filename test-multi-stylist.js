/**
 * Test Multi-Stylist Support
 * Tests booking 5 appointments at same time (should succeed)
 * Tests booking 6th at same time (should fail)
 */

import database from './src/services/database.js';
import { bookAppointment } from './src/tools/bookAppointment.js';
import { getAvailableSlots } from './src/tools/getAvailableSlots.js';

const TEST_TENANT = 'salon-farah';
const TEST_DATE = '2025-10-15';
const TEST_TIME = '14:00';
const TEST_SERVICE = 'SRV-001';

async function runTest() {
  try {
    console.log('🧪 Testing Multi-Stylist Support\n');

    // Connect to database
    console.log('Connecting to database...');
    await database.connect();
    console.log('✅ Connected\n');

    // Clean up any existing test bookings
    console.log('Cleaning up test data...');
    const appointmentsCol = database.getCollection(TEST_TENANT, 'appointments');
    await appointmentsCol.deleteMany({ date: TEST_DATE, time: TEST_TIME });

    // Check initial availability
    console.log('\n1️⃣ Checking initial availability...');
    const slotsResponse = await getAvailableSlots({
      tenant_id: TEST_TENANT,
      date: TEST_DATE,
      service_id: TEST_SERVICE
    });
    console.log(`Available slots for ${TEST_TIME}:`,
      slotsResponse.available_slots.find(s => s.time === TEST_TIME) || 'Slot not found');

    // Book 5 appointments at same time
    console.log('\n2️⃣ Booking 5 appointments at same time (should all succeed)...');
    const bookings = [];
    for (let i = 1; i <= 5; i++) {
      const result = await bookAppointment({
        tenant_id: TEST_TENANT,
        customer_name: `عميل اختبار ${i}`,
        phone_number: `+96599${String(i).padStart(6, '0')}`,
        service_id: TEST_SERVICE,
        date: TEST_DATE,
        time: TEST_TIME,
        notes: `Test booking ${i}`
      });

      if (result.success) {
        console.log(`   ✅ Booking ${i}: ${result.booking_id}`);
        bookings.push(result.booking_id);
      } else {
        console.log(`   ❌ Booking ${i} FAILED: ${result.message}`);
      }
    }

    // Check availability after 5 bookings
    console.log('\n3️⃣ Checking availability after 5 bookings...');
    const slotsResponse2 = await getAvailableSlots({
      tenant_id: TEST_TENANT,
      date: TEST_DATE,
      service_id: TEST_SERVICE
    });
    const slot14 = slotsResponse2.available_slots.find(s => s.time === TEST_TIME);
    console.log(`Available slots for ${TEST_TIME}:`, slot14 || 'Slot fully booked (expected)');

    // Try to book 6th appointment (should fail)
    console.log('\n4️⃣ Attempting 6th booking (should fail with "لا توجد كوافيرة متاحة")...');
    const sixthBooking = await bookAppointment({
      tenant_id: TEST_TENANT,
      customer_name: 'عميل اختبار 6',
      phone_number: '+96599000006',
      service_id: TEST_SERVICE,
      date: TEST_DATE,
      time: TEST_TIME,
      notes: 'Should fail'
    });

    if (!sixthBooking.success) {
      console.log(`   ✅ Correctly rejected: ${sixthBooking.message}`);
    } else {
      console.log(`   ❌ ERROR: 6th booking should have been rejected!`);
    }

    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   - Successful bookings: ${bookings.length}/5`);
    console.log(`   - 6th booking rejected: ${!sixthBooking.success ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   - Error message correct: ${sixthBooking.message === 'لا توجد كوافيرة متاحة في هذا الوقت' ? 'Yes ✅' : 'No ❌'}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await appointmentsCol.deleteMany({ date: TEST_DATE, time: TEST_TIME });
    console.log('   ✅ Cleanup complete');

    console.log('\n✅ Multi-stylist test completed!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
