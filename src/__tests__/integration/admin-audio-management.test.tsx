import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import AudioEditModal from '../../components/admin/AudioEditModal';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock authentication
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'admin-id', role: 'admin', email: 'admin@test.com' }
    },
    status: 'authenticated'
  }),
}));

// Mock Ant Design message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock CoverImageUpload
jest.mock('../../components/admin/CoverImageUpload', () => {
  return function MockCoverImageUpload({ onChange, value }: any) {
    return (
      <div data-testid="cover-image-upload">
        <input
          type="file"
          data-testid="cover-image-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file || null);
          }}
        />
        {value && <img src={value} alt="cover" data-testid="current-cover" />}
      </div>
    );
  };
});

// Setup MSW server for API mocking
const server = setupServer(
  // Mock audio update API
  rest.put('/api/admin/simple-audio/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        message: 'Audio updated successfully',
        data: {
          id: 'test-audio-id',
          title: 'Updated Audio Title',
          description: 'Updated description',
          subject: '心血管',
          speaker: 'Updated Speaker',
          tags: ['updated-tag'],
        }
      })
    );
  }),

  // Mock cover image upload API
  rest.post('/api/admin/audio/:id/cover', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        message: 'Cover image uploaded successfully',
        coverImageUrl: '/uploads/covers/test-audio-id-123456.jpg'
      })
    );
  }),

  // Mock cover image delete API
  rest.delete('/api/admin/audio/:id/cover', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        message: 'Cover image removed successfully'
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockAudio = {
  id: 'test-audio-id',
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

describe('Admin Audio Management Integration Tests', () => {
  describe('Complete Audio Edit Workflow', () => {
    it('successfully edits audio with metadata and cover image', async () => {
      const mockOnSave = jest.fn(async (audioId: string, data: any) => {
        // Simulate API calls
        const updateResponse = await fetch(`/api/admin/simple-audio/${audioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (data.coverImage) {
          const formData = new FormData();
          formData.append('coverImage', data.coverImage);
          
          const coverResponse = await fetch(`/api/admin/audio/${audioId}/cover`, {
            method: 'POST',
            body: formData,
          });

          const coverResult = await coverResponse.json();
          if (!coverResult.success) {
            throw new Error(coverResult.error);
          }
        }

        const result = await updateResponse.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      });

      const mockOnCancel = jest.fn();

      render(
        <AudioEditModal
          visible={true}
          audio={mockAudio}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Update title
      const titleInput = screen.getByDisplayValue('Test Audio');
      fireEvent.change(titleInput, { target: { value: 'Updated Audio Title' } });

      // Update description
      const descriptionInput = screen.getByDisplayValue('Test Description');
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

      // Update speaker
      const speakerInput = screen.getByDisplayValue('Test Speaker');
      fireEvent.change(speakerInput, { target: { value: 'Updated Speaker' } });

      // Upload new cover image
      const file = new File(['test'], 'new-cover.jpg', { type: 'image/jpeg' });
      const coverImageInput = screen.getByTestId('cover-image-input');
      fireEvent.change(coverImageInput, { target: { files: [file] } });

      // Save changes
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-audio-id', {
          title: 'Updated Audio Title',
          description: 'Updated description',
          subject: '心血管',
          speaker: 'Updated Speaker',
          tags: ['tag1', 'tag2'],
          recordingDate: expect.any(String),
          coverImage: file,
        });
      });

      // Verify no errors occurred
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('handles API errors gracefully', async () => {
      // Mock API error
      server.use(
        rest.put('/api/admin/simple-audio/:id', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              success: false,
              error: 'Internal server error'
            })
          );
        })
      );

      const mockOnSave = jest.fn(async (audioId: string, data: any) => {
        const response = await fetch(`/api/admin/simple-audio/${audioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      });

      const mockOnCancel = jest.fn();

      render(
        <AudioEditModal
          visible={true}
          audio={mockAudio}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Try to save
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Verify error was thrown
      await expect(mockOnSave).rejects.toThrow('Internal server error');
    });

    it('handles cover image upload failure', async () => {
      // Mock cover image upload error
      server.use(
        rest.post('/api/admin/audio/:id/cover', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: 'Invalid file format'
            })
          );
        })
      );

      const mockOnSave = jest.fn(async (audioId: string, data: any) => {
        // Update metadata first
        const updateResponse = await fetch(`/api/admin/simple-audio/${audioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const updateResult = await updateResponse.json();
        if (!updateResult.success) {
          throw new Error(updateResult.error);
        }

        // Try to upload cover image
        if (data.coverImage) {
          const formData = new FormData();
          formData.append('coverImage', data.coverImage);
          
          const coverResponse = await fetch(`/api/admin/audio/${audioId}/cover`, {
            method: 'POST',
            body: formData,
          });

          const coverResult = await coverResponse.json();
          if (!coverResult.success) {
            throw new Error(`Cover upload failed: ${coverResult.error}`);
          }
        }
      });

      const mockOnCancel = jest.fn();

      render(
        <AudioEditModal
          visible={true}
          audio={mockAudio}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Upload invalid cover image
      const file = new File(['test'], 'invalid.txt', { type: 'text/plain' });
      const coverImageInput = screen.getByTestId('cover-image-input');
      fireEvent.change(coverImageInput, { target: { files: [file] } });

      // Try to save
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Verify cover upload error was thrown
      await expect(mockOnSave).rejects.toThrow('Cover upload failed: Invalid file format');
    });
  });

  describe('Cover Image Management Workflow', () => {
    it('successfully removes existing cover image', async () => {
      const mockOnSave = jest.fn(async (audioId: string, data: any) => {
        // Remove cover image
        const response = await fetch(`/api/admin/audio/${audioId}/cover`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      });

      const mockOnCancel = jest.fn();

      render(
        <AudioEditModal
          visible={true}
          audio={mockAudio}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Verify current cover is displayed
      expect(screen.getByTestId('current-cover')).toHaveAttribute('src', '/test-cover.jpg');

      // Remove cover image (this would be triggered by the CoverImageUpload component)
      const coverImageInput = screen.getByTestId('cover-image-input');
      fireEvent.change(coverImageInput, { target: { files: [] } });

      // Save changes
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation Workflow', () => {
    it('prevents saving with invalid data and shows validation errors', async () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <AudioEditModal
          visible={true}
          audio={mockAudio}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Clear required title field
      const titleInput = screen.getByDisplayValue('Test Audio');
      fireEvent.change(titleInput, { target: { value: '' } });

      // Add too many tags
      const tagsInput = screen.getByRole('combobox', { name: /标签/i });
      const manyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      
      // Simulate adding many tags (this would normally be done through the Select component)
      fireEvent.change(tagsInput, { target: { value: manyTags.join(',') } });

      // Try to save
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // Verify validation errors are shown
      await waitFor(() => {
        expect(screen.getByText('请输入音频标题')).toBeInTheDocument();
      });

      // Verify onSave was not called due to validation errors
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Permission and Access Control', () => {
    it('handles authentication errors', async () => {
      // Mock authentication error
      server.use(
        rest.put('/api/admin/simple-audio/:id', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              success: false,
              error: 'Authentication required'
            })
          );
        })
      );

      const mockOnSave = jest.fn(async (audioId: string, data: any) => {
        const response = await fetch(`/api/admin/simple-audio/${audioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      });

      const mockOnCancel = jest.fn();

      render(
        <AudioEditModal
          visible={true}
          audio={mockAudio}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Try to save
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Verify authentication error was thrown
      await expect(mockOnSave).rejects.toThrow('Authentication required');
    });
  });
});