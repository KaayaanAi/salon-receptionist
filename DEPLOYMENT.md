# Deployment Guide

## 📦 What We Built

**Salon Receptionist MCP** - Multi-tenant appointment booking system for Kuwait beauty salons.

### Key Features
- ✅ 5 MCP Tools: book, slots, find, update, cancel
- ✅ Multi-tenant: One server, multiple salons via JSON configs
- ✅ Dual Interface: STDIO MCP + HTTP REST API (port 4032)
- ✅ Kuwait-specific: +965 validation, Asia/Kuwait timezone, Arabic errors
- ✅ Smart scheduling: Collision detection, working hours, slot calculation
- ✅ Unique booking IDs: `BK-{tenant_id}-{YYYYMMDD}-{seq}` format

### Project Stats
- **Files Created**: 22
- **Lines of Code**: ~1,200
- **Dependencies**: 5 (MCP SDK, Express, MongoDB, dayjs, libphonenumber-js)

---

## 🚀 Local Testing (Do This First!)

### Step 1: Check MongoDB

```bash
# If using Docker
docker ps | grep mongodb

# If not running, start it
docker-compose up -d mongodb

# Or install MongoDB locally
brew install mongodb-community
brew services start mongodb-community
```

### Step 2: Start the Server

```bash
cd salon-receptionist

# Start HTTP server
npm start

# You should see:
# ✅ Connected to MongoDB: salon_bookings_test
# ✅ Salon Receptionist HTTP server running on port 4032
```

### Step 3: Quick Health Check

```bash
# In another terminal
curl http://localhost:4032/health | jq

# Expected output:
# {
#   "status": "healthy",
#   "database": "connected"
# }
```

### Step 4: Run Full Test Suite

```bash
./test-mcp.sh

# This will:
# - Get available slots
# - Book an appointment
# - Find the appointment
# - Update it
# - Cancel it
```

---

## 🐳 Production Deployment

### Prerequisites on Production Server

1. **MongoDB Running**
   ```bash
   docker ps | grep mongodb
   ```

2. **Kaayaan Network Exists**
   ```bash
   docker network ls | grep kaayaan
   ```

3. **Environment Variables Ready**
   - MongoDB URI with credentials
   - Database name
   - Timezone set to Asia/Kuwait

### Deployment Steps

#### 1. Copy Project to Server

```bash
# From your local machine
scp -r salon-receptionist user@kaayaan-server:/path/to/kaayaan-stack/
```

#### 2. Add to docker-compose.yml

Copy the contents from `docker-compose.example.yml` to your main docker-compose.yml:

```yaml
  salon-receptionist:
    build: ./salon-receptionist
    container_name: salon-receptionist
    ports:
      - "4032:4032"
    restart: unless-stopped
    networks:
      - kaayaan-network
    environment:
      - MONGODB_URI=mongodb://kaayaan:KuwaitMongo2025!@mongodb:27017
      - MONGODB_DB=salon_bookings
      - TZ=Asia/Kuwait
    depends_on:
      - mongodb
    volumes:
      - ./salon-receptionist/tenants:/app/tenants:ro
```

#### 3. Update Caddy Configuration

Add to your Caddyfile:

```
salon.kaayaan.ai {
    reverse_proxy salon-receptionist:4032
    tls admin@kaayaan.ai
}
```

#### 4. Deploy

```bash
# Build and start
docker-compose up -d salon-receptionist

# Check logs
docker-compose logs -f salon-receptionist

# You should see:
# ✅ Connected to MongoDB: salon_bookings
# ✅ Salon Receptionist HTTP server running on port 4032
```

#### 5. Test Production

```bash
# Health check
curl https://salon.kaayaan.ai/health

# Get available slots
curl "https://salon.kaayaan.ai/slots?tenant_id=salon-farah&date=2025-10-10&service_id=SRV-002"
```

---

## 🔧 Adding New Salons

### 1. Create Tenant Config

