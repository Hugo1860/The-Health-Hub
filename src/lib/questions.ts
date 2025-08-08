import fs from 'fs';
import path from 'path';

export interface Question {
  id: string;
  audioId: string;
  userId: string;
  username: string;
  title: string;
  content: string;
  createdAt: string;
  answers: Answer[];
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  isAccepted: boolean;
}

const questionsFilePath = path.join(process.cwd(), 'data', 'questions.json');
const answersFilePath = path.join(process.cwd(), 'data', 'answers.json');

// 确保数据文件存在
function ensureDataFiles() {
  if (!fs.existsSync(questionsFilePath)) {
    fs.writeFileSync(questionsFilePath, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(answersFilePath)) {
    fs.writeFileSync(answersFilePath, JSON.stringify([], null, 2));
  }
}

// 读取问题数据
export function readQuestions(): Question[] {
  try {
    ensureDataFiles();
    const data = fs.readFileSync(questionsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading questions:', error);
    return [];
  }
}

// 写入问题数据
export function writeQuestions(questions: Question[]): void {
  try {
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2));
  } catch (error) {
    console.error('Error writing questions:', error);
    throw error;
  }
}

// 读取答案数据
export function readAnswers(): Answer[] {
  try {
    ensureDataFiles();
    const data = fs.readFileSync(answersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading answers:', error);
    return [];
  }
}

// 写入答案数据
export function writeAnswers(answers: Answer[]): void {
  try {
    fs.writeFileSync(answersFilePath, JSON.stringify(answers, null, 2));
  } catch (error) {
    console.error('Error writing answers:', error);
    throw error;
  }
}

// 获取问题及其答案
export function getQuestionsWithAnswers(audioId?: string): Question[] {
  const questions = readQuestions();
  const answers = readAnswers();
  
  const questionsWithAnswers = questions.map(question => ({
    ...question,
    answers: answers.filter(answer => answer.questionId === question.id)
  }));
  
  if (audioId) {
    return questionsWithAnswers.filter(q => q.audioId === audioId);
  }
  
  return questionsWithAnswers;
}

// 获取单个问题及其答案
export function getQuestionWithAnswers(questionId: string): Question | null {
  const questions = readQuestions();
  const answers = readAnswers();
  
  const question = questions.find(q => q.id === questionId);
  if (!question) {
    return null;
  }
  
  return {
    ...question,
    answers: answers.filter(answer => answer.questionId === question.id)
  };
}

// 创建新问题
export function createQuestion(questionData: Omit<Question, 'id' | 'createdAt' | 'answers'>): Question {
  const questions = readQuestions();
  
  const newQuestion: Question = {
    ...questionData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    answers: []
  };
  
  questions.push(newQuestion);
  writeQuestions(questions);
  
  return newQuestion;
}

// 创建新答案
export function createAnswer(answerData: Omit<Answer, 'id' | 'createdAt' | 'isAccepted'>): Answer {
  const answers = readAnswers();
  
  const newAnswer: Answer = {
    ...answerData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    isAccepted: false
  };
  
  answers.push(newAnswer);
  writeAnswers(answers);
  
  return newAnswer;
}

// 删除问题及其所有答案
export function deleteQuestion(questionId: string): boolean {
  const questions = readQuestions();
  const answers = readAnswers();
  
  const questionIndex = questions.findIndex(q => q.id === questionId);
  if (questionIndex === -1) {
    return false;
  }
  
  // 删除问题
  questions.splice(questionIndex, 1);
  writeQuestions(questions);
  
  // 删除相关答案
  const filteredAnswers = answers.filter(a => a.questionId !== questionId);
  writeAnswers(filteredAnswers);
  
  return true;
}

// 删除答案
export function deleteAnswer(answerId: string): boolean {
  const answers = readAnswers();
  const answerIndex = answers.findIndex(a => a.id === answerId);
  
  if (answerIndex === -1) {
    return false;
  }
  
  answers.splice(answerIndex, 1);
  writeAnswers(answers);
  
  return true;
}

// 标记最佳答案
export function markBestAnswer(answerId: string): boolean {
  const answers = readAnswers();
  const answerIndex = answers.findIndex(a => a.id === answerId);
  
  if (answerIndex === -1) {
    return false;
  }
  
  const answer = answers[answerIndex];
  
  // 取消同一问题下其他答案的最佳标记
  answers.forEach(a => {
    if (a.questionId === answer.questionId) {
      a.isAccepted = false;
    }
  });
  
  // 标记当前答案为最佳
  answers[answerIndex].isAccepted = true;
  writeAnswers(answers);
  
  return true;
}

// 取消最佳答案标记
export function unmarkBestAnswer(answerId: string): boolean {
  const answers = readAnswers();
  const answerIndex = answers.findIndex(a => a.id === answerId);
  
  if (answerIndex === -1) {
    return false;
  }
  
  answers[answerIndex].isAccepted = false;
  writeAnswers(answers);
  
  return true;
}

// 搜索问题
export function searchQuestions(query: string, audioId?: string): Question[] {
  const questionsWithAnswers = getQuestionsWithAnswers(audioId);
  
  if (!query.trim()) {
    return questionsWithAnswers;
  }
  
  const lowerQuery = query.toLowerCase();
  
  return questionsWithAnswers.filter(question =>
    question.title.toLowerCase().includes(lowerQuery) ||
    question.content.toLowerCase().includes(lowerQuery) ||
    question.username.toLowerCase().includes(lowerQuery) ||
    question.answers.some(answer =>
      answer.content.toLowerCase().includes(lowerQuery) ||
      answer.username.toLowerCase().includes(lowerQuery)
    )
  );
}