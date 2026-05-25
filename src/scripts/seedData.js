const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const path = require('path');

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

const seedData = async () => {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功！');

    console.log('开始插入初始数据...\n');

    // 插入用户
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    await sequelize.query(`
      INSERT IGNORE INTO users (id, username, password, name, role, department, phone, status) VALUES
      (1, 'boss001', '${hashedPassword}', '老板', 'boss', '总公司', '13800000001', 'active'),
      (2, 'manager001', '${hashedPassword}', '张三', 'shop_manager', '佰和悦府店', '13800000002', 'active'),
      (3, 'manager002', '${hashedPassword}', '李四', 'shop_manager', '开发区店', '13800000003', 'active'),
      (4, 'staff001', '${hashedPassword}', '王五', 'shop_staff', '佰和悦府店', '13800000004', 'active'),
      (5, 'staff002', '${hashedPassword}', '赵六', 'shop_staff', '佰和悦府店', '13800000005', 'active'),
      (6, 'staff003', '${hashedPassword}', '孙七', 'shop_staff', '开发区店', '13800000006', 'active')
    `);
    console.log('✓ 用户数据插入完成');

    // 插入任务
    await sequelize.query(`
      INSERT IGNORE INTO tasks (id, name, description, task_type, status, created_by) VALUES
      (1, '日巡检-店外区域', '每日例行检查店外各项工作', 'daily', 'active', 1),
      (2, '日巡检-店内区域', '每日例行检查店内各项工作', 'daily', 'active', 1),
      (3, '夜班工作检查', '检查夜班各项工作完成情况', 'daily', 'active', 1),
      (4, '日巡检-重点工作', '每日重点工作检查', 'daily', 'active', 1),
      (5, '周任务-周六', '每周六固定任务', 'weekly', 'active', 1),
      (6, '周任务-周三', '每周三固定任务', 'weekly', 'active', 1),
      (7, '周任务-周四', '每周四固定任务', 'weekly', 'active', 1),
      (8, '月任务-1日', '每月1日固定任务', 'monthly', 'active', 1),
      (9, '月任务-2日', '每月2日固定任务', 'monthly', 'active', 1),
      (10, '月任务-15/30日', '每月15日、30日固定任务', 'monthly', 'active', 1),
      (11, '月任务-25日', '每月25日固定任务', 'monthly', 'active', 1),
      (12, '月任务-30日前', '每月30日前完成的任务', 'monthly', 'active', 1)
    `);
    console.log('✓ 任务数据插入完成');

    // 插入任务检查项
    await sequelize.query(`
      INSERT IGNORE INTO task_items (id, task_id, title, description, require_photo, required, sort_order) VALUES
      -- 日巡检-店外区域 (task_id=1)
      (1, 1, '门口堆头检查', '摆放合理、整齐干净、品类搭配合理、商品有价签、价签无破损', 1, 1, 1),
      (2, 1, '门口车位预留（下午班）', '佰和悦府店下午班预留门口车位', 0, 1, 2),
      (3, 1, '门口卫生', '地面干净、无垃圾、已清洗、休闲椅干净整齐无破损', 1, 1, 3),
      (4, 1, '门口垃圾桶', '无垃圾遗留、已清理、套袋、未满溢、需要更换', 1, 1, 4),
      (5, 1, '进门地垫', '清洗干净、无纸屑垃圾', 1, 1, 5),
      (6, 1, '门前电器设备', '冰柜、啤酒柜通电、插座电源防水安全、擦洗干净整洁', 1, 1, 6),
      (7, 1, '广告招牌', '店内外广告是新的、无歪斜、店铺广告牌亮灯', 1, 1, 7),
      
      -- 日巡检-店内区域 (task_id=2)
      (8, 2, '店内卫生', '各处清洁、地面无污渍水渍、卫生间干净、无卫生死角', 1, 1, 1),
      (9, 2, '货品排面', '饱满整齐、每个品类货架充足、品类齐全、补货齐全', 1, 1, 2),
      (10, 2, '日期检查', '每个班次定时检查，找出临期和过期品', 0, 1, 3),
      (11, 2, '价签检查', '一一对应、每天抽检一个品类、无遗漏标价错误、无过期活动价签', 1, 1, 4),
      (12, 2, '电气设备检查', '冰柜、冷柜、OC柜、烧烤柜、烤箱、咖啡机等正常运行，灯、监控正常', 1, 1, 5),
      (13, 2, '店员状态', '精神饱满、熟悉促销活动、工作服干净整洁无污渍', 0, 1, 6),
      (14, 2, '面销情况检查', '每个班次面销达标', 0, 1, 7),
      (15, 2, '群销检查', '按时发送群消息、质量达标、不应付', 0, 1, 8),
      (16, 2, '交接表检查', '拍照发到工作群、针对交接表进行抽检、防止应付', 1, 1, 9),
      (17, 2, '线上平台检查', '当前评分情况、无停止接单、新增差评、回复率、回复速度达标', 0, 1, 10),
      (18, 2, '盘点', '盘点进行、分区盘点进行、每天至少3个班次盘点', 0, 1, 11),
      (19, 2, '业绩检查', '查看昨天和当天班次业绩情况、分析业绩变化原因、找出问题', 0, 1, 12),
      (20, 2, '客诉处理', '线上线下客诉、当天处理完成', 0, 1, 13),
      (21, 2, '废弃商品检查', '明细检查确认', 1, 1, 14),
      (22, 2, '临期商品促销', '临期商品提前促销、店员推销、设立临期商品展销区', 1, 1, 15),
      (23, 2, '存缴营业款', '按规定存缴营业款', 0, 1, 16),
      
      -- 夜班工作检查 (task_id=3)
      (24, 3, '查看监控夜班工作', '工作量饱和、仓库整理完成、排面补货完成', 0, 1, 1),
      (25, 3, '验货情况检查', '无遗漏、无破损、无多验货少收货', 1, 1, 2),
      
      -- 日巡检-重点工作 (task_id=4)
      (26, 4, '业绩分析', '当天和昨天业绩分析、多维度分析销量原因', 0, 1, 1),
      (27, 4, '订货', '多维度订货（天气、节假日、展会、学校、产品）', 0, 1, 2),
      (28, 4, '废弃检查', '每天80-100元控制、拍照发群、每周打印废弃表', 1, 1, 3),
      (29, 4, '促销活动执行', '抽奖、满赠等活动执行', 0, 1, 4),
      (30, 4, '线上平台维护', '差评处理、评分、在线检查、三个达标、加热、库存', 0, 1, 5),
      (31, 4, '面销', '不同时间/人群/商品推荐、下发品类、发布结果', 0, 1, 6),
      (32, 4, '群销', '按时发消息、每个班次至少2条、每天至少6条', 0, 1, 7),
      (33, 4, '临期商品促销', '长保商品、非日配商品提前促销', 1, 1, 8),
      (34, 4, '补货', '确定补货时间点', 0, 1, 9)
    `);
    console.log('✓ 任务检查项数据插入完成');

    // 插入任务分配（给店长分配任务）
    await sequelize.query(`
      INSERT IGNORE INTO assignments (id, task_id, user_id, status) VALUES
      (1, 1, 2, 'assigned'),
      (2, 2, 2, 'assigned'),
      (3, 3, 2, 'assigned'),
      (4, 4, 2, 'assigned'),
      (5, 5, 2, 'assigned'),
      (6, 6, 2, 'assigned'),
      (7, 7, 2, 'assigned'),
      (8, 8, 2, 'assigned'),
      (9, 9, 2, 'assigned'),
      (10, 10, 2, 'assigned'),
      (11, 11, 2, 'assigned'),
      (12, 12, 2, 'assigned'),
      (13, 1, 3, 'assigned'),
      (14, 2, 3, 'assigned'),
      (15, 3, 3, 'assigned'),
      (16, 4, 3, 'assigned'),
      (17, 5, 3, 'assigned'),
      (18, 6, 3, 'assigned'),
      (19, 7, 3, 'assigned'),
      (20, 8, 3, 'assigned'),
      (21, 9, 3, 'assigned'),
      (22, 10, 3, 'assigned'),
      (23, 11, 3, 'assigned'),
      (24, 12, 3, 'assigned')
    `);
    console.log('✓ 任务分配数据插入完成');

    console.log('\n========================================');
    console.log('初始数据插入完成！');
    console.log('========================================');
    console.log('\n测试账号：');
    console.log('  老板: boss001 / 123456');
    console.log('  店长: manager001 / 123456');
    console.log('  店员: staff001 / 123456');
    console.log('\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('数据初始化失败:', error);
    await sequelize.close();
    process.exit(1);
  }
};

seedData();
