const express = require('express');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { testConnection } = require('./config/database');

// 加载环境变量
require('dotenv').config();

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const assignmentRoutes = require('./routes/assignments');
const inspectionRoutes = require('./routes/inspections');
const abnormalTaskRoutes = require('./routes/abnormalTasks');
const ledgerRoutes = require('./routes/ledger');
const dingtalkRoutes = require('./routes/dingtalk');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
const corsMiddleware = require('./config/cors');
app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger 配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '任务巡检系统 API',
      version: '1.0.0',
      description: '任务巡检系统后端 API 文档',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://0.0.0.0:${PORT}`,
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/abnormal-tasks', abnormalTaskRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/dingtalk', dingtalkRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(500).json({ code: 500, message: '服务器错误' });
});

// 测试数据库连接并启动服务器
testConnection()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('========================================');
      console.log('✅ 服务器启动成功！');
      console.log(`📡 服务地址: http://0.0.0.0:${PORT}`);
      console.log(`📚 API 文档: http://0.0.0.0:${PORT}/api-docs`);
      console.log('========================================');
    });
  })
  .catch((err) => {
    console.error('数据库连接失败:', err);
    process.exit(1);
  });

module.exports = app;
