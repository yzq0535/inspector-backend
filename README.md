# 任务巡检系统 - 后端部署指南

## 📋 目录

1. [环境要求](#环境要求)
2. [快速安装](#快速安装)
3. [详细配置](#详细配置)
4. [启动服务](#启动服务)
5. [测试验证](#测试验证)
6. [API 文档](#api-文档)
7. [常见问题](#常见问题)

---

## 🖥️ 环境要求

- **操作系统**: Ubuntu 22.04 LTS
- **Node.js**: 18.x 或更高版本
- **MySQL**: 8.0 或更高版本
- **内存**: 至少 1GB RAM
- **磁盘空间**: 至少 5GB

---

## 🚀 快速安装

### 步骤 1: 上传代码到虚拟机

您可以将 `/workspace/inspector-backend` 目录通过以下方式上传到虚拟机：

**方式 A: 使用 SCP（Windows PowerShell）**
```powershell
scp -i "您的私钥文件" -P 65522 -r C:\path\to\inspector-backend root@192.168.47.135:/opt/
```

**方式 B: 使用 SFTP 工具**
- 使用 WinSCP、FileZilla 等工具
- 连接信息：
  - 主机: 192.168.47.135
  - 端口: 65522
  - 用户名: root
  - 密钥文件: 您的私钥

**方式 C: Git 克隆**
```bash
# 在虚拟机上执行
cd /opt
git clone https://github.com/yzq0535/inspectior-backend.git
# 或使用您创建的仓库地址
```

### 步骤 2: 安装环境

上传代码后，在虚拟机上执行：

```bash
# 进入项目目录
cd /opt/inspector-backend

# 添加执行权限
chmod +x install.sh

# 运行安装脚本
sudo ./install.sh
```

安装脚本会自动：
- ✅ 更新系统包
- ✅ 安装 MySQL 8.0
- ✅ 配置 MySQL（创建数据库和用户）
- ✅ 安装 Node.js 18.x
- ✅ 安装项目依赖
- ✅ 初始化数据库表结构
- ✅ 创建 systemd 服务

### 步骤 3: 配置环境变量

```bash
# 复制环境变量配置文件
sudo cp /opt/inspector-backend/.env.example /opt/inspector-backend/.env

# 编辑配置文件
sudo nano /opt/inspector-backend/.env
```

修改以下配置（可选）：

```env
# 服务端口
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=inspector_db
DB_USER=inspector
DB_PASSWORD=Inspector2025!

# JWT 密钥（生产环境请使用更复杂的密钥）
JWT_SECRET=your-secret-key-change-this-in-production-2025
JWT_EXPIRES_IN=7d
```

### 步骤 4: 初始化数据

```bash
cd /opt/inspector-backend

# 创建数据库表
sudo npm run init-db

# 插入初始数据
sudo npm run seed
```

成功后会看到：
```
========================================
数据库初始化完成！
========================================

测试账号：
  老板: boss001 / 123456
  店长: manager001 / 123456
  店员: staff001 / 123456
```

### 步骤 5: 启动服务

**方式 A: 使用 systemd 服务（推荐）**
```bash
# 启动服务
sudo systemctl start inspector

# 设置开机启动
sudo systemctl enable inspector

# 查看服务状态
sudo systemctl status inspector
```

**方式 B: 直接启动**
```bash
cd /opt/inspector-backend
sudo npm start
```

---

## ⚙️ 详细配置

### 数据库配置

MySQL 连接信息：
- **主机**: localhost
- **端口**: 3306
- **用户名**: inspector
- **密码**: Inspector2025!
- **数据库**: inspector_db

### 防火墙配置

如果虚拟机有防火墙，需要开放 3000 端口：

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### Nginx 反向代理（可选）

如果需要通过域名访问，可以配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 测试验证

### 1. 检查服务状态

```bash
sudo systemctl status inspector
```

看到 `Active: active (running)` 表示服务正在运行。

### 2. 测试健康检查

```bash
curl http://localhost:3000/health
```

返回：
```json
{"status":"ok","message":"服务运行正常"}
```

### 3. 测试登录 API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"boss001","password":"123456"}'
```

返回：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "boss001",
      "name": "老板",
      "role": "boss",
      "department": "总公司"
    }
  }
}
```

### 4. 访问 API 文档

在浏览器中打开：
```
http://192.168.47.135:3000/api-docs
```

---

## 📚 API 文档

完整的 API 文档可以通过 Swagger UI 查看：
```
http://localhost:3000/api-docs
```

### 主要 API 端点

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/login` | 用户登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |
| GET | `/api/users` | 获取用户列表 | 是 |
| POST | `/api/users` | 创建用户 | 是 |
| GET | `/api/tasks` | 获取任务列表 | 是 |
| POST | `/api/tasks` | 创建任务 | 是 |
| GET | `/api/assignments/my` | 获取我的任务 | 是 |
| POST | `/api/assignments` | 分配任务 | 是 |
| POST | `/api/inspections` | 提交巡检 | 是 |
| GET | `/api/ledger` | 获取台账 | 是 |
| GET | `/api/abnormal-tasks/my` | 获取我的异常任务 | 是 |

### 认证方式

API 认证使用 JWT Bearer Token。

在请求头中添加：
```
Authorization: Bearer <token>
```

例如：
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## ❓ 常见问题

### 1. 安装脚本报错

如果安装脚本执行失败，可以分步执行：

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 MySQL
sudo apt install -y mysql-server mysql-client

# 3. 配置 MySQL
sudo mysql_secure_installation
sudo systemctl start mysql
sudo systemctl enable mysql

# 4. 创建数据库和用户
sudo mysql -u root -p
```

在 MySQL 中执行：
```sql
CREATE DATABASE IF NOT EXISTS inspector_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'inspector'@'localhost' IDENTIFIED BY 'Inspector2025!';
GRANT ALL PRIVILEGES ON inspector_db.* TO 'inspector'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Node.js 版本不对

```bash
# 检查 Node.js 版本
node --version

# 如果不是 18.x，卸载并重新安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
```

### 3. 端口被占用

```bash
# 查看 3000 端口占用
sudo lsof -i :3000

# 如果有其他进程占用，停止它
sudo kill -9 <PID>

# 或修改 .env 中的端口
```

### 4. 数据库连接失败

```bash
# 测试 MySQL 连接
mysql -u inspector -p'Inspector2025!' -h localhost inspector_db

# 如果连接成功，检查 .env 配置
cat /opt/inspector-backend/.env
```

### 5. 服务启动失败

```bash
# 查看日志
sudo journalctl -u inspector -n 50

# 或者查看应用日志
sudo tail -f /var/log/inspector/stdout.log
sudo tail -f /var/log/inspector/stderr.log
```

---

## 🔧 服务管理命令

```bash
# 启动服务
sudo systemctl start inspector

# 停止服务
sudo systemctl stop inspector

# 重启服务
sudo systemctl restart inspector

# 查看状态
sudo systemctl status inspector

# 查看日志
sudo journalctl -u inspector -f
```

---

## 📞 技术支持

如果遇到问题，可以：

1. 查看日志文件
2. 检查系统环境
3. 确认配置文件正确

祝您部署顺利！🎉
