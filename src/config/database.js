const { Sequelize } = require('sequelize');
const path = require('path');

// 加载环境配置
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'inspector_db',
  process.env.DB_USER || 'inspector',
  process.env.DB_PASSWORD || 'Inspector2025!',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    timezone: '+08:00',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功！');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};
