FROM node:22-alpine

WORKDIR /app

# 安装依赖 (包含 ESLint 和 TypeScript 供校验器链使用)
COPY package.json package-lock.json ./
RUN npm ci --production=false

# 复制源码并编译
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# 仅保留运行时需要的文件
RUN npm ci --production && npm cache clean --force

EXPOSE 3000

# 默认启动 WebUI 模式 (Render/Railway 部署)
# CLI 模式: docker run ... rrratcoder run "你的任务"
CMD ["node", "dist/web/server.js"]
