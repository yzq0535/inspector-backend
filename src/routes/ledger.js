const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

// 获取台账数据
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date, user_id, task_id } = req.query;
    
    let query = `
      SELECT i.*, t.name as task_name, u.name as user_name, u.department,
             r.name as reviewer_name
      FROM inspections i
      JOIN tasks t ON i.task_id = t.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users r ON i.reviewed_by = r.id
      WHERE 1=1
    `;
    const replacements = [];

    if (start_date) {
      query += ' AND i.date >= ?';
      replacements.push(start_date);
    }

    if (end_date) {
      query += ' AND i.date <= ?';
      replacements.push(end_date);
    }

    if (user_id) {
      query += ' AND i.user_id = ?';
      replacements.push(user_id);
    }

    if (task_id) {
      query += ' AND i.task_id = ?';
      replacements.push(task_id);
    }

    query += ' ORDER BY i.date DESC, i.created_at DESC';

    const [records] = await sequelize.query(query, { replacements });

    // 计算统计数据
    const stats = {
      total: records.length,
      completed: records.filter(r => r.status !== 'pending').length,
      pending: records.filter(r => r.status === 'pending').length,
      rejected: records.filter(r => r.status === 'rejected').length,
      abnormal: records.filter(r => r.has_abnormal === 1).length,
      avgScore: records.length > 0 
        ? Math.round(records.reduce((sum, r) => sum + (r.score || 0), 0) / records.length)
        : 0
    };

    response.success(res, {
      summary: stats,
      records
    });
  } catch (error) {
    console.error('获取台账数据错误:', error);
    response.error(res, '获取台账数据失败');
  }
});

// 获取统计数据
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // 本月统计数据
    const [monthlyStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status != 'pending' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN has_abnormal = 1 THEN 1 ELSE 0 END) as abnormal,
        AVG(score) as avg_score
      FROM inspections
      WHERE date >= ? AND date <= ?
    `, { replacements: [startOfMonth, endOfMonth] });

    // 用户统计数据
    const [userStats] = await sequelize.query(`
      SELECT 
        u.id, u.name, u.department,
        COUNT(i.id) as total,
        SUM(CASE WHEN i.status != 'pending' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN i.has_abnormal = 1 THEN 1 ELSE 0 END) as abnormal
      FROM users u
      LEFT JOIN inspections i ON u.id = i.user_id AND i.date >= ? AND i.date <= ?
      WHERE u.role IN ('shop_manager', 'shop_staff')
      GROUP BY u.id, u.name, u.department
    `, { replacements: [startOfMonth, endOfMonth] });

    response.success(res, {
      monthly: monthlyStats[0],
      users: userStats
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    response.error(res, '获取统计数据失败');
  }
});

// 导出台账（Excel格式）
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date, user_id, task_id } = req.query;
    
    let query = `
      SELECT i.date, u.name as user_name, u.department, t.name as task_name,
             i.score, i.status, i.has_abnormal, i.remark
      FROM inspections i
      JOIN tasks t ON i.task_id = t.id
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const replacements = [];

    if (start_date) {
      query += ' AND i.date >= ?';
      replacements.push(start_date);
    }

    if (end_date) {
      query += ' AND i.date <= ?';
      replacements.push(end_date);
    }

    if (user_id) {
      query += ' AND i.user_id = ?';
      replacements.push(user_id);
    }

    if (task_id) {
      query += ' AND i.task_id = ?';
      replacements.push(task_id);
    }

    query += ' ORDER BY i.date DESC';

    const [records] = await sequelize.query(query, { replacements });

    // 生成 CSV 数据
    let csv = '日期,姓名,部门,任务名称,得分,状态,是否有异常,备注\n';
    
    records.forEach(record => {
      csv += `${record.date},${record.user_name},${record.department},${record.task_name},${record.score || 0},${record.status},${record.has_abnormal ? '是' : '否'},${record.remark || ''}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ledger-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('导出台账错误:', error);
    response.error(res, '导出台账失败');
  }
});

module.exports = router;
