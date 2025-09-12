'use client';

import { useState } from 'react';
import { Question } from '@/lib/questions';
import QuestionList from './QuestionList';
import QuestionDetail from './QuestionDetail';
import AskQuestionForm from './AskQuestionForm';
import QAStats from './QAStats';

interface QASectionProps {
  audioId?: string;
  title?: string;
}

type ViewMode = 'list' | 'detail' | 'ask';

export default function QASection({ audioId, title = '问答' }: QASectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestionId(question.id);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedQuestionId(null);
  };

  const handleAskQuestion = () => {
    setViewMode('ask');
  };

  const handleQuestionSubmitted = () => {
    setViewMode('list');
    setRefreshKey(prev => prev + 1); // 触发问题列表刷新
  };

  const handleCancelAsk = () => {
    setViewMode('list');
  };

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          {audioId && <QAStats audioId={audioId} />}
        </div>
        {viewMode === 'list' && audioId && (
          <button
            onClick={handleAskQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors self-start sm:self-auto"
          >
            提问
          </button>
        )}
      </div>

      {/* 内容区域 */}
      {viewMode === 'list' && (
        <QuestionList
          key={refreshKey}
          audioId={audioId}
          onQuestionClick={handleQuestionClick}
        />
      )}

      {viewMode === 'detail' && selectedQuestionId && (
        <QuestionDetail
          questionId={selectedQuestionId}
          onBack={handleBackToList}
        />
      )}

      {viewMode === 'ask' && audioId && (
        <AskQuestionForm
          audioId={audioId}
          onSuccess={handleQuestionSubmitted}
          onCancel={handleCancelAsk}
        />
      )}
    </div>
  );
}