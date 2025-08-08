# Design Document

## Overview

This design document outlines the modernization of the audio detail page (`/audio/[id]`) to use Ant Design components, creating a consistent and professional user interface that aligns with the existing design system. The redesign will maintain all current functionality while improving the visual presentation, user experience, and mobile responsiveness.

## Architecture

### Component Structure

The audio detail page will be restructured using Ant Design's layout and component system:

```
AudioDetailPage (Main Container)
├── AntdProvider (Already configured)
├── Layout
│   ├── Breadcrumb (Ant Design)
│   ├── PageHeader (Custom with Ant Design components)
│   ├── Content
│   │   ├── AudioInfoCard (Card component)
│   │   ├── SearchSection (Card with Input.Search)
│   │   ├── TranscriptionCard (Card with Typography)
│   │   ├── ChapterSection (Card with List)
│   │   ├── TimeMarkersSection (Card with Timeline)
│   │   ├── RelatedContent (Card with List)
│   │   └── CommentsSection (Card with Comment components)
│   └── BackTop (Ant Design)
```

### Design System Integration

The page will use the existing Ant Design theme configuration:
- Primary color: `#00529B` (medical blue)
- Success color: `#28A745` (green)
- Border radius: `8px` for consistency
- Typography scale from Ant Design
- Responsive breakpoints: `xs`, `sm`, `md`, `lg`, `xl`

## Components and Interfaces

### 1. Page Layout Component

```typescript
interface AudioDetailLayoutProps {
  audio: AudioFile;
  loading: boolean;
  error: string | null;
}
```

**Key Features:**
- Uses Ant Design's `Layout` component
- Responsive grid system with `Row` and `Col`
- Consistent spacing using Ant Design's space tokens
- Mobile-first responsive design

### 2. Audio Information Card

```typescript
interface AudioInfoCardProps {
  audio: AudioFile;
  onPlay: (startPosition?: number) => void;
  loading?: boolean;
}
```

**Design Elements:**
- `Card` component with shadow and hover effects
- `Descriptions` component for metadata display
- `Button.Group` for action buttons
- `Avatar` for audio thumbnail/icon
- `Tag` components for categories and subjects

### 3. Search Section Component

```typescript
interface AudioSearchProps {
  audioId: string;
  onSearchResults: (results: SearchResult[]) => void;
  onSeekTo: (time: number) => void;
}
```

**Design Elements:**
- `Input.Search` with search icon
- `List` component for search results
- `Typography.Text` with `mark` prop for highlighting
- `Empty` component for no results state
- `Button` components for "jump to time" actions

### 4. Content Sections

**Transcription Section:**
- `Card` with collapsible content
- `Typography.Paragraph` with proper line height
- Search highlighting integration
- Responsive text sizing

**Chapter List Section:**
- `List` component with clickable items
- `Timeline` component for visual progression
- Current time highlighting
- Mobile-optimized touch targets

**Time Markers Section:**
- `List` with custom item rendering
- Time formatting utilities
- Interactive click handlers
- Add marker functionality (admin only)

## Data Models

### Audio File Interface (Extended)
```typescript
interface AudioFile {
  id: string;
  title: string;
  description?: string;
  subject: string;
  tags?: string[];
  duration?: number;
  uploadDate: string;
  transcription?: string;
  // ... existing properties
}

interface SearchResult {
  segment: {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
  };
  matches: string[];
}
```

### UI State Management
```typescript
interface AudioDetailState {
  audio: AudioFile | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  showSearchResults: boolean;
  currentTime: number;
}
```

## Error Handling

### Error States Design

1. **Loading State:**
   - `Skeleton` components for content areas
   - `Spin` component for overlay loading
   - Progressive loading for different sections

2. **Error States:**
   - `Result` component for 404 errors
   - `Alert` component for non-critical errors
   - `message` API for user feedback

3. **Empty States:**
   - `Empty` component with custom illustrations
   - Contextual messages and actions
   - Consistent styling across sections

### Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
```

## Testing Strategy

### Component Testing
1. **Unit Tests:**
   - Individual Ant Design component integration
   - Props validation and rendering
   - Event handler functionality
   - Responsive behavior testing

2. **Integration Tests:**
   - Audio playback integration
   - Search functionality
   - Navigation and routing
   - State management

3. **Visual Testing:**
   - Ant Design theme consistency
   - Mobile responsiveness
   - Cross-browser compatibility
   - Accessibility compliance

### User Experience Testing
1. **Usability Tests:**
   - Navigation flow
   - Touch interaction on mobile
   - Keyboard accessibility
   - Screen reader compatibility

2. **Performance Tests:**
   - Component rendering performance
   - Search response times
   - Mobile performance metrics
   - Bundle size impact

## Implementation Approach

### Phase 1: Core Layout Migration
- Replace basic HTML structure with Ant Design Layout
- Implement responsive grid system
- Add consistent spacing and typography

### Phase 2: Interactive Components
- Migrate action buttons to Ant Design Button components
- Implement search with Input.Search
- Add proper loading and error states

### Phase 3: Content Sections
- Convert transcription display to Card components
- Implement chapter list with List component
- Add time markers with Timeline component

### Phase 4: Polish and Optimization
- Add animations and transitions
- Optimize mobile experience
- Implement accessibility improvements
- Performance optimization

## Mobile Responsiveness

### Breakpoint Strategy
- **xs (< 576px):** Single column layout, compact components
- **sm (≥ 576px):** Two-column sections where appropriate
- **md (≥ 768px):** Three-column layout for content sections
- **lg (≥ 992px):** Full desktop layout with sidebars
- **xl (≥ 1200px):** Maximum width with centered content

### Touch Optimization
- Minimum 44px touch targets for buttons
- Swipe gestures for chapter navigation
- Pull-to-refresh for content updates
- Optimized scrolling performance

## Accessibility Considerations

### WCAG 2.1 Compliance
- Proper heading hierarchy using Typography components
- Color contrast ratios meeting AA standards
- Keyboard navigation support
- Screen reader compatibility
- Focus management for interactive elements

### Ant Design Accessibility Features
- Built-in ARIA attributes
- Keyboard navigation patterns
- Focus indicators
- Semantic HTML structure