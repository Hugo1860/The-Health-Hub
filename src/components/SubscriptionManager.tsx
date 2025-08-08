'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Subscription } from '@/lib/subscriptions';

export default function SubscriptionManager() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    type: 'all',
    value: '',
    notificationMethod: 'inApp'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchSubscriptions();
    }
  }, [session]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSubscription),
      });

      if (response.ok) {
        setNewSubscription({
          type: 'all',
          value: '',
          notificationMethod: 'inApp'
        });
        setShowAddForm(false);
        fetchSubscriptions();
      } else {
        const error = await response.json();
        alert(error.error || '添加订阅失败');
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert('添加订阅失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('确定要取消这个订阅吗？')) return;

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSubscriptions();
      } else {
        const error = await response.json();
        alert(error.error || '取消订阅失败');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('取消订阅失败');
    }
  };

  const getSubscriptionTypeText = (type: string) => {
    switch (type) {
      case 'all': return '全部内容';
      case 'subject': return '学科';
      case 'tag': return '标签';
      case 'speaker': return '演讲者';
      default: return type;
    }
  };

  const getNotificationMethodText = (method: string) => {
    switch (method) {
      case 'email': return '邮件';
      case 'inApp': return '站内';
      case 'both': return '邮件+站内';
      default: return method;
    }
  };

  if (!session?.user) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-gray-500 mb-4">请登录后管理订阅</p>
        <a
          href="/auth/signin"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          登录
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和添加按钮 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">订阅管理</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          添加订阅
        </button>
      </div>

      {/* 添加订阅表单 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">添加新订阅</h3>
          <form onSubmit={handleAddSubscription} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                订阅类型
              </label>
              <select
                value={newSubscription.type}
                onChange={(e) => setNewSubscription({
                  ...newSubscription,
                  type: e.target.value,
                  value: e.target.value === 'all' ? '' : newSubscription.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部内容</option>
                <option value="subject">特定学科</option>
                <option value="tag">特定标签</option>
                <option value="speaker">特定演讲者</option>
              </select>
            </div>

            {newSubscription.type !== 'all' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {newSubscription.type === 'subject' && '学科名称'}
                  {newSubscription.type === 'tag' && '标签名称'}
                  {newSubscription.type === 'speaker' && '演讲者姓名'}
                </label>
                <input
                  type="text"
                  value={newSubscription.value}
                  onChange={(e) => setNewSubscription({
                    ...newSubscription,
                    value: e.target.value
                  })}
                  placeholder={`请输入${getSubscriptionTypeText(newSubscription.type)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                通知方式
              </label>
              <select
                value={newSubscription.notificationMethod}
                onChange={(e) => setNewSubscription({
                  ...newSubscription,
                  notificationMethod: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="inApp">站内通知</option>
                <option value="email">邮件通知</option>
                <option value="both">邮件+站内通知</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '添加中...' : '添加订阅'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 订阅列表 */}
      <div className="bg-white rounded-lg shadow-sm">
        {subscriptions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            暂无订阅
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {getSubscriptionTypeText(subscription.type)}
                      </span>
                      {subscription.value && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {subscription.value}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        {getNotificationMethodText(subscription.notificationMethod)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      创建时间: {new Date(subscription.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelSubscription(subscription.id)}
                    className="text-red-600 hover:text-red-800 text-sm transition-colors"
                  >
                    取消订阅
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}