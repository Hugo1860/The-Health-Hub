'use client';

import AdminLayout from '../../../components/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function TestNavigation() {
  const { isAdmin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证权限...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">权限不足</h1>
          <p className="text-gray-600">您没有权限访问此页面。</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">导航测试页面</h1>
          <p className="text-gray-600">这是一个测试页面，用于验证管理员导航是否正常工作</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">导航测试</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800">✅ 导航成功</h3>
              <p className="text-green-700 text-sm mt-1">
                如果您能看到这个页面，说明管理员导航系统正在正常工作。
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800">🔗 测试其他链接</h3>
              <p className="text-blue-700 text-sm mt-1">
                请尝试点击左侧菜单中的其他项目，看看是否能正常跳转。
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800">🐛 调试信息</h3>
              <p className="text-yellow-700 text-sm mt-1">
                请打开浏览器的开发者工具（F12），查看控制台是否有错误信息。
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">当前页面信息</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>URL: {typeof window !== 'undefined' ? window.location.pathname : '未知'}</p>
              <p>时间: {new Date().toLocaleString('zh-CN')}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}