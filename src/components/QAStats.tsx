'use client';

import { useState, useEffect } from 'react';

interface QAStatsProps {
  audioId: string;
}

interface Stats {
  totalQuestions: number;
  answeredQuestions: number;
  totalAnswers: number;
}

export default function QAStats({ audioId }: QAStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    answeredQuestions: 0,
    totalAnswers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [audioId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/questions?audioId=${audioId}`);
      if (response.ok) {
        const questions = await response.json();
        
        const totalQuestions = questions.length;
        const answeredQuestions = questions.filter((q: any) => q.answers.length > 0).length;
        const totalAnswers = questions.reduce((sum: number, q: any) => sum + q.answers.length, 0);
        
        setStats({
          totalQuestions,
          answeredQuestions,
          totalAnswers
        });
      }
    } catch (error) {
      console.error('Error fetching QA stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="animate-pulse">加载统计中...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{stats.totalQuestions} 个问题</span>
      </div>
      
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>{stats.totalAnswers} 个回答</span>
      </div>
      
      {stats.totalQuestions > 0 && (
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{Math.round((stats.answeredQuestions / stats.totalQuestions) * 100)}% 已回答</span>
        </div>
      )}
    </div>
  );
}