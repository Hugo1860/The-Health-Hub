'use client';

import { useState } from 'react';
import UserStatus from '@/components/UserStatus';

export default function TestUserStatusPage() {
  const [testDropdown, setTestDropdown] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">UserStatus 组件测试</h1>
        
        {/* 测试简单下拉菜单 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">简单下拉菜单测试</h2>
          <div className="relative inline-block">
            <button
              onClick={() => setTestDropdown(!testDropdown)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              测试下拉菜单 {testDropdown ? '(已打开)' : '(已关闭)'}
            </button>
            
            {testDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setTestDropdown(false)}
                ></div>
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20 min-w-[200px]">
                  <div className="text-sm text-gray-700">
                    <div className="py-2">测试菜单项 1</div>
                    <div className="py-2">测试菜单项 2</div>
                    <div className="py-2">测试菜单项 3</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* UserStatus 组件测试 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">UserStatus 组件</h2>
          <div className="w-64">
            <UserStatus />
          </div>
        </div>

        {/* 调试信息 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">调试信息</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div>简单下拉菜单状态: {testDropdown ? '打开' : '关闭'}</div>
            <div>请检查浏览器控制台查看UserStatus的点击日志</div>
            <div>如果UserStatus下拉菜单不显示，可能是z-index或CSS问题</div>
          </div>
        </div>

        {/* CSS 调试 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">CSS 层级测试</h2>
          <div className="relative">
            <div className="bg-red-200 p-4 rounded">
              z-index: auto (默认)
              <div className="absolute top-0 left-20 bg-blue-200 p-4 rounded z-10">
                z-index: 10
                <div className="absolute top-0 left-20 bg-green-200 p-4 rounded z-20">
                  z-index: 20
                  <div className="absolute top-0 left-20 bg-yellow-200 p-4 rounded z-30">
                    z-index: 30
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}