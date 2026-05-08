# Base stage
FROM node:24-alpine AS base
WORKDIR /app
COPY . /app
 
# Development stage
FROM base AS development
EXPOSE 3000
ENV NODE_ENV=development
RUN npm ci
ENTRYPOINT npm run dev
 
# Production stage
FROM base AS production
EXPOSE 3000
ENV NODE_ENV=production
RUN npm ci --omit=dev
RUN npm run build
ENTRYPOINT npm start
