import fs from 'fs';
import path from 'path';

export interface TranscriptionSegment {
  id: string;
  startTime: number; // 开始时间（秒）
  endTime: number; // 结束时间（秒）
  text: string; // 转录文本
  confidence?: number; // 置信度 (0-1)
  speaker?: string; // 说话人标识
}

export interface AudioTranscription {
  id: string;
  audioId: string;
  language: string; // 语言代码，如 'zh-CN', 'en-US'
  fullText: string; // 完整转录文本
  segments: TranscriptionSegment[]; // 分段转录
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  processingTime?: number; // 处理时间（毫秒）
  errorMessage?: string; // 错误信息
}

const transcriptionsFilePath = path.join(process.cwd(), 'data', 'transcriptions.json');

// 确保数据文件存在
function ensureDataFiles() {
  if (!fs.existsSync(transcriptionsFilePath)) {
    fs.writeFileSync(transcriptionsFilePath, JSON.stringify([], null, 2));
  }
}

// 读取转录数据
export function readTranscriptions(): AudioTranscription[] {
  try {
    ensureDataFiles();
    const data = fs.readFileSync(transcriptionsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading transcriptions:', error);
    return [];
  }
}

// 写入转录数据
export function writeTranscriptions(transcriptions: AudioTranscription[]): void {
  try {
    fs.writeFileSync(transcriptionsFilePath, JSON.stringify(transcriptions, null, 2));
  } catch (error) {
    console.error('Error writing transcriptions:', error);
    throw error;
  }
}

// 获取音频的转录
export function getAudioTranscription(audioId: string): AudioTranscription | null {
  const transcriptions = readTranscriptions();
  return transcriptions.find(t => t.audioId === audioId) || null;
}

// 创建新转录记录
export function createTranscription(audioId: string, language: string = 'zh-CN'): AudioTranscription {
  const transcriptions = readTranscriptions();
  
  // 检查是否已存在转录
  const existing = transcriptions.find(t => t.audioId === audioId);
  if (existing) {
    return existing;
  }
  
  const newTranscription: AudioTranscription = {
    id: Date.now().toString(),
    audioId,
    language,
    fullText: '',
    segments: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  transcriptions.push(newTranscription);
  writeTranscriptions(transcriptions);
  
  return newTranscription;
}

// 更新转录状态
export function updateTranscriptionStatus(
  audioId: string, 
  status: AudioTranscription['status'],
  errorMessage?: string
): boolean {
  const transcriptions = readTranscriptions();
  const transcriptionIndex = transcriptions.findIndex(t => t.audioId === audioId);
  
  if (transcriptionIndex === -1) {
    return false;
  }
  
  transcriptions[transcriptionIndex].status = status;
  transcriptions[transcriptionIndex].updatedAt = new Date().toISOString();
  
  if (errorMessage) {
    transcriptions[transcriptionIndex].errorMessage = errorMessage;
  }
  
  writeTranscriptions(transcriptions);
  return true;
}

// 保存转录结果
export function saveTranscriptionResult(
  audioId: string,
  fullText: string,
  segments: TranscriptionSegment[],
  processingTime?: number
): boolean {
  const transcriptions = readTranscriptions();
  const transcriptionIndex = transcriptions.findIndex(t => t.audioId === audioId);
  
  if (transcriptionIndex === -1) {
    return false;
  }
  
  transcriptions[transcriptionIndex].fullText = fullText;
  transcriptions[transcriptionIndex].segments = segments;
  transcriptions[transcriptionIndex].status = 'completed';
  transcriptions[transcriptionIndex].updatedAt = new Date().toISOString();
  
  if (processingTime) {
    transcriptions[transcriptionIndex].processingTime = processingTime;
  }
  
  writeTranscriptions(transcriptions);
  return true;
}

// 模拟转录服务（实际项目中应该调用真实的转录API）
export async function transcribeAudio(audioFilePath: string, language: string = 'zh-CN'): Promise<{
  fullText: string;
  segments: TranscriptionSegment[];
}> {
  // 这里模拟转录过程
  // 在实际项目中，你可以集成以下服务：
  // - Google Cloud Speech-to-Text
  // - Azure Cognitive Services Speech
  // - AWS Transcribe
  // - 百度语音识别
  // - 讯飞语音识别
  
  return new Promise((resolve) => {
    // 模拟处理时间
    setTimeout(() => {
      // 模拟转录结果
      const mockSegments: TranscriptionSegment[] = [
        {
          id: '1',
          startTime: 0,
          endTime: 30,
          text: '欢迎收听本期医学音频讲座。今天我们将讨论降糖药对糖尿病视网膜病变的影响。',
          confidence: 0.95
        },
        {
          id: '2',
          startTime: 30,
          endTime: 60,
          text: '糖尿病视网膜病变是糖尿病最常见的微血管并发症之一，严重影响患者的生活质量。',
          confidence: 0.92
        },
        {
          id: '3',
          startTime: 60,
          endTime: 90,
          text: '近年来的研究表明，不同类型的降糖药物对视网膜病变的影响存在显著差异。',
          confidence: 0.88
        }
      ];
      
      const fullText = mockSegments.map(s => s.text).join(' ');
      
      resolve({
        fullText,
        segments: mockSegments
      });
    }, 2000); // 模拟2秒处理时间
  });
}

// 搜索转录文本
export function searchTranscriptions(query: string, audioId?: string): {
  transcription: AudioTranscription;
  matches: {
    segment: TranscriptionSegment;
    matchText: string;
    startIndex: number;
    endIndex: number;
  }[];
}[] {
  const transcriptions = readTranscriptions();
  const results: {
    transcription: AudioTranscription;
    matches: {
      segment: TranscriptionSegment;
      matchText: string;
      startIndex: number;
      endIndex: number;
    }[];
  }[] = [];
  
  const searchTranscriptions = audioId 
    ? transcriptions.filter(t => t.audioId === audioId)
    : transcriptions;
  
  const lowerQuery = query.toLowerCase();
  
  for (const transcription of searchTranscriptions) {
    if (transcription.status !== 'completed') continue;
    
    const matches: {
      segment: TranscriptionSegment;
      matchText: string;
      startIndex: number;
      endIndex: number;
    }[] = [];
    
    // 在分段中搜索
    for (const segment of transcription.segments) {
      const lowerText = segment.text.toLowerCase();
      let startIndex = 0;
      
      while (true) {
        const index = lowerText.indexOf(lowerQuery, startIndex);
        if (index === -1) break;
        
        matches.push({
          segment,
          matchText: segment.text.substring(index, index + query.length),
          startIndex: index,
          endIndex: index + query.length
        });
        
        startIndex = index + 1;
      }
    }
    
    if (matches.length > 0) {
      results.push({
        transcription,
        matches
      });
    }
  }
  
  return results;
}

// 格式化时间显示
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// 高亮搜索结果
export function highlightSearchResults(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}