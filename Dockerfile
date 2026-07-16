FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 3000
ENTRYPOINT ["node", "dist/cli/index.js"]
