FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy site source
COPY . .

EXPOSE 3001

CMD ["npm", "start"]
