#!/usr/bin/env node

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000';

async function testUploadAPI() {
  console.log('=== Testing Upload API ===');
  
  try {
    // 创建一个测试音频文件
    const testContent = Buffer.from('fake audio content for testing');
    const testFilePath = path.join(process.cwd(), 'test-audio.mp3');
    fs.writeFileSync(testFilePath, testContent);
    
    // 创建 FormData
    const formData = new FormData();
    formData.append('title', '测试音频文件');
    formData.append('description', '这是一个测试上传的音频文件');
    formData.append('subject', '测试分类');
    formData.append('tags', JSON.stringify(['测试', '上传', 'API']));
    formData.append('speaker', '测试演讲者');
    formData.append('audio', fs.createReadStream(testFilePath), {
      filename: 'test-audio.mp3',
      contentType: 'audio/mpeg'
    });
    
    console.log('Sending upload request...');
    const response = await fetch(`${API_BASE}/api/admin/simple-upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // 注意：不要手动设置 Content-Type，让 FormData 自动设置
        'Cookie': 'next-auth.session-token=your-session-token-here' // 需要有效的会话token
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    // 清理测试文件
    fs.unlinkSync(testFilePath);
    
    if (response.ok) {
      console.log('✅ Upload test passed!');
    } else {
      console.log('❌ Upload test failed!');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// 运行测试
testUploadAPI();