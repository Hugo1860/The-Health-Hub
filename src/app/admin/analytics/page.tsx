'use client';

import { useState, useEffect } from 'react';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import AnimatedCounter from '../../../components/AnimatedCounter';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    setTimeout(() => setLoading(false), 1000);
  }, [timeRange]);

  const chartData = [
    { date: '01-15', plays: 1200, users: 89, comments: 45 },
    { date: '01-16', plays: 1350, users: 95, comments: 52 },
    { date: '01-17', plays: 1180, users: 78, comments: 38 },
    { date: '01-18', plays: 1420, users: 102, comments: 61 },
    { date: '01-19', plays: 1680, users: 118, comments: 73 },
    { date: '01-20', plays: 1550, users: 108, comments: 67 },
    { date: '01-21', plays: 1750, users: 125, comments: 82 },
  ];

  const maxPlays = Math.max(...chartData.map(d => d.plays));

  return (
    <AntdAdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">数据分析</h1>
              <p className="text-gray-600">平台数据统计和分析</p>
            </div>
            
            <div className="flex space-x-2">
              {[
                { value: '7d', label: '7天' },
                { value: '30d', label: '30天' },
                { value: '90d', label: '90天' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    timeRange === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">总播放量</p>
                <AnimatedCounter 
                  end={15678} 
                  className="text-2xl font-bold text-blue-600"
                />
                <p className="text-xs text-green-600 mt-1">↑ 12.5%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">活跃用户</p>
                <AnimatedCounter 
                  end={1248} 
                  className="text-2xl font-bold text-green-600"
                />
                <p className="text-xs text-green-600 mt-1">↑ 8.3%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">平均播放时长</p>
                <div className="text-2xl font-bold text-purple-600">8.5分</div>
                <p className="text-xs text-red-600 mt-1">↓ 2.1%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">用户参与度</p>
                <div className="text-2xl font-bold text-orange-600">73%</div>
                <p className="text-xs text-green-600 mt-1">↑ 5.7%</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 播放量趋势 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">播放量趋势</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">播放量</span>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between space-x-2">
              {chartData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                    style={{ height: `${(data.plays / maxPlays) * 100}%` }}
                    title={`${data.date}: ${data.plays} 播放`}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">{data.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 用户活跃度 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">用户活跃度</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">活跃用户</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">评论数</span>
                </div>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between space-x-2">
              {chartData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                  <div className="w-full flex flex-col items-end space-y-1">
                    <div
                      className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                      style={{ height: `${(data.users / 125) * 80}px` }}
                      title={`${data.date}: ${data.users} 用户`}
                    ></div>
                    <div
                      className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t"
                      style={{ height: `${(data.comments / 82) * 60}px` }}
                      title={`${data.date}: ${data.comments} 评论`}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{data.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 热门内容 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">热门内容</h3>
            <div className="space-y-4">
              {[
                { title: 'COVID-19最新治疗指南', plays: 2341, trend: 'up' },
                { title: '心血管疾病诊断新进展', plays: 1876, trend: 'up' },
                { title: '糖尿病管理新方法', plays: 1654, trend: 'down' },
                { title: '神经系统疾病治疗', plays: 1432, trend: 'up' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.plays} 播放</p>
                    </div>
                  </div>
                  <div className={`text-xs ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.trend === 'up' ? '↑' : '↓'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 学科分布 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">学科分布</h3>
            <div className="space-y-4">
              {[
                { subject: '内科学', count: 45, percentage: 28 },
                { subject: '外科学', count: 38, percentage: 24 },
                { subject: '神经科学', count: 32, percentage: 20 },
                { subject: '药理学', count: 28, percentage: 18 },
                { subject: '其他', count: 16, percentage: 10 },
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">{item.subject}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 用户地区分布 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">用户地区分布</h3>
            <div className="space-y-4">
              {[
                { region: '北京', users: 234, percentage: 35 },
                { region: '上海', users: 189, percentage: 28 },
                { region: '广州', users: 156, percentage: 23 },
                { region: '深圳', users: 98, percentage: 15 },
                { region: '其他', users: 87, percentage: 13 },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">{item.region}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{item.users}</p>
                    <p className="text-xs text-gray-500">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AntdAdminLayout>
  );
}