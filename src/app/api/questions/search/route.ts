import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsWithAnswers, searchQuestions } from '@/lib/questions';

// GET - 搜索和筛选问题
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const audioId = searchParams.get('audioId') || undefined;
    const hasAnswers = searchParams.get('hasAnswers');
    const sortBy = searchParams.get('sortBy') || 'newest'; // newest, oldest, mostAnswers
    
    // 使用搜索函数获取基础结果
    let questionsWithAnswers = query 
      ? searchQuestions(query, audioId)
      : getQuestionsWithAnswers(audioId);
    
    // 应用答案筛选条件
    if (hasAnswers === 'true') {
      questionsWithAnswers = questionsWithAnswers.filter(q => q.answers.length > 0);
    } else if (hasAnswers === 'false') {
      questionsWithAnswers = questionsWithAnswers.filter(q => q.answers.length === 0);
    }
    
    // 排序
    switch (sortBy) {
      case 'oldest':
        questionsWithAnswers.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case 'mostAnswers':
        questionsWithAnswers.sort((a, b) => b.answers.length - a.answers.length);
        break;
      case 'newest':
      default:
        questionsWithAnswers.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    
    return NextResponse.json(questionsWithAnswers);
  } catch (error) {
    console.error('Error searching questions:', error);
    return NextResponse.json(
      { error: '搜索问题失败' },
      { status: 500 }
    );
  }
}