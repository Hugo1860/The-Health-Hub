const { getAudioDuration, formatDuration } = require('./src/lib/audioDuration');
const { join } = require('path');

async function testAudioDuration() {
  console.log('测试音频时长计算功能...');
  
  // 创建一个测试音频文件路径
  const testAudioPath = join(__dirname, 'public', 'uploads', 'audio', 'test.mp3');
  
  try {
    const duration = await getAudioDuration(testAudioPath);
    console.log(`计算得到的音频时长: ${duration} 秒`);
    console.log(`格式化显示: ${formatDuration(duration)}`);
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testAudioDuration();