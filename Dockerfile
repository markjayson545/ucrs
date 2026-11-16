# Base image
FROM node:22-alpine AS base

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Development stage (used by docker compose dev target)
FROM base AS dev

RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev"]

# Production stage
FROM base AS prod

RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

USER node

EXPOSE 8080

CMD ["npm", "start"]