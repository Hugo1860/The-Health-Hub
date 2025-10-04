import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioEditModal from '../AudioEditModal';

// Mock Ant Design components
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock CoverImageUpload component
jest.mock('../CoverImageUpload', () => {
  return function MockCoverImageUpload({ onChange, value, disabled }: any) {
    return (
      <div data-testid="cover-image-upload">
        <input
          type="file"
          data-testid="cover-image-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file || null);
          }}
          disabled={disabled}
        />
        {value && <img src={value} alt="cover" data-testid="current-cover" />}
      </div>
    );
  };
});

const mockAudio = {
  id: '1',
  title: 'Test Audio',
  description: 'Test Description',
  subject: '心血管',
  speaker: 'Test Speaker',
  tags: ['tag1', 'tag2'],
  coverImage: '/test-cover.jpg',
  uploadDate: '2023-01-01T00:00:00Z',
  duration: 300,
  size: 1024000,
  filename: 'test.mp3',
  url: '/test.mp3',
  recordingDate: '2023-01-01T00:00:00Z',
};

describe('AudioEditModal', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('编辑音频 - Test Audio')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Audio')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Speaker')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <AudioEditModal
        visible={false}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('编辑音频 - Test Audio')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('取消'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('validates required fields', async () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Clear title field
    const titleInput = screen.getByDisplayValue('Test Audio');
    fireEvent.change(titleInput, { target: { value: '' } });

    // Try to save
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('请输入音频标题')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates title length', async () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Audio');
    const longTitle = 'a'.repeat(201); // Exceeds 200 character limit
    fireEvent.change(titleInput, { target: { value: longTitle } });

    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('标题不能超过200个字符')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates description length', async () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const descriptionInput = screen.getByDisplayValue('Test Description');
    const longDescription = 'a'.repeat(1001); // Exceeds 1000 character limit
    fireEvent.change(descriptionInput, { target: { value: longDescription } });

    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('描述不能超过1000个字符')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with correct data when form is valid', async () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Modify title
    const titleInput = screen.getByDisplayValue('Test Audio');
    fireEvent.change(titleInput, { target: { value: 'Updated Audio Title' } });

    // Save
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('1', expect.objectContaining({
        title: 'Updated Audio Title',
        description: 'Test Description',
        subject: '心血管',
        speaker: 'Test Speaker',
        tags: ['tag1', 'tag2'],
        coverImage: null, // No new cover image uploaded
      }));
    });
  });

  it('handles cover image upload', async () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Mock file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Upload cover image
    const coverImageInput = screen.getByTestId('cover-image-input');
    fireEvent.change(coverImageInput, { target: { files: [file] } });

    // Save
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('1', expect.objectContaining({
        coverImage: file,
      }));
    });
  });

  it('shows current cover image', () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId('current-cover')).toHaveAttribute('src', '/test-cover.jpg');
  });

  it('displays file information correctly', () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('文件名: test.mp3')).toBeInTheDocument();
    expect(screen.getByText('文件大小: 1 MB')).toBeInTheDocument();
    expect(screen.getByText('时长: 5:00')).toBeInTheDocument();
    expect(screen.getByText('音频ID: 1')).toBeInTheDocument();
  });

  it('disables form when loading', () => {
    render(
      <AudioEditModal
        visible={true}
        audio={mockAudio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Audio');
    expect(titleInput).toBeDisabled();

    const saveButton = screen.getByText('保存');
    expect(saveButton).toHaveClass('ant-btn-loading');
  });
});