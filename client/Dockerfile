FROM node:18-alpine AS build

WORKDIR /app
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps

COPY client/ .
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
