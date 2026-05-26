#!/bin/bash

# ===========================================
# 任务巡检系统 - 环境安装脚本
# 适用于 Ubuntu 22.04
# ===========================================

echo "========================================"
echo "开始安装环境..."
echo "========================================"

# 更新系统包
echo "[1/7] 更新系统包..."
apt update && apt upgrade -y

# 安装 MySQL
echo "[2/7] 安装 MySQL..."
apt install -y mysql-server mysql-client

# 配置 MySQL
echo "[3/7] 配置 MySQL..."
systemctl start mysql
systemctl enable mysql

# 使用 sudo mysql 设置 root 密码并创建数据库
sudo mysql <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Inspector2025!';
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS inspector_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'inspector'@'localhost' IDENTIFIED BY 'Inspector2025!';
GRANT ALL PRIVILEGES ON inspector_db.* TO 'inspector'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo "✅ MySQL 数据库已创建完成！"
else
    echo "⚠️  MySQL 自动配置失败，请参考 MANUAL_INSTALL.md 手动配置"
fi

# 安装 Node.js 18.x
echo "[4/7] 安装 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证安装
node --version
npm --version

# 创建应用目录
echo "[5/7] 创建应用目录..."
mkdir -p /opt/inspector-backend
mkdir -p /var/log/inspector

# 安装项目依赖
echo "[6/7] 安装项目依赖..."
cd /opt/inspector-backend
npm install

# 初始化数据库（尝试执行）
echo "[7/7] 初始化数据库..."
if npm run init-db; then
    npm run seed
else
    echo "⚠️  数据库初始化失败，请手动执行："
    echo "  cd /opt/inspector-backend"
    echo "  npm run init-db"
    echo "  npm run seed"
fi

# 创建 systemd 服务文件
echo "[完成] 创建 systemd 服务..."
cat > /etc/systemd/system/inspector.service <<EOF
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

# 重新加载 systemd
systemctl daemon-reload

echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""
echo "📋 如果遇到问题，请参考 MANUAL_INSTALL.md"
echo ""
echo "服务管理命令："
echo "  启动服务: systemctl start inspector"
echo "  停止服务: systemctl stop inspector"
echo "  查看状态: systemctl status inspector"
echo "  开机启动: systemctl enable inspector"
echo ""
echo "API 服务地址: http://localhost:3000/api"
echo "API 文档地址: http://localhost:3000/api-docs"
echo ""
echo "数据库信息："
echo "  主机: localhost"
echo "  端口: 3306"
echo "  用户名: inspector"
echo "  密码: Inspector2025!"
echo "  数据库: inspector_db"
echo ""
