const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    // 首先测试API是否可访问
    console.log('Testing API accessibility...');
    const testResponse = await fetch('http://localhost:3000/api/admin/simple-audio', {
      method: 'GET',
      headers: {
        'Cookie': 'next-auth.session-token=test' // 这里需要真实的session token
      }
    });
    
    console.log('API test response status:', testResponse.status);
    const testData = await testResponse.text();
    console.log('API test response:', testData);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testUpload();