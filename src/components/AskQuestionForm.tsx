'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface AskQuestionFormProps {
  audioId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AskQuestionForm({ 
  audioId, 
  onSuccess, 
  onCancel 
}: AskQuestionFormProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !session?.user) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioId,
          title: title.trim(),
          content: content.trim(),
        }),
      });

      if (response.ok) {
        setTitle('');
        setContent('');
        onSuccess?.();
      } else {
        const error = await response.json();
        alert(error.error || '提交问题失败');
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      alert('提交问题失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-gray-500 mb-4">请登录后提问</p>
        <a
          href="/auth/signin"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          登录
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">提问</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            问题标题 *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入问题标题..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {title.length}/200 字符
          </p>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            问题描述 *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请详细描述您的问题..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            maxLength={2000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {content.length}/2000 字符
          </p>
        </div>

        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '提交中...' : '提交问题'}
          </button>
        </div>
      </form>
    </div>
  );
}