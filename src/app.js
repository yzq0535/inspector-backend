const express = require('express');
const cors = require('cors');
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
app.use(cors());
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
        url: `http://localhost:${PORT}`,
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
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js']
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

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在'
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('无法连接到数据库，服务启动失败');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`✅ 服务器启动成功！`);
      console.log(`📡 服务地址: http://localhost:${PORT}`);
      console.log(`📚 API 文档: http://localhost:${PORT}/api-docs`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
