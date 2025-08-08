# Design Document

## Overview

This design outlines the replacement of demo data with real API integrations across all admin interface pages. The solution will implement standardized API endpoints, consistent error handling, proper loading states, and performance optimizations to ensure the admin interface works reliably with real database data.

## Architecture

### API Layer Structure
```
Admin Interface
├── Dashboard API Integration
│   ├── /api/admin/dashboard/stats
│   ├── /api/admin/dashboard/recent-activity
│   └── /api/admin/dashboard/popular-content
├── User Management API Integration
│   ├── /api/admin/users (GET, POST)
│   ├── /api/admin/users/[id] (GET, PUT, DELETE)
│   └── /api/admin/users/search
├── Content Management API Integration
│   ├── /api/admin/categories
│   ├── /api/admin/analytics
│   └── /api/admin/system/status
└── Common API Utilities
    ├── Error Handling Middleware
    ├── Authentication Middleware
    └── Response Standardization
```

### Data Flow Architecture
1. **Client Request**: Admin page initiates API call
2. **Authentication**: Verify admin permissions
3. **Database Query**: Execute optimized database operations
4. **Response Processing**: Format and return standardized response
5. **Client Update**: Update UI with real data and handle errors

## Components and Interfaces

### API Response Standardization

#### Standard Success Response
```typescript
interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
```

#### Standard Error Response
```typescript
interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}
```

### Dashboard API Interfaces

#### Dashboard Statistics
```typescript
interface DashboardStats {
  totalAudios: number
  totalUsers: number
  totalPlays: number
  totalComments: number
  monthlyGrowth: {
    audios: number
    users: number
    plays: number
  }
  categoryDistribution: Array<{
    category: string
    count: number
    percentage: number
  }>
}
```

#### Recent Activity
```typescript
interface RecentActivity {
  id: string
  type: 'audio_upload' | 'user_register' | 'comment_post' | 'user_login'
  title: string
  description: string
  userId?: string
  username?: string
  timestamp: string
  metadata?: Record<string, any>
}
```

#### Popular Content
```typescript
interface PopularContent {
  recentAudios: Array<{
    id: string
    title: string
    uploadDate: string
    plays: number
    duration: number
    speaker?: string
  }>
  popularAudios: Array<{
    id: string
    title: string
    plays: number
    likes: number
    comments: number
    rating: number
  }>
  topCategories: Array<{
    category: string
    audioCount: number
    totalPlays: number
  }>
}
```

### User Management API Interfaces

#### User Data Model
```typescript
interface AdminUser {
  id: string
  username: string
  email: string
  role: 'user' | 'admin' | 'moderator' | 'editor'
  status: 'active' | 'inactive' | 'banned'
  createdAt: string
  updatedAt: string
  lastLogin?: string
  profile?: {
    firstName?: string
    lastName?: string
    avatar?: string
    bio?: string
  }
  statistics?: {
    totalPlays: number
    totalComments: number
    totalFavorites: number
  }
}
```

#### User Search and Filter
```typescript
interface UserSearchParams {
  query?: string
  role?: string
  status?: string
  page?: number
  pageSize?: number
  sortBy?: 'username' | 'email' | 'createdAt' | 'lastLogin'
  sortOrder?: 'asc' | 'desc'
}
```

## Data Models

### Database Query Optimization

#### Dashboard Statistics Queries
```sql
-- Optimized statistics query
SELECT 
  (SELECT COUNT(*) FROM audios WHERE deleted_at IS NULL) as total_audios,
  (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
  (SELECT COALESCE(SUM(play_count), 0) FROM audios WHERE deleted_at IS NULL) as total_plays,
  (SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL) as total_comments;

-- Monthly growth query
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as count,
  'audios' as type
FROM audios 
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

#### User Management Queries
```sql
-- Paginated user search with filters
SELECT u.*, 
       COALESCE(stats.total_plays, 0) as total_plays,
       COALESCE(stats.total_comments, 0) as total_comments
FROM users u
LEFT JOIN (
  SELECT user_id,
         COUNT(DISTINCT audio_plays.id) as total_plays,
         COUNT(DISTINCT comments.id) as total_comments
  FROM users u2
  LEFT JOIN audio_plays ON u2.id = audio_plays.user_id
  LEFT JOIN comments ON u2.id = comments.user_id
  GROUP BY user_id
) stats ON u.id = stats.user_id
WHERE u.deleted_at IS NULL
  AND ($1::text IS NULL OR u.username ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
  AND ($2::text IS NULL OR u.role = $2)
  AND ($3::text IS NULL OR u.status = $3)
ORDER BY u.created_at DESC
LIMIT $4 OFFSET $5;
```

### Caching Strategy

#### Redis Cache Implementation
```typescript
interface CacheConfig {
  dashboardStats: {
    key: 'admin:dashboard:stats'
    ttl: 300 // 5 minutes
  }
  userCounts: {
    key: 'admin:users:counts'
    ttl: 600 // 10 minutes
  }
  popularContent: {
    key: 'admin:popular:content'
    ttl: 900 // 15 minutes
  }
}
```

## Error Handling

### Client-Side Error Handling

#### Error Display Component
```typescript
interface ErrorDisplayProps {
  error: ApiErrorResponse
  onRetry?: () => void
  showRetry?: boolean
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, showRetry = true }) => {
  return (
    <Alert
      message="操作失败"
      description={error.error.message}
      type="error"
      showIcon
      action={
        showRetry && onRetry && (
          <Button size="small" onClick={onRetry}>
            重试
          </Button>
        )
      }
    />
  )
}
```

#### Loading State Management
```typescript
interface LoadingState {
  dashboard: boolean
  users: boolean
  statistics: boolean
  activities: boolean
}

