const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initMySQLUsers() {
  let connection;

  try {
    // 连接到MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'health_hub'
    });

    console.log('✅ 连接到MySQL数据库');

    // 检查users表是否存在
    const [tables] = await connection.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'users'
    `);

    if (tables.length === 0) {
      console.log('❌ users表不存在，请先运行数据库迁移脚本');
      return;
    }

    // 检查现有用户
    const [existingUsers] = await connection.execute(`
      SELECT id, username, email, role FROM users
    `);

    console.log('📊 现有用户:', existingUsers);

    // 创建或更新测试用户
    const testUsers = [
      {
        id: 'admin-test',
        username: 'admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        status: 'active'
      },
      {
        id: 'chkd-test',
        username: 'chkd',
        email: 'chkd@qq.com',
        password: await bcrypt.hash('123456', 12),
        role: 'admin',
        status: 'active'
      },
      {
        id: 'hugo-test',
        username: 'hugo',
        email: 'dajiawa@gmail.com',
        password: await bcrypt.hash('123456', 12),
        role: 'admin',
        status: 'active'
      }
    ];

    for (const user of testUsers) {
      const existingUser = existingUsers.find(u => u.email === user.email);

      if (existingUser) {
        // 更新现有用户
        await connection.execute(`
          UPDATE users
          SET
            username = ?,
            password = ?,
            role = ?,
            status = ?
          WHERE email = ?
        `, [user.username, user.password, user.role, user.status, user.email]);

        console.log(`✅ 更新用户: ${user.email}`);
      } else {
        // 创建新用户
        await connection.execute(`
          INSERT INTO users (
            id, username, email, password, role, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [user.id, user.username, user.email, user.password, user.role, user.status]);

        console.log(`✅ 创建用户: ${user.email}`);
      }
    }

    console.log('🎉 用户初始化完成');

    // 验证用户
    const [finalUsers] = await connection.execute(`
      SELECT id, username, email, role, status FROM users
      WHERE email IN ('admin@example.com', 'chkd@qq.com', 'dajiawa@gmail.com')
    `);

    console.log('✅ 最终用户状态:');
    finalUsers.forEach(user => {
      console.log(`   - ${user.email}: ${user.role} (${user.status})`);
    });

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行初始化
initMySQLUsers().catch(console.error);
