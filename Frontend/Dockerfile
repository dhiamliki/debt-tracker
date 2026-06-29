# syntax=docker/dockerfile:1

# --- Stage 1: build the SPA ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps from the lockfile first for reproducible, cache-friendly builds.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build to /app/dist
COPY . .
RUN npm run build

# --- Stage 2: serve with nginx ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
