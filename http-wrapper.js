/**
 * HTTP Wrapper for Salon Receptionist MCP
 * Provides HTTP/REST API access to MCP tools on port 4032
 */

import express from 'express';
import database from './src/services/database.js';

// Import tools
import { bookAppointment } from './src/tools/bookAppointment.js';
import { getAvailableSlots } from './src/tools/getAvailableSlots.js';
import { findAppointment } from './src/tools/findAppointment.js';
import { updateAppointment } from './src/tools/updateAppointment.js';
import { cancelAppointment } from './src/tools/cancelAppointment.js';

const app = express();
const PORT = process.env.PORT || 4032;

// Middleware
app.use(express.json());

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');

  // CORS (configurable via environment)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'salon-receptionist-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: database.isConnected() ? 'connected' : 'disconnected'
  });
});

// MCP protocol endpoint (JSON-RPC 2.0 compatible)
app.post('/mcp', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  try {
    // Ensure database is connected
    if (!database.isConnected()) {
      await database.connect();
    }

    // Handle tools/list request
    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'book_appointment',
              description: 'Book a new appointment for a customer'
            },
            {
              name: 'get_available_slots',
              description: 'Get available time slots for a date and service'
            },
            {
              name: 'find_appointment',
              description: 'Find appointment by booking ID or phone number'
            },
            {
              name: 'update_appointment',
              description: 'Update an existing appointment'
            },
            {
              name: 'cancel_appointment',
              description: 'Cancel an appointment'
            }
          ]
        }
      });
    }

    // Handle tools/call request
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      let result;

      switch (name) {
        case 'book_appointment':
          result = await bookAppointment(args);
          break;

        case 'get_available_slots':
          result = await getAvailableSlots(args);
          break;

        case 'find_appointment':
          result = await findAppointment(args);
          break;

        case 'update_appointment':
          result = await updateAppointment(args);
          break;

        case 'cancel_appointment':
          result = await cancelAppointment(args);
          break;

        default:
          return res.status(400).json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`
            }
          });
      }

      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        }
      });
    }

    // Unknown method
    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Unknown method: ${method}`
      }
    });

  } catch (error) {
    console.error('MCP request error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error.message
      }
    });
  }
});

// REST API endpoints (simpler alternative to MCP protocol)

// POST /book - Book appointment
app.post('/book', async (req, res) => {
  try {
    if (!database.isConnected()) {
      await database.connect();
    }
    const result = await bookAppointment(req.body);
    return res.json(result);
  } catch (error) {
    console.error('Book error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /slots - Get available slots
app.get('/slots', async (req, res) => {
  try {
    if (!database.isConnected()) {
      await database.connect();
    }
    const result = await getAvailableSlots(req.query);
    return res.json(result);
  } catch (error) {
    console.error('Slots error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /find - Find appointment
app.get('/find', async (req, res) => {
  try {
    if (!database.isConnected()) {
      await database.connect();
    }
    const result = await findAppointment(req.query);
    return res.json(result);
  } catch (error) {
    console.error('Find error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /update - Update appointment
app.put('/update', async (req, res) => {
  try {
    if (!database.isConnected()) {
      await database.connect();
    }
    const result = await updateAppointment(req.body);
    return res.json(result);
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /cancel - Cancel appointment
app.delete('/cancel', async (req, res) => {
  try {
    if (!database.isConnected()) {
      await database.connect();
    }
    const result = await cancelAppointment(req.body);
    return res.json(result);
  } catch (error) {
    console.error('Cancel error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /health',
      'POST /mcp',
      'POST /book',
      'GET /slots',
      'GET /find',
      'PUT /update',
      'DELETE /cancel'
    ]
  });
});

// Start server
async function main() {
  try {
    // Connect to database
    await database.connect();

    // Start HTTP server
    app.listen(PORT, () => {
      console.error(`✅ Salon Receptionist HTTP server running on port ${PORT}`);
      console.error(`🌐 Health check: http://localhost:${PORT}/health`);
      console.error(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
    });
  } catch (error) {
    console.error('❌ Failed to start HTTP server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n🛑 Shutting down HTTP server...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 Shutting down HTTP server...');
  await database.close();
  process.exit(0);
});

main();
