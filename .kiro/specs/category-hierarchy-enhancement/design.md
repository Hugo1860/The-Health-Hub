# 分类层级管理功能设计文档

## 概述

本设计文档描述了为健康音频平台增加二级分类功能的技术实现方案。该功能将在现有的一级分类基础上，增加二级分类支持，形成两层的分类层级结构，提供更精细的内容分类和管理能力。

## 架构

### 数据库架构设计

#### 1. 分类表结构更新

现有的 `categories` 表需要增加以下字段来支持层级关系：

```sql
-- 为现有 categories 表添加层级支持字段
ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1 CHECK (level IN (1, 2));
ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- 添加外键约束
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent 
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;

-- 添加索引优化查询性能
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_sort ON categories(parent_id, sort_order);
```

#### 2. 音频分类关联更新

`audios` 表需要更新分类关联字段：

```sql
-- 为 audios 表添加二级分类支持
ALTER TABLE audios ADD COLUMN category_id VARCHAR(255);
ALTER TABLE audios ADD COLUMN subcategory_id VARCHAR(255);

-- 添加外键约束
ALTER TABLE audios ADD CONSTRAINT fk_audios_category 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE audios ADD CONSTRAINT fk_audios_subcategory 
  FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL;

-- 添加索引
CREATE INDEX idx_audios_category ON audios(category_id);
CREATE INDEX idx_audios_subcategory ON audios(subcategory_id);
CREATE INDEX idx_audios_categories ON audios(category_id, subcategory_id);
```

### 数据迁移策略

#### 1. 现有数据迁移
- 将现有分类标记为一级分类 (level = 1)
- 保持现有音频的 `subject` 字段作为临时兼容
- 创建映射关系将 `subject` 转换为 `category_id`

#### 2. 兼容性处理
- 保留 `subject` 字段一段时间以确保向后兼容
- 提供数据同步机制确保新旧字段一致性

## 组件和接口

### 1. 数据模型

#### Category 接口定义
```typescript
interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string | null;  // 新增：父分类ID
  level: 1 | 2;              // 新增：分类层级
  sortOrder: number;         // 新增：排序顺序
  isActive: boolean;         // 新增：是否激活
  createdAt: string;
  updatedAt: string;
  children?: Category[];     // 新增：子分类列表（查询时填充）
  audioCount?: number;       // 新增：关联音频数量
}
```

#### CategoryTree 接口定义
```typescript
interface CategoryTree {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  level: 1;
  sortOrder: number;
  isActive: boolean;
  audioCount: number;
  children: CategoryChild[];
  createdAt: string;
  updatedAt: string;
}

interface CategoryChild {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId: string;
  level: 2;
  sortOrder: number;
  isActive: boolean;
  audioCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### 2. API 接口设计

#### 分类管理 API

**GET /api/categories**
- 功能：获取分类列表（支持树形和平铺两种格式）
- 参数：
  - `format`: 'tree' | 'flat' (默认 'tree')
  - `includeInactive`: boolean (默认 false)
  - `includeCount`: boolean (默认 false)

**GET /api/categories/tree**
- 功能：获取完整的分类树结构
- 返回：CategoryTree[]

**POST /api/categories**
- 功能：创建新分类
- 参数：
  - `name`: string (必需)
  - `description`: string (可选)
  - `parentId`: string (可选，指定则创建二级分类)
  - `color`: string (可选)
  - `icon`: string (可选)

**PUT /api/categories/[id]**
- 功能：更新分类信息
- 支持修改父分类关系（有限制条件）

**DELETE /api/categories/[id]**
- 功能：删除分类
- 检查子分类和关联音频

**POST /api/categories/reorder**
- 功能：批量调整分类排序
- 参数：分类ID和新排序的数组

#### 音频分类 API

**GET /api/audio**
- 新增参数：
  - `categoryId`: string (一级分类筛选)
  - `subcategoryId`: string (二级分类筛选)
  - `categoryPath`: string (分类路径筛选，如 "cardiology/hypertension")

**PUT /api/audio/[id]**
- 更新音频分类关联
- 参数：
  - `categoryId`: string
  - `subcategoryId`: string (可选)

### 3. 前端组件设计

#### CategorySelector 组件
```typescript
interface CategorySelectorProps {
  value?: {
    categoryId?: string;
    subcategoryId?: string;
  };
  onChange: (selection: {
    categoryId?: string;
    subcategoryId?: string;
  }) => void;
  allowEmpty?: boolean;
  level?: 1 | 2 | 'both'; // 允许选择的层级
}
```

#### CategoryTree 组件
```typescript
interface CategoryTreeProps {
  categories: CategoryTree[];
  onSelect?: (category: Category) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  showAudioCount?: boolean;
  expandAll?: boolean;
}
```

#### CategoryBreadcrumb 组件
```typescript
interface CategoryBreadcrumbProps {
  categoryId?: string;
  subcategoryId?: string;
  onNavigate?: (categoryId?: string, subcategoryId?: string) => void;
}
```

## 数据模型

### 分类层级规则

1. **层级限制**：最多支持2级分类
2. **命名唯一性**：同一层级下分类名称不能重复
3. **循环引用检查**：防止分类引用自身或形成循环
4. **删除限制**：
   - 有子分类的一级分类不能直接删除
   - 有关联音频的分类不能删除
   - 删除一级分类时需要处理其子分类

### 数据验证规则

```typescript
const categoryValidationRules = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 100,
    unique: true // 同层级内唯一
  },
  description: {
    maxLength: 500
  },
  parentId: {
    // 只能引用一级分类
    mustBeLevel1: true,
    notSelf: true
  },
  level: {
    // 根据parentId自动计算
    autoCalculated: true
  }
};
```

## 错误处理

### 常见错误场景

1. **层级深度超限**：尝试创建三级分类
2. **循环引用**：设置父分类为自身或子分类
3. **重名冲突**：同层级下分类名称重复
4. **删除限制**：删除有子分类或关联音频的分类
5. **数据不一致**：音频关联的二级分类与一级分类不匹配

### 错误处理策略

```typescript
enum CategoryErrorCode {
  INVALID_HIERARCHY = 'INVALID_HIERARCHY',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  DELETE_RESTRICTED = 'DELETE_RESTRICTED',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
  PARENT_NOT_FOUND = 'PARENT_NOT_FOUND'
}

