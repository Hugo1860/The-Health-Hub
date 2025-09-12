/**
 * 分类层级管理相关类型定义
 * 支持二级分类功能的完整类型系统
 */

// 分类层级枚举
export enum CategoryLevel {
  PRIMARY = 1,    // 一级分类
  SECONDARY = 2   // 二级分类
}

// 基础分类接口
export interface BaseCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// 扩展分类接口（包含层级信息）
export interface Category extends BaseCategory {
  parentId?: string | null;  // 父分类ID
  level: CategoryLevel;      // 分类层级
  sortOrder: number;         // 排序顺序
  isActive: boolean;         // 是否激活
  children?: Category[];     // 子分类列表（查询时填充）
  audioCount?: number;       // 关联音频数量
}

// 分类树节点接口
export interface CategoryTreeNode extends BaseCategory {
  level: CategoryLevel.PRIMARY;
  sortOrder: number;
  isActive: boolean;
  audioCount: number;
  children: CategoryChild[];
}

// 子分类接口
export interface CategoryChild extends BaseCategory {
  parentId: string;
  level: CategoryLevel.SECONDARY;
  sortOrder: number;
  isActive: boolean;
  audioCount: number;
}

// 分类选择器值接口
export interface CategorySelection {
  categoryId?: string;
  subcategoryId?: string;
}

// 分类路径接口
export interface CategoryPath {
  category?: Category;
  subcategory?: Category;
  breadcrumb: string[];
}

// 分类创建请求接口
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

// 分类更新请求接口
export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 分类查询参数接口
export interface CategoryQueryParams {
  format?: 'tree' | 'flat';
  includeInactive?: boolean;
  includeCount?: boolean;
  parentId?: string;
  level?: CategoryLevel;
}

// 分类排序请求接口
export interface CategoryReorderRequest {
  categoryId: string;
  newSortOrder: number;
  parentId?: string;
}

// 分类统计接口
export interface CategoryStats {
  totalCategories: number;
  level1Count: number;
  level2Count: number;
  activeCount: number;
  inactiveCount: number;
  categoriesWithAudio: number;
  emptyCategoriesCount: number;
}

// 分类验证错误枚举
export enum CategoryErrorCode {
  INVALID_HIERARCHY = 'INVALID_HIERARCHY',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  DELETE_RESTRICTED = 'DELETE_RESTRICTED',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
  PARENT_NOT_FOUND = 'PARENT_NOT_FOUND',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
  INVALID_LEVEL = 'INVALID_LEVEL'
}

// 分类错误接口
export interface CategoryError {
  code: CategoryErrorCode;
  message: string;
  details?: any;
  field?: string;
}

// 分类验证结果接口
export interface CategoryValidationResult {
  isValid: boolean;
  errors: CategoryError[];
  warnings?: string[];
}

// 分类操作结果接口
export interface CategoryOperationResult<T = Category> {
  success: boolean;
  data?: T;
  error?: CategoryError;
  message?: string;
}

// 分类列表响应接口
export interface CategoryListResponse {
  success: boolean;
  data: Category[];
  total?: number;
  stats?: CategoryStats;
  error?: CategoryError;
}

// 分类树响应接口
export interface CategoryTreeResponse {
  success: boolean;
  data: CategoryTreeNode[];
  stats?: CategoryStats;
  error?: CategoryError;
}

// 分类选项接口（用于下拉选择）
export interface CategoryOption {
  label: string;
  value: string;
  key: string;
  title?: string;
  level?: CategoryLevel;
  parentId?: string;
  disabled?: boolean;
  children?: CategoryOption[];
}

// 分类筛选器接口
export interface CategoryFilter {
  categoryId?: string;
  subcategoryId?: string;
  categoryPath?: string;
  level?: CategoryLevel;
  isActive?: boolean;
  hasAudio?: boolean;
}

// 音频分类关联接口
export interface AudioCategoryAssociation {
  audioId: string;
  categoryId?: string;
  subcategoryId?: string;
  subject?: string; // 兼容旧字段
}

// 分类迁移状态接口
export interface CategoryMigrationStatus {
  isCompleted: boolean;
  totalCategories: number;
  migratedCategories: number;
  totalAudios: number;
  migratedAudios: number;
  errors: string[];
  warnings: string[];
}

// 分类管理权限接口
export interface CategoryPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReorder: boolean;
  canViewInactive: boolean;
}

// 分类上下文接口
export interface CategoryContextType {
  categories: Category[];
  categoryTree: CategoryTreeNode[];
  loading: boolean;
  error: string | null;
  permissions: CategoryPermissions;
  
  // 基础操作
  fetchCategories: () => Promise<void>;
  fetchCategoryTree: () => Promise<void>;
  createCategory: (data: CreateCategoryRequest) => Promise<CategoryOperationResult>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<CategoryOperationResult>;
  deleteCategory: (id: string) => Promise<CategoryOperationResult>;
  
  // 排序操作
  reorderCategories: (requests: CategoryReorderRequest[]) => Promise<CategoryOperationResult>;
  
  // 查询操作
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  getCategoryPath: (categoryId?: string, subcategoryId?: string) => CategoryPath;
  getCategoryOptions: (level?: CategoryLevel) => CategoryOption[];
  getSubcategoryOptions: (parentId: string) => CategoryOption[];
  
  // 验证操作
  validateCategory: (data: CreateCategoryRequest | UpdateCategoryRequest) => CategoryValidationResult;
  
  // 统计操作
  getCategoryStats: () => CategoryStats;
  
  // 刷新操作
  refreshCategories: () => void;
}

// 分类选择器组件属性接口
export interface CategorySelectorProps {
  value?: CategorySelection;
  onChange: (selection: CategorySelection) => void;
  allowEmpty?: boolean;
  level?: CategoryLevel | 'both';
  placeholder?: {
    category?: string;
    subcategory?: string;
  };
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  showSearch?: boolean;
  loading?: boolean;
}

// 分类树组件属性接口
export interface CategoryTreeProps {
  categories: CategoryTreeNode[];
  onSelect?: (category: Category) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onReorder?: (requests: CategoryReorderRequest[]) => void;
  showAudioCount?: boolean;
  expandAll?: boolean;
  draggable?: boolean;
  checkable?: boolean;
  selectedKeys?: string[];
  expandedKeys?: string[];
  loading?: boolean;
}

// 分类面包屑组件属性接口
export interface CategoryBreadcrumbProps {
  categoryId?: string;
  subcategoryId?: string;
  onNavigate?: (categoryId?: string, subcategoryId?: string) => void;
  separator?: string;
  showHome?: boolean;
  maxLength?: number;
}

// 分类管理表格列接口
export interface CategoryTableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  sorter?: boolean;
  filterable?: boolean;
  render?: (value: any, record: Category) => React.ReactNode;
}

// 分类批量操作接口
export interface CategoryBatchOperation {
  type: 'activate' | 'deactivate' | 'delete' | 'move';
  categoryIds: string[];
  targetParentId?: string;
}

// 分类导入导出接口
export interface CategoryExportData {
  categories: Category[];
  exportTime: string;
  version: string;
  metadata: {
    totalCount: number;
    level1Count: number;
    level2Count: number;
  };
}

export interface CategoryImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}