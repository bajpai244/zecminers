# Frontend Dockerfile - Build and serve with nginx
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
ARG VITE_API_URL=http://localhost:13000
ENV VITE_API_URL=${VITE_API_URL}
RUN bun run build

# Production image with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
