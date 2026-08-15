FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
