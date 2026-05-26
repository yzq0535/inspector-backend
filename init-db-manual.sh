#!/bin/bash

# ===========================================
# 数据库初始化脚本
# 当安装脚本的数据库配置失败时使用
# ===========================================

echo "========================================"
echo "数据库初始化"
echo "========================================"

# 检查 MySQL 服务状态
echo "检查 MySQL 服务..."
if ! systemctl is-active --quiet mysql; then
    echo "MySQL 服务未启动，正在启动..."
    systemctl start mysql
fi

echo ""
echo "正在创建数据库和用户..."
# 使用 sudo mysql 连接
sudo mysql <<EOF
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
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库创建成功！"
    echo ""
    echo "数据库信息："
    echo "  主机: localhost"
    echo "  端口: 3306"
    echo "  数据库名: inspector_db"
    echo "  用户名: inspector"
    echo "  密码: Inspector2025!"
    echo ""
else
    echo ""
    echo "❌ 数据库创建失败"
    echo ""
    echo "尝试替代方案："
    echo "  请手动执行以下命令："
    echo ""
    echo "  sudo mysql"
    echo ""
    echo "  然后复制粘贴以下 SQL："
    echo ""
    cat <<SQL
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Inspector2025!';
  FLUSH PRIVILEGES;
  CREATE DATABASE IF NOT EXISTS inspector_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'inspector'@'localhost' IDENTIFIED BY 'Inspector2025!';
  GRANT ALL PRIVILEGES ON inspector_db.* TO 'inspector'@'localhost';
  FLUSH PRIVILEGES;
SQL
    echo ""
fi
