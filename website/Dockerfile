FROM node:20-alpine

WORKDIR /app

# Copy lockfile + package.json for deterministic install
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy site source
COPY . .

EXPOSE 3001

CMD ["npm", "start"]
