'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Question } from '@/lib/questions';

interface QuestionListProps {
  audioId?: string;
  showCreateButton?: boolean;
  onQuestionClick?: (question: Question) => void;
}

export default function QuestionList({ 
  audioId, 
  showCreateButton = true,
  onQuestionClick 
}: QuestionListProps) {
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [hasAnswersFilter, setHasAnswersFilter] = useState('all');

  useEffect(() => {
    fetchQuestions();
  }, [audioId, searchQuery, sortBy, hasAnswersFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (audioId) params.append('audioId', audioId);
      if (searchQuery) params.append('q', searchQuery);
      if (sortBy) params.append('sortBy', sortBy);
      if (hasAnswersFilter !== 'all') params.append('hasAnswers', hasAnswersFilter);

      const endpoint = searchQuery || hasAnswersFilter !== 'all' || sortBy !== 'newest'
        ? '/api/questions/search'
        : '/api/questions';

      const response = await fetch(`${endpoint}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('确定要删除这个问题吗？')) return;

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setQuestions(questions.filter(q => q.id !== questionId));
      } else {
        const error = await response.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('删除失败');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索问题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">最新</option>
              <option value="oldest">最旧</option>
              <option value="mostAnswers">最多回答</option>
            </select>
            <select
              value={hasAnswersFilter}
              onChange={(e) => setHasAnswersFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="true">已回答</option>
              <option value="false">未回答</option>
            </select>
          </div>
        </div>
      </div>

      {/* 问题列表 */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? '没有找到相关问题' : '暂无问题'}
          </div>
        ) : (
          questions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onQuestionClick?.(question)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                  {question.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    question.answers.length > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {question.answers.length} 回答
                  </span>
                  {question.answers.some(a => a.isAccepted) && (
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      已解决
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 mb-4 overflow-hidden" style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {question.content}
              </p>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span>提问者: {question.username}</span>
                  <span>{formatDate(question.createdAt)}</span>
                </div>
                
                {session?.user && (
                  question.userId === session.user.id || session.user.role === 'admin'
                ) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(question.id);
                    }}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}