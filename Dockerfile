FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 4032

# Health check (using ES6 import syntax)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node --input-type=module -e "import http from 'http'; http.get('http://localhost:4032/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start HTTP server
CMD ["node", "http-wrapper.js"]
