'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

interface GlobalSearchProps {
  onResultClick?: (audioId: string, startTime: number) => void;
  className?: string;
}

export default function GlobalSearch({ onResultClick, className = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [audioList, setAudioList] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取音频列表用于显示音频标题
  useEffect(() => {
    fetch('/uploads/audio-list.json')
      .then(res => res.json())
      .then(data => setAudioList(data))
      .catch(err => console.error('Error loading audio list:', err));
  }, []);

  // 点击外部关闭搜索结果
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜索函数
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/transcriptions/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setResults(data);
        setIsOpen(true);
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

  // 防抖搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        performSearch(query);
      } else {
        setResults(null);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // 获取音频标题
  const getAudioTitle = (audioId: string) => {
    const audio = audioList.find(a => a.id === audioId);
    return audio?.title || `音频 ${audioId}`;
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

  // 处理结果点击
  const handleResultClick = (audioId: string, startTime: number) => {
    if (onResultClick) {
      onResultClick(audioId, startTime);
    }
    setIsOpen(false);
    setQuery('');
  };

  // 清除搜索
  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // 高亮搜索结果文本
  const getHighlightedText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* 搜索输入框 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索音频内容..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* 搜索结果下拉框 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">搜索中...</p>
            </div>
          ) : results && results.results.length > 0 ? (
            <div>
              {/* 搜索统计 */}
              <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                找到 {results.totalMatches} 个匹配项，共 {results.totalResults} 个音频
              </div>
              
              {/* 搜索结果 */}
              <div className="max-h-80 overflow-y-auto">
                {results.results.map((result) => (
                  <div key={result.transcription.id} className="border-b border-gray-100 last:border-b-0">
                    {/* 音频标题 */}
                    <div className="px-4 py-2 bg-gray-50">
                      <Link
                        href={`/audio/${result.transcription.audioId}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                        onClick={() => setIsOpen(false)}
                      >
                        {getAudioTitle(result.transcription.audioId)}
                      </Link>
                      <span className="ml-2 text-sm text-gray-500">
                        ({result.matches.length} 个匹配项)
                      </span>
                    </div>
                    
                    {/* 匹配的片段 */}
                    <div className="divide-y divide-gray-100">
                      {result.matches.slice(0, 3).map((match, index) => (
                        <button
                          key={`${match.segment.id}-${index}`}
                          onClick={() => handleResultClick(result.transcription.audioId, match.segment.startTime)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p 
                                className="text-sm text-gray-900 leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: getHighlightedText(match.segment.text, query)
                                }}
                              />
                              {match.segment.confidence && (
                                <p className="text-xs text-gray-500 mt-1">
                                  置信度: {Math.round(match.segment.confidence * 100)}%
                                </p>
                              )}
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {formatTime(match.segment.startTime)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                      
                      {/* 显示更多匹配项的链接 */}
                      {result.matches.length > 3 && (
                        <div className="px-4 py-2">
                          <Link
                            href={`/audio/${result.transcription.audioId}?search=${encodeURIComponent(query)}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                            onClick={() => setIsOpen(false)}
                          >
                            查看全部 {result.matches.length} 个匹配项 →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : results && results.results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>未找到匹配的内容</p>
              <p className="text-sm mt-1">尝试使用不同的关键词</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}