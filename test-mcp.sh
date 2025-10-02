#!/bin/bash

# Salon Receptionist MCP - Test Script
# Tests all 5 MCP tools via HTTP API

BASE_URL="http://localhost:4032"
TENANT_ID="salon-farah"
TEST_PHONE="+96599888777"
TEST_DATE="2025-10-11"
TEST_TIME="14:00"
SERVICE_ID="SRV-002"

echo "🧪 Testing Salon Receptionist MCP..."
echo "========================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check"
echo "-------------------"
curl -s $BASE_URL/health | jq
echo ""
echo ""

# Test 2: List Tools (MCP Protocol)
echo "2️⃣  List Available Tools (MCP Protocol)"
echo "----------------------------------------"
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }' | jq
echo ""
echo ""

# Test 3: Get Available Slots
echo "3️⃣  Get Available Slots"
echo "------------------------"
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"get_available_slots\",
      \"arguments\": {
        \"tenant_id\": \"$TENANT_ID\",
        \"date\": \"$TEST_DATE\",
        \"service_id\": \"$SERVICE_ID\"
      }
    },
    \"id\": 2
  }" | jq
echo ""
echo ""

# Test 4: Book Appointment
echo "4️⃣  Book Appointment"
echo "---------------------"
BOOKING_RESPONSE=$(curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"book_appointment\",
      \"arguments\": {
        \"tenant_id\": \"$TENANT_ID\",
        \"customer_name\": \"سارة أحمد\",
        \"phone_number\": \"$TEST_PHONE\",
        \"service_id\": \"$SERVICE_ID\",
        \"date\": \"$TEST_DATE\",
        \"time\": \"$TEST_TIME\",
        \"notes\": \"أول زيارة - اختبار\"
      }
    },
    \"id\": 3
  }")

echo "$BOOKING_RESPONSE" | jq

# Extract booking_id from response
BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.booking_id')
echo ""
echo "📌 Booking ID: $BOOKING_ID"
echo ""
echo ""

# Test 5: Find Appointment
echo "5️⃣  Find Appointment by Booking ID"
echo "------------------------------------"
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"find_appointment\",
      \"arguments\": {
        \"tenant_id\": \"$TENANT_ID\",
        \"booking_id\": \"$BOOKING_ID\"
      }
    },
    \"id\": 4
  }" | jq
echo ""
echo ""

# Test 6: Find by Phone Number
echo "6️⃣  Find Appointments by Phone"
echo "--------------------------------"
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"find_appointment\",
      \"arguments\": {
        \"tenant_id\": \"$TENANT_ID\",
        \"phone_number\": \"$TEST_PHONE\"
      }
    },
    \"id\": 5
  }" | jq
echo ""
echo ""

# Test 7: Update Appointment
echo "7️⃣  Update Appointment Time"
echo "-----------------------------"
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"update_appointment\",
      \"arguments\": {
        \"tenant_id\": \"$TENANT_ID\",
        \"booking_id\": \"$BOOKING_ID\",
        \"new_time\": \"15:00\",
        \"new_notes\": \"تم تحديث الموعد - اختبار\"
      }
    },
    \"id\": 6
  }" | jq
echo ""
echo ""

# Test 8: Cancel Appointment
echo "8️⃣  Cancel Appointment"
echo "-----------------------"
curl -s -X POST $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"cancel_appointment\",
      \"arguments\": {
        \"tenant_id\": \"$TENANT_ID\",
        \"booking_id\": \"$BOOKING_ID\",
        \"cancellation_reason\": \"اختبار - موعد تجريبي\"
      }
    },
    \"id\": 7
  }" | jq
echo ""
echo ""

echo "✅ Testing Complete!"
echo "========================================"
echo ""
echo "📝 Note: If you see errors about database connection,"
echo "   make sure MongoDB is running and .env is configured."
echo ""
