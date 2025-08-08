import fs from 'fs';
import path from 'path';

export interface RelatedResource {
  id: string;
  audioId: string;
  title: string;
  url: string;
  type: 'link' | 'pdf' | 'image' | 'slides';
  description?: string;
  createdAt: string;
  createdBy: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'related-resources.json');

export function getRelatedResources(): RelatedResource[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading related resources:', error);
    return [];
  }
}

export function getRelatedResourcesByAudioId(audioId: string): RelatedResource[] {
  const resources = getRelatedResources();
  return resources.filter(resource => resource.audioId === audioId);
}

export function addRelatedResource(resource: Omit<RelatedResource, 'id' | 'createdAt'>): RelatedResource {
  const resources = getRelatedResources();
  const newResource: RelatedResource = {
    ...resource,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  resources.push(newResource);
  fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2));
  return newResource;
}

export function updateRelatedResource(id: string, updates: Partial<RelatedResource>): RelatedResource | null {
  const resources = getRelatedResources();
  const index = resources.findIndex(resource => resource.id === id);
  
  if (index === -1) {
    return null;
  }
  
  resources[index] = { ...resources[index], ...updates };
  fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2));
  return resources[index];
}

export function deleteRelatedResource(id: string): boolean {
  const resources = getRelatedResources();
  const index = resources.findIndex(resource => resource.id === id);
  
  if (index === -1) {
    return false;
  }
  
  resources.splice(index, 1);
  fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2));
  return true;
}