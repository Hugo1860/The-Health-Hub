'use client'

import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Rate, 
  Input, 
  Form, 
  Space, 
  Typography, 
  Radio,
  Checkbox,
  message,
  Card
} from 'antd';
import { MessageOutlined, StarOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text, Title } = Typography;

export interface UserFeedback {
  rating: number;
  usability: number;
  performance: number;
  design: number;
  features: string[];
  deviceType: string;
  issues: string;
  suggestions: string;
  wouldRecommend: boolean;
  timestamp: string;
}

export interface UserFeedbackCollectorProps {
  onFeedbackSubmit?: (feedback: UserFeedback) => void;
}

export const UserFeedbackCollector: React.FC<UserFeedbackCollectorProps> = ({
  onFeedbackSubmit
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    
    try {
      const feedback: UserFeedback = {
        rating: values.rating || 0,
        usability: values.usability || 0,
        performance: values.performance || 0,
        design: values.design || 0,
        features: values.features || [],
        deviceType: values.deviceType || 'unknown',
        issues: values.issues || '',
        suggestions: values.suggestions || '',
        wouldRecommend: values.wouldRecommend || false,
        timestamp: new Date().toISOString()
      };

      // 保存到本地存储
      const existingFeedback = JSON.parse(localStorage.getItem('sharecard_feedback') || '[]');
      existingFeedback.push(feedback);
      localStorage.setItem('sharecard_feedback', JSON.stringify(existingFeedback));

      // 调用回调函数
      onFeedbackSubmit?.(feedback);

      message.success('感谢您的反馈！您的意见对我们很重要。');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('提交反馈失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const featureOptions = [
    { label: '模板选择', value: 'templates' },
    { label: '二维码生成', value: 'qrcode' },
    { label: '图片质量', value: 'quality' },
    { label: '保存功能', value: 'save' },
    { label: '分享功能', value: 'share' },
    { label: '移动端体验', value: 'mobile' },
    { label: '加载速度', value: 'speed' },
    { label: '界面设计', value: 'ui' }
  ];

  return (
    <>
      <Button
        type="primary"
        icon={<MessageOutlined />}
        onClick={showModal}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          borderRadius: '50px',
          height: '50px',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}
      >
        反馈
      </Button>

      <Modal
        title={
          <Space>
            <StarOutlined />
            <span>用户体验反馈</span>
          </Space>
        }
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            rating: 5,
            usability: 5,
            performance: 5,
            design: 5,
            wouldRecommend: true
          }}
        >
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>整体评价</Title>
            <Form.Item
              name="rating"
              label="您对分享卡片功能的整体满意度："
            >
              <Rate allowHalf />
            </Form.Item>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>详细评分</Title>
            <Form.Item
              name="usability"
              label="易用性 (操作是否简单直观)"
            >
              <Rate allowHalf />
            </Form.Item>

            <Form.Item
              name="performance"
              label="性能 (生成速度和响应性)"
            >
              <Rate allowHalf />
            </Form.Item>

            <Form.Item
              name="design"
              label="设计 (界面美观度和模板质量)"
            >
              <Rate allowHalf />
            </Form.Item>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>功能体验</Title>
            <Form.Item
              name="features"
              label="您最喜欢的功能特性："
            >
              <Checkbox.Group options={featureOptions} />
            </Form.Item>

            <Form.Item
              name="deviceType"
              label="您主要使用的设备类型："
            >
              <Radio.Group>
                <Radio value="mobile">手机</Radio>
                <Radio value="tablet">平板</Radio>
                <Radio value="desktop">电脑</Radio>
              </Radio.Group>
            </Form.Item>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>问题反馈</Title>
            <Form.Item
              name="issues"
              label="您遇到的问题或困难："
            >
              <TextArea
                rows={3}
                placeholder="请描述您在使用过程中遇到的任何问题..."
              />
            </Form.Item>

            <Form.Item
              name="suggestions"
              label="改进建议："
            >
              <TextArea
                rows={3}
                placeholder="请分享您的改进建议或希望增加的功能..."
              />
            </Form.Item>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="wouldRecommend"
              valuePropName="checked"
            >
              <Checkbox>我愿意向其他人推荐这个功能</Checkbox>
            </Form.Item>
          </Card>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                size="large"
              >
                提交反馈
              </Button>
              <Button onClick={handleCancel} size="large">
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Text type="secondary" style={{ fontSize: '12px' }}>
          您的反馈将帮助我们改进产品体验。所有信息仅用于产品优化，不会用于其他用途。
        </Text>
      </Modal>
    </>
  );
};

export default UserFeedbackCollector;