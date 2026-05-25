const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { response } = require('../utils/helpers');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return response.error(res, '用户名和密码不能为空', 400);
    }

    const [users] = await sequelize.query(
      'SELECT * FROM users WHERE username = ? AND status = "active"',
      { replacements: [username] }
    );

    if (users.length === 0) {
      return response.error(res, '用户不存在或已被禁用', 401);
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return response.error(res, '密码错误', 401);
    }

    const token = generateToken(user);

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department,
          phone: user.phone
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    response.error(res, '登录失败');
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await sequelize.query(
      'SELECT id, username, name, role, department, phone, avatar FROM users WHERE id = ?',
      { replacements: [req.user.id] }
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

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: 修改密码
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return response.error(res, '请填写完整信息', 400);
    }

    const [users] = await sequelize.query(
      'SELECT * FROM users WHERE id = ?',
      { replacements: [req.user.id] }
    );

    if (users.length === 0) {
      return response.notFound(res, '用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, users[0].password);
    if (!isPasswordValid) {
      return response.error(res, '原密码错误', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await sequelize.query(
      'UPDATE users SET password = ? WHERE id = ?',
      { replacements: [hashedPassword, req.user.id] }
    );

    response.success(res, null, '密码修改成功');
  } catch (error) {
    console.error('修改密码错误:', error);
    response.error(res, '修改密码失败');
  }
});

module.exports = router;
