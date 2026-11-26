# Base image
FROM node:26-alpine AS base

# Install the latest Alpine security fixes available during the build.
RUN apk upgrade --no-cache

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Development stage (used by docker compose dev target)
FROM base AS dev

RUN npm install

COPY . .

EXPOSE 8080

CMD ["sh", "-c", "npm install && npm run dev"]

# Production stage
FROM base AS prod

RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

RUN chown -R node:node /app/public/vendor

USER node

EXPOSE 8080

CMD ["npm", "start"]