interface CategoryError {
  code: CategoryErrorCode;
  message: string;
  details?: any;
}
```

## 测试策略

### 单元测试

1. **数据模型测试**
   - 分类创建和验证
   - 层级关系检查
   - 数据一致性验证

2. **API 接口测试**
   - CRUD 操作测试
   - 参数验证测试
   - 错误处理测试

3. **业务逻辑测试**
   - 分类树构建
   - 音频分类关联
   - 权限检查

### 集成测试

1. **数据库操作测试**
   - 复杂查询性能测试
   - 事务一致性测试
   - 并发操作测试

2. **API 集成测试**
   - 端到端流程测试
   - 数据迁移测试
   - 兼容性测试

### 性能测试

1. **查询性能**
   - 分类树查询优化
   - 大量数据下的响应时间
   - 索引效果验证

2. **并发测试**
   - 多用户同时操作分类
   - 高并发下的数据一致性

## 部署和迁移

### 数据库迁移步骤

1. **阶段1：结构更新**
   ```sql
   -- 添加新字段
   ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255);
   ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1;
   -- ... 其他字段
   ```

2. **阶段2：数据迁移**
   ```sql
   -- 设置现有分类为一级分类
   UPDATE categories SET level = 1 WHERE level IS NULL;
   ```

3. **阶段3：约束添加**
   ```sql
   -- 添加外键和检查约束
   ALTER TABLE categories ADD CONSTRAINT fk_categories_parent ...;
   ```

4. **阶段4：音频表更新**
   ```sql
   -- 添加新的分类关联字段
   ALTER TABLE audios ADD COLUMN category_id VARCHAR(255);
   -- 迁移现有数据
   UPDATE audios SET category_id = (
     SELECT id FROM categories WHERE name = audios.subject
   );
   ```

### 部署策略

1. **向后兼容**：保持现有API的兼容性
2. **渐进式迁移**：分阶段迁移数据和功能
3. **回滚计划**：准备数据回滚脚本
4. **监控告警**：部署后的性能和错误监控

## 安全考虑

### 权限控制

1. **管理员权限**：
   - 创建、编辑、删除分类
   - 调整分类层级结构
   - 批量操作分类

2. **普通用户权限**：
   - 查看分类列表
   - 按分类筛选内容

### 数据验证

1. **输入验证**：严格验证所有输入参数
2. **SQL注入防护**：使用参数化查询
3. **XSS防护**：对输出内容进行转义
4. **CSRF防护**：验证请求来源

### 审计日志

记录所有分类管理操作：
- 操作类型（创建、更新、删除）
- 操作用户
- 操作时间
- 变更内容
- IP地址