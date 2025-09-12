'use client';

import React, { useState, useRef } from 'react';
import { Upload, DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, message, Modal, Image } from 'antd';

interface ImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  onImageRemove?: (imageUrl: string) => void;
  maxImages?: number;
  existingImages?: string[];
}

export default function ImageUpload({ 
  onImageUpload, 
  onImageRemove, 
  maxImages = 10, 
  existingImages = [] 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (existingImages.length >= maxImages) {
      message.warning(`最多只能上传${maxImages}张图片`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        onImageUpload(result.data.url);
        message.success('图片上传成功');
      } else {
        message.error(result.error.message || '图片上传失败');
      }
    } catch (error) {
      console.error('图片上传失败:', error);
      message.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = (imageUrl: string) => {
    if (onImageRemove) {
      onImageRemove(imageUrl);
    }
  };

  const handlePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Button
          type="dashed"
          icon={uploading ? <LoadingOutlined /> : <PlusOutlined />}
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
          disabled={existingImages.length >= maxImages}
          style={{ width: '100%' }}
        >
          {uploading ? '上传中...' : '上传图片'}
        </Button>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          支持 JPEG、PNG、GIF、WebP 格式，单张图片不超过5MB
        </div>
      </div>

      {existingImages.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: '8px' 
        }}>
          {existingImages.map((imageUrl, index) => (
            <div key={index} style={{ 
              position: 'relative',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #d9d9d9'
            }}>
              <img
                src={imageUrl}
                alt={`图片 ${index + 1}`}
                style={{
                  width: '100%',
                  height: '80px',
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
                onClick={() => handlePreview(imageUrl)}
              />
              {onImageRemove && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    border: 'none'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(imageUrl);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={previewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        style={{ top: 20 }}
      >
        <Image
          src={previewImage}
          style={{ width: '100%' }}
          alt="预览图片"
        />
      </Modal>
    </div>
  );
}
