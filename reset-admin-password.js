const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');

async function resetAdminPassword() {
  const usersFile = path.join(__dirname, 'data', 'users.json');
  
  try {
    // 读取用户数据
    const data = fs.readFileSync(usersFile, 'utf-8');
    const users = JSON.parse(data);
    
    // 查找管理员用户
    const adminIndex = users.findIndex(user => user.role === 'admin' || user.email === 'admin@example.com');
    
    if (adminIndex === -1) {
      // 如果没有管理员，创建一个
      const newAdmin = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          autoplay: false,
          defaultPlaybackRate: 1,
          defaultVolume: 0.8
        }
      };
      
      users.unshift(newAdmin);
      console.log('✅ 创建新的管理员账户');
    } else {
      // 重置现有管理员密码
      users[adminIndex].password = await bcrypt.hash('admin123', 12);
      users[adminIndex].email = 'admin@example.com';
      users[adminIndex].username = 'admin';
      users[adminIndex].role = 'admin';
      console.log('✅ 重置管理员密码');
    }
    
    // 保存更新后的用户数据
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    
    console.log('🎉 管理员账户配置完成!');
    console.log('📧 邮箱: admin@example.com');
    console.log('🔑 密码: admin123');
    console.log('👤 角色: admin');
    
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
  }
}

resetAdminPassword(); 