# Salon Receptionist MCP

Multi-tenant salon appointment booking system using Model Context Protocol (MCP). Designed for beauty salons in Kuwait with Arabic language support and Kuwait timezone handling.

## 🎯 Features

- **Multi-Tenant Architecture**: Single MCP server serving multiple salons
- **5 Core Tools**: Book, find, update, cancel appointments + get available slots
- **Dual Interfaces**: STDIO MCP server + HTTP REST API
- **Kuwait-Specific**: +965 phone validation, Asia/Kuwait timezone, Arabic messages
- **Smart Scheduling**: Collision detection, working hours enforcement, slot calculation
- **Flexible Configuration**: JSON-based tenant configs for easy salon onboarding

---

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [n8n Integration](#n8n-integration)
- [Adding New Salons](#adding-new-salons)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Installation

### Prerequisites

- Node.js 18+
- MongoDB (local or remote)
- jq (for testing script)

### Local Setup

```bash
# Clone or navigate to project
cd salon-receptionist

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your MongoDB connection
nano .env

# Start HTTP server (recommended for testing)
npm start

# OR start STDIO server (for Claude Desktop)
npm run stdio
```

### Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=salon_bookings

# Server
NODE_ENV=development
TZ=Asia/Kuwait
PORT=4032
```

---

## ⚙️ Configuration

### Adding a New Salon

1. **Copy the template**:
   ```bash
   cp tenants/salon-template.json tenants/salon-mysalon.json
   ```

2. **Edit the configuration**:
   ```json
   {
     "tenant_id": "salon-mysalon",
     "salon_info": {
       "name": "صالون اسمي",
       "phone": "+96599000000",
       "location": "منطقتي، الكويت"
     },
     "working_hours": {
       "sunday": { "start": "09:00", "end": "21:00", "enabled": true }
     },
     "services": [
       {
         "id": "SRV-001",
         "name": "قص شعر",
         "duration_minutes": 30,
         "price": 5,
         "currency": "KWD"
       }
     ]
   }
   ```

3. **Create MongoDB indexes** (optional, auto-created on first use):
   ```javascript
   use salon_bookings
   db.mysalon_appointments.createIndex({ booking_id: 1 }, { unique: true })
   db.mysalon_appointments.createIndex({ phone_number: 1 })
   db.mysalon_appointments.createIndex({ date: 1, time: 1 })
   ```

### Configuration Fields

| Field | Description |
|-------|-------------|
| `tenant_id` | Unique salon identifier (lowercase, no spaces) |
| `working_hours` | Hours per day (sunday-saturday) |
| `services` | Array of services with duration and price |
| `settings.slot_duration_minutes` | Time slot increments (default: 30) |
| `settings.advance_booking_days` | Max days in advance for booking |
| `settings.cancellation_hours_notice` | Required notice for cancellation |
| `blocked_dates` | Array of dates (YYYY-MM-DD) unavailable for booking |

---

## 📚 API Documentation

### 1. Get Available Slots

Get available time slots for a specific date and service.

**MCP Tool**: `get_available_slots`

**HTTP REST**:
```bash
GET /slots?tenant_id=salon-farah&date=2025-10-10&service_id=SRV-002
```

**Parameters**:
- `tenant_id` (required): Salon identifier
- `date` (required): Date in YYYY-MM-DD format
- `service_id` (required): Service ID

**Response**:
```json
{
  "success": true,
  "date": "10/10/2025",
  "day": "الجمعة",
  "service": "صبغة شعر (120 دقيقة)",
  "available_slots": ["10:00", "10:30", "11:00", "14:00", "15:30"],
  "total_available": 5
}
```

---

### 2. Book Appointment

Create a new appointment booking.

**MCP Tool**: `book_appointment`

**HTTP REST**:
```bash
POST /book
Content-Type: application/json

{
  "tenant_id": "salon-farah",
  "customer_name": "سارة أحمد",
  "phone_number": "+96599888777",
  "service_id": "SRV-002",
  "date": "2025-10-10",
  "time": "14:00",
  "notes": "أول زيارة"
}
```

**Response**:
```json
{
  "success": true,
  "booking_id": "BK-salon-farah-20251010-001",
  "message": "تم حجز موعدك بنجاح في صالون فرح",
  "details": {
    "customer_name": "سارة أحمد",
    "service": "صبغة شعر",
    "date": "10/10/2025",
    "time": "14:00",
    "salon_phone": "+96599123456"
  }
}
```

**Booking ID Format**: `BK-{tenant_id}-{YYYYMMDD}-{sequential_number}`

---

### 3. Find Appointment

Search for appointments by booking ID or phone number.

**MCP Tool**: `find_appointment`

**HTTP REST**:
```bash
# By booking ID
GET /find?tenant_id=salon-farah&booking_id=BK-salon-farah-20251010-001

# By phone number
GET /find?tenant_id=salon-farah&phone_number=+96599888777
```

**Response**:
```json
{
  "success": true,
  "total": 1,
  "appointments": [
    {
      "booking_id": "BK-salon-farah-20251010-001",
      "customer_name": "سارة أحمد",
      "service": "صبغة شعر",
      "date": "10/10/2025",
      "time": "14:00",
      "status": "مؤكد"
    }
  ]
}
```

---

### 4. Update Appointment

Modify an existing appointment.

**MCP Tool**: `update_appointment`

**HTTP REST**:
```bash
PUT /update
Content-Type: application/json

{
  "tenant_id": "salon-farah",
  "booking_id": "BK-salon-farah-20251010-001",
  "new_time": "15:00",
  "new_notes": "تحديث الملاحظات"
}
```

**Optional Fields**: `new_date`, `new_time`, `new_service_id`, `new_notes`

---

### 5. Cancel Appointment

Cancel an existing appointment.

**MCP Tool**: `cancel_appointment`

**HTTP REST**:
```bash
DELETE /cancel
Content-Type: application/json

{
  "tenant_id": "salon-farah",
  "booking_id": "BK-salon-farah-20251010-001",
  "cancellation_reason": "ظرف طارئ"
}
```

**Cancellation Policy**: Enforces `cancellation_hours_notice` from tenant config.

---

## 🔗 n8n Integration

### Example Workflow: WhatsApp Booking Bot

```json
{
  "nodes": [
    {
      "name": "WhatsApp Trigger",
      "type": "n8n-nodes-base.webhook",
      "webhookId": "whatsapp-booking"
    },
    {
      "name": "Get Available Slots",
      "type": "n8n-nodes-base.httpRequest",
      "method": "GET",
      "url": "http://salon-receptionist:4032/slots",
      "parameters": {
        "tenant_id": "salon-farah",
        "date": "{{$json.message.date}}",
        "service_id": "{{$json.message.service}}"
      }
    },
    {
      "name": "Book Appointment",
      "type": "n8n-nodes-base.httpRequest",
      "method": "POST",
      "url": "http://salon-receptionist:4032/book",
      "body": {
        "tenant_id": "salon-farah",
        "customer_name": "{{$json.message.name}}",
        "phone_number": "{{$json.message.phone}}",
        "service_id": "{{$json.message.service}}",
        "date": "{{$json.message.date}}",
        "time": "{{$json.message.time}}"
      }
    }
  ]
}
```

---

## 🧪 Testing

### Run Test Script

```bash
# Start the HTTP server first
npm start

# In another terminal, run tests
./test-mcp.sh
```

The test script will:
1. Check server health
2. List available tools
3. Get available slots
4. Book an appointment
5. Find the appointment
6. Update the appointment
7. Cancel the appointment

### Manual Testing with curl

```bash
# Health check
curl http://localhost:4032/health

# Get slots
curl "http://localhost:4032/slots?tenant_id=salon-farah&date=2025-10-10&service_id=SRV-002"

# Book appointment
curl -X POST http://localhost:4032/book \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "salon-farah",
    "customer_name": "سارة أحمد",
    "phone_number": "+96599888777",
    "service_id": "SRV-002",
    "date": "2025-10-10",
    "time": "14:00"
  }'
```

---

## 🐳 Deployment

### Docker Setup

**Dockerfile** (already created):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4032
CMD ["node", "http-wrapper.js"]
```

**Add to docker-compose.yml**:
```yaml
salon-receptionist:
  build: ./salon-receptionist-mcp
  container_name: salon-receptionist
  ports:
    - "4032:4032"
  restart: unless-stopped
  networks:
    - kaayaan-network
  environment:
    - MONGODB_URI=mongodb://kaayaan:password@mongodb:27017
    - MONGODB_DB=salon_bookings
    - TZ=Asia/Kuwait
  depends_on:
    - mongodb
  volumes:
    - ./salon-receptionist-mcp/tenants:/app/tenants:ro
```

**Caddy Configuration**:
```
salon.kaayaan.ai {
    reverse_proxy salon-receptionist:4032
    tls admin@kaayaan.ai
}
```

### Deploy Commands

```bash
# Build and start
docker-compose up -d salon-receptionist

# View logs
docker-compose logs -f salon-receptionist

# Restart
docker-compose restart salon-receptionist
```

---

## 🛠️ Troubleshooting

### MongoDB Connection Failed

**Error**: `❌ MongoDB connection failed`

**Solution**:
1. Check MongoDB is running: `docker ps | grep mongodb`
2. Verify MONGODB_URI in .env
3. Test connection: `mongosh $MONGODB_URI`

### Tenant Config Not Found

**Error**: `Tenant configuration not found: salon-xyz`

**Solution**:
1. Ensure file exists: `ls tenants/salon-xyz.json`
2. Check tenant_id matches filename
3. Validate JSON syntax: `jq . tenants/salon-xyz.json`

### Slot Always Unavailable

**Error**: `عذراً، هذا الموعد محجوز مسبقاً`

**Solution**:
1. Check working hours in tenant config
2. Verify date is not in `blocked_dates`
3. Check existing appointments: `db.farah_appointments.find({ date: "2025-10-10" })`

### Phone Validation Failed

**Error**: `رقم الهاتف غير صحيح`

**Solution**:
- Use Kuwait format: `+965XXXXXXXX` (12 characters total)
- Example: `+96599888777`

---

## 📁 Project Structure

```
salon-receptionist/
├── package.json
├── index.js                    # STDIO MCP Server
├── http-wrapper.js             # HTTP API Server (port 4032)
├── .env.example
├── README.md
├── src/
│   ├── tools/                  # MCP Tools
│   │   ├── bookAppointment.js
│   │   ├── getAvailableSlots.js
│   │   ├── findAppointment.js
│   │   ├── updateAppointment.js
│   │   └── cancelAppointment.js
│   ├── services/
│   │   ├── database.js         # MongoDB connection
│   │   ├── tenantLoader.js     # Load tenant configs
│   │   ├── validator.js        # Input validation
│   │   └── scheduler.js        # Slot calculation
│   └── utils/
│       ├── dateHelpers.js      # Kuwait timezone
│       └── responseFormatter.js # Arabic/English responses
└── tenants/                    # Tenant configurations
    ├── salon-template.json
    ├── salon-farah.json
    └── salon-lamar.json
```

---

## 🔐 Security Notes

- Phone numbers are validated and formatted using libphonenumber-js
- MongoDB collections are isolated per tenant
- Input validation prevents injection attacks
- No authentication layer (add reverse proxy auth if exposing publicly)

---

## 📝 License

MIT License - Built for Kaayaan AI

---

## 🤝 Support

For issues or questions:
- Check MongoDB logs: `docker-compose logs mongodb`
- Check app logs: `docker-compose logs salon-receptionist`
- Verify tenant config JSON syntax
- Test with the provided test script

---

**Built with ❤️ for Kuwait beauty salons**
