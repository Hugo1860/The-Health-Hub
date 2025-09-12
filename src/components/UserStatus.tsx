'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

export default function UserStatus() {
  const { user, isLoading, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-200 h-12 w-full rounded-lg"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <Link
          href="/auth/signin"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center block"
        >
          登录
        </Link>
        <Link
          href="/auth/signup"
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors text-center block"
        >
          注册账户
        </Link>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 用户信息卡片 */}
      <button
        onClick={() => {
          console.log('UserStatus dropdown clicked, current state:', showDropdown);
          setShowDropdown(!showDropdown);
        }}
        className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 group border border-gray-200"
      >
        <div className="flex items-center space-x-3">
          {/* 头像 */}
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform duration-200">
            {user.username.charAt(0).toUpperCase()}
          </div>
          
          {/* 用户信息 */}
          <div className="flex-1 text-left">
            <div className="font-medium text-gray-900 text-sm truncate">
              {user.username}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {user.role === 'admin' ? '管理员' : '用户'}
            </div>
          </div>
          
          {/* 下拉箭头 */}
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {/* 在线状态指示器 */}
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </button>

      {/* 下拉菜单 */}
      {showDropdown && (
        <>
          {/* 点击外部关闭下拉菜单 */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setShowDropdown(false)}
          ></div>
          
          <div 
            className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg py-2 border border-gray-200"
            style={{ zIndex: 9999 }}
          >
            {/* 测试可见性 */}
            <div className="px-4 py-2 text-red-600 font-bold">
              下拉菜单已显示 - 测试
            </div>
            
            {/* 用户信息头部 */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 菜单项 */}
            <div className="py-1">
              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="w-3 h-3 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                个人资料
              </Link>
              
              <Link
                href="/favorites"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="w-3 h-3 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                我的收藏
              </Link>
              
              <Link
                href="/playlists"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="w-3 h-3 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
                </svg>
                播放列表
              </Link>
              
              <Link
                href="/notifications"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="w-3 h-3 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 15h11v-3L4 15z" />
                </svg>
                通知中心
                <NotificationBell />
              </Link>
            </div>
            
            {/* 管理员功能 */}
            {user.role === 'admin' && (
              <>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    管理功能
                  </div>
                  
                  <Link
                    href="/admin"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <svg className="w-3 h-3 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    管理后台
                  </Link>
                  
                  <Link
                    href="/admin/upload"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <svg className="w-3 h-3 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    上传音频
                  </Link>
                </div>
              </>
            )}
            
            {/* 退出登录 */}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => {
                  logout()
                  setShowDropdown(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-3 h-3 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}