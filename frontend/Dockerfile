FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

ARG NEXT_PUBLIC_CODE_URL
ARG NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_CODE_URL=https://codeservice-1040040326387.europe-west1.run.app
ENV NEXT_PUBLIC_AUTH_URL=https://authservice-1040040326387.us-west1.run.app

RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]