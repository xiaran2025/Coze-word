import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Word } from '@/types';
import { useWords } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { LocalStorageService } from '@/lib/localStorage';

// 定义游戏状态接口
// 全局变量用于跟踪已使用的释义，实现循环使用
let usedDefinitionsQueue: string[] = [];

interface GameState {
  currentGroup: number;
  matchedPairs: number;
  flippedCards: number[];
  isProcessing: boolean;
  gameCompleted: boolean;
  selectedWords: Word[];
  wordPairs: Array<{
    id: string;
    word: string;
    definition: string;
    distractors: string[];
    matched: boolean;
    attempted: boolean;
    correct: boolean;
  }>;
  words: string[];
  definitions: string[];
  pairHistory: Array<{
    word: string;
    definition: string;
    correct: boolean;
    correctDefinition?: string;
  }>;
  shuffleEnabled: boolean;
  noteContent: string;
  showNoteModal: boolean;
  wordNotes: Record<string, string>;
  TOTAL_GROUPS: number;
}

// 用户指定的单词列表
// 跟踪已使用的释义，确保每个释义尽量使用一次

// 获取今日需学习单词
const getTodayWords = (): Array<{ word: string; definition: string }> => {
  try {
    // 获取今日需学习单词（从同步的单词中获取）
    const syncedWords = LocalStorageService.getSyncedWords();
    if (syncedWords.length > 0) {
      return syncedWords.map(word => ({
        word: word.word,
        definition: word.definitions?.[0] || ""
      })).filter(item => item.word && item.definition);
    }
    
    // 如果没有同步单词，使用默认单词库
    const words = LocalStorageService.getWords();
    return words.map(word => ({
      word: word.word,
      definition: word.definitions?.[0] || ""
    })).filter(item => item.word && item.definition);
  } catch (error) {
    console.error("Failed to load today's words:", error);
    // 错误时的备用单词
    return [
      { word: "China", definition: "n. 中国,瓷器;adj. 中国的" },
      { word: "Chinese", definition: "n. 中文,中国人;adj. 中国的" },
      { word: "English", definition: "n. 英语;adj. 英国的" },
      { word: "book", definition: "n. 书,书籍" },
      { word: "student", definition: "n. 学生" },
      { word: "teacher", definition: "n. 教师" },
      { word: "school", definition: "n. 学校" },
      { word: "classroom", definition: "n. 教室" }
    ];
  }
};

