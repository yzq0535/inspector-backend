const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

// 获取任务列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const replacements = [];

    if (type) {
      query += ' AND task_type = ?';
      replacements.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      replacements.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [tasks] = await sequelize.query(query, { replacements });

    // 获取每个任务的检查项
    for (let task of tasks) {
      const [items] = await sequelize.query(
        'SELECT * FROM task_items WHERE task_id = ? ORDER BY sort_order',
        { replacements: [task.id] }
      );
      task.items = items;
    }

    response.success(res, tasks);
  } catch (error) {
    console.error('获取任务列表错误:', error);
    response.error(res, '获取任务列表失败');
  }
});

// 获取单个任务
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [tasks] = await sequelize.query(
      'SELECT * FROM tasks WHERE id = ?',
      { replacements: [req.params.id] }
    );

    if (tasks.length === 0) {
      return response.notFound(res, '任务不存在');
    }

    const task = tasks[0];

    // 获取检查项
    const [items] = await sequelize.query(
      'SELECT * FROM task_items WHERE task_id = ? ORDER BY sort_order',
      { replacements: [task.id] }
    );
    task.items = items;

    response.success(res, task);
  } catch (error) {
    console.error('获取任务信息错误:', error);
    response.error(res, '获取任务信息失败');
  }
});

// 创建任务（仅管理员和老板）
router.post('/', authMiddleware, roleMiddleware('boss', 'admin'), async (req, res) => {
  try {
    const { name, description, task_type, weekly_day, monthly_day, items } = req.body;

    if (!name || !task_type) {
      return response.error(res, '请填写任务名称和类型', 400);
    }

    // 创建任务
    const [result] = await sequelize.query(
      `INSERT INTO tasks (name, description, task_type, weekly_day, monthly_day, created_by, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      { replacements: [name, description || null, task_type, weekly_day || null, monthly_day || null, req.user.id] }
    );

    const taskId = result.insertId;

    // 创建检查项
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await sequelize.query(
          `INSERT INTO task_items (task_id, title, description, require_photo, required, sort_order) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          { replacements: [taskId, item.title, item.description || null, item.requirePhoto ? 1 : 0, item.required !== false ? 1 : 0, i] }
        );
      }
    }

    // 返回创建的任务
    const [newTask] = await sequelize.query('SELECT * FROM tasks WHERE id = ?', { replacements: [taskId] });
    const [newItems] = await sequelize.query('SELECT * FROM task_items WHERE task_id = ? ORDER BY sort_order', { replacements: [taskId] });
    newTask[0].items = newItems;

    response.success(res, newTask[0], '任务创建成功');
  } catch (error) {
    console.error('创建任务错误:', error);
    response.error(res, '创建任务失败');
  }
});

// 更新任务
router.put('/:id', authMiddleware, roleMiddleware('boss', 'admin'), async (req, res) => {
  try {
    const { name, description, task_type, weekly_day, monthly_day, status, items } = req.body;
    const taskId = req.params.id;

    const updates = [];
    const replacements = [];

    if (name) {
      updates.push('name = ?');
      replacements.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      replacements.push(description);
    }

    if (task_type) {
      updates.push('task_type = ?');
      replacements.push(task_type);
    }

    if (weekly_day !== undefined) {
      updates.push('weekly_day = ?');
      replacements.push(weekly_day);
    }

    if (monthly_day !== undefined) {
      updates.push('monthly_day = ?');
      replacements.push(monthly_day);
    }

    if (status) {
      updates.push('status = ?');
      replacements.push(status);
    }

    if (updates.length > 0) {
      replacements.push(taskId);
      await sequelize.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, { replacements });
    }

    // 更新检查项
    if (items && items.length > 0) {
      // 删除旧的检查项
      await sequelize.query('DELETE FROM task_items WHERE task_id = ?', { replacements: [taskId] });

      // 添加新的检查项
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await sequelize.query(
          `INSERT INTO task_items (task_id, title, description, require_photo, required, sort_order) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          { replacements: [taskId, item.title, item.description || null, item.requirePhoto ? 1 : 0, item.required !== false ? 1 : 0, i] }
        );
      }
    }

    // 返回更新后的任务
    const [updatedTask] = await sequelize.query('SELECT * FROM tasks WHERE id = ?', { replacements: [taskId] });
    const [updatedItems] = await sequelize.query('SELECT * FROM task_items WHERE task_id = ? ORDER BY sort_order', { replacements: [taskId] });
    updatedTask[0].items = updatedItems;

    response.success(res, updatedTask[0], '任务更新成功');
  } catch (error) {
    console.error('更新任务错误:', error);
    response.error(res, '更新任务失败');
  }
});

// 删除任务
router.delete('/:id', authMiddleware, roleMiddleware('boss', 'admin'), async (req, res) => {
  try {
    const taskId = req.params.id;

    // 删除检查项
    await sequelize.query('DELETE FROM task_items WHERE task_id = ?', { replacements: [taskId] });

    // 删除任务
    await sequelize.query('DELETE FROM tasks WHERE id = ?', { replacements: [taskId] });

    response.success(res, null, '任务删除成功');
  } catch (error) {
    console.error('删除任务错误:', error);
    response.error(res, '删除任务失败');
  }
});

module.exports = router;
