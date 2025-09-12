'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Question, Answer } from '@/lib/questions';

interface QuestionDetailProps {
  questionId: string;
  onBack?: () => void;
}

export default function QuestionDetail({ questionId, onBack }: QuestionDetailProps) {
  const { data: session } = useSession();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  useEffect(() => {
    fetchQuestion();
  }, [questionId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/questions/${questionId}`);
      if (response.ok) {
        const data = await response.json();
        setQuestion(data);
      }
    } catch (error) {
      console.error('Error fetching question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerContent.trim() || !session?.user) return;

    try {
      setSubmittingAnswer(true);
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          content: answerContent.trim(),
        }),
      });

      if (response.ok) {
        setAnswerContent('');
        fetchQuestion(); // 重新获取问题以更新答案列表
      } else {
        const error = await response.json();
        alert(error.error || '提交答案失败');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('提交答案失败');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleMarkBestAnswer = async (answerId: string, isAccepted: boolean) => {
    try {
      const response = await fetch(`/api/answers/${answerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAccepted }),
      });

      if (response.ok) {
        fetchQuestion(); // 重新获取问题以更新答案状态
      } else {
        const error = await response.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('Error marking best answer:', error);
      alert('操作失败');
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm('确定要删除这个答案吗？')) return;

    try {
      const response = await fetch(`/api/answers/${answerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchQuestion(); // 重新获取问题以更新答案列表
      } else {
        const error = await response.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting answer:', error);
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

  if (!question) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">问题不存在</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回
          </button>
        )}
      </div>
    );
  }

  const isQuestionOwner = session?.user && question.userId === session.user.id;

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回问题列表
        </button>
      )}

      {/* 问题详情 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{question.title}</h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm ${
              question.answers.length > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {question.answers.length} 回答
            </span>
            {question.answers.some(a => a.isAccepted) && (
              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                已解决
              </span>
            )}
          </div>
        </div>
        
        <div className="prose max-w-none mb-4">
          <p className="text-gray-700 whitespace-pre-wrap">{question.content}</p>
        </div>
        
        <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
          <div className="flex items-center gap-4">
            <span>提问者: {question.username}</span>
            <span>{formatDate(question.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 答案列表 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          回答 ({question.answers.length})
        </h2>
        
        {question.answers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            暂无回答
          </div>
        ) : (
          <div className="space-y-4">
            {question.answers
              .sort((a, b) => {
                // 最佳答案排在前面
                if (a.isAccepted && !b.isAccepted) return -1;
                if (!a.isAccepted && b.isAccepted) return 1;
                // 其他按时间排序
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              })
              .map((answer) => (
                <div
                  key={answer.id}
                  className={`bg-white rounded-lg shadow-sm p-6 ${
                    answer.isAccepted ? 'border-l-4 border-green-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      {answer.isAccepted && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          最佳答案
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isQuestionOwner && !answer.isAccepted && (
                        <button
                          onClick={() => handleMarkBestAnswer(answer.id, true)}
                          className="text-green-600 hover:text-green-800 text-sm transition-colors"
                        >
                          标记为最佳答案
                        </button>
                      )}
                      {isQuestionOwner && answer.isAccepted && (
                        <button
                          onClick={() => handleMarkBestAnswer(answer.id, false)}
                          className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                        >
                          取消最佳答案
                        </button>
                      )}
                      {session?.user && (
                        answer.userId === session.user.id || session.user.role === 'admin'
                      ) && (
                        <button
                          onClick={() => handleDeleteAnswer(answer.id)}
                          className="text-red-600 hover:text-red-800 text-sm transition-colors"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="prose max-w-none mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{answer.content}</p>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <span>回答者: {answer.username}</span>
                      <span>{formatDate(answer.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 回答表单 */}
      {session?.user && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">添加回答</h3>
          <form onSubmit={handleSubmitAnswer}>
            <div className="mb-4">
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="请输入您的回答..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingAnswer || !answerContent.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submittingAnswer ? '提交中...' : '提交回答'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!session?.user && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-500 mb-4">请登录后回答问题</p>
          <a
            href="/auth/signin"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            登录
          </a>
        </div>
      )}
    </div>
  );
}