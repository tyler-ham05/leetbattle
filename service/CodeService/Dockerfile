FROM node:20-alpine
RUN apk add --no-cache python3
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4001
CMD ["npm", "run", "start"]
