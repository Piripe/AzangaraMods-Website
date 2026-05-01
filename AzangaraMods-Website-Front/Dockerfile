# Base stage
FROM node:25-alpine AS base
WORKDIR /app
COPY . /app
RUN npm ci
 
# Development stage
FROM base AS development
EXPOSE 3000
ENV NODE_ENV=development
ENTRYPOINT npm run dev
 
# Production stage
FROM base AS production
EXPOSE 3000
ENV NODE_ENV=production
RUN npm ci --omit=dev
ENTRYPOINT npm run build
ENTRYPOINT npm start
