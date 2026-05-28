FROM node:20-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output
COPY dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
