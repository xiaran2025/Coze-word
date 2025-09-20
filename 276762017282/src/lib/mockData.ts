import { Word, Student, CoursePlan, MemoryCurveData, Notification, User, SystemSettings, TestQuestion } from '@/types';

// 模拟单词数据
export const mockWords: Word[] = [];

// 模拟学生数据
export const mockStudents: Student[] = [];

// 模拟课程计划数据
export const mockCoursePlans: CoursePlan[] = [];

// 模拟记忆曲线数据
export const mockMemoryCurveData: MemoryCurveData[] = [
  { day: '第1天', class1: 100, class2: 100, class3: 100 },
  { day: '第2天', class1: 60, class2: 65, class3: 70 },
  { day: '第3天', class1: 45, class2: 50, class3: 55 },
  { day: '第7天', class1: 35, class2: 40, class3: 45 },
  { day: '第15天', class1: 25, class2: 30, class3: 40 },
  { day: '第30天', class1: 20, class2: 25, class3: 35 }
];

// 模拟通知数据
// 模拟词汇测试题目数据
export const mockQuestions: TestQuestion[] = [
  {
    id: 1,
    word: "abandon",
    options: ["放弃", "能力", "完成", "承认"],
    correctAnswer: 0,
    difficulty: "medium",
    explanation: "abandon = 放弃，常见搭配：abandon hope（放弃希望）",
    distractorsExplanation: {
      1: "能力 = ability，注意区分拼写",
      2: "完成 = accomplish，注意区分词义",
      3: "承认 = acknowledge，注意区分用法"
    }
  },
  {
    id: 2,
    word: "ability",
    options: ["能力", "苹果", "香蕉", "放弃"],
    correctAnswer: 0,
    difficulty: "easy",
    explanation: "ability = 能力，常见搭配：reading ability（阅读能力）",
    distractorsExplanation: {
      1: "苹果 = apple，注意区分拼写",
      2: "香蕉 = banana，注意区分词义",
      3: "放弃 = abandon，注意区分用法"
    }
  },
  {
    id: 3,
    word: "achieve",
    options: ["完成", "能力", "放弃", "承认"],
    correctAnswer: 0,
    difficulty: "medium",
    explanation: "achieve = 完成，常见搭配：achieve goals（实现目标）",
    distractorsExplanation: {
      1: "能力 = ability，注意区分拼写",
      2: "放弃 = abandon，注意区分词义",
      3: "承认 = acknowledge，注意区分用法"
    }
  },
  {
    id: 4,
    word: "acknowledge",
    options: ["承认", "完成", "能力", "放弃"],
    correctAnswer: 0,
    difficulty: "hard",
    explanation: "acknowledge = 承认，常见搭配：acknowledge the truth（承认事实）",
    distractorsExplanation: {
      1: "完成 = achieve，注意区分拼写",
      2: "能力 = ability，注意区分词义",
      3: "放弃 = abandon，注意区分用法"
    }
  },
  {
    id: 5,
    word: "acquire",
    options: ["获得", "完成", "能力", "放弃"],
    correctAnswer: 0,
    difficulty: "hard",
    explanation: "acquire = 获得，常见搭配：acquire knowledge（获取知识）",
    distractorsExplanation: {
      1: "完成 = achieve，注意区分拼写",
      2: "能力 = ability，注意区分词义",
      3: "放弃 = abandon，注意区分用法"
    }
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: '今日复习提醒',
    message: '张小明等5名学生有待复习单词',
    time: '10分钟前',
    read: false,
    type: 'reminder'
  },
  {
    id: '2',
    title: '课程计划完成',
    message: '三年级(2)班的"三年级上册Unit1-2"课程计划已完成',
    time: '2小时前',
    read: false,
    type: 'announcement'
  },
  {
    id: '3',
    title: '系统更新通知',
    message: '系统将于今晚23:00进行维护更新，预计持续1小时',
    time: '昨天',
    read: true,
    type: 'announcement'
  }
];

// 模拟用户数据
export const mockUser: User = {
  id: '1',
  name: '李老师',
  role: '高级教师',
  avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=teacher+avatar&sign=058f3328e4668585d702643ea9f1d4dd',
  phone: '13800138000',
  email: 'li.teacher@example.com'
};

import { LocalStorageService } from './localStorage';

// 初始化本地存储数据
export function initializeLocalStorageData() {
LocalStorageService.initializeDefaultDataIfNeeded({
  words: mockWords,
  students: mockStudents,
  coursePlans: mockCoursePlans,
  user: mockUser
});
}

// 模拟系统设置
export const mockSystemSettings: SystemSettings = {
  textbookVersion: '人教版',
  pronunciationSpeed: 'slow',
  memoryCurveReminder: 'daily',
  theme: 'blue'
};