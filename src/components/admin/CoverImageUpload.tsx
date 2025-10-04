'use client';

import React, { useState } from 'react';
import {
  Upload,
  Image,
  Button,
  Space,
  Typography,
  Card,
  App
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';

const { Text } = Typography;

interface CoverImageUploadProps {
  value?: string;
  onChange: (file: File | null, previewUrl?: string) => void;
  disabled?: boolean;
  maxSize?: number; // in bytes, default 5MB
  acceptedFormats?: string[];
  compact?: boolean; // 新增紧凑模式
  initialImageUrl?: string; // 初始图片URL
}

const CoverImageUpload: React.FC<CoverImageUploadProps> = ({
  value,
  onChange,
  disabled = false,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  compact = false,
  initialImageUrl
}) => {
  const { message } = App.useApp();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 验证文件
  const beforeUpload = (file: File) => {
    if (!file) {
      message.error('无效的文件');
      return false;
    }

    // 检查文件格式
    if (!file.type || !acceptedFormats.includes(file.type)) {
      message.error(`不支持的文件格式。支持的格式: ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`);
      return false;
    }

    // 检查文件大小
    if (!file.size || file.size > maxSize) {
      message.error(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)} MB`);
      return false;
    }

    // 创建预览URL
    const previewUrl = URL.createObjectURL(file);
    
    // 更新文件列表
    const newFile: UploadFile = {
      uid: Date.now().toString(),
      name: file.name || 'unknown-file',
      status: 'done',
      url: previewUrl,
      originFileObj: file as any, // Type assertion for compatibility
    };
    
    setFileList([newFile]);
    onChange(file, previewUrl);
    
    return false; // 阻止自动上传
  };

  // 移除文件
  const handleRemove = () => {
    setFileList([]);
    onChange(null);
    
    // 清理预览URL
    if (fileList.length > 0 && fileList[0].url) {
      URL.revokeObjectURL(fileList[0].url);
    }
  };

  // 预览图片
  const handlePreview = (file: UploadFile) => {
    const imageUrl = file.url || file.preview || null;
    if (imageUrl) {
      setPreviewImage(imageUrl);
      setPreviewVisible(true);
    }
  };

  // 上传属性
  const uploadProps: UploadProps = {
    beforeUpload,
    onRemove: handleRemove,
    onPreview: handlePreview,
    fileList,
    listType: 'picture-card',
    disabled,
    accept: acceptedFormats.join(','),
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
    },
  };

  // 上传按钮
  const uploadButton = compact ? (
    <div style={{ textAlign: 'center', padding: '8px' }}>
      <PlusOutlined style={{ fontSize: 16 }} />
      <div style={{ marginTop: 4, fontSize: 11 }}>封面</div>
    </div>
  ) : (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传封面</div>
    </div>
  );

  // 紧凑模式的样式
  const compactStyle = compact ? {
    width: 80,
    height: 80,
  } : {};

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Upload 
        {...uploadProps}
        style={compactStyle}
        className={compact ? 'compact-upload' : ''}
      >
        {fileList.length === 0 && !value && !initialImageUrl && uploadButton}
      </Upload>

      {/* 显示现有封面图片 */}
      {(value || initialImageUrl) && fileList.length === 0 && (
        <Card
          size="small"
          style={{ 
            width: compact ? 80 : 104, 
            height: compact ? 80 : 'auto',
            display: 'inline-block' 
          }}
          styles={{ body: { padding: compact ? 4 : 8 } }}
          cover={
            <div style={{ position: 'relative' }}>
              <Image
                src={value || initialImageUrl}
                alt="当前封面"
                style={{ 
                  width: '100%', 
                  height: compact ? 60 : 80, 
                  objectFit: 'cover' 
                }}
                preview={{
                  mask: <EyeOutlined />,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '50%',
                  width: compact ? 16 : 20,
                  height: compact ? 16 : 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={handleRemove}
              >
                <DeleteOutlined style={{ 
                  color: 'white', 
                  fontSize: compact ? 10 : 12 
                }} />
              </div>
            </div>
          }
        >
          {!compact && (
            <div style={{ textAlign: 'center', fontSize: 12 }}>
              当前封面
            </div>
          )}
        </Card>
      )}

      {/* 预览模态框 */}
      {previewImage && (
        <Image
          style={{ display: 'none' }}
          src={previewImage}
          preview={{
            visible: previewVisible,
            onVisibleChange: setPreviewVisible,
          }}
        />
      )}

      {/* 上传提示 - 紧凑模式下隐藏或简化 */}
      {!compact && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            支持 JPG、PNG、WebP 格式，文件大小不超过 {Math.round(maxSize / 1024 / 1024)} MB
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            建议尺寸: 800x600 像素，比例 4:3
          </Text>
        </div>
      )}
    </div>
  );
};

export default CoverImageUpload;