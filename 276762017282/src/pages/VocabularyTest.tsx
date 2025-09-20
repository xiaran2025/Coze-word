import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Word } from '@/types';
import { LocalStorageService } from '@/lib/localStorage';
import { mockQuestions } from '@/lib/mockData';
import * as XLSX from 'xlsx';

// 定义测试题目接口
interface TestQuestion {
  id: number;
  word: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  distractorsExplanation: Record<number, string>;
}

// 词汇量测试小游戏组件
const VocabularyTest: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'start' | 'game' | 'results'>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [estimatedVocabulary, setEstimatedVocabulary] = useState(1124);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60); // 每轮游戏60秒
  const [gameLevel, setGameLevel] = useState(1);
  const [comboCount, setComboCount] = useState(0);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const questionTimerRef = useRef<number | null>(null);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState('all');
  const [textbookOptions, setTextbookOptions] = useState<string[]>(['all']);
  
  // 当前题目
  const currentQuestion = testQuestions[currentQuestionIndex];
  
  // 计算进度和词汇量估算
  useEffect(() => {
    const newProgress = (currentQuestionIndex / testQuestions.length) * 100;
    setProgress(newProgress);
    
    // 模拟词汇量估算变化
    if (currentQuestionIndex > 0) {
      const difficultyFactor = {
        easy: 50,
        medium: 150,
        hard: 300
      };
      
      const randomChange = Math.floor(Math.random() * 50) - 25;
      const difficultyContribution = difficultyFactor[currentQuestion.difficulty];
      setEstimatedVocabulary(prev => prev + difficultyContribution + randomChange);
    }
  }, [currentQuestionIndex, currentQuestion]);
  
  // 游戏计时器
  useEffect(() => {
    if (currentView === 'game') {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // 时间到，结束游戏
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // 每题计时
      resetQuestionTimer();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
    };
  }, [currentView]);
  
  // 重置题目计时器
  const resetQuestionTimer = () => {
    if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
    questionTimerRef.current = setTimeout(() => {
      // 超时未答，自动进入下一题
      if (currentView === 'game' && selectedAnswer === null) {
        handleDontKnow();
      }
    }, 15000); // 每题15秒超时
  };
  
  // 开始游戏
  const startGame = () => {
    setCurrentView('game');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setProgress(0);
    setEstimatedVocabulary(1124);
    setScore(0);
    setTimeRemaining(60);
    setGameLevel(1);
    setComboCount(0);
  };
  
  // 结束游戏
  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
    setCurrentView('results');
  };
  
  // 返回开始界面
  const goToStart = () => {
    setCurrentView('start');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
  };
  
  // 选择答案
  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === currentQuestion.correctAnswer;
    
    // 显示答案反馈
    setAnswerResult(isCorrect ? 'correct' : 'incorrect');
    setShowAnswerFeedback(true);
    
    // 根据答案正确性更新分数和连击
    if (isCorrect) {
      // 根据答题速度给予不同分数
      const speedBonus = Math.floor(timeRemaining / 10);
      const difficultyBonus = currentQuestion.difficulty === 'easy' ? 10 : 
                             currentQuestion.difficulty === 'medium' ? 20 : 30;
      const comboBonus = comboCount > 0 ? comboCount * 5 : 0;
      const totalPoints = difficultyBonus + speedBonus + comboBonus;
      
      setScore(prev => prev + totalPoints);
      setComboCount(prev => prev + 1);
      
      // 每答对3题升一级
      if ((comboCount + 1) % 3 === 0) {
        setGameLevel(prev => prev + 1);
      }
    } else {
      setComboCount(0);
    }
    
    // 短暂延迟后进入下一题
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  };
  
  // 下一题
  const handleNextQuestion = () => {
    setShowAnswerFeedback(false);
    setSelectedAnswer(null);
    
    if (currentQuestionIndex < mockQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      resetQuestionTimer();
    } else {
      // 题目答完，结束游戏
      endGame();
    }
  };
  
  // 不认识该单词
  const handleDontKnow = () => {
    setSelectedAnswer(-1); // 使用-1表示不认识
    setAnswerResult('incorrect');
    setShowAnswerFeedback(true);
    setComboCount(0);
    
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  };
  
  // 从本地存储加载单词并生成测试题目
  useEffect(() => {
    try {
      // 从本地存储获取单词数据
      const words = LocalStorageService.getWords();
      setAllWords(words);
      setFilteredWords(words);
      
      // 获取所有教材版本
      const textbooks = Array.from(new Set(words.map(word => word.textbook)));
      setTextbookOptions(['all', ...textbooks]);
      
      // 生成测试题目
      generateTestQuestions(words);
      
      // 估算词汇量
      setEstimatedVocabulary(Math.max(words.length * 100, 1124));
    } catch (error) {
      console.error('Failed to load words:', error);
      toast.error('加载单词数据失败');
    }
  }, []);
  
  // 当选择的教材变化时过滤单词并重新生成题目
  useEffect(() => {
    if (allWords.length === 0) return;
    
    // 获取嵌入本地的单词
    const embeddedWords = JSON.parse(localStorage.getItem('embeddedWords') || '[]');
    
    let filtered = embeddedWords;
    if (selectedTextbook !== 'all') {
      filtered = embeddedWords.filter(word => word.textbook === selectedTextbook);
    }
    
    setFilteredWords(filtered);
    generateTestQuestions(filtered);
    setEstimatedVocabulary(Math.max(filtered.length * 100, 1124));
  }, [selectedTextbook]);
  
  // 生成测试题目
  const generateTestQuestions = (words: Word[]) => {
    if (words.length < 5) {
      toast.warning('单词数量不足，至少需要5个单词才能进行测试');
      return;
    }
    
    // 随机选择单词并创建题目
    const questions: TestQuestion[] = words
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(10, words.length))
      .map((word, index) => {
        // 确保有足够的干扰项
        const possibleDistractors = words.filter(w => w.id !== word.id);
        const distractors = possibleDistractors
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        
        // 创建选项
        const options = [...distractors.map(w => w.definitions?.[0] || ''), word.definitions?.[0] || '']
          .sort(() => 0.5 - Math.random());
          
        const correctAnswer = options.indexOf(word.definitions?.[0] || '');
        
        return {
          id: index,
          word: word.word,
          options,
          correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
          difficulty: index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard',
          explanation: `${word.word} 的正确释义是 ${word.definitions?.[0] || ''}`,
          distractorsExplanation: {}
        };
      });
      
    setTestQuestions(questions);
  };
  
  // 获取等级标题
  const getLevelTitle = () => {
    const titles = ['词汇新手', '词汇学徒', '词汇达人', '词汇大师', '词汇专家', '词汇王者'];
    return titles[Math.min(gameLevel - 1, titles.length - 1)];
  };
  
  // 获取最终评级
  const getFinalRating = () => {
    if (estimatedVocabulary < 1500) return '初级学习者';
    if (estimatedVocabulary < 3000) return '中级学习者';
    if (estimatedVocabulary < 5000) return '高级学习者';
    if (estimatedVocabulary < 7000) return '英语达人';
    return '英语专家';
  };
  
  // 渲染开始界面
  const renderStartView = () => (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="text-center max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-300 hover:scale-105">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">词汇大挑战</h1>
          <p className="text-xl text-blue-600 mb-6">{getLevelTitle()}</p>
          
          <div className="mb-8">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-blue-600">{gameLevel}</span>
              </div>
            </div>
            <p className="text-gray-600">测试你的词汇量极限，挑战更高分数！</p>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">当前词汇量</span>
              <span className="font-semibold">{estimatedVocabulary}词</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(estimatedVocabulary / 8000 * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium ripple-effect transition-all duration-200 transform hover:scale-105"
          >
            <i className="fas fa-play mr-2"></i>开始挑战
          </button>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>游戏规则：在时间结束前尽可能答对更多单词</p>
            <p>• 正确回答获得分数，连击有额外奖励</p>
            <p>• 难度越高的单词分值越高</p>
            <p>• 答题速度越快，得分越高</p>
          </div>
        </div>
      </div>
    </div>
  );
  
  // 渲染游戏界面
  const renderGameView = () => (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 游戏状态栏 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-xs opacity-80">分数</p>
              <p className="font-bold text-xl">{score}</p>
            </div>
            
            <div>
              <p className="text-xs opacity-80">连击</p>
              <p className="font-bold text-xl">{comboCount}x</p>
            </div>
            
            <div>
              <p className="text-xs opacity-80">等级</p>
              <p className="font-bold text-xl">{gameLevel}</p>
            </div>
          </div>
          
          <div>
            <p className="text-xs opacity-80">剩余时间</p>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20">
              <span className="font-bold text-2xl">{timeRemaining}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto">
          {/* 进度条 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                第{currentQuestionIndex + 1}题 / 词汇量预估: {estimatedVocabulary}
              </span>
              <span className="text-sm text-gray-500">
                {currentQuestionIndex + 1}/{testQuestions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* 题目卡片 - 添加3D翻转效果 */}
          <div className={`bg-white rounded-xl shadow-lg p-8 text-center mb-8 transition-all duration-500 transform ${
            showAnswerFeedback ? 'rotate-y-180' : ''
          }`}>
            <div className={`backface-hidden transition-all duration-500 ${
              showAnswerFeedback ? 'opacity-0' : 'opacity-100'
            }`}>
              <div className="mb-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full inline-block text-sm font-medium">
                {currentQuestion.difficulty === 'easy' ? '简单' : 
                 currentQuestion.difficulty === 'medium' ? '中等' : '困难'}
              </div>
              <h2 className="text-4xl font-bold text-gray-900">{currentQuestion.word}</h2>
            </div>
            
            {showAnswerFeedback && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 backface-hidden transform rotate-y-180 transition-all duration-500">
                {answerResult === 'correct' ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <i className="fas fa-check text-2xl text-green-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">正确!</h3>
                    <p className="text-gray-700 mb-2">{currentQuestion.options[currentQuestion.correctAnswer]}</p>
                    <p className="text-sm text-gray-500">{currentQuestion.explanation}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <i className="fas fa-times text-2xl text-red-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-red-600 mb-2">不正确</h3>
                    <p className="text-gray-700 mb-2">正确答案: {currentQuestion.options[currentQuestion.correctAnswer]}</p>
                    <p className="text-sm text-gray-500">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 选项区域 - 添加动画效果 */}
          {!showAnswerFeedback && (
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={cn(
                    "w-full text-left bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1",
                    selectedAnswer === index 
                      ? answerResult === 'correct' 
                        ? "border-green-500 bg-green-50" 
                        : "border-red-500 bg-red-50"
                      : "hover:shadow-md"
                  )}
                  disabled={selectedAnswer !== null}
                >
                  <span className="text-gray-800">{option}</span>
                  {selectedAnswer === index && (
                    <i className={`fas ${answerResult === 'correct' ? 'fa-check text-green-500' : 'fa-times text-red-500'} float-right`}></i>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* 不认识按钮 */}
          {!showAnswerFeedback && (
            <button
              onClick={handleDontKnow}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200"
              disabled={selectedAnswer !== null}
            >
              <i className="fas fa-question-circle mr-2"></i>不认识
            </button>
          )}
        </div>
      </div>
    </div>
  );
  
  // 渲染结果界面
  const renderResultsView = () => (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="text-center max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-500 animate-fade-in">
          <div className="mb-6">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <i className="fas fa-trophy text-4xl text-yellow-500"></i>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">挑战完成!</h1>
            <p className="text-xl text-blue-600">{getFinalRating()}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">最终得分</p>
              <p className="text-3xl font-bold text-gray-900">{score}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">词汇量</p>
              <p className="text-3xl font-bold text-gray-900">{estimatedVocabulary}词</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">最高连击</p>
              <p className="text-3xl font-bold text-gray-900">{comboCount}x</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">等级</p>
              <p className="text-3xl font-bold text-gray-900">{gameLevel}</p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={goToStart}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              <i className="fas fa-home mr-2"></i>首页
            </button>
            <button
              onClick={startGame}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              <i className="fas fa-redo mr-2"></i>再玩一次
            </button>
          </div>
          
            <button
              onClick={() => {
                // 生成并下载词汇量报告
                // 创建报告数据
                const reportData = [
                  ['词汇量测试报告', '', '', ''],
                  ['测评日期:', new Date().toLocaleString(), '', ''],
                  ['', '', '', ''],
                  ['你的词汇量约为', estimatedVocabulary + '词', '', ''],
                  ['相当于', getFinalRating(), '', ''],
                  ['', '', '', ''],
                  ['各年级英语水平划分表', '', '', ''],
                  ['高中水平 总词汇量:', '3500词', '', ''],
                  ['你的掌握词汇量:', estimatedVocabulary + '词', '', ''],
                  ['', '', '', ''],
                  ['测评结果:', '', '', ''],
                  ['经过我们的检测，你的词汇量相当于' + getFinalRating() + '。目前你可以认识生活中一些常用的名词和部分基本的词汇，能够进行基本的听说交流，但在学术和专业领域词汇仍有不足。', '', '', ''],
                  ['', '', '', ''],
                  ['学习建议:', '', '', ''],
                  ['1. 开始背诵高中考纲和超前词汇，扫清英语学习的词汇障碍', '', '', ''],
                  ['2. 在掌握词汇后，可以开始进行大学阶段英文阅读，培养英语阅读的兴趣和习惯', '', '', ''],
                  ['3. 每周至少进行3次英语阅读训练，每次30分钟以上', '', '', ''],
                  ['4. 建立个人词汇本，记录阅读中遇到的新词汇', '', '', '']
                ];
                
                // 创建工作表和工作簿
                const worksheet = XLSX.utils.aoa_to_sheet(reportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, '词汇量测试结果');
                
                // 保存文件并下载
                XLSX.writeFile(workbook, `词汇量测试报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
                toast.success('词汇量报告已下载');
              }}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg text-lg ripple-effect transition-all duration-300 flex items-center justify-center shadow-lg"
            >
              <i className="fas fa-download mr-2 text-xl"></i>下载词汇量报告
            </button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="h-full min-h-screen">
      {currentView === 'start' && renderStartView()}
      {currentView === 'game' && renderGameView()}
      {currentView === 'results' && renderResultsView()}
    </div>
  );
};

export default VocabularyTest;