'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useSecureFetch } from '@/hooks/useCSRFToken';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export default function AdminUpload() {
  const { secureFetch, csrfToken, csrfLoading, csrfError } = useSecureFetch();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
  }>({ current: 0, total: 0, currentFile: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !title || !subject) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, currentFile: '' });
    
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ 
          current: i + 1, 
          total: files.length, 
          currentFile: file.name 
        });

        const formData = new FormData();
        formData.append('audio', file);
        
        // 如果是批量上传且只有一个文件，使用表单中的标题
        // 如果是多个文件，使用文件名作为标题
        const fileTitle = files.length === 1 ? title : file.name.replace(/\.[^/.]+$/, '');
        formData.append('title', fileTitle);
        formData.append('description', description);
        formData.append('subject', subject);
        formData.append('tags', tags);
        
        // 只在第一个文件或单文件上传时添加封面图片
        if ((i === 0 || files.length === 1) && coverImage) {
          formData.append('coverImage', coverImage);
        }

        try {
          const response = await secureFetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Upload failed:', errorData);
            failCount++;
          }
        } catch (error) {
          console.error('Upload error:', error);
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        setMessage(`成功上传 ${successCount} 个音频文件！`);
      } else if (successCount > 0 && failCount > 0) {
        setMessage(`成功上传 ${successCount} 个文件，失败 ${failCount} 个文件`);
      } else {
        setMessage('所有文件上传失败，请重试');
      }

      // 清空表单
      setTitle('');
      setDescription('');
      setFiles([]);
      setCoverImage(null);
      setCoverImagePreview('');
      
    } catch (error) {
      setMessage('上传出错，请重试');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, currentFile: '' });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">音频上传</h1>
          <p className="text-gray-600">上传新的音频内容到平台</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                音频标题 {files.length > 1 && <span className="text-xs text-gray-500">(多文件上传时将使用文件名)</span>}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required={files.length <= 1}
                disabled={files.length > 1}
                placeholder={files.length > 1 ? "多文件上传时将自动使用文件名作为标题" : "请输入音频标题"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                音频描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学科分类
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              >
                <option value="">请选择学科</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-500">
                <a href="/admin/categories" target="_blank" className="text-blue-600 hover:text-blue-800">
                  管理分类
                </a>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签（用逗号分隔）
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="例如: 心脏,循环,心血管"
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                封面图片 <span className="text-xs text-gray-500">(可选，将显示在播放器中)</span>
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {coverImagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={coverImagePreview}
                      alt="封面预览"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                音频文件 <span className="text-xs text-gray-500">(支持多文件选择)</span>
              </label>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>

            {files.length > 0 && (
              <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                <div className="font-medium mb-2">已选择 {files.length} 个文件:</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && uploadProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>上传进度: {uploadProgress.current} / {uploadProgress.total}</span>
                  <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
                {uploadProgress.currentFile && (
                  <div className="text-xs text-gray-500">
                    正在上传: {uploadProgress.currentFile}
                  </div>
                )}
              </div>
            )}

            {csrfError && (
              <div className="text-center text-sm p-3 rounded-md text-red-600 bg-red-50">
                安全验证失败: {csrfError}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || files.length === 0 || csrfLoading || !csrfToken}
              className="w-full bg-blue-600 text-white py-3 sm:py-2 px-4 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 touch-manipulation text-base font-medium"
            >
              {csrfLoading ? '安全验证中...' : 
               uploading ? `上传中... (${uploadProgress.current}/${uploadProgress.total})` : 
               `上传音频 ${files.length > 0 ? `(${files.length} 个文件)` : ''}`}
            </button>

            {message && (
              <div className={`text-center text-sm p-3 rounded-md ${
                message.includes('成功') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
              }`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}