FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Declare build args. Next.js bakes these variables into static JS during build time
ARG NEXT_PUBLIC_API_URL="http://localhost:5005/api"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Copy built app outputs
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=3000
EXPOSE 3000

CMD ["npx", "next", "start"]
