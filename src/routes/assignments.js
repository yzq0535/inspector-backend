const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

// 获取分配给我的任务
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    const dayOfMonth = new Date().getDate();

    const [assignments] = await sequelize.query(`
      SELECT a.*, t.name as task_name, t.description as task_description, 
             t.task_type, t.weekly_day, t.monthly_day,
             u.name as user_name
      FROM assignments a
      JOIN tasks t ON a.task_id = t.id
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `, { replacements: [req.user.id] });

    // 获取每个分配任务的检查项
    for (let assignment of assignments) {
      const [items] = await sequelize.query(
        'SELECT * FROM task_items WHERE task_id = ? ORDER BY sort_order',
        { replacements: [assignment.task_id] }
      );
      assignment.items = items;

      // 检查今日是否已提交
      const [submissions] = await sequelize.query(
        'SELECT id FROM inspections WHERE assignment_id = ? AND date = ?',
        { replacements: [assignment.id, today] }
      );
      assignment.submitted = submissions.length > 0;
    }

    // 过滤周期任务
    const filteredAssignments = assignments.filter(a => {
      // 如果是普通任务，直接显示
      if (a.task_type === 'daily') return true;
      
      // 如果是周任务，检查是否是当天
      if (a.task_type === 'weekly' && a.weekly_day === dayOfWeek) return true;
      
      // 如果是月任务，检查是否是当天
      if (a.task_type === 'monthly' && a.monthly_day === dayOfMonth) return true;
      
      return false;
    });

    response.success(res, filteredAssignments);
  } catch (error) {
    console.error('获取我的任务错误:', error);
    response.error(res, '获取我的任务失败');
  }
});

// 获取任务分配列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { task_id, user_id } = req.query;
    
    let query = `
      SELECT a.*, t.name as task_name, u.name as user_name, u.department
      FROM assignments a
      JOIN tasks t ON a.task_id = t.id
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const replacements = [];

    if (task_id) {
      query += ' AND a.task_id = ?';
      replacements.push(task_id);
    }

    if (user_id) {
      query += ' AND a.user_id = ?';
      replacements.push(user_id);
    }

    query += ' ORDER BY a.created_at DESC';

    const [assignments] = await sequelize.query(query, { replacements });
    response.success(res, assignments);
  } catch (error) {
    console.error('获取分配列表错误:', error);
    response.error(res, '获取分配列表失败');
  }
});

// 分配任务（仅管理员和老板）
router.post('/', authMiddleware, roleMiddleware('boss', 'admin', 'shop_manager'), async (req, res) => {
  try {
    const { task_id, user_id } = req.body;

    if (!task_id || !user_id) {
      return response.error(res, '请选择任务和用户', 400);
    }

    // 检查是否已分配
    const [existing] = await sequelize.query(
      'SELECT id FROM assignments WHERE task_id = ? AND user_id = ?',
      { replacements: [task_id, user_id] }
    );

    if (existing.length > 0) {
      return response.error(res, '该任务已分配给此用户', 400);
    }

    const [result] = await sequelize.query(
      `INSERT INTO assignments (task_id, user_id, status) VALUES (?, ?, 'assigned')`,
      { replacements: [task_id, user_id] }
    );

    const [newAssignment] = await sequelize.query(`
      SELECT a.*, t.name as task_name, u.name as user_name
      FROM assignments a
      JOIN tasks t ON a.task_id = t.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `, { replacements: [result.insertId] });

    response.success(res, newAssignment[0], '任务分配成功');
  } catch (error) {
    console.error('分配任务错误:', error);
    response.error(res, '分配任务失败');
  }
});

// 批量分配任务
router.post('/batch', authMiddleware, roleMiddleware('boss', 'admin'), async (req, res) => {
  try {
    const { task_id, user_ids } = req.body;

    if (!task_id || !user_ids || !Array.isArray(user_ids)) {
      return response.error(res, '请选择任务和用户', 400);
    }

    const results = [];
    for (const user_id of user_ids) {
      const [existing] = await sequelize.query(
        'SELECT id FROM assignments WHERE task_id = ? AND user_id = ?',
        { replacements: [task_id, user_id] }
      );

      if (existing.length === 0) {
        await sequelize.query(
          'INSERT INTO assignments (task_id, user_id, status) VALUES (?, ?, "assigned")',
          { replacements: [task_id, user_id] }
        );
        results.push(user_id);
      }
    }

    response.success(res, { assigned: results.length }, `成功分配给 ${results.length} 个用户`);
  } catch (error) {
    console.error('批量分配任务错误:', error);
    response.error(res, '批量分配任务失败');
  }
});

// 取消分配
router.delete('/:id', authMiddleware, roleMiddleware('boss', 'admin', 'shop_manager'), async (req, res) => {
  try {
    const assignmentId = req.params.id;

    await sequelize.query('DELETE FROM assignments WHERE id = ?', { replacements: [assignmentId] });
    response.success(res, null, '取消分配成功');
  } catch (error) {
    console.error('取消分配错误:', error);
    response.error(res, '取消分配失败');
  }
});

module.exports = router;
