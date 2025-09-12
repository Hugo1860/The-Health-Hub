import { NextRequest } from 'next/server';
import { POST, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('path');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDb = db as jest.Mocked<typeof db>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('/api/admin/audio/[id]/cover', () => {
  const mockParams = { id: 'test-audio-id' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock path.join to return predictable paths
    const path = require('path');
    path.join = jest.fn((...args) => args.join('/'));
    
    // Mock process.cwd()
    process.cwd = jest.fn(() => '/mock/project/root');
  });

  describe('POST /api/admin/audio/[id]/cover', () => {
    it('uploads cover image successfully', async () => {
      // Mock authentication
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      // Mock database queries
      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({
        id: 'test-audio-id', coverImage: null
      });
      const mockRun = jest.fn().mockResolvedValue({ changes: 1 });
      
      mockPrepare.mockReturnValue({ get: mockGet, run: mockRun });
      mockDb.prepare = mockPrepare;

      // Mock file system
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      // Create mock request with form data
      const formData = new FormData();
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });
      formData.append('"coverImage"', mockFile);

      const request = {
        formData: jest.fn().mockResolvedValue(formData)
      } as unknown as NextRequest;

      const response = await POST(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Cover image uploaded successfully');
      expect(responseData.coverImageUrl).toMatch(/^\/uploads\/covers\/test-audio-id-\d+\.jpg$/);

      // Verify database operations
      expect(mockPrepare).toHaveBeenCalledWith('SELECT id, ""coverImage"" FROM audios WHERE id = ?');
      expect(mockGet).toHaveBeenCalledWith('test-audio-id');
      expect(mockPrepare).toHaveBeenCalledWith('UPDATE audios SET ""coverImage"" = ? WHERE id = ?');
      expect(mockRun).toHaveBeenCalledWith(expect.stringMatching(/^\/uploads\/covers\/test-audio-id-\d+\.jpg$/), 'test-audio-id');

      // Verify file operations
      expect(mockMkdir).toHaveBeenCalledWith('/mock/project/root/public/uploads/covers', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = {} as NextRequest;
      const response = await POST(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });

    it('returns 403 when user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-id', role: 'user' }
      } as any);

      const request = {} as NextRequest;
      const response = await POST(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Admin privileges required');
    });

    it('returns 404 when audio not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue(null);
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const formData = new FormData();
      const request = {
        formData: jest.fn().mockResolvedValue(formData)
      } as unknown as NextRequest;

      const response = await POST(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Audio not found');
    });

    it('returns 400 when no file provided', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({ id: 'test-audio-id' });
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const formData = new FormData();
      const request = {
        formData: jest.fn().mockResolvedValue(formData)
      } as unknown as NextRequest;

      const response = await POST(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No image file provided');
    });

    it('returns 400 for invalid file type', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({ id: 'test-audio-id' });
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const formData = new FormData();
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('"coverImage"', mockFile);

      const request = {
        formData: jest.fn().mockResolvedValue(formData)
      } as unknown as NextRequest;

      const response = await POST(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid file type. Allowed: JPEG, PNG, WebP');
    });

    it('returns 400 for oversized file', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({ id: 'test-audio-id' });
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const formData = new FormData();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      formData.append('"coverImage"', mockFile);

      const request = {
        formData: jest.fn().mockResolvedValue(formData)
      } as unknown as NextRequest;

      const response = await POST(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('File size too large. Maximum: 5MB');
    });

    it('deletes old cover image when uploading new one', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({
        id: 'test-audio-id', coverImage: '/uploads/covers/old-cover.jpg'
      });
      const mockRun = jest.fn().mockResolvedValue({ changes: 1 });
      
      mockPrepare.mockReturnValue({ get: mockGet, run: mockRun });
      mockDb.prepare = mockPrepare;

      mockExistsSync.mockReturnValue(true);
      mockUnlink.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const formData = new FormData();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });
      formData.append('"coverImage"', mockFile);

      const request = {
        formData: jest.fn().mockResolvedValue(formData)
      } as unknown as NextRequest;

      await POST(request, { params: Promise.resolve(mockParams) });

      expect(mockUnlink).toHaveBeenCalledWith('/mock/project/root/public/uploads/covers/old-cover.jpg');
    });
  });

  describe('DELETE /api/admin/audio/[id]/cover', () => {
    it('removes cover image successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({
        id: 'test-audio-id', coverImage: '/uploads/covers/cover.jpg'
      });
      const mockRun = jest.fn().mockResolvedValue({ changes: 1 });
      
      mockPrepare.mockReturnValue({ get: mockGet, run: mockRun });
      mockDb.prepare = mockPrepare;

      mockExistsSync.mockReturnValue(true);
      mockUnlink.mockResolvedValue(undefined);

      const request = {} as NextRequest;
      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Cover image removed successfully');

      expect(mockUnlink).toHaveBeenCalledWith('/mock/project/root/public/uploads/covers/cover.jpg');
      expect(mockRun).toHaveBeenCalledWith('test-audio-id');
    });

    it('returns 400 when no cover image to remove', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-id', role: 'admin' }
      } as any);

      const mockPrepare = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({
        id: 'test-audio-id', coverImage: null
      });
      
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const request = {} as NextRequest;
      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No cover image to remove');
    });
  });
});