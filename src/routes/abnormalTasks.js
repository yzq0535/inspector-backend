const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

// 获取异常任务列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, status } = req.query;
    
    let query = `
      SELECT at.*, u.name as created_by_name, c.name as completed_by_name
      FROM abnormal_tasks at
      LEFT JOIN users u ON at.created_by = u.id
      LEFT JOIN users c ON at.completed_by = c.id
      WHERE 1=1
    `;
    const replacements = [];

    // 普通用户只看自己创建的异常任务
    if (req.user.role !== 'boss' && req.user.role !== 'admin' && req.user.role !== 'shop_manager') {
      query += ' AND at.created_by = ?';
      replacements.push(req.user.id);
    } else if (user_id) {
      query += ' AND at.created_by = ?';
      replacements.push(user_id);
    }

    if (status) {
      query += ' AND at.status = ?';
      replacements.push(status);
    }

    query += ' ORDER BY at.created_at DESC';

    const [abnormalTasks] = await sequelize.query(query, { replacements });

    // 获取每个异常任务的检查项
    for (let task of abnormalTasks) {
      const [items] = await sequelize.query(
        'SELECT * FROM abnormal_task_items WHERE abnormal_task_id = ?',
        { replacements: [task.id] }
      );
      task.items = items;
    }

    response.success(res, abnormalTasks);
  } catch (error) {
    console.error('获取异常任务列表错误:', error);
    response.error(res, '获取异常任务列表失败');
  }
});

// 获取分配给我的异常任务
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [assignments] = await sequelize.query(`
      SELECT a.*, at.name, at.description, at.reason, at.status as task_status
      FROM assignments a
      JOIN abnormal_tasks at ON a.abnormal_task_id = at.id
      WHERE a.user_id = ? AND a.is_abnormal = 1 AND at.status = 'pending'
    `, { replacements: [req.user.id] });

    // 获取每个异常任务的检查项
    for (let assignment of assignments) {
      const [items] = await sequelize.query(
        'SELECT * FROM abnormal_task_items WHERE abnormal_task_id = ?',
        { replacements: [assignment.abnormal_task_id] }
      );
      assignment.items = items;
    }

    response.success(res, assignments);
  } catch (error) {
    console.error('获取我的异常任务错误:', error);
    response.error(res, '获取我的异常任务失败');
  }
});

// 处理异常任务
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const abnormalTaskId = req.params.id;
    const { items } = req.body;
    const userId = req.user.id;

    // 验证异常任务存在且属于当前用户
    const [abnormalTasks] = await sequelize.query(
      'SELECT * FROM abnormal_tasks WHERE id = ?',
      { replacements: [abnormalTaskId] }
    );

    if (abnormalTasks.length === 0) {
      return response.notFound(res, '异常任务不存在');
    }

    // 更新异常任务状态
    await sequelize.query(
      'UPDATE abnormal_tasks SET status = "completed", completed_by = ?, completed_at = NOW() WHERE id = ?',
      { replacements: [userId, abnormalTaskId] }
    );

    // 更新分配状态
    await sequelize.query(
      'UPDATE assignments SET status = "completed" WHERE abnormal_task_id = ? AND user_id = ?',
      { replacements: [abnormalTaskId, userId] }
    );

    response.success(res, null, '异常任务处理完成');
  } catch (error) {
    console.error('处理异常任务错误:', error);
    response.error(res, '处理异常任务失败');
  }
});

module.exports = router;
