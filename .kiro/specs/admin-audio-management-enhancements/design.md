# Design Document

## Overview

This design enhances the admin panel's audio management system by adding comprehensive edit functionality and image cover support. The system will allow administrators to modify existing audio metadata and upload cover images that will be displayed in featured recommendation sections.

## Architecture

### Current State Analysis

Based on the codebase analysis, the current system has:

**Existing Components:**
- Admin dashboard (`src/app/admin/page.tsx`) with audio statistics
- Audio upload functionality (`src/app/admin/upload/page.tsx`)
- Simple audio API (`src/app/api/admin/simple-audio/[id]/route.ts`) with GET, PUT, DELETE operations
- Database schema with `coverImage` field already defined

**Database Schema (audios table):**
```sql
CREATE TABLE audios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  coverImage TEXT NULL,  -- Already exists for cover images
  uploadDate TIMESTAMPTZ NULL,
  subject TEXT NULL,
  tags JSONB NULL,
  size BIGINT NULL,
  duration DOUBLE PRECISION NULL,
  speaker TEXT NULL,
  recordingDate TIMESTAMPTZ NULL
);
```

### Target Architecture

The enhanced system will include:

1. **Audio Management Page**: A dedicated admin page for listing and managing all audio files
2. **Edit Modal/Form**: In-place editing functionality with pre-populated data
3. **Cover Image Upload**: Support for uploading and managing cover images
4. **Featured Display**: Enhanced featured recommendations with cover images

## Components and Interfaces

### 1. Audio Management Page Component

**Location**: `src/app/admin/audio/page.tsx`

**Features:**
- List all audio files with pagination
- Search and filter functionality
- Edit button for each audio item
- Delete functionality with confirmation
- Bulk operations support

**Component Structure:**
```typescript
interface AudioItem {
  id: string;
  title: string;
  description?: string;
  subject: string;
  speaker?: string;
  tags: string[];
  coverImage?: string;
  uploadDate: string;
  duration?: number;
  plays?: number;
}

interface AudioManagementPageProps {
  initialData?: AudioItem[];
  pageSize?: number;
}
```

### 2. Audio Edit Modal Component

**Location**: `src/components/admin/AudioEditModal.tsx`

**Features:**
- Pre-populated form with current audio data
- Cover image upload with preview
- Form validation
- Save/Cancel functionality
- Loading states

**Component Structure:**
```typescript
interface AudioEditModalProps {
  visible: boolean;
  audio: AudioItem | null;
  onSave: (audioId: string, data: AudioUpdateData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface AudioUpdateData {
  title: string;
  description?: string;
  subject: string;
  speaker?: string;
  tags: string[];
  coverImage?: File | string;
  recordingDate?: string;
}
```

### 3. Cover Image Upload Component

**Location**: `src/components/admin/CoverImageUpload.tsx`

**Features:**
- Drag and drop upload
- Image preview
- Format validation (JPEG, PNG, WebP)
- Size validation (max 5MB)
- Crop/resize functionality

**Component Structure:**
```typescript
interface CoverImageUploadProps {
  value?: string;
  onChange: (file: File | null, previewUrl?: string) => void;
  disabled?: boolean;
  maxSize?: number; // in bytes
  acceptedFormats?: string[];
}
```

### 4. Enhanced Featured Recommendations

**Location**: Update existing components to display cover images

**Features:**
- Display cover images in recommendation cards
- Fallback to default placeholder
- Lazy loading for images
- Responsive image sizing

### 5. Compact Upload Form Layout

**Location**: `src/app/admin/upload/page.tsx` and related form components

**Features:**
- Optimized row-based layout for better space utilization
- Responsive design that adapts to screen size
- Improved visual hierarchy and field grouping
- Maintained accessibility and usability

**Layout Structure:**
```typescript
interface CompactFormLayout {
  row1: {
    description: FormField;
    speaker: FormField;
    coverImage: UploadField;
  };
  row2: {
    status: SelectField;
    audioFile: UploadField;
  };
  // Other fields remain in their current positions
}
```

## Data Models

### Audio Update API Request

```typescript
interface AudioUpdateRequest {
  title: string;
  description?: string;
  subject: string;
  speaker?: string;
  tags: string[];
  recordingDate?: string;
  // Cover image handled separately via multipart upload
}
```

### Cover Image Upload API

```typescript
interface CoverImageUploadRequest {
  audioId: string;
  coverImage: File;
}

interface CoverImageUploadResponse {
  success: boolean;
  coverImageUrl?: string;
  error?: string;
}
```

### Enhanced Audio Response

```typescript
interface AudioResponse {
  id: string;
  title: string;
  description?: string;
  subject: string;
  speaker?: string;
  tags: string[];
  coverImage?: string;
  coverImageUrl?: string; // Full URL for display
  uploadDate: string;
  duration?: number;
  plays?: number;
  recordingDate?: string;
}
```

## Error Handling

### Form Validation

