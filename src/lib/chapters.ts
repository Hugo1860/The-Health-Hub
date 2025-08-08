import fs from 'fs';
import path from 'path';

export interface AudioChapter {
  id: string;
  audioId: string;
  title: string;
  description?: string;
  startTime: number; // 开始时间（秒）
  endTime?: number; // 结束时间（秒），可选
  order: number; // 章节顺序
  createdAt: string;
  updatedAt: string;
}

export interface ChapterMarker {
  id: string;
  audioId: string;
  title: string;
  time: number; // 时间戳（秒）
  description?: string;
  type: 'chapter' | 'highlight' | 'note'; // 标记类型
  createdBy?: string; // 创建者ID
  createdAt: string;
}

const chaptersFilePath = path.join(process.cwd(), 'data', 'chapters.json');
const markersFilePath = path.join(process.cwd(), 'data', 'markers.json');

// 确保数据文件存在
function ensureDataFiles() {
  if (!fs.existsSync(chaptersFilePath)) {
    fs.writeFileSync(chaptersFilePath, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(markersFilePath)) {
    fs.writeFileSync(markersFilePath, JSON.stringify([], null, 2));
  }
}

// 读取章节数据
export function readChapters(): AudioChapter[] {
  try {
    ensureDataFiles();
    const data = fs.readFileSync(chaptersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading chapters:', error);
    return [];
  }
}

// 写入章节数据
export function writeChapters(chapters: AudioChapter[]): void {
  try {
    fs.writeFileSync(chaptersFilePath, JSON.stringify(chapters, null, 2));
  } catch (error) {
    console.error('Error writing chapters:', error);
    throw error;
  }
}

// 读取标记数据
export function readMarkers(): ChapterMarker[] {
  try {
    ensureDataFiles();
    const data = fs.readFileSync(markersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading markers:', error);
    return [];
  }
}

// 写入标记数据
export function writeMarkers(markers: ChapterMarker[]): void {
  try {
    fs.writeFileSync(markersFilePath, JSON.stringify(markers, null, 2));
  } catch (error) {
    console.error('Error writing markers:', error);
    throw error;
  }
}

// 获取音频的章节
export function getAudioChapters(audioId: string): AudioChapter[] {
  const chapters = readChapters();
  return chapters
    .filter(chapter => chapter.audioId === audioId)
    .sort((a, b) => a.order - b.order);
}

// 获取音频的标记
export function getAudioMarkers(audioId: string): ChapterMarker[] {
  const markers = readMarkers();
  return markers
    .filter(marker => marker.audioId === audioId)
    .sort((a, b) => a.time - b.time);
}

// 创建新章节
export function createChapter(chapterData: Omit<AudioChapter, 'id' | 'createdAt' | 'updatedAt'>): AudioChapter {
  const chapters = readChapters();
  
  const newChapter: AudioChapter = {
    ...chapterData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  chapters.push(newChapter);
  writeChapters(chapters);
  
  return newChapter;
}

// 创建新标记
export function createMarker(markerData: Omit<ChapterMarker, 'id' | 'createdAt'>): ChapterMarker {
  const markers = readMarkers();
  
  const newMarker: ChapterMarker = {
    ...markerData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  
  markers.push(newMarker);
  writeMarkers(markers);
  
  return newMarker;
}

// 更新章节
export function updateChapter(chapterId: string, updates: Partial<AudioChapter>): boolean {
  const chapters = readChapters();
  const chapterIndex = chapters.findIndex(c => c.id === chapterId);
  
  if (chapterIndex === -1) {
    return false;
  }
  
  chapters[chapterIndex] = {
    ...chapters[chapterIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  writeChapters(chapters);
  return true;
}

// 删除章节
export function deleteChapter(chapterId: string): boolean {
  const chapters = readChapters();
  const chapterIndex = chapters.findIndex(c => c.id === chapterId);
  
  if (chapterIndex === -1) {
    return false;
  }
  
  chapters.splice(chapterIndex, 1);
  writeChapters(chapters);
  
  return true;
}

// 删除标记
export function deleteMarker(markerId: string): boolean {
  const markers = readMarkers();
  const markerIndex = markers.findIndex(m => m.id === markerId);
  
  if (markerIndex === -1) {
    return false;
  }
  
  markers.splice(markerIndex, 1);
  writeMarkers(markers);
  
  return true;
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

// 解析时间字符串为秒数
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 2) {
    // MM:SS 格式
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS 格式
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
}

// 获取当前时间所在的章节
export function getCurrentChapter(audioId: string, currentTime: number): AudioChapter | null {
  const chapters = getAudioChapters(audioId);
  
  for (const chapter of chapters) {
    if (currentTime >= chapter.startTime && 
        (chapter.endTime === undefined || currentTime < chapter.endTime)) {
      return chapter;
    }
  }
  
  return null;
}