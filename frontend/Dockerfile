# Frontend Dockerfile (Dev)
FROM node:22-slim

WORKDIR /app

# Install dependencies first (cached)
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
