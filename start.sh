#!/bin/bash

# ===========================================
# 快速启动脚本
# 用于已安装环境后的快速启动
# ===========================================

set -e

echo "========================================"
echo "任务巡检系统 - 快速启动"
echo "========================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "请先运行 install.sh 脚本"
    exit 1
fi

# 检查 MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL 未安装"
    echo "请先运行 install.sh 脚本"
    exit 1
fi

# 检查项目依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

# 检查数据库
echo "🔍 检查数据库..."
mysql -u inspector -p'Inspector2025!' -h localhost -e "USE inspector_db;" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "⚠️  数据库未初始化，正在初始化..."
    npm run init-db
    npm run seed
fi

echo ""
echo "========================================"
echo "✅ 环境检查完成！"
echo "========================================"
echo ""
echo "启动服务..."
echo ""

# 启动服务
npm start
