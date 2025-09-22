import { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LocalStorageService } from '@/lib/localStorage';
import { Word } from '@/types';

// 工具函数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 类型定义
interface WordData {
  id: string;
  word: string;
  meaning: string;
  audioSrc?: string;  
  phonetic?: string;
}

type TestMode = 'wordToMeaning' | 'meaningToWord' | 'audioToWord';
type QuestionStatus = 'unanswered' | 'correct' | 'incorrect';

interface Question {
  id: string;
  word: string;
  meaning: string;
  phonetic?: string;
  audioSrc?: string;
  options: string[];
  correctAnswer: string;
}

interface TestState {
  currentQuestionIndex: number;
  score: number;
  questionStatuses: Record<string, QuestionStatus>;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | undefined;

// 组件定义
interface AnswerOptionsProps {
  options: string[];
  onSelect: (option: string) => void;
  status: AnswerStatus;
  correctAnswer?: string;
  selectedAnswer?: string;
}

const AnswerOptions: React.FC<AnswerOptionsProps> = ({ 
  options, 
  onSelect, 
  status, 
  correctAnswer,
  selectedAnswer
}) => {
  const isDisabled = status !== 'unanswered' && status !== undefined;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
      {options.map((option, index) => {
        let optionClasses = "p-4 rounded-xl border transition-all duration-300 cursor-pointer";
        let icon = null;
        
        if (status === 'unanswered' || status === undefined) {
          optionClasses += " border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700";
        } else {
          if (option === correctAnswer) {
            optionClasses += " border-green-500 bg-green-50 dark-bg-green-900/30 text-green-700 dark:text-green-400";
            icon = <i className="fa-solid fa-check text-green-500 ml-2"></i>;
          } else if (option === selectedAnswer) {
            optionClasses += " border-red-500 bg-red-50 dark-bg-red-900/30 text-red-700 dark:text-red-400";
            icon = <i className="fa-solid fa-times text-red-500 ml-2"></i>;
          } else {
            optionClasses += " border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
          }
        }
        
        return (
          <motion.button
            key={index}
            onClick={() => !isDisabled && onSelect(option)}
            disabled={isDisabled}
            className={optionClasses}
            whileHover={!isDisabled ? { scale: 1.02 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <span>{option}</span>
              {icon}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

interface ModeSelectorProps {
  currentMode: TestMode;
  onModeChange: (mode: TestMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const modes = [
    { value: 'wordToMeaning' as TestMode, name: '看词选义', description: '通过单词选择正确的含义，增强词汇理解能力。', icon: 'fa-book' },
    { value: 'meaningToWord' as TestMode, name: '看义选词', description: '根据含义选择对应的单词，锻炼词汇记忆能力。', icon: 'fa-lightbulb' },
    { value: 'audioToWord' as TestMode, name: '听音选词', description: '听单词发音选择正确拼写，提升听力辨词能力。', icon: 'fa-volume-high' }
  ];
  
  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-8 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">选择测试模式</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={`relative overflow-hidden rounded-lg p-4 transition-all duration-300 ${
              currentMode === mode.value
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <div className="text-center">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${
                currentMode === mode.value 
                  ? 'bg-white bg-opacity-20' 
                  : mode.value === 'wordToMeaning' ? 'bg-blue-100 text-blue-600' : 
                    mode.value === 'meaningToWord' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
              }`}>
                <i className={`fa-solid ${mode.icon} text-xl`}></i>
              </div>
              <h3 className="font-bold text-lg mb-1">{mode.name}</h3>
              <p className="text-sm opacity-80">{mode.description}</p>
            </div>
            
            {currentMode === mode.value && (
              <div className="absolute top-2 right-2">
                <i className="fa-solid fa-check-circle"></i>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

interface ProgressBarProps {
  percentage: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, className = '' }) => {
  return (
    <div className={cn("w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6", className)}>
      <div 
        className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

interface QuestionCardProps {
  className?: string;
}

const QuestionCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mt-8 mb-4 transition-all duration-300",
      "border border-gray-100 dark:border-gray-700",
      "hover:shadow-2xl",
      className
    )}>
      {children}
    </div>
  );
};

interface ScoreDisplayProps {
  score: number;
  total: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, total }) => {
  return (
    <div className="mb-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-4 inline-flex items-center"
      >
        <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mr-3">
          <i className="fa-solid fa-trophy text-xl"></i>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">当前得分</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{score}/{total}</p>
        </div>
      </motion.div>
    </div>
  );
};

// 测试模式组件
interface AudioToWordTestProps {
  question: Question & {
    word: string;
    phonetic?: string;
    options: string[];
    correctAnswer: string;
  };
  onAnswerSubmit: (isCorrect: boolean) => void;
  status: 'unanswered' | 'correct' | 'incorrect' | undefined;
}

const AudioToWordTest: React.FC<AudioToWordTestProps> = ({ 
  question, 
  onAnswerSubmit,
  status
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playAudio = () => {
    setIsPlaying(true);
    
    // 使用Web Speech API朗读单词
    const utterance = new SpeechSynthesisUtterance(question.word);
    utterance.lang = 'en-US';
    
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    window.speechSynthesis.speak(utterance);
    
    // 超时安全机制
    setTimeout(() => {
      setIsPlaying(false);
    }, 3000);
  };
  
  const handleSelect = (option: string) => {
    if (status) return;
    
    setSelectedAnswer(option);
    const isCorrect = option === question.correctAnswer;
    onAnswerSubmit(isCorrect);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">听发音，选择正确的中文含义</h3>
        
        <motion.button
          onClick={playAudio}
          disabled={isPlaying || status}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-6 mb-6 transition-all duration-300 shadow-lg"
        >  
          <i className={`fa-solid ${isPlaying ? 'fa-volume-up' : 'fa-volume-high'} text-3xl`}></i>
        </motion.button>
        
        {question.phonetic && (
          <p className="text-gray-500 mb-2">{question.phonetic}</p>
        )}
        
        {isPlaying && (
          <div className="flex justify-center space-x-2">
            {[1, 2, 3].map((dot) => (
              <motion.span
                key={dot}
                className="w-3 h-3 bg-purple-500 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  delay: dot * 0.2
                }}
              ></motion.span>
            ))}
          </div>
        )}
      </div>
      
      <AnswerOptions
        options={question.options}
        onSelect={handleSelect}
        status={status}
        correctAnswer={question.correctAnswer}
        selectedAnswer={selectedAnswer}
      />
    </div>
  );
};

interface MeaningToWordTestProps {
  question: Question;
  onAnswerSubmit: (isCorrect: boolean) => void;  
  status: 'unanswered' | 'correct' | 'incorrect' | undefined;
}

const MeaningToWordTest: React.FC<MeaningToWordTestProps> = ({ 
  question, 
  onAnswerSubmit,
  status
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>();
  
  const handleSelect = (option: string) => {
    if (status) return;
    
    setSelectedAnswer(option);
    const isCorrect = option === question.correctAnswer;
    onAnswerSubmit(isCorrect);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">选择与含义匹配的单词</h3>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-xl md:text-2xl font-medium text-gray-700 dark:text-gray-300 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl"
        >
          "{question.meaning}"
        </motion.div>
      </div>
      
      <AnswerOptions
        options={question.options}
        onSelect={handleSelect}
        status={status}
        correctAnswer={question.correctAnswer}
        selectedAnswer={selectedAnswer}
      />
    </div>
  );
};

interface WordToMeaningTestProps {
  question: Question;
  onAnswerSubmit: (isCorrect: boolean) => void;
  status: 'unanswered' | 'correct' | 'incorrect' | undefined;
}

const WordToMeaningTest: React.FC<WordToMeaningTestProps> = ({ 
  question, 
  onAnswerSubmit,
  status
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>();
  
  const handleSelect = (option: string) => {
    if (status) return;
    
    setSelectedAnswer(option);
    const isCorrect = option === question.correctAnswer;
    onAnswerSubmit(isCorrect);
  };
  
  return (
    <div className="space-y-6">  
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">选择单词的正确含义</h3>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white"
        >
          {question.word}
        </motion.div>
        
        {question.phonetic && (
          <p className="text-lg text-gray-500 mt-2">{question.phonetic}</p>
        )}
      </div>
      
      <AnswerOptions
        options={question.options}
        onSelect={handleSelect}
        status={status}
        correctAnswer={question.correctAnswer}
        selectedAnswer={selectedAnswer}
      />
    </div>
  );
};

// 页面组件
const WordMasterChallenge: React.FC = () => {
  const navigate = useNavigate();
  const [currentMode, setCurrentMode] = useState<TestMode>('wordToMeaning');
  const [testState, setTestState] = useState<TestState>({
    currentQuestionIndex: 0,
    score: 0,
    questionStatuses: {},
  });
  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState('');
  
  // 加载用户信息和单词数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 获取用户信息
        const user = LocalStorageService.getCurrentUser();
        setUserInfo(user);
        
        // 获取最后同步时间
        const syncTime = LocalStorageService.getLastSync();
        setLastSyncTime(syncTime);
        
        // 获取同步的单词数据
        const syncedWords = LocalStorageService.getSyncedWords();
        
        if (syncedWords.length === 0) {
          // 如果没有同步的单词，从词库中随机选择15个
          const allWords = LocalStorageService.getWords();
          if (allWords.length === 0) { // 如果词库也为空
            setError("没有找到可测试的单词，请先同步单词库");
            return;
          }
          
          // 随机选择15个单词
          const shuffled = [...allWords].sort(() => 0.5 - Math.random());
          const selectedWords = shuffled.slice(0, Math.min(15, shuffled.length));
          
          // 转换为WordData格式
          const formattedWords = selectedWords.map(word => ({
            id: word.id,
            word: word.word,
            meaning: word.definitions?.[0] || '',
            phonetic: word.phonetic,
          }));
          
          setWords(formattedWords);
        } else {
          // 转换为WordData格式
          const formattedWords = syncedWords.map(word => ({
            id: word.id,
            word: word.word,
            meaning: word.definitions?.[0] || '',
            phonetic: word.phonetic,
          }));
          
          setWords(formattedWords);
        }
      } catch (err) {
        console.error('Failed to load test data:', err);
        setError("加载测试数据失败，请刷新页面重试");
        toast.error("加载测试数据失败");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // 根据当前模式过滤和处理问题
  const questions: Question[] = words.map((word) => {
    let options: string[] = [];
    let correctAnswer: string = '';
    
    switch(currentMode) {
      case 'wordToMeaning':
        // 看词选义 - 选项是词义
        options = [word.meaning, ...words.filter(w => w.id !== word.id).slice(0, 3).map(w => w.meaning)];
        correctAnswer = word.meaning;
        break;
      case 'meaningToWord':
        // 看义选词 - 选项是单词
        options = [word.word, ...words.filter(w => w.id !== word.id).slice(0, 3).map(w => w.word)];
        correctAnswer = word.word;
        break;
      case 'audioToWord':
        // 听音选词 - 选项是词义
        options = [word.meaning, ...words.filter(w => w.id !== word.id).slice(0, 3).map(w => w.meaning)];
        correctAnswer = word.meaning;
        break;
    }
    
    // 随机打乱选项顺序
    options.sort(() => Math.random() - 0.5);
    
    return {
      id: word.id,
      word: word.word,
      meaning: word.meaning,
      phonetic: word.phonetic,
      options,
      correctAnswer
    };
  });
  
  const handleAnswerSubmit = (isCorrect: boolean) => {
    if (questions.length === 0) return;
    
    const questionId = questions[testState.currentQuestionIndex].id;
    
    setTestState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 1 : prev.score,
      questionStatuses: {
        ...prev.questionStatuses,
        [questionId]: isCorrect ? 'correct' : 'incorrect'
      }
    }));
    
    // 显示提示
    if (isCorrect) {
      toast.success("回答正确！");
    } else {
      const correctAnswer = questions[testState.currentQuestionIndex].correctAnswer;
      toast.error(`回答错误，正确答案是: ${correctAnswer}`);
    }
    
    setTimeout(() => {
      const nextIndex = testState.currentQuestionIndex < questions.length - 1 
        ? testState.currentQuestionIndex + 1 
        : testState.currentQuestionIndex;
        
      setTestState(prev => ({
        ...prev,
        currentQuestionIndex: nextIndex
      }));
      
      // 如果是最后一题，显示完成提示
      if (nextIndex === testState.currentQuestionIndex) {
        setTimeout(() => {
          toast.success(`测试完成！最终得分: ${testState.score}/${questions.length}`);
        }, 500);
      }
    }, 1000);
  };
  
  const handleModeChange = (newMode: TestMode) => {
    setCurrentMode(newMode);
    setTestState({
      currentQuestionIndex: 0,
      score: 0,
      questionStatuses: {}
    });
  };
  
  const handleStartTest = () => {
    if (questions.length === 0) {
      toast.error("没有可测试的单词");
      return;
    }
    navigate('/word-test');
  };
  
  const currentQuestion = questions[testState.currentQuestionIndex];
  const progressPercentage = questions.length > 0 
    ? (testState.currentQuestionIndex / questions.length) * 100 
    : 0;
  
  const renderTestComponent = () => {
    if (!currentQuestion) return null;
    
    switch(currentMode) {
      case 'wordToMeaning':
        return (
          <WordToMeaningTest 
            question={currentQuestion} 
            onAnswerSubmit={handleAnswerSubmit} 
            status={testState.questionStatuses[currentQuestion.id]}
          />
        );
        
      case 'meaningToWord':
        return (
          <MeaningToWordTest 
            question={currentQuestion} 
            onAnswerSubmit={handleAnswerSubmit}
            status={testState.questionStatuses[currentQuestion.id]}
          />
        );
        
      case 'audioToWord':
        return (
          <AudioToWordTest 
            question={currentQuestion} 
            onAnswerSubmit={handleAnswerSubmit}
            status={testState.questionStatuses[currentQuestion.id]}
          />
        );
    }
  };
  
  // 渲染欢迎界面
  const renderWelcomeScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 flex flex-col">
      {/* 顶部用户信息 */}
      <div className="flex justify-between items-center mb-8 px-4 py-2">
        <div className="flex items-center">
          <div className="relative">
            <img 
              src={userInfo?.avatar || "https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=student+avatar&sign=029837c01a92e460db523ebdd26ca87a"} 
              alt={userInfo?.name || "用户头像"} 
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800 dark:text-white">{userInfo?.name || "默认学生"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.className || "默认班级"}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <i className="fa-solid fa-bell text-xl"></i>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">2</span>
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <i className="fa-solid fa-sync-alt mr-1"></i>
            <span>上次同步: {lastSyncTime || "未同步"}</span>
          </div>
        </div>
      </div>
      
      <div className="text-center max-w-4xl mx-auto mt-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
          欢迎来到 <span className="text-blue-600">单词达人</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          通过有趣的测试挑战提升你的词汇量，三种模式帮助你全面掌握英语单词！
        </p>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mt-8"
        >
          <button 
            onClick={handleStartTest}
            disabled={loading || error}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 inline-flex items-center"
          >
            开始测试挑战
            <i className="fa-solid fa-arrow-right ml-2"></i>
          </button>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mx-auto mt-6 flex-grow items-center justify-center">
        {/* 看词选义 */}
        <motion.div
          className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-gray-100 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => {
            setCurrentMode('wordToMeaning');
            handleStartTest();
          }}
        >
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-book text-blue-600 text-xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">看词选义</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            通过单词选择正确的含义，增强词汇理解能力。
          </p>
        </motion.div>
        
        {/* 看义选词 */}
        <motion.div
          className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-gray-100 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}>
          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-lightbulb text-green-600 text-xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">看义选词</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            根据含义选择对应的单词，锻炼词汇记忆能力。
          </p>
        </motion.div>
        
        {/* 听音选词 */}
        <motion.div
          className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-gray-100 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity:.1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => {
            setCurrentMode('audioToWord');
            handleStartTest();
          }}
        >
          <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-volume-high text-purple-600 text-xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">听音选词</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            听单词发音选择正确拼写，提升听力辨词能力。
          </p>
        </motion.div>
      </div>
      
      {error && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-2">
            <i className="fa-solid fa-exclamation-circle text-xl"></i>
          </div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => navigate('/study-word-bank')}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            前往同步单词库 <i className="fa-solid fa-arrow-right ml-1"></i>
          </button>
        </div>
      )}
      
      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-600">加载测试数据中...</p>
        </div>
      )}
    </div>
  );
  
  // 渲染测试界面
  const renderTestScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 flex flex-col">
      <div className="text-center mb-6 mt-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">单词达人测试挑战</h1>
        <p className="text-gray-600 dark:text-gray-300">提升你的词汇量，挑战自我极限！</p>
      </div>
      
      <ModeSelector currentMode={currentMode} onModeChange={handleModeChange} />
      
      <div className="flex-1 flex flex-col items-center justify-center my-8">
        <ScoreDisplay score={testState.score} total={questions.length} />
        
        <div className="w-full max-w-md mx-auto">
          <ProgressBar percentage={progressPercentage} />
          
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">加载题目中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="bg-red-100 text-red-600 p-4 rounded-full inline-flex items-center justify-center mb-4">
                <i className="fa-solid fa-exclamation-circle text-xl"></i>
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => navigate('/study-word-bank')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                前往单词库
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">没有可测试的单词</p>
              <button 
                onClick={() => navigate('/study-word-bank')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                去同步单词
              </button>
            </div>
          ) : (
            <QuestionCard>
              {renderTestComponent()}
            </QuestionCard>
          )}
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
             问题 {testState.currentQuestionIndex + 1}/{questions.length}
          </div>
          
          <div className="flex justify-center mt-8 space-x-4">
            <button
              onClick={() => navigate('/study-word-bank')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>返回单词库
            </button>
            
            <button
              onClick={() => {
                setTestState({
                  currentQuestionIndex: 0,
                  score: 0,
                  questionStatuses: {}
                });
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
            >
              <i className="fa-solid fa-redo mr-2"></i>重新开始
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // 根据当前路径决定渲染哪个界面
  const currentPath = window.location.pathname;
  return currentPath === '/runtime/word-master-challenge' ? renderTestScreen() : renderWelcomeScreen();
};

export default WordMasterChallenge;