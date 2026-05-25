const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

// 发送钉钉消息（通过群机器人）
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { type, content, webhook } = req.body;

    if (!type || !content) {
      return response.error(res, '请提供消息类型和内容', 400);
    }

    // 如果没有提供 webhook，从数据库获取配置的 webhook
    let webhookUrl = webhook;
    if (!webhookUrl) {
      const [configs] = await sequelize.query(
        'SELECT config_value FROM dingtalk_configs WHERE config_key = "robot_webhook"'
      );
      if (configs.length > 0) {
        webhookUrl = configs[0].config_value;
      }
    }

    if (!webhookUrl) {
      return response.error(res, '请先配置钉钉群机器人 Webhook', 400);
    }

    // 构建消息
    let message = {};
    
    switch (type) {
      case 'text':
        message = {
          msgtype: 'text',
          text: {
            content: content
          }
        };
        break;
      case 'link':
        message = {
          msgtype: 'link',
          link: {
            text: content.text || '',
            title: content.title || '',
            messageUrl: content.url || ''
          }
        };
        break;
      case 'markdown':
        message = {
          msgtype: 'markdown',
          markdown: {
            title: content.title || '',
            text: content.text || ''
          }
        };
        break;
      default:
        return response.error(res, '不支持的消息类型', 400);
    }

    // 发送请求（这里需要实际的 HTTP 请求库，如 axios 或 node-fetch）
    // 由于没有引入额外的依赖，这里返回提示信息
    response.success(res, { message: '钉钉消息发送功能待实现，请配置 axios 或 node-fetch', message_data: message });
  } catch (error) {
    console.error('发送钉钉消息错误:', error);
    response.error(res, '发送钉钉消息失败');
  }
});

// 推送任务提醒
router.post('/task-reminder', authMiddleware, roleMiddleware('boss', 'admin', 'shop_manager'), async (req, res) => {
  try {
    const { user_id, task_id, message } = req.body;

    if (!user_id || !task_id) {
      return response.error(res, '请提供用户ID和任务ID', 400);
    }

    // 获取用户信息
    const [users] = await sequelize.query(
      'SELECT * FROM users WHERE id = ?',
      { replacements: [user_id] }
    );

    if (users.length === 0) {
      return response.notFound(res, '用户不存在');
    }

    // 获取任务信息
    const [tasks] = await sequelize.query(
      'SELECT * FROM tasks WHERE id = ?',
      { replacements: [task_id] }
    );

    if (tasks.length === 0) {
      return response.notFound(res, '任务不存在');
    }

    // 发送钉钉消息
    const reminderMessage = message || `您有新的巡检任务待完成：${tasks[0].name}`;
    
    // 这里调用发送消息的逻辑
    response.success(res, { 
      message: '任务提醒发送功能待实现',
      reminder: reminderMessage,
      user: users[0].name
    });
  } catch (error) {
    console.error('推送任务提醒错误:', error);
    response.error(res, '推送任务提醒失败');
  }
});

// 配置钉钉 Webhook
router.post('/config/webhook', authMiddleware, roleMiddleware('boss', 'admin'), async (req, res) => {
  try {
    const { webhook } = req.body;

    if (!webhook) {
      return response.error(res, '请提供 Webhook 地址', 400);
    }

    await sequelize.query(
      `INSERT INTO dingtalk_configs (config_key, config_value, description) 
       VALUES ('robot_webhook', ?, '钉钉群机器人 Webhook 地址')
       ON DUPLICATE KEY UPDATE config_value = ?`,
      { replacements: [webhook, webhook] }
    );

    response.success(res, null, 'Webhook 配置成功');
  } catch (error) {
    console.error('配置钉钉 Webhook 错误:', error);
    response.error(res, '配置钉钉 Webhook 失败');
  }
});

// 获取钉钉配置
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const [configs] = await sequelize.query('SELECT * FROM dingtalk_configs');
    
    const configObj = {};
    configs.forEach(config => {
      configObj[config.config_key] = {
        value: config.config_value,
        description: config.description
      };
    });

    response.success(res, configObj);
  } catch (error) {
    console.error('获取钉钉配置错误:', error);
    response.error(res, '获取钉钉配置失败');
  }
});

module.exports = router;
