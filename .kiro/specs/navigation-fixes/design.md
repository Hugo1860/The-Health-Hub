# Design Document

## Overview

This design addresses critical navigation and display issues in the medical audio platform by implementing robust error handling for the browse page and intelligent role-based navigation for the settings functionality. The solution focuses on improving user experience through better error handling, fallback mechanisms, and context-aware navigation.

## Architecture

### Component Structure

```
AntdHomeLayout (Navigation Container)
├── UserDropdownMenu (Enhanced with role-based routing)
├── BrowsePage (Enhanced with error handling)
│   ├── ErrorBoundary (New error handling wrapper)
│   ├── LoadingStates (Enhanced loading indicators)
│   └── FallbackContent (Graceful degradation)
└── AdminGuard (Existing admin protection)
```

### Data Flow

1. **Authentication Context** → Provides user role information
2. **Navigation Logic** → Routes based on user role and permissions
3. **API Layer** → Enhanced with error handling and retries
4. **UI Components** → Display appropriate content or error states

## Components and Interfaces

### 1. Enhanced User Navigation Component

**Location:** `src/components/AntdHomeLayout.tsx`

**Interface:**
```typescript
interface UserMenuConfig {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  visible?: boolean;
}

interface NavigationProps {
  user: User | null;
  onNavigate: (path: string) => void;
}
```

**Functionality:**
- Dynamically generates menu items based on user role
- Admin users see "管理后台" linking to `/admin`
- Regular users see "设置" linking to `/settings`
- Handles menu closing and navigation state

### 2. Browse Page Error Handling

**Location:** `src/app/browse/page.tsx`

**Interface:**
```typescript
interface BrowsePageState {
  loading: boolean;
  error: string | null;
  retryCount: number;
  categories: Category[];
  audios: AudioFile[];
  pagination: PaginationInfo;
}

interface ErrorBoundaryProps {
  fallback: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error) => void;
}
```

**Error Handling Strategy:**
- Wrap API calls in try-catch blocks
- Implement exponential backoff for retries
- Provide fallback data for categories
- Show skeleton loaders during loading states
- Display user-friendly error messages

### 3. API Enhancement Layer

**Location:** `src/lib/apiErrorHandler.ts` (Enhanced)

**Interface:**
```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  retryable?: boolean;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}
```

**Features:**
- Centralized error handling
- Automatic retry logic for transient failures
- Network status detection
- Graceful degradation strategies

## Data Models

### User Role Navigation Mapping

```typescript
interface NavigationMapping {
  admin: {
    settingsPath: '/admin';
    settingsLabel: '管理后台';
    icon: SettingOutlined;
  };
  user: {
    settingsPath: '/settings';
    settingsLabel: '设置';
    icon: SettingOutlined;
  };
}
```

### Error State Models

```typescript
interface ErrorState {
  type: 'network' | 'api' | 'auth' | 'unknown';
  message: string;
  retryable: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
}
```

## Error Handling

### Browse Page Error Scenarios

1. **Network Failures**
   - Display: "网络连接失败，请检查网络设置"
   - Action: Retry button with exponential backoff
   - Fallback: Show cached content if available

2. **API Errors**
   - Display: Specific error message from API
   - Action: Retry or contact support options
   - Fallback: Default categories and empty audio list

3. **Authentication Errors**
   - Display: "登录已过期，请重新登录"
   - Action: Redirect to login page
   - Fallback: Show public content only

4. **Data Parsing Errors**
   - Display: "数据格式错误，正在尝试修复"
   - Action: Automatic retry with data validation
   - Fallback: Show minimal safe content

### Navigation Error Scenarios

1. **Role Detection Failure**
   - Default to regular user navigation
   - Log error for debugging
   - Provide manual admin access option

2. **Route Access Denied**
   - Redirect to appropriate page based on permissions
   - Show informative message
   - Provide alternative navigation options

## Testing Strategy

### Unit Tests

1. **Navigation Logic Tests**
   ```typescript
   describe('Role-based Navigation', () => {
     test('admin user navigates to admin dashboard');
     test('regular user navigates to settings page');
     test('undefined role defaults to settings page');
   });
   ```

2. **Error Handling Tests**
   ```typescript
   describe('Browse Page Error Handling', () => {
     test('displays error message on API failure');
     test('retries failed requests with backoff');
     test('shows fallback content when appropriate');
   });
   ```

### Integration Tests

1. **End-to-End Navigation Flow**
   - Test complete user journey from login to settings/admin
   - Verify role-based routing works correctly
   - Test error recovery scenarios

2. **Browse Page Functionality**
   - Test page loading with various API response scenarios
   - Verify error states and recovery mechanisms
   - Test filtering and search functionality

### Error Simulation Tests

1. **Network Failure Simulation**
   - Disconnect network during page load
   - Verify error handling and retry logic
   - Test offline/online state transitions

2. **API Error Simulation**
   - Mock various API error responses
   - Test error message display and user actions
   - Verify fallback content rendering

## Implementation Approach

### Phase 1: Navigation Enhancement
1. Update `AntdHomeLayout.tsx` with role-based menu generation
2. Implement user role detection logic
3. Add proper menu item visibility controls
4. Test navigation flows for both user types

### Phase 2: Browse Page Error Handling
1. Wrap browse page components in error boundaries
2. Implement retry logic for API calls
3. Add loading states and skeleton components
4. Create fallback content for various error scenarios

### Phase 3: API Layer Enhancement
1. Enhance existing API error handler
2. Implement retry mechanisms with exponential backoff
3. Add network status detection
4. Create centralized error logging

### Phase 4: Testing and Validation
1. Write comprehensive unit tests
2. Implement integration tests
3. Perform error simulation testing
4. Validate user experience improvements

## Security Considerations

1. **Role Validation**
   - Server-side role verification for admin routes
   - Client-side role checks for UI optimization only
   - Proper session management and timeout handling

2. **Error Information Disclosure**
   - Sanitize error messages to prevent information leakage
   - Log detailed errors server-side only
   - Provide generic user-friendly messages

3. **Navigation Security**
   - Validate route permissions on both client and server
   - Implement proper authentication guards
   - Handle unauthorized access gracefully