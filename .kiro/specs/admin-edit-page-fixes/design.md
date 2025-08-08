# Design Document

## Overview

This design addresses the critical issues in the admin audio edit page by implementing proper component imports, fixing JSX structure, enhancing API data handling, and adding comprehensive support for chapters and related resources management. The solution will use Ant Design components for consistency with the existing admin interface and implement proper error handling and loading states.

## Architecture

### Component Structure
```
EditAudioPage (Main Component)
├── AntdAdminLayout (Correct Layout Component)
├── AudioEditForm (Form Section)
│   ├── BasicMetadataFields
│   ├── TranscriptionEditor
│   ├── ChapterManager
│   └── RelatedResourcesManager
├── AudioPreviewPanel (Sidebar)
│   ├── AudioPlayer
│   └── AudioMetadata
└── ErrorBoundary (Error Handling)
```

### Data Flow
1. **Page Load**: Fetch audio data from `/api/audio/[id]`
2. **Form State**: Manage all form fields in component state
3. **Validation**: Client-side validation before submission
4. **Update**: PUT request to `/api/audio/[id]` with all changes
5. **Chapters/Resources**: Separate API endpoints for complex data

## Components and Interfaces

### Main Component Interface
```typescript
interface AudioFile {
  id: string
  title: string
  description: string
  url: string
  filename: string
  uploadDate: string
  subject: string
  tags: string[]
  speaker?: string
  recordingDate?: string
  duration?: number
  transcription?: string
  chapters?: AudioChapter[]
  relatedResources?: RelatedResource[]
}

interface AudioChapter {
  id: string
  audioId: string
  title: string
  description?: string
  startTime: number
  endTime?: number
  order: number
  createdAt?: string
  updatedAt?: string
}

interface RelatedResource {
  id: string
  audioId: string
  title: string
  url: string
  type: 'link' | 'pdf' | 'image' | 'slides'
  description?: string
}
```

### Form Validation Schema
```typescript
const audioUpdateSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题不能超过200个字符"),
  description: z.string().max(2000, "描述不能超过2000个字符").optional(),
  subject: z.string().min(1, "学科分类不能为空"),
  tags: z.array(z.string()).max(10, "标签数量不能超过10个").optional(),
  speaker: z.string().optional(),
  recordingDate: z.string().optional(),
  transcription: z.string().optional(),
  chapters: z.array(chapterSchema).optional(),
  relatedResources: z.array(resourceSchema).optional()
})
```

### Component Fixes

#### 1. Import Corrections
- Replace `AdminLayout` with `AntdAdminLayout`
- Remove unused imports (`useRef`, `EditOutlined`)
- Add missing Ant Design component imports

#### 2. JSX Structure Fix
- Fix unclosed div tags
- Ensure proper nesting of components
- Add proper key props for dynamic lists

#### 3. Layout Integration
- Use AntdAdminLayout for consistent admin interface
- Implement proper breadcrumb navigation
- Add responsive design considerations

## Data Models

### Database Integration

#### Chapters Table
```sql
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  audioId TEXT,
  title TEXT,
  description TEXT,
  startTime REAL,
  endTime REAL,
  "order" INTEGER,
  createdAt TEXT,
  updatedAt TEXT,
  FOREIGN KEY (audioId) REFERENCES audios(id)
);
```

#### Related Resources Table
```sql
CREATE TABLE related_resources (
  id TEXT PRIMARY KEY,
  audioId TEXT,
  title TEXT,
  url TEXT,
  type TEXT,
  description TEXT,
  FOREIGN KEY (audioId) REFERENCES audios(id)
);
```

### API Data Handling

#### Enhanced GET Response
```typescript
// Current API returns: { audio: AudioData }
// Enhanced to include related data:
{
  audio: AudioData,
  chapters: AudioChapter[],
  relatedResources: RelatedResource[],
  transcription?: TranscriptionData
}
```

#### Enhanced PUT Request
```typescript
// Support for updating all related data in single request
{
  ...basicMetadata,
  chapters: AudioChapter[],
  relatedResources: RelatedResource[],
  transcription?: string
}
```

## Error Handling

### Client-Side Error Handling
1. **Form Validation Errors**: Display field-specific error messages
2. **API Errors**: Show user-friendly error messages with retry options
3. **Network Errors**: Handle offline scenarios and connection issues
4. **Permission Errors**: Redirect to appropriate pages with clear messages

### Error Boundary Implementation
```typescript
class AudioEditErrorBoundary extends React.Component {
  // Catch and handle component-level errors
  // Provide fallback UI with error reporting
}
```

### Loading States
1. **Initial Load**: Full page loading spinner
2. **Form Submission**: Button loading state with disabled form
3. **Audio Loading**: Audio player loading indicator
4. **Chapter/Resource Operations**: Individual loading states

## Testing Strategy

### Unit Tests
1. **Component Rendering**: Test all form fields render correctly
2. **Form Validation**: Test client-side validation rules
3. **State Management**: Test form state updates and resets
4. **Error Handling**: Test error display and recovery

### Integration Tests
1. **API Integration**: Test data fetching and updating
2. **Audio Player**: Test audio playback functionality
3. **Chapter Management**: Test CRUD operations for chapters
4. **Resource Management**: Test CRUD operations for resources

### User Acceptance Tests
1. **Admin Workflow**: Test complete edit workflow
2. **Permission Handling**: Test access control
3. **Error Scenarios**: Test error handling and recovery
4. **Performance**: Test with large audio files and many chapters

## Implementation Approach

### Phase 1: Core Fixes
1. Fix import issues and JSX structure
2. Implement proper layout integration
3. Add basic error handling and loading states

### Phase 2: Enhanced Data Handling
1. Implement chapters management UI
2. Implement related resources management UI
3. Enhance API integration for complex data

### Phase 3: Polish and Testing
1. Add comprehensive validation
2. Implement proper error boundaries
3. Add loading states and user feedback
4. Performance optimization

## Security Considerations

### Input Validation
- Sanitize all user inputs
- Validate file URLs and resource links
- Prevent XSS attacks in transcription content

### Access Control
- Verify admin permissions on every request
- Implement proper session handling
- Add CSRF protection for form submissions

### Data Integrity
- Validate chapter timestamps for logical consistency
- Ensure resource URLs are valid and safe
- Implement proper database constraints

## Performance Considerations

### Client-Side Optimization
- Lazy load audio player components
- Debounce form validation
- Optimize re-renders with React.memo

### Server-Side Optimization
- Implement proper database indexing
- Use prepared statements for queries
- Add response caching where appropriate

### Audio Handling
- Stream audio for preview without full download
- Implement proper audio metadata extraction
- Add audio duration calculation and caching