```bash
cp tenants/salon-template.json tenants/salon-newsalon.json
```

### 2. Edit Configuration

```json
{
  "tenant_id": "salon-newsalon",
  "salon_info": {
    "name": "صالون جديد",
    "phone": "+96599000000",
    "location": "المنطقة، الكويت"
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

### 3. Restart Server (Production)

```bash
docker-compose restart salon-receptionist
```

### 4. Test New Tenant

```bash
curl "https://salon.kaayaan.ai/slots?tenant_id=salon-newsalon&date=2025-10-10&service_id=SRV-001"
```

---

## 📊 MongoDB Collections

Each tenant gets isolated collections:

```
salon_bookings/
├── farah_appointments
├── farah_customers (future)
├── lamar_appointments
├── lamar_customers (future)
└── newsalon_appointments
```

### Indexes (Auto-Created)

```javascript
// Per tenant
{tenant_id}_appointments:
  - booking_id (unique)
  - phone_number
  - date + time
  - tenant_id + date
  - status
```

---

## 🔗 n8n Integration Example

### HTTP Request Node

```json
{
  "method": "POST",
  "url": "https://salon.kaayaan.ai/book",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "tenant_id": "salon-farah",
    "customer_name": "{{ $json.name }}",
    "phone_number": "{{ $json.phone }}",
    "service_id": "{{ $json.service }}",
    "date": "{{ $json.date }}",
    "time": "{{ $json.time }}"
  }
}
```

---

## 🛠️ Troubleshooting

### Server Won't Start

```bash
# Check MongoDB
docker-compose logs mongodb

# Check network
docker network inspect kaayaan-network

# Check port
lsof -i :4032
```

### Tenant Config Errors

```bash
# Validate JSON
jq . tenants/salon-farah.json

# Check file exists
ls -la tenants/

# Check tenant_id matches filename
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "$MONGODB_URI"

# Check database
use salon_bookings
show collections
```

---

## 📈 Monitoring

### Health Checks

```bash
# Local
curl http://localhost:4032/health

# Production
curl https://salon.kaayaan.ai/health
```

### View Logs

```bash
# Docker
docker-compose logs -f salon-receptionist

# Last 100 lines
docker-compose logs --tail=100 salon-receptionist
```

### Check Appointments

```bash
# MongoDB shell
use salon_bookings
db.farah_appointments.find().pretty()

# Count appointments
db.farah_appointments.countDocuments({ status: "confirmed" })
```

---

## 🔒 Security Checklist

- [ ] MongoDB credentials in environment variables (not hardcoded)
- [ ] Caddy TLS certificate working (HTTPS)
- [ ] Phone validation active (libphonenumber-js)
- [ ] Tenant isolation verified (separate collections)
- [ ] Test booking IDs are unique across tenants
- [ ] .env file NOT committed to git
- [ ] MongoDB not exposed to public internet

---

## 📝 Next Steps (Optional Enhancements)

1. **WhatsApp Integration**: Connect n8n → Salon MCP → WhatsApp
2. **Customer Database**: Store customer history in `{tenant}_customers`
3. **SMS Reminders**: Use n8n scheduler → find appointments → send SMS
4. **Analytics Dashboard**: Add endpoints for booking statistics
5. **Redis Caching**: Implement for faster slot availability queries
6. **Multi-language**: Add English response option
7. **Payment Integration**: Add deposit handling for services

---

## ✅ Deployment Checklist

### Before Deploying

- [ ] All tests pass locally (`./test-mcp.sh`)
- [ ] MongoDB connection works
- [ ] Tenant configs validated
- [ ] .env file configured
- [ ] README.md reviewed

### After Deploying

- [ ] Health endpoint returns 200
- [ ] Can get available slots
- [ ] Can book appointment
- [ ] Booking ID format correct
- [ ] Can find appointment
- [ ] Can update appointment
- [ ] Can cancel appointment
- [ ] Logs show no errors

---

**Built and tested locally ✅**
**Ready for production deployment 🚀**