const useAdminLoading = () => {
  const [loading, setLoading] = useState<LoadingState>({
    dashboard: false,
    users: false,
    statistics: false,
    activities: false
  })

  const setLoadingState = (key: keyof LoadingState, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }))
  }

  return { loading, setLoadingState }
}
```

### Server-Side Error Handling

#### API Error Middleware
```typescript
export const adminErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Admin API Error:', error)

  // Database connection errors
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: '数据库连接失败，请稍后重试'
      }
    })
  }

  // Authentication errors
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '认证失败，请重新登录'
      }
    })
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '数据验证失败',
        details: error.details
      }
    })
  }

  // Default error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  })
}
```

## Testing Strategy

### API Integration Tests

#### Dashboard API Tests
```typescript
describe('Dashboard API Integration', () => {
  test('should fetch real dashboard statistics', async () => {
    const response = await fetch('/api/admin/dashboard/stats')
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('totalAudios')
    expect(data.data).toHaveProperty('totalUsers')
    expect(typeof data.data.totalAudios).toBe('number')
  })

  test('should handle database connection errors', async () => {
    // Mock database failure
    jest.spyOn(db, 'query').mockRejectedValue(new Error('Connection failed'))
    
    const response = await fetch('/api/admin/dashboard/stats')
    const data = await response.json()
    
    expect(response.status).toBe(503)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('DATABASE_UNAVAILABLE')
  })
})
```

#### User Management API Tests
```typescript
describe('User Management API Integration', () => {
  test('should fetch paginated user list', async () => {
    const response = await fetch('/api/admin/users?page=1&pageSize=10')
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.pagination).toHaveProperty('total')
  })

  test('should update user role', async () => {
    const userId = 'test-user-id'
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    })
    
    const data = await response.json()
    expect(response.ok).toBe(true)
    expect(data.success).toBe(true)
  })
})
```

### Component Integration Tests

#### Dashboard Component Tests
```typescript
describe('Admin Dashboard Integration', () => {
  test('should display real statistics', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText(/音频总数/)).toBeInTheDocument()
      expect(screen.getByText(/用户总数/)).toBeInTheDocument()
    })
    
    // Verify numbers are not hardcoded demo values
    const audioCount = screen.getByTestId('audio-count')
    expect(audioCount.textContent).not.toBe('156') // Demo value
  })

  test('should handle API errors gracefully', async () => {
    // Mock API failure
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API Error'))
    
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText(/获取数据失败/)).toBeInTheDocument()
    })
  })
})
```

## Implementation Approach

### Phase 1: API Infrastructure
1. Create standardized API response utilities
2. Implement authentication middleware for admin routes
3. Set up error handling middleware
4. Create database query optimization utilities

### Phase 2: Dashboard Integration
1. Replace demo statistics with real database queries
2. Implement recent activity tracking
3. Create popular content analytics
4. Add caching for performance optimization

### Phase 3: User Management Integration
1. Replace demo user data with real database queries
2. Implement user search and filtering
3. Add user statistics calculation
4. Create user management CRUD operations

### Phase 4: Content Management Integration
1. Integrate category management with real data
2. Connect analytics with actual usage statistics
3. Implement system status monitoring
4. Add content management features

### Phase 5: Performance and Polish
1. Optimize database queries for large datasets
2. Implement proper pagination and filtering
3. Add comprehensive error handling
4. Performance testing and optimization

## Security Considerations

### Authentication and Authorization
- Verify admin permissions on all API endpoints
- Implement role-based access control
- Add session management and timeout handling
- Secure sensitive operations with additional verification

### Data Protection
- Sanitize all user inputs
- Implement proper SQL injection prevention
- Add rate limiting for API endpoints
- Encrypt sensitive data in transit and at rest

### Audit Logging
- Log all admin actions for audit trails
- Track data modifications with timestamps
- Monitor failed authentication attempts
- Alert on suspicious admin activities

## Performance Considerations

### Database Optimization
- Add proper indexes for frequently queried fields
- Implement connection pooling for database access
- Use prepared statements for repeated queries
- Optimize complex queries with proper joins

### Caching Strategy
- Cache frequently accessed statistics
- Implement Redis for session and data caching
- Use browser caching for static admin assets
- Add cache invalidation for real-time updates

### Frontend Optimization
- Implement lazy loading for large datasets
- Use virtual scrolling for long lists
- Debounce search and filter operations
- Optimize component re-renders with React.memo