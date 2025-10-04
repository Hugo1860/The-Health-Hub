import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoverImageUpload from '../CoverImageUpload';

// Mock Ant Design message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('CoverImageUpload', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload area correctly', () => {
    render(<CoverImageUpload onChange={mockOnChange} />);

    expect(screen.getByText('上传封面')).toBeInTheDocument();
    expect(screen.getByText('支持 JPG、PNG、WebP 格式，文件大小不超过 5 MB')).toBeInTheDocument();
    expect(screen.getByText('建议尺寸: 800x600 像素，比例 4:3')).toBeInTheDocument();
  });

  it('accepts valid image file', async () => {
    render(<CoverImageUpload onChange={mockOnChange} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(file, 'mock-url');
    });
  });

  it('rejects invalid file format', async () => {
    const { message } = require('antd');
    render(<CoverImageUpload onChange={mockOnChange} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining('不支持的文件格式')
      );
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('rejects oversized file', async () => {
    const { message } = require('antd');
    render(<CoverImageUpload onChange={mockOnChange} maxSize={1024} />); // 1KB limit

    // Create a file larger than 1KB
    const largeContent = 'x'.repeat(2000);
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    
    // Mock file size
    Object.defineProperty(file, 'size', { value: 2000 });

    const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining('文件大小不能超过')
      );
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('displays existing cover image', () => {
    render(
      <CoverImageUpload 
        value="/existing-cover.jpg" 
        onChange={mockOnChange} 
      />
    );

    expect(screen.getByAltText('当前封面')).toHaveAttribute('src', '/existing-cover.jpg');
    expect(screen.getByText('当前封面')).toBeInTheDocument();
  });

  it('removes existing cover image when delete button is clicked', () => {
    render(
      <CoverImageUpload 
        value="/existing-cover.jpg" 
        onChange={mockOnChange} 
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('is disabled when disabled prop is true', () => {
    render(<CoverImageUpload onChange={mockOnChange} disabled={true} />);

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    expect(uploadButton).toHaveClass('ant-upload-disabled');
  });

  it('accepts custom accepted formats', async () => {
    const { message } = require('antd');
    render(
      <CoverImageUpload 
        onChange={mockOnChange} 
        acceptedFormats={['image/png']} 
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining('不支持的文件格式')
      );
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('shows custom max size in help text', () => {
    render(
      <CoverImageUpload 
        onChange={mockOnChange} 
        maxSize={2 * 1024 * 1024} // 2MB
      />
    );

    expect(screen.getByText('支持 JPG、PNG、WebP 格式，文件大小不超过 2 MB')).toBeInTheDocument();
  });

  it('handles file removal correctly', async () => {
    render(<CoverImageUpload onChange={mockOnChange} />);

    // First upload a file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(file, 'mock-url');
    });

    // Then remove the file
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith(null);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('handles preview functionality', async () => {
    render(<CoverImageUpload onChange={mockOnChange} />);

    // Upload a file first
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      const previewButton = screen.getByRole('button', { name: /preview/i });
      expect(previewButton).toBeInTheDocument();
    });
  });
});