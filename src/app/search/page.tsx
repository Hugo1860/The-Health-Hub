'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon, ClockIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface SearchMatch {
  segment: {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    confidence?: number;
  };
  matchText: string;
  startIndex: number;
  endIndex: number;
}

interface SearchResult {
  transcription: {
    id: string;
    audioId: string;
    language: string;
    fullText: string;
  };
  matches: SearchMatch[];
}

interface SearchResponse {
  query: string;
  totalResults: number;
  totalMatches: number;
  results: SearchResult[];
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioList, setAudioList] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'time'>('relevance');

  // 获取音频列表
  useEffect(() => {
    fetch('/uploads/audio-list.json')
      .then(res => res.json())
      .then(data => setAudioList(data))
      .catch(err => console.error('Error loading audio list:', err));
  }, []);

  // 初始搜索
  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [searchParams]);

  // 执行搜索
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/transcriptions/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setResults(data);
      } else {
        console.error('Search failed');
        setResults(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理搜索提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
      // 更新URL
      const url = new URL(window.location.href);
      url.searchParams.set('q', query.trim());
      window.history.pushState({}, '', url.toString());
    }
  };

  // 获取音频信息
  const getAudioInfo = (audioId: string) => {
    return audioList.find(a => a.id === audioId) || {
      title: `音频 ${audioId}`,
      subject: '未知',
      uploadDate: ''
    };
  };

  // 高亮搜索结果
  const getHighlightedText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded font-medium">$1</mark>');
  };

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // 获取上下文文本
  const getContextText = (match: SearchMatch, fullText: string) => {
    const contextLength = 100;
    const matchStart = match.startIndex;
    const matchEnd = match.endIndex;
    
    const start = Math.max(0, matchStart - contextLength);
    const end = Math.min(fullText.length, matchEnd + contextLength);
    
    let contextText = match.segment.text;
    
    if (start > 0) {
      contextText = '...' + contextText;
    }
    if (end < fullText.length) {
      contextText = contextText + '...';
    }
    
    return contextText;
  };

  // 排序结果
  const sortedResults = results?.results ? [...results.results].sort((a, b) => {
    if (sortBy === 'relevance') {
      return b.matches.length - a.matches.length;
    } else {
      const audioA = getAudioInfo(a.transcription.audioId);
      const audioB = getAudioInfo(b.transcription.audioId);
      return new Date(audioB.uploadDate).getTime() - new Date(audioA.uploadDate).getTime();
    }
  }) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">搜索音频内容</h1>
          <p className="text-gray-600">在所有音频的转录文本中搜索内容</p>
        </div>

        {/* 搜索表单 */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入搜索关键词..."
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '搜索中...' : '搜索'}
              </button>
            </button>
          </div>
        </form>

        {/* 搜索结果 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">搜索中...</p>
          </div>
        ) : results ? (
          <div>
            {/* 搜索统计和排序 */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="text-gray-600">
                找到 <span className="font-semibold text-gray-900">{results.totalMatches}</span> 个匹配项，
                共 <span className="font-semibold text-gray-900">{results.totalResults}</span> 个音频
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">排序:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'relevance' | 'time')}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="relevance">相关性</option>
                  <option value="time">时间</option>
                </select>
              </div>
            </div>

            {/* 搜索结果列表 */}
            {sortedResults.length > 0 ? (
              <div className="space-y-6">
                {sortedResults.map((result) => {
                  const audioInfo = getAudioInfo(result.transcription.audioId);
                  return (
                    <div key={result.transcription.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {/* 音频信息头部 */}
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link
                              href={`/audio/${result.transcription.audioId}?search=${encodeURIComponent(query)}`}
                              className="text-xl font-semibold text-blue-600 hover:text-blue-800"
                            >
                              {audioInfo.title}
                            </Link>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center">
                                <SpeakerWaveIcon className="h-4 w-4 mr-1" />
                                {audioInfo.subject}
                              </span>
                              <span className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {new Date(audioInfo.uploadDate).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {result.matches.length} 个匹配项
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 匹配的片段 */}
                      <div className="divide-y divide-gray-100">
                        {result.matches.map((match, index) => (
                          <div key={`${match.segment.id}-${index}`} className="px-6 py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p 
                                  className="text-gray-900 leading-relaxed mb-2"
                                  dangerouslySetInnerHTML={{
                                    __html: getHighlightedText(match.segment.text, query)
                                  }}
                                />
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>时间: {formatTime(match.segment.startTime)} - {formatTime(match.segment.endTime)}</span>
                                  {match.segment.confidence && (
                                    <span>置信度: {Math.round(match.segment.confidence * 100)}%</span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                <Link
                                  href={`/audio/${result.transcription.audioId}?t=${match.segment.startTime}&search=${encodeURIComponent(query)}`}
                                  className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  跳转播放
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的内容</h3>
                <p className="text-gray-600">尝试使用不同的关键词或检查拼写</p>
              </div>
            )}
          </div>
        ) : query ? (
          <div className="text-center py-12">
            <p className="text-gray-600">请输入搜索关键词开始搜索</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}