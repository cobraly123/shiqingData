# 阿里云部署指南 (Deployment Guide)

本指南将帮助您将 GEO 项目部署到阿里云 ECS 服务器（推荐使用 Ubuntu 20.04/22.04 或 CentOS 7/8）。

## 1. 环境准备 (Prerequisites)

登录到您的服务器，按顺序执行以下安装步骤。

### 安装 Node.js (v18+)

推荐使用 `nvm` 安装 Node.js：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# 安装 Node.js v18
nvm install 18
nvm use 18
nvm alias default 18
```

### 安装 PM2 (进程管理器)

用于保持后端服务常驻运行：

```bash
npm install -g pm2
```

### 安装 Nginx (Web 服务器)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx -y
```

**CentOS/Alibaba Cloud Linux:**
```bash
sudo yum install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 2. 项目部署 (Deployment)

假设将项目代码上传至 `/var/www/geo-app` 目录。

### 上传代码

您可以使用 `scp`、`git clone` 或 FTP 工具将本地代码上传到服务器。
确保上传目录结构如下：
```
/var/www/geo-app/
  ├── package.json
  ├── web/
  └── server/
```

### 部署后端 (Backend)

1. 进入 server 目录并安装依赖：
   ```bash
   cd /var/www/geo-app/server
   npm install
   ```

2. 配置环境变量：
   复制示例配置文件并编辑：
   ```bash
   cp .env.example .env
   nano .env
   ```
   **重要**：请务必在 `.env` 中填入您的 API Key（如 `DASHSCOPE_API_KEY` 等）。

3. 启动后端服务：
   ```bash
   pm2 start src/index.js --name "geo-backend"
   pm2 save
   pm2 startup
   ```

### 部署前端 (Frontend)

1. 进入 web 目录并安装依赖：
   ```bash
   cd /var/www/geo-app/web
   npm install
   ```

2. 构建生产环境代码：
   ```bash
   npm run build
   ```
   构建完成后，会生成 `/var/www/geo-app/web/dist` 目录，这是我们需要发布的静态文件。

---

## 3. 配置 Nginx

创建一个新的 Nginx 配置文件：

```bash
sudo nano /etc/nginx/conf.d/geo-app.conf
```

将以下内容粘贴进去（请将 `your_domain_or_ip` 替换为您的公网 IP 或域名）：

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    # 开启 gzip 压缩
    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/json application/javascript application/x-javascript application/xml;

    # 前端静态文件
    location / {
        root /var/www/geo-app/web/dist;
        index index.html;
        # 支持 React Router 的 History 模式
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 转发
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

保存并退出，然后测试并重载 Nginx：

```bash
sudo nginx -t
sudo nginx -s reload
```

---

## 4. 验证部署

1. 在浏览器访问 `http://<您的IP或域名>`。
2. 页面应正常加载。
3. 尝试进行一次分析（如“观心”页面的解码功能），检查网络请求是否成功发送到 `/api/...` 并且返回 200 OK。

## 5. 常用维护命令

- **查看后端日志**: `pm2 logs geo-backend`
- **重启后端**: `pm2 restart geo-backend`
- **更新前端**: 本地修改后重新上传 `web` 目录，在服务器运行 `npm run build`。