1. **Required Fields**: Title, Subject
2. **Image Validation**: Format, size, dimensions
3. **Text Length**: Title (max 200 chars), Description (max 1000 chars)
4. **Tags**: Maximum 10 tags, each max 50 chars

### Upload Error Handling

```typescript
interface UploadError {
  type: 'validation' | 'network' | 'server' | 'storage';
  message: string;
  field?: string;
}
```

### Error Recovery Strategies

1. **Network Errors**: Retry mechanism with exponential backoff
2. **Validation Errors**: Clear field-specific error messages
3. **Storage Errors**: Fallback to default images
4. **Partial Failures**: Save metadata even if image upload fails

## Testing Strategy

### Unit Testing

1. **Component Tests**: Audio edit modal, cover upload component
2. **API Tests**: Audio update endpoints, image upload endpoints
3. **Validation Tests**: Form validation, image validation
4. **Error Handling Tests**: Various error scenarios

### Integration Testing

1. **Edit Flow Tests**: Complete edit workflow from list to save
2. **Image Upload Tests**: Cover image upload and display
3. **Featured Display Tests**: Cover images in recommendations
4. **Permission Tests**: Admin-only access validation

### E2E Testing

1. **Admin Workflow**: Login → Navigate → Edit → Save → Verify
2. **Image Management**: Upload → Preview → Save → Display
3. **Error Scenarios**: Network failures, validation errors
4. **Cross-browser**: Image upload compatibility

## Implementation Phases

### Phase 1: Audio Management Page
- Create audio listing page with basic CRUD operations
- Implement search and filter functionality
- Add edit button integration

### Phase 2: Edit Modal Implementation
- Create edit modal component with form validation
- Implement pre-population of existing data
- Add save/cancel functionality

### Phase 3: Cover Image Support
- Implement cover image upload component
- Add image validation and preview
- Update database operations for cover images

### Phase 4: Featured Display Enhancement
- Update featured recommendations to show cover images
- Implement fallback for missing covers
- Add responsive image handling

### Phase 5: Compact Layout Implementation
- Redesign upload form with optimized row-based layout
- Implement responsive design for mobile compatibility
- Update form styling and spacing for better visual hierarchy
- Ensure accessibility compliance in the new layout

### Phase 6: Testing and Polish
- Comprehensive testing suite
- Performance optimization
- User experience improvements
- Cross-device compatibility testing

## File Upload Strategy

### Cover Image Storage

1. **Storage Location**: `public/uploads/covers/`
2. **Naming Convention**: `{audioId}-{timestamp}.{ext}`
3. **Supported Formats**: JPEG, PNG, WebP
4. **Size Limits**: Max 5MB, recommended 800x600px
5. **Optimization**: Automatic resize and compression

### Upload API Endpoint

**Location**: `src/app/api/admin/audio/[id]/cover/route.ts`

**Features:**
- Multipart form data handling
- Image validation and processing
- Old image cleanup
- Error handling and rollback

## Compact Layout Design Specifications

### Layout Structure

**Row 1: Content Information**
- **Description Field**: Text area (60% width)
- **Speaker Field**: Input field (25% width)  
- **Cover Image Upload**: Upload component (15% width)

**Row 2: File Management**
- **Status Selection**: Dropdown (30% width)
- **Audio File Upload**: File upload component (70% width)

### Responsive Breakpoints

```css
/* Desktop (>= 1024px) */
.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

/* Tablet (768px - 1023px) */
@media (max-width: 1023px) {
  .form-row {
    flex-wrap: wrap;
  }
  .description-field { width: 100%; }
  .speaker-field { width: 48%; }
  .cover-upload { width: 48%; }
}

/* Mobile (< 768px) */
@media (max-width: 767px) {
  .form-row {
    flex-direction: column;
  }
  .form-row > * {
    width: 100%;
  }
}
```

### Visual Hierarchy

1. **Field Labels**: Consistent typography and spacing
2. **Input Heights**: Uniform height across all form elements (40px)
3. **Spacing**: 16px gap between fields, 24px between rows
4. **Visual Grouping**: Subtle background or border to group related fields

### Accessibility Considerations

1. **Tab Order**: Logical tab sequence across rows
2. **Screen Reader**: Proper ARIA labels and descriptions
3. **Keyboard Navigation**: Full keyboard accessibility
4. **Focus Indicators**: Clear focus states for all interactive elements

## Security Considerations

### Access Control

1. **Admin Authentication**: Verify admin role for all operations
2. **CSRF Protection**: Use Next.js built-in CSRF protection
3. **File Upload Security**: Validate file types, scan for malware
4. **Path Traversal**: Sanitize file names and paths

### Data Validation

1. **Input Sanitization**: Clean all text inputs
2. **Image Validation**: Check file headers, not just extensions
3. **Size Limits**: Enforce both file size and image dimension limits
4. **Rate Limiting**: Prevent abuse of upload endpoints