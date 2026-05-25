const { Sequelize } = require('sequelize');
const path = require('path');

// 加载环境配置
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'inspector_db',
  process.env.DB_USER || 'inspector',
  process.env.DB_PASSWORD || 'Inspector2025!',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    timezone: '+08:00'
  }
);

const initDatabase = async () => {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功！');

    console.log('开始创建表结构...');

    // 用户表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(50) NOT NULL,
        role ENUM('boss', 'shop_manager', 'shop_staff') NOT NULL DEFAULT 'shop_staff',
        department VARCHAR(100),
        phone VARCHAR(20),
        avatar VARCHAR(255),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role),
        INDEX idx_department (department),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 用户表创建完成');

    // 任务表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        task_type ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
        weekly_day INT,
        monthly_day INT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (task_type),
        INDEX idx_status (status),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 任务表创建完成');

    // 任务检查项表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS task_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        require_photo TINYINT(1) DEFAULT 0,
        required TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 任务检查项表创建完成');

    // 任务分配表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        is_abnormal TINYINT(1) DEFAULT 0,
        abnormal_task_id INT,
        status ENUM('assigned', 'pending', 'completed') DEFAULT 'assigned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 任务分配表创建完成');

    // 巡检记录表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS inspections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        score INT,
        remark TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        has_abnormal TINYINT(1) DEFAULT 0,
        abnormal_task_id INT,
        reviewed_by INT,
        reviewed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_task_id (task_id),
        INDEX idx_date (date),
        INDEX idx_status (status),
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 巡检记录表创建完成');

    // 巡检记录检查项详情表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS inspection_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inspection_id INT NOT NULL,
        item_id INT NOT NULL,
        status ENUM('normal', 'abnormal') NOT NULL,
        remark TEXT,
        photos JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_inspection_id (inspection_id),
        INDEX idx_item_id (item_id),
        FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 巡检记录检查项表创建完成');

    // 异常任务表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS abnormal_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        original_task_id INT NOT NULL,
        original_task_name VARCHAR(200) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        reason VARCHAR(50),
        status ENUM('pending', 'completed') DEFAULT 'pending',
        created_by INT,
        completed_by INT,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_original_task_id (original_task_id),
        FOREIGN KEY (original_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 异常任务表创建完成');

    // 异常任务检查项表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS abnormal_task_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        abnormal_task_id INT NOT NULL,
        original_item_id INT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        require_photo TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_abnormal_task_id (abnormal_task_id),
        FOREIGN KEY (abnormal_task_id) REFERENCES abnormal_tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 异常任务检查项表创建完成');

    // 钉钉配置表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS dingtalk_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(50) UNIQUE NOT NULL,
        config_value TEXT,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ 钉钉配置表创建完成');

    console.log('\n========================================');
    console.log('数据库初始化完成！');
    console.log('========================================\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    await sequelize.close();
    process.exit(1);
  }
};

initDatabase();
