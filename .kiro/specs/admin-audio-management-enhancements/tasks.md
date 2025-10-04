# Implementation Plan

- [x] 1. Create audio management page with listing and basic operations
  - Build dedicated admin page for audio management with table view
  - Implement pagination, search, and filter functionality
  - Add edit and delete buttons for each audio item
  - _Requirements: 1.1, 1.5_

- [x] 1.1 Create audio management page component
  - Create `src/app/admin/audio/page.tsx` with audio listing table
  - Implement data fetching from existing simple-audio API
  - Add search and filter controls for title, subject, and speaker
  - _Requirements: 1.1_

- [x] 1.2 Add pagination and sorting to audio management
  - Implement client-side pagination for audio list
  - Add sorting functionality for columns (title, upload date, plays)
  - Create loading states and error handling for data fetching
  - _Requirements: 1.1_

- [x] 2. Implement audio edit modal with form validation
  - Create reusable edit modal component with pre-populated form
  - Add form validation for required fields and data formats
  - Implement save and cancel functionality with loading states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.1 Create audio edit modal component
  - Build `src/components/admin/AudioEditModal.tsx` with Ant Design form
  - Implement form fields for title, description, subject, speaker, tags
  - Add form validation rules and error message display
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 2.2 Implement form pre-population and data binding
  - Add logic to populate form with existing audio data when editing
  - Implement controlled form inputs with proper state management
  - Add form reset functionality for cancel operations
  - _Requirements: 1.1, 1.5_

- [x] 2.3 Add save functionality to edit modal
  - Implement form submission with API call to update audio
  - Add loading states during save operations
  - Handle success and error responses with appropriate user feedback
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 3. Create cover image upload component with validation
  - Build image upload component with drag-and-drop support
  - Implement image validation for format, size, and dimensions
  - Add image preview functionality with crop/resize options
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Create cover image upload component
  - Build `src/components/admin/CoverImageUpload.tsx` with Ant Design Upload
  - Implement drag-and-drop image upload with preview
  - Add image format validation (JPEG, PNG, WebP) and size limits
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 3.2 Add image preview and validation feedback
  - Implement image preview with thumbnail display
  - Add validation error messages for invalid images
  - Create loading states for image processing operations
  - _Requirements: 2.2, 2.5_

- [x] 4. Implement cover image API endpoints
  - Create API endpoints for uploading and managing cover images
  - Add image processing and storage functionality
  - Implement proper error handling and cleanup for failed uploads
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 4.1 Create cover image upload API endpoint
  - Build `src/app/api/admin/audio/[id]/cover/route.ts` for image uploads
  - Implement multipart form data handling for image files
  - Add image validation and processing with file system storage
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 4.2 Add cover image management to existing audio API
  - Update `src/app/api/admin/simple-audio/[id]/route.ts` to handle cover images
  - Modify PUT endpoint to accept cover image updates
  - Add cover image deletion when audio is deleted
  - _Requirements: 2.3, 4.4_

- [x] 5. Integrate cover image upload into edit modal
  - Add cover image upload component to the audio edit modal
  - Implement cover image update functionality in save operations
  - Handle existing cover images with replace/remove options
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.1 Add cover image field to edit modal
  - Integrate CoverImageUpload component into AudioEditModal
  - Implement cover image state management within the modal
  - Add logic to handle existing cover images and updates
  - _Requirements: 4.1, 4.2_

- [x] 5.2 Implement cover image save functionality
  - Add cover image upload to the modal save operation
  - Handle both new uploads and existing image updates
  - Implement proper error handling for image upload failures
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 6. Update upload page to support cover images
  - Add cover image upload to the new audio creation form
  - Implement cover image handling in the upload API
  - Ensure consistent behavior between create and edit operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6.1 Add cover image upload to audio creation form
  - Update `src/app/admin/upload/page.tsx` to include cover image upload
  - Integrate CoverImageUpload component into the upload form
  - Add cover image to form validation and submission logic
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 6.2 Update upload API to handle cover images
  - Modify `src/app/api/upload/route.ts` to process cover images
  - Implement cover image storage during audio creation
  - Add proper error handling for cover image upload failures
  - _Requirements: 2.3, 2.5_

- [x] 7. Enhance featured recommendations to display cover images
  - Update featured recommendation components to show cover images
  - Implement fallback to default placeholder images
  - Add responsive image sizing and lazy loading
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7.1 Update admin dashboard featured sections
  - Modify `src/app/admin/page.tsx` to display cover images in audio lists
  - Add cover image display with fallback to default placeholder
  - Implement proper image sizing and aspect ratio handling
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7.2 Update browse page featured recommendations
  - Modify featured recommendation components to include cover images
  - Add lazy loading for cover images to improve performance
  - Implement click handlers for cover images to navigate to audio details
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 8. Create comprehensive test suite for audio management features
  - Write unit tests for all new components and API endpoints
  - Create integration tests for the complete edit workflow
  - Add E2E tests for admin audio management operations
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 8.1 Write unit tests for audio management components
  - Create tests for AudioEditModal component functionality
  - Write tests for CoverImageUpload component validation
  - Add tests for audio management page operations
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 8.2 Write API endpoint tests
  - Create tests for cover image upload API endpoint
  - Write tests for audio update operations with cover images
  - Add tests for error handling and validation scenarios
  - _Requirements: 2.1, 3.1_

- [x] 8.3 Create integration tests for complete workflows
  - Write tests for end-to-end audio editing workflow
  - Create tests for cover image upload and display workflow
  - Add tests for admin permission and access control
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 9. Implement compact layout for audio upload form
  - Redesign upload form with optimized row-based layout
  - Implement responsive design that adapts to different screen sizes
  - Update form styling and spacing for better visual hierarchy
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9.1 Create compact form layout structure
  - Update `src/app/admin/upload/page.tsx` to use row-based layout
  - Group description, speaker, and cover image fields in first row
  - Group status selection and audio file upload in second row
  - _Requirements: 5.1, 5.2_

- [x] 9.2 Implement responsive design for compact layout
  - Add CSS media queries for tablet and mobile breakpoints
  - Implement flexible layout that stacks fields on smaller screens
  - Ensure proper field widths and spacing across all screen sizes
  - _Requirements: 5.3, 5.5_

- [x] 9.3 Update form styling and visual hierarchy
  - Apply consistent typography and spacing to form elements
  - Implement uniform input heights and visual grouping
  - Add proper focus states and accessibility improvements
  - _Requirements: 5.4, 5.5_

- [x] 9.4 Test compact layout across devices and browsers
  - Verify layout functionality on desktop, tablet, and mobile devices
  - Test form submission and validation with new layout
  - Ensure accessibility compliance and keyboard navigation
  - _Requirements: 5.3, 5.4, 5.5_