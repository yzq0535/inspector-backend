const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

// 提交巡检
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { assignment_id, task_id, items } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    if (!assignment_id || !task_id || !items) {
      return response.error(res, '请填写完整信息', 400);
    }

    // 检查今日是否已提交
    const [existing] = await sequelize.query(
      'SELECT id FROM inspections WHERE assignment_id = ? AND date = ?',
      { replacements: [assignment_id, today] }
    );

    if (existing.length > 0) {
      return response.error(res, '今日已提交巡检记录', 400);
    }

    // 检查是否有异常项
    const abnormalItems = items.filter(item => item.status === 'abnormal');
    const hasAbnormal = abnormalItems.length > 0;

    // 计算得分
    const normalCount = items.filter(item => item.status === 'normal').length;
    const score = Math.round((normalCount / items.length) * 100);

    // 创建巡检记录
    const [result] = await sequelize.query(
      `INSERT INTO inspections (assignment_id, task_id, user_id, date, score, has_abnormal, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [assignment_id, task_id, userId, today, score, hasAbnormal ? 1 : 0, 'pending'] }
    );

    const inspectionId = result.insertId;

    // 创建检查项详情
    for (const item of items) {
      await sequelize.query(
        `INSERT INTO inspection_items (inspection_id, item_id, status, remark, photos) 
         VALUES (?, ?, ?, ?, ?)`,
        { replacements: [inspectionId, item.item_id, item.status, item.remark || null, JSON.stringify(item.photos || [])] }
      );
    }

    // 如果有异常项，创建异常任务
    let abnormalTaskId = null;
    if (hasAbnormal) {
      const [task] = await sequelize.query('SELECT * FROM tasks WHERE id = ?', { replacements: [task_id] });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      const [abnormalResult] = await sequelize.query(
        `INSERT INTO abnormal_tasks (original_task_id, original_task_name, name, description, reason, created_by) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        { replacements: [task_id, task[0].name, `${task[0].name}的异常事项-${timestamp}`, `异常检查项：${abnormalItems.map(i => i.title).join('、')}`, '用户自评异常', userId] }
      );

      abnormalTaskId = abnormalResult.insertId;

      // 创建异常任务的检查项
      for (const item of abnormalItems) {
        await sequelize.query(
          `INSERT INTO abnormal_task_items (abnormal_task_id, original_item_id, title, description, require_photo) 
           VALUES (?, ?, ?, ?, ?)`,
          { replacements: [abnormalTaskId, item.item_id, item.title, item.description || null, item.require_photo || 0] }
        );
      }

      // 分配异常任务给用户
      await sequelize.query(
        'INSERT INTO assignments (task_id, user_id, is_abnormal, abnormal_task_id, status) VALUES (?, ?, 1, ?, "assigned")',
        { replacements: [abnormalTaskId, userId, abnormalTaskId] }
      );

      // 更新巡检记录
      await sequelize.query(
        'UPDATE inspections SET abnormal_task_id = ? WHERE id = ?',
        { replacements: [abnormalTaskId, inspectionId] }
      );
    }

    const [inspection] = await sequelize.query(
      'SELECT * FROM inspections WHERE id = ?',
      { replacements: [inspectionId] }
    );

    response.success(res, {
      ...inspection[0],
      abnormal_task_id: abnormalTaskId,
      message: hasAbnormal ? `提交成功！检测到 ${abnormalItems.length} 个异常项，已自动创建异常任务` : '提交成功'
    }, hasAbnormal ? `提交成功！检测到 ${abnormalItems.length} 个异常项` : '提交成功');
  } catch (error) {
    console.error('提交巡检错误:', error);
    response.error(res, '提交巡检失败');
  }
});

// 获取巡检记录列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, task_id, date, status } = req.query;
    
    let query = `
      SELECT i.*, t.name as task_name, u.name as user_name, u.department
      FROM inspections i
      JOIN tasks t ON i.task_id = t.id
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const replacements = [];

    // 普通用户只能查看自己的记录
    if (req.user.role !== 'boss' && req.user.role !== 'admin' && req.user.role !== 'shop_manager') {
      query += ' AND i.user_id = ?';
      replacements.push(req.user.id);
    } else if (user_id) {
      query += ' AND i.user_id = ?';
      replacements.push(user_id);
    }

    if (task_id) {
      query += ' AND i.task_id = ?';
      replacements.push(task_id);
    }

    if (date) {
      query += ' AND i.date = ?';
      replacements.push(date);
    }

    if (status) {
      query += ' AND i.status = ?';
      replacements.push(status);
    }

    query += ' ORDER BY i.date DESC, i.created_at DESC';

    const [inspections] = await sequelize.query(query, { replacements });

    response.success(res, inspections);
  } catch (error) {
    console.error('获取巡检记录错误:', error);
    response.error(res, '获取巡检记录失败');
  }
});

// 获取单个巡检记录详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [inspections] = await sequelize.query(
      `SELECT i.*, t.name as task_name, u.name as user_name, u.department,
              r.name as reviewer_name
       FROM inspections i
       JOIN tasks t ON i.task_id = t.id
       JOIN users u ON i.user_id = u.id
       LEFT JOIN users r ON i.reviewed_by = r.id
       WHERE i.id = ?`,
      { replacements: [req.params.id] }
    );

    if (inspections.length === 0) {
      return response.notFound(res, '巡检记录不存在');
    }

    const inspection = inspections[0];

    // 获取检查项详情
    const [items] = await sequelize.query(
      `SELECT ii.*, ti.title, ti.description, ti.require_photo
       FROM inspection_items ii
       JOIN task_items ti ON ii.item_id = ti.id
       WHERE ii.inspection_id = ?`,
      { replacements: [inspection.id] }
    );
    inspection.items = items;

    response.success(res, inspection);
  } catch (error) {
    console.error('获取巡检记录详情错误:', error);
    response.error(res, '获取巡检记录详情失败');
  }
});

// 审核巡检记录（仅管理员和老板）
router.put('/:id/review', authMiddleware, roleMiddleware('boss', 'admin', 'shop_manager'), async (req, res) => {
  try {
    const { status, remark } = req.body;
    const inspectionId = req.params.id;

    if (!status) {
      return response.error(res, '请选择审核状态', 400);
    }

    await sequelize.query(
      `UPDATE inspections SET status = ?, remark = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      { replacements: [status, remark || null, req.user.id, inspectionId] }
    );

    const [updatedInspection] = await sequelize.query(
      'SELECT * FROM inspections WHERE id = ?',
      { replacements: [inspectionId] }
    );

    response.success(res, updatedInspection[0], '审核成功');
  } catch (error) {
    console.error('审核巡检记录错误:', error);
    response.error(res, '审核失败');
  }
});

module.exports = router;
