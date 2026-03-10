# Frontend Dockerfile (Dev)
FROM node:22-slim

WORKDIR /app

# Install dependencies first (cached)
COPY package.json package-lock.json ./
# --legacy-peer-deps: react-simple-maps@3 declares peer react ^18, not 19.
# Remove once react-simple-maps releases React 19 support.
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Drop root privileges — node image ships with a built-in 'node' user (uid 1000)
USER node

# Expose Vite port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
