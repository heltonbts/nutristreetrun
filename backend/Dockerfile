FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build && echo "=== dist contents ===" && ls -la dist/ && echo "=== dist/main.js ===" && ls dist/main.js

EXPOSE 3000

CMD ["node", "dist/main"]
