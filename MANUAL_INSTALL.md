# 手动分步部署指南

## ⚠️ 如果安装脚本失败，请使用此指南

---

## 第一步：检查环境

在虚拟机上执行：

```bash
# 检查系统版本
lsb_release -a

# 更新系统
sudo apt update && sudo apt upgrade -y
```

---

## 第二步：安装 MySQL

```bash
# 安装 MySQL
sudo apt install -y mysql-server mysql-client

# 启动 MySQL 服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 检查状态
sudo systemctl status mysql
```

看到 `Active: active (running)` 表示成功。

---

## 第三步：配置 MySQL 数据库

### 方式 A：使用自动脚本（推荐）

```bash
cd /opt/inspector-backend
chmod +x init-db-manual.sh
sudo ./init-db-manual.sh
```

### 方式 B：手动执行 SQL

```bash
# 连接 MySQL
sudo mysql
```

复制以下 SQL 并粘贴：

```sql
-- 修改 root 密码
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Inspector2025!';
FLUSH PRIVILEGES;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS inspector_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
CREATE USER IF NOT EXISTS 'inspector'@'localhost' IDENTIFIED BY 'Inspector2025!';

-- 授权
GRANT ALL PRIVILEGES ON inspector_db.* TO 'inspector'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 测试连接

```bash
mysql -u inspector -p'Inspector2025!' -h localhost inspector_db
```

如果成功连接，继续下一步。

---

## 第四步：安装 Node.js

```bash
# 下载 Node.js 18.x 安装脚本
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -

# 安装 Node.js
sudo apt install -y nodejs

# 验证安装
node --version  # 应该是 18.x
npm --version
```

---

## 第五步：准备项目

```bash
# 进入 /opt 目录
cd /opt

# 克隆仓库（如果还没克隆）
if [ ! -d "inspector-backend" ]; then
    git clone https://github.com/yzq0535/inspector-backend.git
fi

# 进入项目目录
cd inspector-backend

# 复制环境变量文件
cp .env.example .env

# 编辑配置（可选）
nano .env

# 安装依赖
npm install
```

---

## 第六步：初始化数据库表和数据

```bash
cd /opt/inspector-backend

# 创建表结构
npm run init-db

# 插入初始数据
npm run seed
```

成功后会看到：
```
数据库初始化完成！
初始数据插入完成！
```

---

## 第七步：启动服务

### 方式 A：直接启动（用于测试）

```bash
cd /opt/inspector-backend
npm start
```

看到 `服务器启动成功！` 表示正常。

按 `Ctrl+C` 停止。

### 方式 B：创建 systemd 服务（推荐用于生产）

```bash
# 创建服务文件
sudo cat > /etc/systemd/system/inspector.service <<EOF
[Unit]
Description=Inspector Backend Service
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/inspector-backend
ExecStart=/usr/bin/node src/app.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/inspector/stdout.log
StandardError=append:/var/log/inspector/stderr.log

[Install]
WantedBy=multi-user.target
EOF

# 创建日志目录
sudo mkdir -p /var/log/inspector

# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start inspector

# 设置开机启动
sudo systemctl enable inspector

# 查看状态
sudo systemctl status inspector
```

---

## 第八步：测试验证

### 1. 健康检查

```bash
curl http://localhost:3000/health
```

返回：
```json
{"status":"ok","message":"服务运行正常"}
```

### 2. 测试登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"boss001","password":"123456"}'
```

应该返回登录成功的 JSON 数据。

---

## 📋 完整的服务管理命令

```bash
# 启动
sudo systemctl start inspector

# 停止
sudo systemctl stop inspector

# 重启
sudo systemctl restart inspector

# 查看状态
sudo systemctl status inspector

# 查看日志
sudo journalctl -u inspector -f

# 查看应用日志
sudo tail -f /var/log/inspector/stdout.log
sudo tail -f /var/log/inspector/stderr.log
```

---

## 🔧 故障排查

### 如果数据库连接失败

```bash
# 测试连接
mysql -u inspector -p'Inspector2025!' -h localhost inspector_db

# 检查 MySQL 服务
sudo systemctl status mysql
```

### 如果端口被占用

```bash
# 查看 3000 端口
sudo lsof -i :3000
# 或
sudo netstat -tlnp | grep 3000

# 杀死进程
sudo kill -9 <PID>

# 或者修改 .env 中的 PORT
```

---

## ✅ 部署成功后

访问 API 文档：
```
http://192.168.47.135:3000/api-docs
```

使用测试账号登录：
- 老板: `boss001` / `123456`
- 店长: `manager001` / `123456`
- 店员: `staff001` / `123456`

---

## 📞 需要帮助？

如果遇到问题，先检查日志文件：

```bash
# 系统服务日志
sudo journalctl -u inspector -n 100

# 应用日志
sudo cat /var/log/inspector/stderr.log
```
