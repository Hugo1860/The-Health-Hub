'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  ColorPicker,
  Button,
  Space,
  Alert,
  Divider,
  Switch,
  InputNumber,
  message
} from 'antd';
import {
  FolderOutlined,
  TagOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import {
  Category,
  CategoryLevel,
  CreateCategoryRequest,
  UpdateCategoryRequest
} from '@/types/category';
import { useCategories } from '@/contexts/CategoriesContextNew';

const { TextArea } = Input;
const { Option } = Select;

interface CategoryFormProps {
  category?: Category; // 编辑时传入，新建时为空
  parentId?: string; // 指定父分类ID（创建子分类时）
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// 常用图标选项
const ICON_OPTIONS = [
  '📂', '📁', '📋', '📊', '📈', '📉', '📌', '📍', '📎', '📏',
  '🏥', '💊', '🩺', '🧬', '🔬', '🧪', '💉', '🩹', '🦷', '👁️',
  '❤️', '🧠', '🫁', '🦴', '💪', '👂', '👃', '👄', '🤲', '🦶',
  '📚', '📖', '📝', '📄', '📃', '📑', '📜', '📰', '📓', '📔',
  '🎯', '🎪', '🎨', '🎭', '🎪', '🎵', '🎶', '🎤', '🎧', '📻'
];

// 常用颜色选项
const COLOR_PRESETS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa541c', '#a0d911', '#2f54eb',
  '#fa8c16', '#eb2f96', '#52c41a', '#1890ff', '#722ed1'
];

export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  parentId,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const { categories, getCategoryOptions, validateCategory } = useCategories();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isEditing = !!category?.id;
  const isSubcategory = !!(parentId || category?.parentId);

  // 初始化表单数据
  useEffect(() => {
    if (category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || parentId,
        color: category.color || '#1890ff',
        icon: category.icon || '📂',
        sortOrder: category.sortOrder || 0,
        isActive: category.isActive !== false
      });
    } else {
      form.setFieldsValue({
        parentId: parentId,
        color: '#1890ff',
        icon: isSubcategory ? '📋' : '📂',
        sortOrder: 0,
        isActive: true
      });
    }
  }, [category, parentId, form, isSubcategory]);

  // 获取父分类选项
  const parentCategoryOptions = getCategoryOptions(CategoryLevel.PRIMARY);

  // 表单验证
  const validateForm = async (values: any) => {
    const validationResult = validateCategory(values, categories, category?.id);
    
    if (!validationResult.isValid) {
      const errors = validationResult.errors.map(err => err.message);
      setValidationErrors(errors);
      return false;
    }
    
    setValidationErrors([]);
    return true;
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      const isValid = await validateForm(values);
      if (!isValid) {
        return;
      }

      const formData = {
        name: values.name.trim(),
        description: values.description?.trim() || '',
        parentId: values.parentId || undefined,
        color: values.color,
        icon: values.icon,
        sortOrder: values.sortOrder || 0,
        isActive: values.isActive !== false
      };

      await onSubmit(formData);
      message.success(isEditing ? '分类更新成功' : '分类创建成功');
    } catch (error) {
      console.error('表单提交失败:', error);
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  // 处理名称变化时的实时验证
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value.trim();
    if (name) {
      const currentValues = form.getFieldsValue();
      validateForm({ ...currentValues, name });
    }
  };

  return (
    <div className="category-form">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={loading}
      >
        {/* 验证错误提示 */}
        {validationErrors.length > 0 && (
          <Alert
            message="表单验证失败"
            description={
              <ul className="mb-0">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        {/* 分类类型提示 */}
        <Alert
          message={
            <Space>
              {isSubcategory ? <TagOutlined /> : <FolderOutlined />}
              <span>
                {isEditing ? '编辑' : '创建'}
                {isSubcategory ? '二级分类' : '一级分类'}
              </span>
            </Space>
          }
          type="info"
          showIcon={false}
          className="mb-4"
        />

        {/* 父分类选择（仅子分类） */}
        {isSubcategory && (
          <Form.Item
            name="parentId"
            label="父分类"
            rules={[{ required: true, message: '请选择父分类' }]}
          >
            <Select
              placeholder="请选择父分类"
              disabled={!!parentId} // 如果指定了parentId则不可修改
            >
              {parentCategoryOptions.map(option => (
                <Option key={option.key} value={option.value}>
                  <Space>
                    <span style={{ color: option.title }}>
                      {categories.find(c => c.id === option.value)?.icon || <FolderOutlined />}
                    </span>
                    <span>{option.label}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 分类名称 */}
        <Form.Item
          name="name"
          label="分类名称"
          rules={[
            { required: true, message: '请输入分类名称' },
            { max: 100, message: '分类名称不能超过100个字符' }
          ]}
        >
          <Input
            placeholder="请输入分类名称"
            onChange={handleNameChange}
          />
        </Form.Item>

        {/* 分类描述 */}
        <Form.Item
          name="description"
          label="分类描述"
          rules={[
            { max: 500, message: '分类描述不能超过500个字符' }
          ]}
        >
          <TextArea
            placeholder="请输入分类描述（可选）"
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Divider />

        {/* 外观设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 分类图标 */}
          <Form.Item
            name="icon"
            label="分类图标"
          >
            <Select
              placeholder="选择图标"
              showSearch
              optionFilterProp="children"
            >
              {ICON_OPTIONS.map(icon => (
                <Option key={icon} value={icon}>
                  <Space>
                    <span>{icon}</span>
                    <span>{icon}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* 分类颜色 */}
          <Form.Item
            name="color"
            label="分类颜色"
          >
            <ColorPicker
              presets={[
                {
                  label: '推荐颜色',
                  colors: COLOR_PRESETS
                }
              ]}
              showText
            />
          </Form.Item>
        </div>

        <Divider />

        {/* 高级设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 排序顺序 */}
          <Form.Item
            name="sortOrder"
            label="排序顺序"
            tooltip="数字越小排序越靠前"
          >
            <InputNumber
              min={0}
              max={9999}
              placeholder="0"
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* 是否激活 */}
          <Form.Item
            name="isActive"
            label="状态"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="激活"
              unCheckedChildren="停用"
            />
          </Form.Item>
        </div>

        {/* 操作按钮 */}
        <Form.Item className="mb-0 mt-6">
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
            >
              {isEditing ? '更新分类' : '创建分类'}
            </Button>
            <Button
              onClick={onCancel}
              disabled={loading}
              icon={<CloseOutlined />}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CategoryForm;