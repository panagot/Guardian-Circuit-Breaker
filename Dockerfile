# Guardian backend image (Railway / Render / Fly / any container host).
# Builds backend/ TypeScript, then runs the production start script which
# co-launches the in-process Ika HTTP signing bridge + the API.
FROM node:20-alpine AS builder

WORKDIR /app

# Install backend deps (caches when only source changes).
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# Build the backend.
COPY backend/ ./backend/
RUN cd backend && npm run build

# ---------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=8787

# Copy backend deps + compiled output from the build stage.
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/scripts ./scripts

EXPOSE 8787

CMD ["npm", "start"]
