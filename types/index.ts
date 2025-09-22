export interface WordBank {
  id: string;
  name: string;
  unitCount: number;
  wordCount: number;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  student: string;
  duration: string;
  content: string;
  level: string;
  type: 'word' | 'reading' | 'grammar';
}

export interface Word {
  time: string;
  id: string;
  word: string;
  phonetic: string;
  syllables: string[];
  textbook: string;
  grade: string;
  bankId: string; // 添加词库ID关联
  definitions: string[]; // 详细释义
  examples: { // 例句
    sentence: string;
    translation: string;
  }[];
  phonics?: {
    letters: string[];
    sounds: string[];
  };
}

export interface LearningRecord {
  id: string;
  date: string;
  duration: number;
  wordsLearned: number;
  masteryRate: number;
  timestamp?: string;
  notes?: string;
}

export interface Student {
  id: string;
  name: string;
  className: string;

  currentWordLibrary: string;
  invitationCode: string;
  coursePlan: string;
  progress: number;
  learningRecords: LearningRecord[];
}

export interface CoursePlan {
  id: string;
  name: string;
  className: string;
  studentId?: string;  // 关联学生ID
  currentWordLibrary: string;
  
  wordCount: number;
  progress: number;
  status: 'pending' | 'completed' | 'leave';
  startDate: string;
  endDate?: string;
  dailyWordCount: number;
  singleSessionDuration: number;
  words: Word[];
}

export interface MemoryCurveData {
  day: string;
  class1: number;
  class2: number;
  class3: number;
}

// 九宫格记忆阶段接口
export interface ReviewCard {
  id: string;
  word: string;
  phonetic: string;
  status: 'pending' | 'completed' | 'moved';
  fromPrevious?: boolean;
}

export interface MemoryStage {
  id: number;
  name: string;
  description: string;
  count: number;
  color: string;
  angle: number;
  path: string;
  cards: ReviewCard[];
  completed: boolean;
  isAnimating?: boolean;
  animationProgress?: number;
}

// 测试题目接口
export interface TestQuestion {
  id: number;
  word: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  distractorsExplanation: Record<number, string>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reminder' | 'announcement' | 'alert';
}

export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  phone?: string;
  email?: string;
}

export interface SystemSettings {
  textbookVersion: string;
  pronunciationSpeed: 'slow' | 'medium' | 'fast';
  memoryCurveReminder: 'daily' | 'weekly' | 'none';
  theme: 'blue' | 'green' | 'purple' | 'dark';
}

// 错词本接口
export interface MistakeWord extends Word {
  mistakeCount: number;
  lastMistakeDate: string;
  reviewLevel: number;
}

export type QuestionStatus = 'unanswered' | 'correct' | 'incorrect';