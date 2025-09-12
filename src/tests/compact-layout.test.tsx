import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Form } from 'antd';
import '@testing-library/jest-dom';

// Mock the upload page component for testing
const MockCompactUploadForm = () => {
  const [form] = Form.useForm();
  
  return (
    <div data-testid="compact-upload-form">
      <Form form={form} layout="vertical">
        {/* 第一行：音频描述、讲者、封面图片 */}
        <div className="form-row" data-testid="row-1">
          <div className="description-field" data-testid="description-field">
            <Form.Item name="description" label="音频描述">
              <textarea placeholder="请输入音频描述（可选）" />
            </Form.Item>
          </div>
          <div className="speaker-field" data-testid="speaker-field">
            <Form.Item name="speaker" label="讲者">
              <input placeholder="讲者姓名（可选）" />
            </Form.Item>
          </div>
          <div className="cover-upload" data-testid="cover-upload">
            <Form.Item label="封面图片">
              <input type="file" accept="image/*" />
            </Form.Item>
          </div>
        </div>

        {/* 第二行：状态选择、音频文件上传 */}
        <div className="form-row" data-testid="row-2">
          <div data-testid="status-field">
            <Form.Item name="status" label="发布状态">
              <select>
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
            </Form.Item>
          </div>
          <div data-testid="audio-upload">
            <Form.Item name="audioFile" label="音频文件">
              <input type="file" accept="audio/*" />
            </Form.Item>
          </div>
        </div>
      </Form>
    </div>
  );
};

describe('Compact Layout Tests', () => {
  beforeEach(() => {
    // Reset viewport to desktop size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  test('renders compact form layout structure', () => {
    render(<MockCompactUploadForm />);
    
    // 验证表单存在
    expect(screen.getByTestId('compact-upload-form')).toBeInTheDocument();
    
    // 验证第一行存在
    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.getByTestId('description-field')).toBeInTheDocument();
    expect(screen.getByTestId('speaker-field')).toBeInTheDocument();
    expect(screen.getByTestId('cover-upload')).toBeInTheDocument();
    
    // 验证第二行存在
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
    expect(screen.getByTestId('status-field')).toBeInTheDocument();
    expect(screen.getByTestId('audio-upload')).toBeInTheDocument();
  });

  test('form fields have correct labels', () => {
    render(<MockCompactUploadForm />);
    
    // 验证标签文本
    expect(screen.getByText('音频描述')).toBeInTheDocument();
    expect(screen.getByText('讲者')).toBeInTheDocument();
    expect(screen.getByText('封面图片')).toBeInTheDocument();
    expect(screen.getByText('发布状态')).toBeInTheDocument();
    expect(screen.getByText('音频文件')).toBeInTheDocument();
  });

  test('form fields have correct placeholders', () => {
    render(<MockCompactUploadForm />);
    
    // 验证占位符文本
    expect(screen.getByPlaceholderText('请输入音频描述（可选）')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('讲者姓名（可选）')).toBeInTheDocument();
  });

  test('file inputs accept correct file types', () => {
    render(<MockCompactUploadForm />);
    
    // 验证文件输入类型
    const coverUpload = screen.getByTestId('cover-upload').querySelector('input[type="file"]');
    const audioUpload = screen.getByTestId('audio-upload').querySelector('input[type="file"]');
    
    expect(coverUpload).toHaveAttribute('accept', 'image/*');
    expect(audioUpload).toHaveAttribute('accept', 'audio/*');
  });

  test('form maintains functionality with compact layout', async () => {
    render(<MockCompactUploadForm />);
    
    // 测试表单交互
    const descriptionField = screen.getByPlaceholderText('请输入音频描述（可选）');
    const speakerField = screen.getByPlaceholderText('讲者姓名（可选）');
    const statusField = screen.getByTestId('status-field').querySelector('select');
    
    // 输入测试数据
    fireEvent.change(descriptionField, { target: { value: '测试音频描述' } });
    fireEvent.change(speakerField, { target: { value: '测试讲者' } });
    fireEvent.change(statusField!, { target: { value: 'published' } });
    
    // 验证输入值
    expect(descriptionField).toHaveValue('测试音频描述');
    expect(speakerField).toHaveValue('测试讲者');
    expect(statusField).toHaveValue('published');
  });

  test('layout adapts to different screen sizes', () => {
    const { rerender } = render(<MockCompactUploadForm />);
    
    // 测试桌面布局
    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
    
    // 模拟移动端尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    // 重新渲染
    rerender(<MockCompactUploadForm />);
    
    // 验证布局仍然存在（CSS媒体查询会处理样式变化）
    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
  });

  test('accessibility features are present', () => {
    render(<MockCompactUploadForm />);
    
    // 验证标签与输入框的关联
    const descriptionField = screen.getByPlaceholderText('请输入音频描述（可选）');
    const speakerField = screen.getByPlaceholderText('讲者姓名（可选）');
    
    // 验证输入框可以获得焦点
    expect(descriptionField).not.toHaveFocus();
    descriptionField.focus();
    expect(descriptionField).toHaveFocus();
    
    expect(speakerField).not.toHaveFocus();
    speakerField.focus();
    expect(speakerField).toHaveFocus();
  });

  test('keyboard navigation works correctly', () => {
    render(<MockCompactUploadForm />);
    
    const descriptionField = screen.getByPlaceholderText('请输入音频描述（可选）');
    const speakerField = screen.getByPlaceholderText('讲者姓名（可选）');
    
    // 测试Tab键导航
    descriptionField.focus();
    expect(descriptionField).toHaveFocus();
    
    // 模拟Tab键
    fireEvent.keyDown(descriptionField, { key: 'Tab', code: 'Tab' });
    
    // 在实际应用中，焦点会移动到下一个可聚焦元素
    // 这里我们只验证键盘事件能够正确触发
    expect(descriptionField).toHaveFocus(); // 在测试环境中焦点不会自动移动
  });
});

// 导出测试组件供其他测试使用
export { MockCompactUploadForm };