// 单词匹配游戏组件
const WordMatchingGame: React.FC = () => {
  const navigate = useNavigate();
  const { words } = useWords();
  const [gameState, setGameState] = useState<GameState>({
    currentGroup: 1,
    matchedPairs: 0,
    flippedCards: [],
    isProcessing: false,
    gameCompleted: false,
    selectedWords: [],
    wordPairs: [],
    words: [],
    definitions: [],
    pairHistory: [],
    shuffleEnabled: false,
    TOTAL_GROUPS: 1,
    noteContent: '',
    showNoteModal: false,
    wordNotes: {}
  });
  
  // 游戏配置
  const WORDS_PER_GROUP = 4; // 每组单词数量
  
  // 初始化游戏数据
  useEffect(() => {
    initializeGame();
    loadNotes();
  }, [gameState.currentGroup, gameState.shuffleEnabled]);
  
  // 加载笔记
  const loadNotes = () => {
    try {
      const savedNotes = localStorage.getItem('wordNotes');
      if (savedNotes) {
        setGameState(prev => ({
          ...prev,
          wordNotes: JSON.parse(savedNotes)
        }));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };
  
  // 保存笔记
  const saveNote = (word: string, note: string) => {
    try {
      const updatedNotes = {
        ...gameState.wordNotes,
        [word]: note
      };
      
      localStorage.setItem('wordNotes', JSON.stringify(updatedNotes));
      
      setGameState(prev => ({
        ...prev,
        wordNotes: updatedNotes
      }));
      
      toast.success('笔记已保存');
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('保存笔记失败');
    }
  };
  
  // 初始化游戏
  const initializeGame = () => {
    // 获取本地单词库数据
    const allWords = getTodayWords();
    if (allWords.length < 4) {
      toast.error("单词库中至少需要4个单词才能进行游戏");
      return;
    }

    // 计算总组数
    const TOTAL_GROUPS = Math.ceil(allWords.length / WORDS_PER_GROUP);
    
    // 获取当前组的单词对
    const startIndex = (gameState.currentGroup - 1) * WORDS_PER_GROUP;
    let currentGroupWords = allWords.slice(startIndex, startIndex + WORDS_PER_GROUP);

    // 如果单词不足，循环使用现有单词
    while (currentGroupWords.length < WORDS_PER_GROUP && allWords.length > 0) {
      currentGroupWords = [...currentGroupWords, ...allWords.slice(0, WORDS_PER_GROUP - currentGroupWords.length)];
    }

    // 创建单词对数据并添加干扰项
    const wordPairs = currentGroupWords.map((item, index) => {
// 初始化释义队列（如果为空）
if (usedDefinitionsQueue.length === 0) {
  // 收集所有可用释义并打乱顺序
  const allDefinitions = allWords.map(w => w.definition);
  usedDefinitionsQueue = shuffleArray([...allDefinitions]);
}

// 从队列中获取3个不重复的干扰项
const distractors = [];
while (distractors.length < 3) {
  if (usedDefinitionsQueue.length === 0) {
    // 如果队列为空，重新填充并打乱
    const allDefinitions = allWords.map(w => w.definition);
    usedDefinitionsQueue = shuffleArray([...allDefinitions]);
  }
  
  const def = usedDefinitionsQueue.shift() || "";
  if (def && def !== item.definition && !distractors.includes(def)) {
    distractors.push(def);
    // 将使用过的释义放回队列末尾，实现循环使用
    usedDefinitionsQueue.push(def);
  }
}

return {
  id: `pair-${startIndex + index}`,
  word: item.word,
  definition: item.definition,
  distractors: distractors,
  matched: false,
  attempted: false,
  correct: false
};
    });
    
    // 创建单词列表和包含干扰项的释义列表
    let words = wordPairs.map(pair => pair.word);
    let definitions = [];

    // 为每个单词添加正确释义和干扰项
    wordPairs.forEach(pair => {
      // 合并正确释义和干扰项
      const allOptions = [pair.definition, ...pair.distractors];
      // 随机排序选项
      const shuffledOptions = shuffleArray(allOptions);
      // 将选项添加到定义列表
      definitions.push(...shuffledOptions);
    });

    // 如果启用随机打乱，打乱顺序
    if (gameState.shuffleEnabled) {
      words = shuffleArray([...words]);
      definitions = shuffleArray([...definitions]);
    }
    
    setGameState(prev => ({
      ...prev,
      wordPairs,
      words,
      definitions,
      matchedPairs: 0,
      flippedCards: [],
      gameCompleted: false,
      pairHistory: [],
      noteContent: gameState.wordNotes[words[0]] || '',
      TOTAL_GROUPS: TOTAL_GROUPS
    }));
};
  
  // 打乱数组顺序的工具函数
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  // 打开笔记模态框
  const openNoteModal = (word?: string) => {
    const currentWord = word || gameState.words[0];
    setGameState(prev => ({
      ...prev,
      noteContent: prev.wordNotes[currentWord] || '',
      showNoteModal: true
    }));
  };
  
  // 关闭笔记模态框
  const closeNoteModal = () => {
    setGameState(prev => ({
      ...prev,
      showNoteModal: false
    }));
  };
  
  // 保存笔记
  const handleSaveNote = () => {
    const currentWord = gameState.words[0];
    if (gameState.noteContent.trim()) {
      saveNote(currentWord, gameState.noteContent);
    } else {
      // 如果内容为空，删除笔记
      const updatedNotes = { ...gameState.wordNotes };
      delete updatedNotes[currentWord];
      localStorage.setItem('wordNotes', JSON.stringify(updatedNotes));
      setGameState(prev => ({
        ...prev,
        wordNotes: updatedNotes
      }));
      toast.success('笔记已删除');
    }
    closeNoteModal();
  };
  
  // 处理笔记内容变化
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGameState(prev => ({
      ...prev,
      noteContent: e.target.value
    }));
  };
  
  // 处理单词点击
  const handleWordClick = (wordIndex: number) => {
    // 如果正在处理匹配或已完成，则不响应点击
    if (gameState.isProcessing || gameState.gameCompleted) return;
    
    // 如果已经选择了两个项目，则重置选择
    if (gameState.flippedCards.length === 2) {
      setGameState(prev => ({
        ...prev,
        flippedCards: [wordIndex]
      }));
      return;
    }
    
    // 添加到已选择的卡片
    const newFlippedCards = [...gameState.flippedCards, wordIndex];
    
    setGameState(prev => ({
      ...prev,
      flippedCards: newFlippedCards
    }));
    
    // 如果选择了一个单词和一个释义，检查匹配
    if (newFlippedCards.length === 2) {
      const [wordIndex, defIndex] = newFlippedCards;
      checkMatch(wordIndex, defIndex);
    }
  };
  
  // 检查单词和释义是否匹配
  const checkMatch = (wordIndex: number, defIndex: number) => {
    setGameState(prev => ({ ...prev, isProcessing: true }));
    
const selectedWord = gameState.words[wordIndex];
const selectedDef = gameState.definitions[defIndex];
// 找到当前单词的正确定义
const currentWordPair = gameState.wordPairs.find(pair => pair.word === selectedWord);

// 查找正确的配对
const correctPair = currentWordPair && selectedDef === currentWordPair.definition
  ? currentWordPair
  : null;
    
// 查找正确的释义
const correctDefinition = currentWordPair?.definition;
    
    // 记录配对历史
    const newHistoryItem = {
      word: selectedWord,
      definition: selectedDef,
      correct: !!correctPair,
      correctDefinition: correctPair ? undefined : correctDefinition
    };
    
    // 更新单词对状态
    const updatedPairs = gameState.wordPairs.map(pair => 
      pair.word === selectedWord 
        ? { 
            ...pair, 
            attempted: true, 
            correct: !!correctPair,
            matched: pair.matched || !!correctPair
          } 
        : pair
    );
    
    // 短暂延迟后处理匹配结果
    setTimeout(() => {
      if (correctPair) {
        // 匹配成功
        toast.success(`'${selectedWord} - ${selectedDef}' 配对正确！`);
        
        setGameState(prev => ({
          ...prev,
          wordPairs: updatedPairs,
          matchedPairs: prev.matchedPairs + 1,
          flippedCards: [],
          isProcessing: false,
          pairHistory: [...prev.pairHistory, newHistoryItem]
        }));
        
        // 检查当前组是否完成
        if (gameState.matchedPairs + 1 === gameState.wordPairs.length) {
          // 检查是否是最后一组
          if (gameState.currentGroup === gameState.TOTAL_GROUPS) {
            // 游戏完成，计算正确率
            const correctCount = gameState.pairHistory.filter(item => item.correct).length;
            const totalCount = gameState.pairHistory.length;
            const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
            
            // 找出错误的单词
            const incorrectItems = gameState.pairHistory.filter(item => !item.correct);
            
            // 显示完成信息
            toast.success(`本次配对练习，共 ${totalCount} 组单词释义，正确 ${correctCount} 组，正确率 ${accuracy}%`);
            
            if (incorrectItems.length > 0) {
              const errorWords = incorrectItems.map(item => 
                `'${item.word} - ${item.correctDefinition || "无正确释义"}'`
              ).join('、');
              toast.info(`需重点复习 ${errorWords} 相关内容`);
            }
            
            setGameState(prev => ({
              ...prev,
              gameCompleted: true,
              isProcessing: false
            }));
          } else {
            // 进入下一组
            toast.success(`第${gameState.currentGroup}组完成！`);
            setGameState(prev => ({
              ...prev,
              currentGroup: prev.currentGroup + 1,
              flippedCards: [],
              isProcessing: false,
              pairHistory: [...prev.pairHistory, newHistoryItem]
            }));
          }
        }
      } else {
        // 不匹配
        toast.error(`'${selectedWord} - ${selectedDef}' 配对错误，正确应为 '${selectedWord} - ${correctDefinition}'`);
        
        setGameState(prev => ({
          ...prev,
          wordPairs: updatedPairs,
          flippedCards: [],
          isProcessing: false,
          pairHistory: [...prev.pairHistory, newHistoryItem]
        }));
      }
    }, 500);
  };
  
  // 返回单词库
  const handleBack = () => {
    navigate('/word-library');
  };
  
  // 重新开始当前组
  const restartCurrentGroup = () => {
    setGameState(prev => ({
      ...prev,
      matchedPairs: 0,
      flippedCards: [],
      gameCompleted: false,
      pairHistory: []
    }));
    initializeGame();
  };
  
  // 切换随机打乱
  const toggleShuffle = () => {
    setGameState(prev => ({
      ...prev,
      shuffleEnabled: !prev.shuffleEnabled
    }));
  };
  
  // 获取卡片样式
  const getCardStyle = (index: number, type: 'word' | 'definition') => {
    const isSelected = gameState.flippedCards.includes(index);
    const isMatched = type === 'word' 
      ? gameState.wordPairs.find(pair => pair.word === gameState.words[index])?.matched 
      : gameState.wordPairs.find(pair => pair.definition === gameState.definitions[index])?.matched;
    const attempted = type === 'word' 
      ? gameState.wordPairs.find(pair => pair.word === gameState.words[index])?.attempted 
      : false;
    const correct = type === 'word' 
      ? gameState.wordPairs.find(pair => pair.word === gameState.words[index])?.correct 
      : false;
    
    return cn(
      "flex items-center justify-center p-4 rounded-lg cursor-pointer transition-all duration-300 transform hover:shadow-md min-h-[80px]",
      isMatched ? "bg-green-100 text-green-800" : 
      isSelected ? "bg-blue-100 text-blue-800 border-2 border-blue-300 scale-105 shadow-lg" : 
      attempted && !correct ? "bg-red-50 text-red-800" : 
      "bg-gray-50 text-gray-800 border border-gray-200 hover:border-blue-300"
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6 module-transition min-h-[calc(100vh-120px)]">
      {/* 顶部导航栏 */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <button 
          className="text-gray-600 hover:text-gray-900 flex items-center"
          onClick={handleBack}
        >
          <i className="fas fa-arrow-left mr-2"></i> 返回单词库
        </button>
        
        <div className="text-center flex-1 min-w-[200px]">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">趣消单词</h2>
          <p className="text-gray-500">第{gameState.currentGroup}/{gameState.TOTAL_GROUPS}组 · 已匹配: {gameState.matchedPairs}/{gameState.wordPairs.length}对</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm ripple-effect"
            onClick={toggleShuffle}
          >
            <i className={`fas ${gameState.shuffleEnabled ? 'fa-check-circle' : 'fa-random'} mr-1`}></i> 
            {gameState.shuffleEnabled ? '已打乱' : '随机打乱'}
          </button>
          
          <button 
            className="bg-[#165DFF] hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm ripple-effect"
            onClick={restartCurrentGroup}
          >
            <i className="fas fa-redo mr-1"></i> 重玩本组
          </button>
        </div>
      </div>
      
      {/* 游戏区域 */}
      {gameState.gameCompleted ? (
        // 游戏完成界面
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <i className="fas fa-trophy text-4xl text-green-500"></i>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">恭喜完成所有配对！</h3>
          
          {/* 结果统计 */}
          <div className="bg-gray-50 p-6 rounded-xl shadow-inner mb-8 w-full max-w-2xl">
            <h4 className="text-xl font-semibold text-gray-800 mb-4">学习报告</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">总配对数</p>
                <p className="text-3xl font-bold text-gray-900">{gameState.pairHistory.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">正确配对</p>
                <p className="text-3xl font-bold text-green-600">
                  {gameState.pairHistory.filter(item => item.correct).length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">正确率</p>
                <p className="text-3xl font-bold text-blue-600">
                  {gameState.pairHistory.length > 0 
                    ? `${Math.round((gameState.pairHistory.filter(item => item.correct).length / gameState.pairHistory.length) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>
            
            {/* 错误单词列表 */}
            {gameState.pairHistory.filter(item => !item.correct).length > 0 && (
              <div>
                <h5 className="text-lg font-medium text-red-600 mb-3">需重点复习：</h5>
                <ul className="text-left space-y-2">
                  {gameState.pairHistory
                    .filter(item => !item.correct)
                    .map((item, index) => (
                      <li key={index} className="flex items-start">
                        <i className="fas fa-exclamation-circle text-red-500 mt-1 mr-2"></i>
                        <div>
                          <span className="font-medium">{item.word}</span> - 
                          <span className="text-red-600 line-through mr-2">{item.definition}</span>
                          <span className="text-green-600">{item.correctDefinition}</span>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md ripple-effect"
              onClick={restartCurrentGroup}
            >
              再玩一次
            </button>
            <button 
              className="px-6 py-3 bg-[#165DFF] hover:bg-blue-700 text-white rounded-md ripple-effect"
              onClick={handleBack}
            >
              返回单词库
            </button>
          </div>
        </div>
      ) : (
        // 游戏网格 - 分为左右两列
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左侧单词列 */}
           <div>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                 <i className="fas fa-language text-blue-500 mr-2"></i>英语单词
               </h3>
               <button 
                 onClick={() => openNoteModal()}
                 className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full text-sm flex items-center"
               >
                 <i className="fas fa-sticky-note mr-1"></i>
                 {gameState.wordNotes[gameState.words[0]] ? '编辑笔记' : '添加笔记'}
               </button>
             </div>
             
             {/* 显示当前单词的笔记预览 */}
             {gameState.words[0] && gameState.wordNotes[gameState.words[0]] && (
               <div className="bg-yellow-50 p-3 rounded-lg mb-4 text-sm">
                 <div className="flex items-start">
                   <i className="fas fa-sticky-note text-yellow-500 mt-1 mr-2"></i>
                   <p className="text-gray-700 line-clamp-2">{gameState.wordNotes[gameState.words[0]]}</p>
                 </div>
               </div>
             )}
             
             <div className="grid grid-cols-2 gap-4">
               {gameState.words.map((word, index) => (
                 <div 
                   key={`word-${index}`}
                   className={getCardStyle(index, 'word')}
                   onClick={() => handleWordClick(index)}
                 >
                   <div className="flex items-center flex-col">
                     <span className="text-sm font-medium">{word}</span>
                     {gameState.wordNotes[word] && (
                       <i className="fas fa-sticky-note text-yellow-500 ml-1 text-xs"></i>
                     )}
                     <button 
                       className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm ripple-effect"
                       onClick={(e) => {
                         e.stopPropagation();
                         openNoteModal(word);
                       }}
                     >
                       <i className="fas fa-sticky-note mr-1"></i>添加笔记
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           </div>
          
          {/* 右侧释义列 */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-book text-green-500 mr-2"></i>中文释义
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {gameState.definitions.map((definition, index) => (
                <div 
                  key={`def-${index}`}
                  className={getCardStyle(index, 'definition')}
                  onClick={() => handleWordClick(index + gameState.words.length)}
                >
                  <span className="text-sm font-medium">{definition}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 游戏说明 */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
          <i className="fas fa-info-circle mr-2"></i>游戏说明
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 点击左侧英语单词和右侧中文释义进行配对</li>
          <li>• 系统会自动判断配对是否正确，并给出反馈</li>
          <li>• 完成所有配对后可查看学习报告和正确率</li>
          <li>• 可点击"随机打乱"按钮随机排列单词和释义的顺序</li>
        </ul>
       </div>
       
       {/* 笔记模态框 */}
       {gameState.showNoteModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all animate-fade-in">
             <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
               <h3 className="text-lg font-semibold text-gray-800">
                 单词笔记 - {gameState.words[0]}
               </h3>
               <button 
                 className="text-gray-500 hover:text-gray-700"
                 onClick={closeNoteModal}
               >
                 <i className="fas fa-times"></i>
               </button>
             </div>
             
             <div className="p-6">
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-2">笔记内容</label>
                 <textarea
                   value={gameState.noteContent}
                   onChange={handleNoteChange}
                   className="w-full border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF] min-h-[150px]"
                   placeholder="输入关于这个单词的笔记..."
                 ></textarea>
               </div>
               
               <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                 <button
                   type="button"
                   onClick={closeNoteModal}
                   className="px-4 py-2 border border-gray-300 rounded-md text-sm ripple-effect"
                 >
                   取消
                 </button>
                 <button
                   type="button"
                   onClick={handleSaveNote} 
                   className="px-4 py-2 bg-[#165DFF] text-white rounded-md text-sm ripple-effect"
                 >
                   保存笔记
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };
   
 export default WordMatchingGame;