# Frontend Dockerfile (Dev)
FROM node:22-slim

WORKDIR /app

# Run everything as node user so node_modules are writable at runtime
# (needed for Vite's .vite/deps cache inside the anonymous volume)
RUN chown node:node /app
USER node

# Install dependencies first (cached)
COPY --chown=node:node package.json package-lock.json ./
# --legacy-peer-deps: react-simple-maps@3 declares peer react ^18, not 19.
# Remove once react-simple-maps releases React 19 support.
RUN npm ci --legacy-peer-deps

# Copy source code
COPY --chown=node:node . .

# Expose Vite port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
