const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// 生成唯一 ID
const generateId = () => {
  return uuidv4();
};

// 格式化日期
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// 判断是否是今天
const isToday = (date) => {
  if (!date) return false;
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

// 获取本周的某一天
const getDayOfWeek = (date = new Date()) => {
  return date.getDay();
};

// 获取本月的某一天
const getDayOfMonth = (date = new Date()) => {
  return date.getDate();
};

// 确保目录存在
const ensureDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

// 响应格式化
const response = {
  success: (res, data, message = '操作成功') => {
    return res.json({
      code: 200,
      message,
      data
    });
  },
  
  error: (res, message = '操作失败', status = 500) => {
    return res.status(status).json({
      code: status,
      message
    });
  },
  
  unauthorized: (res, message = '未授权') => {
    return res.status(401).json({
      code: 401,
      message
    });
  },
  
  forbidden: (res, message = '禁止访问') => {
    return res.status(403).json({
      code: 403,
      message
    });
  },
  
  notFound: (res, message = '资源不存在') => {
    return res.status(404).json({
      code: 404,
      message
    });
  }
};

module.exports = {
  generateId,
  formatDate,
  isToday,
  getDayOfWeek,
  getDayOfMonth,
  ensureDir,
  response
};
