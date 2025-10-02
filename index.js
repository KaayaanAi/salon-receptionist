#!/usr/bin/env node

/**
 * Salon Receptionist MCP - STDIO Server
 * Model Context Protocol server for salon appointment booking
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import database from './src/services/database.js';

// Import tools
import { bookAppointment, bookAppointmentTool } from './src/tools/bookAppointment.js';
import { getAvailableSlots, getAvailableSlotsTool } from './src/tools/getAvailableSlots.js';
import { findAppointment, findAppointmentTool } from './src/tools/findAppointment.js';
import { updateAppointment, updateAppointmentTool } from './src/tools/updateAppointment.js';
import { cancelAppointment, cancelAppointmentTool } from './src/tools/cancelAppointment.js';

// Create MCP server
const server = new Server(
  {
    name: 'salon-receptionist',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      bookAppointmentTool,
      getAvailableSlotsTool,
      findAppointmentTool,
      updateAppointmentTool,
      cancelAppointmentTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Ensure database is connected
    if (!database.isConnected()) {
      await database.connect();
    }

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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${name}`,
              }),
            },
          ],
        };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`Tool call error (${name}):`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  try {
    // Connect to database
    await database.connect();

    // Create STDIO transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    console.error('✅ Salon Receptionist MCP Server running on STDIO');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n🛑 Shutting down server...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 Shutting down server...');
  await database.close();
  process.exit(0);
});

main();
