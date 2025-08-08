import fs from 'fs';
import path from 'path';

export interface Slide {
  id: string;
  audioId: string;
  title: string;
  imageUrl: string;
  startTime: number;
  endTime?: number;
  description?: string;
  order: number;
  createdAt: string;
  createdBy: string;
}

export interface SlideSet {
  id: string;
  audioId: string;
  title: string;
  description?: string;
  slides: Slide[];
  createdAt: string;
  createdBy: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'slides.json');

export function getSlides(): Slide[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading slides:', error);
    return [];
  }
}

export function getSlidesByAudioId(audioId: string): Slide[] {
  const slides = getSlides();
  return slides
    .filter(slide => slide.audioId === audioId)
    .sort((a, b) => a.startTime - b.startTime);
}

export function getSlideAtTime(audioId: string, currentTime: number): Slide | null {
  const slides = getSlidesByAudioId(audioId);
  
  // 找到当前时间对应的幻灯片
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const nextSlide = slides[i + 1];
    
    if (currentTime >= slide.startTime) {
      // 如果有结束时间，检查是否在范围内
      if (slide.endTime && currentTime > slide.endTime) {
        continue;
      }
      
      // 如果没有结束时间，检查是否在下一张幻灯片之前
      if (!slide.endTime && nextSlide && currentTime >= nextSlide.startTime) {
        continue;
      }
      
      return slide;
    }
  }
  
  return null;
}

export function addSlide(slide: Omit<Slide, 'id' | 'createdAt'>): Slide {
  const slides = getSlides();
  const newSlide: Slide = {
    ...slide,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  slides.push(newSlide);
  fs.writeFileSync(DATA_FILE, JSON.stringify(slides, null, 2));
  return newSlide;
}

export function updateSlide(id: string, updates: Partial<Slide>): Slide | null {
  const slides = getSlides();
  const index = slides.findIndex(slide => slide.id === id);
  
  if (index === -1) {
    return null;
  }
  
  slides[index] = { ...slides[index], ...updates };
  fs.writeFileSync(DATA_FILE, JSON.stringify(slides, null, 2));
  return slides[index];
}

export function deleteSlide(id: string): boolean {
  const slides = getSlides();
  const index = slides.findIndex(slide => slide.id === id);
  
  if (index === -1) {
    return false;
  }
  
  slides.splice(index, 1);
  fs.writeFileSync(DATA_FILE, JSON.stringify(slides, null, 2));
  return true;
}

export function reorderSlides(audioId: string, slideIds: string[]): boolean {
  const slides = getSlides();
  const audioSlides = slides.filter(slide => slide.audioId === audioId);
  
  // 更新顺序
  slideIds.forEach((slideId, index) => {
    const slideIndex = slides.findIndex(slide => slide.id === slideId);
    if (slideIndex !== -1) {
      slides[slideIndex].order = index;
    }
  });
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(slides, null, 2));
  return true;
}