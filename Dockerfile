# Stage 1: Build the Next.js application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN pnpm build

# Stage 2: Run the Next.js application
FROM node:18-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Set NODE_ENV to production
ENV NODE_ENV production

# Copy necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/public ./public

# Expose the port Next.js runs on
EXPOSE 3000

# Command to start the Next.js application
CMD ["pnpm", "start"]
