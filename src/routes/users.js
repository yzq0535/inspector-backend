const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

// 获取用户列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, department, status } = req.query;
    
    let query = 'SELECT id, username, name, role, department, phone, avatar, status, created_at FROM users WHERE 1=1';
    const replacements = [];

    if (role) {
      query += ' AND role = ?';
      replacements.push(role);
    }

    if (department) {
      query += ' AND department = ?';
      replacements.push(department);
    }

    if (status) {
      query += ' AND status = ?';
      replacements.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await sequelize.query(query, { replacements });
    response.success(res, users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    response.error(res, '获取用户列表失败');
  }
});

// 获取单个用户
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [users] = await sequelize.query(
      'SELECT id, username, name, role, department, phone, avatar, status, created_at FROM users WHERE id = ?',
      { replacements: [req.params.id] }
    );

    if (users.length === 0) {
      return response.notFound(res, '用户不存在');
    }

    response.success(res, users[0]);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    response.error(res, '获取用户信息失败');
  }
});

// 创建用户（仅管理员和老板）
router.post('/', authMiddleware, roleMiddleware('boss', 'admin'), async (req, res) => {
  try {
    const { username, password, name, role, department, phone } = req.body;

    if (!username || !password || !name || !role) {
      return response.error(res, '请填写完整信息', 400);
    }

    // 检查用户名是否已存在
    const [existing] = await sequelize.query(
      'SELECT id FROM users WHERE username = ?',
      { replacements: [username] }
    );

    if (existing.length > 0) {
      return response.error(res, '用户名已存在', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await sequelize.query(
      `INSERT INTO users (username, password, name, role, department, phone, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      { replacements: [username, hashedPassword, name, role, department || null, phone || null] }
    );

    const [newUser] = await sequelize.query(
      'SELECT id, username, name, role, department, phone, avatar, status, created_at FROM users WHERE id = ?',
      { replacements: [result.insertId] }
    );

    response.success(res, newUser[0], '用户创建成功');
  } catch (error) {
    console.error('创建用户错误:', error);
    response.error(res, '创建用户失败');
  }
});

// 更新用户
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, role, department, phone, status } = req.body;
    const userId = req.params.id;

    // 普通用户只能修改自己的信息，管理员可以修改所有用户
    if (req.user.role !== 'boss' && req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return response.forbidden(res, '没有权限修改此用户');
    }

    const updates = [];
    const replacements = [];

    if (name) {
      updates.push('name = ?');
      replacements.push(name);
    }

    if (role && (req.user.role === 'boss' || req.user.role === 'admin')) {
      updates.push('role = ?');
      replacements.push(role);
    }

    if (department) {
      updates.push('department = ?');
      replacements.push(department);
    }

    if (phone) {
      updates.push('phone = ?');
      replacements.push(phone);
    }

    if (status && (req.user.role === 'boss' || req.user.role === 'admin')) {
      updates.push('status = ?');
      replacements.push(status);
    }

    if (updates.length === 0) {
      return response.error(res, '没有要更新的字段', 400);
    }

    replacements.push(userId);

    await sequelize.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      { replacements }
    );

    const [updatedUser] = await sequelize.query(
      'SELECT id, username, name, role, department, phone, avatar, status, created_at FROM users WHERE id = ?',
      { replacements: [userId] }
    );

    response.success(res, updatedUser[0], '用户更新成功');
  } catch (error) {
    console.error('更新用户错误:', error);
    response.error(res, '更新用户失败');
  }
});

// 删除用户（仅管理员和老板）
router.delete('/:id', authMiddleware, roleMiddleware('boss', 'admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    // 不能删除自己
    if (req.user.id === parseInt(userId)) {
      return response.error(res, '不能删除自己', 400);
    }

    await sequelize.query('DELETE FROM users WHERE id = ?', { replacements: [userId] });
    response.success(res, null, '用户删除成功');
  } catch (error) {
    console.error('删除用户错误:', error);
    response.error(res, '删除用户失败');
  }
});

// 获取所有部门
router.get('/meta/departments', authMiddleware, async (req, res) => {
  try {
    const [departments] = await sequelize.query(
      'SELECT DISTINCT department FROM users WHERE department IS NOT NULL ORDER BY department'
    );
    response.success(res, departments.map(d => d.department));
  } catch (error) {
    console.error('获取部门列表错误:', error);
    response.error(res, '获取部门列表失败');
  }
});

module.exports = router;
