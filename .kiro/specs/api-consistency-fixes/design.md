# Design Document

## Overview

This design addresses the API consistency issues identified across the application where different endpoints use inconsistent parameter handling patterns. The analysis reveals two main patterns currently in use:

1. **Legacy Pattern**: `const params = await context.params; ... params.id`
2. **Modern Pattern**: `const { id } = await params;`

The goal is to standardize all API endpoints to use the modern pattern while ensuring consistent error handling, response formatting, and authentication patterns.

## Architecture

### Current State Analysis

Based on the codebase analysis, we have identified the following inconsistencies:

**Files using Legacy Pattern (params.id):**
- `src/app/api/questions/[id]/route.ts`
- `src/app/api/related-resources/[id]/route.ts`
- `src/app/api/notifications/[id]/route.ts`
- `src/app/api/subscriptions/[id]/route.ts`
- `src/app/api/answers/[id]/route.ts`

**Files using Modern Pattern (destructured params):**
- `src/app/api/audio/[id]/route.ts`
- `src/app/api/categories/[id]/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/playlists/[id]/route.ts`

### Target Architecture

All API endpoints will follow a standardized pattern:

```typescript
export async function METHOD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Implementation follows...
}
```

## Components and Interfaces

### 1. Parameter Handling Standardization

**Standard Parameter Pattern:**
```typescript
// Consistent parameter destructuring
const { id } = await params;
```

**Type Safety:**
```typescript
interface RouteParams {
  id: string;
}

interface RouteContext {
  params: Promise<RouteParams>;
}
```

### 2. Error Response Standardization

**Standard Error Response Format:**
```typescript
interface ApiErrorResponse {
  error: string;
  details?: any;
  code?: string;
}

interface ApiSuccessResponse<T = any> {
  message?: string;
  data?: T;
  [key: string]: any;
}
```

**Error Handling Patterns:**
```typescript
// 404 Not Found
return NextResponse.json(
  { error: 'Resource not found' },
  { status: 404 }
);

// 400 Bad Request
return NextResponse.json(
  { error: 'Invalid input data', details: validation.error },
  { status: 400 }
);

// 401 Unauthorized
return NextResponse.json(
  { error: 'Authentication required' },
  { status: 401 }
);

// 403 Forbidden
return NextResponse.json(
  { error: 'Insufficient permissions' },
  { status: 403 }
);

// 500 Internal Server Error
return NextResponse.json(
  { error: 'Internal server error' },
  { status: 500 }
);
```

### 3. Authentication and Authorization Patterns

**Standard Authentication Check:**
```typescript
const session = await getServerSession(authOptions);
if (!session?.user) {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}
```

**Admin Authorization Check:**
```typescript
if (session.user.role !== 'admin') {
  return NextResponse.json(
    { error: 'Admin privileges required' },
    { status: 403 }
  );
}
```

### 4. Database Operation Patterns

**Standard Database Query Pattern:**
```typescript
try {
  const stmt = db.prepare('SELECT * FROM table WHERE id = ?');
  const result = stmt.get(id);
  
  if (!result) {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(result);
} catch (error) {
  console.error('Database operation failed:', error);
  return NextResponse.json(
    { error: 'Database operation failed' },
    { status: 500 }
  );
}
```

## Data Models

### Route Handler Function Signature

```typescript
type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;
```

### Standard Response Types

```typescript
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
```

## Error Handling

### Centralized Error Handling Strategy

1. **Parameter Validation**: All routes validate parameters before processing
2. **Authentication Errors**: Consistent 401/403 responses
3. **Database Errors**: Proper error logging and generic error responses
4. **Validation Errors**: Detailed validation error responses
5. **Server Errors**: Logged errors with generic client responses

### Error Logging Pattern

```typescript
catch (error) {
  console.error(`Operation failed for ${endpoint}:`, error);
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}
```

## Testing Strategy

### Unit Testing Approach

1. **Parameter Handling Tests**: Verify consistent parameter extraction
2. **Error Response Tests**: Validate error response formats
3. **Authentication Tests**: Test authentication and authorization flows
4. **Database Operation Tests**: Mock database operations and test error handling

### Integration Testing

1. **API Endpoint Tests**: Test complete request/response cycles
2. **Authentication Flow Tests**: Test protected endpoint access
3. **Error Scenario Tests**: Test various error conditions
4. **Response Format Tests**: Validate consistent response structures

### Test Categories

**Parameter Consistency Tests:**
- Verify all endpoints use `const { id } = await params;`
- Test parameter validation and error handling

**Error Response Consistency Tests:**
- Validate error response format across all endpoints
- Test HTTP status code consistency

**Authentication Pattern Tests:**
- Test authentication middleware consistency
- Validate authorization check patterns

**Database Operation Tests:**
- Test database error handling patterns
- Validate transaction handling consistency

## Implementation Phases

### Phase 1: Parameter Handling Standardization
- Update all legacy `params.id` usage to modern destructuring pattern
- Ensure consistent parameter type definitions

### Phase 2: Error Response Standardization
- Standardize error response formats across all endpoints
- Implement consistent HTTP status code usage

### Phase 3: Authentication Pattern Standardization
- Ensure consistent authentication checks
- Standardize authorization patterns

### Phase 4: Testing and Validation
- Implement comprehensive test suite
- Validate all changes through automated testing