# Requirements Document

## Introduction

This feature addresses critical issues in the admin audio edit page that prevent proper functionality. The current implementation has several problems including incorrect component imports, JSX structure issues, incomplete API data handling, and missing functionality for chapters and related resources management.

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to access the audio edit page without encountering import errors, so that I can edit audio metadata successfully.

#### Acceptance Criteria

1. WHEN an admin navigates to `/admin/edit/[id]` THEN the system SHALL load the page without import errors
2. WHEN the page loads THEN the system SHALL use the correct AdminLayout component (AntdAdminLayout)
3. WHEN there are JSX structure issues THEN the system SHALL render properly without syntax errors

### Requirement 2

**User Story:** As an admin user, I want to edit basic audio metadata (title, description, subject, tags, speaker, recording date), so that I can maintain accurate audio information.

#### Acceptance Criteria

1. WHEN I load an audio edit page THEN the system SHALL populate all form fields with current audio data
2. WHEN I modify basic metadata fields THEN the system SHALL validate the input according to business rules
3. WHEN I submit valid changes THEN the system SHALL update the audio record successfully
4. WHEN validation fails THEN the system SHALL display clear error messages for each invalid field
5. WHEN the API returns an error THEN the system SHALL display a user-friendly error message

### Requirement 3

**User Story:** As an admin user, I want to manage audio transcriptions, so that I can provide accurate text content for audio files.

#### Acceptance Criteria

1. WHEN I view the edit page THEN the system SHALL display the current transcription if available
2. WHEN I edit the transcription field THEN the system SHALL support markdown formatting
3. WHEN I save changes THEN the system SHALL update the transcription in the database
4. WHEN no transcription exists THEN the system SHALL allow me to add new transcription content

### Requirement 4

**User Story:** As an admin user, I want to manage audio chapters with timestamps, so that I can provide structured navigation for long audio content.

#### Acceptance Criteria

1. WHEN I view the edit page THEN the system SHALL display existing chapters if any
2. WHEN I add a new chapter THEN the system SHALL allow me to specify title, start time, end time, and description
3. WHEN I modify chapter information THEN the system SHALL validate timestamp formats and logical ordering
4. WHEN I delete a chapter THEN the system SHALL remove it from the audio record
5. WHEN I save changes THEN the system SHALL persist all chapter data to the database

### Requirement 5

**User Story:** As an admin user, I want to manage related resources (links, PDFs, images, slides), so that I can provide supplementary materials for audio content.

#### Acceptance Criteria

1. WHEN I view the edit page THEN the system SHALL display existing related resources if any
2. WHEN I add a new resource THEN the system SHALL allow me to specify title, URL, type, and description
3. WHEN I specify a resource type THEN the system SHALL provide options: link, PDF, image, slides
4. WHEN I delete a resource THEN the system SHALL remove it from the audio record
5. WHEN I save changes THEN the system SHALL persist all resource data to the database

### Requirement 6

**User Story:** As an admin user, I want to preview audio while editing, so that I can verify the content matches my metadata changes.

#### Acceptance Criteria

1. WHEN I view the edit page THEN the system SHALL display an audio player with the current audio file
2. WHEN I click play/pause THEN the system SHALL control audio playback accordingly
3. WHEN audio is playing THEN the system SHALL display current time and total duration
4. WHEN I use the seek bar THEN the system SHALL allow me to jump to specific timestamps
5. WHEN I add chapter timestamps THEN the system SHALL help me navigate to those positions in the audio

### Requirement 7

**User Story:** As an admin user, I want proper error handling and loading states, so that I have clear feedback about the system status.

#### Acceptance Criteria

1. WHEN the page is loading THEN the system SHALL display a loading indicator
2. WHEN I don't have proper permissions THEN the system SHALL redirect me to the home page
3. WHEN an audio file doesn't exist THEN the system SHALL display a "not found" message
4. WHEN API calls fail THEN the system SHALL display specific error messages
5. WHEN I submit changes THEN the system SHALL show loading state during the update process