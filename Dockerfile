# 第一阶段：构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# 安装git并克隆前端项目
RUN apk add --no-cache git
RUN git clone https://github.com/crackeer/web-tool-frontend.git .

# 安装依赖并构建
RUN npm install --registry=https://registry.npmmirror.com
RUN npm run build

# 第二阶段：构建后端
FROM golang:1.23.5-alpine AS backend-builder
WORKDIR /app/backend

# 设置Go环境变量
ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.cn,direct

# 复制后端项目文件（假设在构建上下文中）
COPY . .

# 安装依赖并编译
RUN go mod tidy
RUN go build -o web-tool-backend main.go

# 第三阶段：最终镜像
FROM alpine:3.19
WORKDIR /app

# 安装运行时依赖
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

# 复制编译好的后端二进制文件
COPY --from=backend-builder /app/backend/web-tool-backend ./

# 复制前端构建产物到bin同级目录
RUN mkdir -p ./frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend

# 复制配置文件
COPY .env* ./

# 设置可执行权限
RUN chmod +x ./web-tool-backend

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["./web-tool-backend"]
