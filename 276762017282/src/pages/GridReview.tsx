import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LocalStorageService } from "@/lib/localStorage";
import { MistakeWord, QuestionStatus } from '@/types';
import * as XLSX from 'xlsx';

// 定义九宫格阶段接口
interface GridStage {
  id: number;
  name: string;
  displayName: string;
  background: string;
  numberColor: string;
  count: number;
  position: [number, number]; // [row, col]
  icon?: string;
  hasBorder?: boolean;
}

// 定义单词接口
interface ReviewWord {
  id: string;
  word: string;
  definition: string;
  stage: number;
}

const GridReview: React.FC = () => {
  const navigate = useNavigate();
   const [currentWord, setCurrentWord] = useState<ReviewWord | null>(null);
   const [currentWordIndex, setCurrentWordIndex] = useState(0);
   const [gridStages, setGridStages] = useState<GridStage[]>([]);
   const [showWordList, setShowWordList] = useState(false);
   const [activeStage, setActiveStage] = useState<GridStage | null>(null);
  const [draggingWord, setDraggingWord] = useState<ReviewWord | null>(null);
  const [numberAnimation, setNumberAnimation] = useState<{id: number, change: number} | null>(null);
  const [wordList, setWordList] = useState<ReviewWord[]>([]);
  const [newMistakeIndex, setNewMistakeIndex] = useState(0);
  const [displayedNewMistakeIds, setDisplayedNewMistakeIds] = useState<string[]>([]);
  const [isFromPatchPlan, setIsFromPatchPlan] = useState(false);
  // 跟踪当前阶段已复习的单词ID
  const [reviewedWordIds, setReviewedWordIds] = useState<Record<number, string[]>>({});
  // 跟踪问题状态
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});
   
   // 初始化九宫格阶段数据
   useEffect(() => {
     const stages: GridStage[] = [
       { id: 1, name: 'new', displayName: '新错词', background: '#FFE0E6', numberColor: '#FF5252', count: 0, position: [0, 0] },
       { id: 2, name: 'review1', displayName: '复习1次', background: '#FFF3E0', numberColor: '#FF9800', count: 0, position: [0, 1] },
       { id: 3, name: 'review2', displayName: '复习2次', background: '#FFFDE7', numberColor: '#FFC107', count: 0, position: [0, 2] },
       { id: 4, name: 'review3', displayName: '复习3次', background: '#E8F5E9', numberColor: '#4CAF50', count: 0, position: [1, 0] },
       { id: 5, name: 'current', displayName: '当前复习', background: '#EDE7F6', numberColor: '#673AB7', count: 0, position: [1, 1], icon: 'fa-book', hasBorder: true },
       { id: 6, name: 'review4', displayName: '复习4次', background: '#E3F2FD', numberColor: '#2196F3', count: 0, position: [1, 2] },
       { id: 7, name: 'review5', displayName: '复习5次', background: '#E3F2FD', numberColor: '#1976D2', count: 0, position: [2, 0] },
       { id: 8, name: 'review6', displayName: '复习6次', background: '#EDE7F6', numberColor: '#7B1FA2', count: 0, position: [2, 1] },
       { id: 9, name: 'mastered', displayName: '已掌握', background: '#FCE4EC', numberColor: '#C2185B', count: 2, position: [2, 2] }
     ];
     
     setGridStages(stages);
     
     // 加载单词数据
     loadWordData();
     
     // 监听单词状态更新事件
     const handleWordStatusUpdate = (e: CustomEvent) => {
       const { wordId, reviewLevel } = e.detail;
       if (reviewLevel) {
         loadWordData(); // 重新加载单词数据
       }
     };
     
     // 监听补丁计划更新事件
     const handlePatchPlanUpdate = () => {
       loadWordData();
     };
     
     window.addEventListener('wordStatusUpdated', handleWordStatusUpdate);
     window.addEventListener('patchPlanUpdated', handlePatchPlanUpdate);
     
     return () => {
       window.removeEventListener('wordStatusUpdated', handleWordStatusUpdate);
       window.removeEventListener('patchPlanUpdated', handlePatchPlanUpdate);
     };
   }, []);
   
   // 从localStorage加载单词数据
  const loadWordData = () => {
    try {
      // 获取当前学生ID
      const studentId = LocalStorageService.getCurrentStudentId();
      // 重置新错词索引
      setNewMistakeIndex(0);
      if (!studentId) {
        console.error('No student ID found');
        toast.error('无法获取学生信息，请重新登录');
        navigate('/login');
        return;
      }
      
      // 优先加载补丁计划中的单词
      const patchPlanWords: MistakeWord[] = LocalStorageService.getPatchPlanWords();
      
      if (patchPlanWords.length > 0) {
        // 有补丁计划单词，使用这些单词
        const words: ReviewWord[] = patchPlanWords.map(word => ({
          id: word.id,
          word: word.word,
          definition: word.definitions?.[0] || '',
          stage: 1 // 补丁计划单词默认从新错词阶段开始
        }));
        
        setWordList(words);
        setIsFromPatchPlan(true);
        setCurrentWordIndex(0);
        if (words.length > 0) {
          setCurrentWord(words[0]);
        }
        
        // 更新新错词计数
        updateStageCounts(words);
      } else {
        // 没有补丁计划单词，加载普通错词
        const mistakeWords: MistakeWord[] = LocalStorageService.getMistakeWords();
        const words: ReviewWord[] = mistakeWords.map(word => ({
          id: word.id,
          word: word.word,
          definition: word.definitions?.[0] || '',
          stage: word.reviewLevel || 1
        }));
        
        setWordList(words);
        setIsFromPatchPlan(false);
        
  // 设置当前复习单词 - 优先从新错词开始
  const currentWords = words.filter(word => word.stage === 1); // 先从新错词开始
        if (currentWords.length > 0) {
          setCurrentWord(currentWords[0]);
        } else if (words.length > 0) {
          setCurrentWord(words[0]);
        }
        
        // 更新各阶段单词数量
        updateStageCounts(words);
      }
    } catch (error) {
      console.error('Failed to load word data:', error);
      toast.error('加载单词数据失败，请重试');
    }
  };
  
  // 更新各阶段单词数量
  const updateStageCounts = (words: ReviewWord[]) => {
    setGridStages(prev => prev.map(stage => {
      if (stage.id === 5) {
        // 当前复习阶段特殊处理
        return { ...stage, count: words.filter(word => word.stage === 5).length };
      }
      return { 
        ...stage, 
        count: words.filter(word => word.stage === stage.id).length 
      };
    }));
  };
  
  // 处理"认识"按钮点击
  const handleKnow = () => {
    if (!currentWord) return;
    
    // 更新单词阶段
    const newStage = Math.min(currentWord.stage + 1, 9);
    const updatedWords = wordList.map(word => 
      word.id === currentWord.id ? { ...word, stage: newStage } : word
    );
    
    setWordList(updatedWords);
    updateStageCounts(updatedWords);
    
    // 显示数字变化动画
    setNumberAnimation({ id: currentWord.stage, change: -1 });
    setTimeout(() => {
      setNumberAnimation({ id: newStage, change: 1 });
    }, 300);
    
        // 更新当前单词 - 补丁计划模式下按顺序显示，新错词模式下依次显示所有新错词一遍
        const newMistakes = updatedWords.filter(word => word.stage === 1);
        
        // 新错词依次显示逻辑：从第一个开始依次显示所有新错词一遍
        let nextWord = null;
        
        // 获取当前单词的阶段
        const currentStage = currentWord.stage;
        
        // 更新当前阶段已复习的单词ID记录
        const updatedReviewedIds = {
          ...reviewedWordIds,
          [currentStage]: [...(reviewedWordIds[currentStage] || []), currentWord.id]
        };
        setReviewedWordIds(updatedReviewedIds);
        
        // 获取当前阶段的所有单词
        const currentStageWords = updatedWords.filter(word => word.stage === currentStage);
        // 获取当前阶段未复习的单词
        const unReviewedWords = currentStageWords.filter(
          word => !updatedReviewedIds[currentStage]?.includes(word.id)
        );
        
        if (unReviewedWords.length > 0) {
          // 当前阶段还有未复习的单词，继续显示当前阶段的下一个单词
          nextWord = unReviewedWords[0];
        } else {
          // 当前阶段所有单词已复习完成，进入下一阶段
          const nextStage = Math.min(currentStage + 1, 9);
          const nextStageWords = updatedWords.filter(word => word.stage === nextStage);
          
          if (nextStageWords.length > 0) {
            // 下一阶段有单词，显示下一阶段的第一个单词
            nextWord = nextStageWords[0];
          } else if (currentStage < 9) {
            // 下一阶段没有单词但未达到最后阶段，继续查找更高阶段
            for (let s = currentStage + 1; s <= 9; s++) {
              const stageWords = updatedWords.filter(word => word.stage === s);
              if (stageWords.length > 0) {
                nextWord = stageWords[0];
                break;
              }
            }
          }
          
          // 如果找到下一阶段单词，重置该阶段的复习记录
          if (nextWord) {
            setReviewedWordIds({
              ...updatedReviewedIds,
              [nextWord.stage]: []
            });
          }
        }
        
        // 如果没有找到下一阶段单词，默认显示第一个单词
        if (!nextWord && updatedWords.length > 0) {
          nextWord = updatedWords[0];
        }
    setCurrentWord(nextWord || updatedWords.find(word => word.stage >= currentWord.stage) || updatedWords[0]);
    
    // 保存到localStorage
    saveWordData(updatedWords);
  };
  
  // 处理"不认识"按钮点击
  const handleNotKnow = () => {
    if (!currentWord) return;
    
    // 更新单词阶段为新错词
    const updatedWords = wordList.map(word => 
      word.id === currentWord.id ? { ...word, stage: 1 } : word
    );
    
    setWordList(updatedWords);
    updateStageCounts(updatedWords);
    
    // 显示数字变化动画
    setNumberAnimation({ id: currentWord.stage, change: -1 });
    setTimeout(() => {
      setNumberAnimation({ id: 1, change: 1 });
    }, 300);
    
  // 更新当前单词
  // 获取当前单词的阶段
  const currentStage = currentWord.stage;
  
  // 更新当前阶段已复习的单词ID记录
  const updatedReviewedIds = {
    ...reviewedWordIds,
    [currentStage]: [...(reviewedWordIds[currentStage] || []), currentWord.id]
  };
  setReviewedWordIds(updatedReviewedIds);
  
  // 获取当前阶段的所有单词
  const currentStageWords = updatedWords.filter(word => word.stage === currentStage);
  // 获取当前阶段未复习的单词
  const unReviewedWords = currentStageWords.filter(
    word => !updatedReviewedIds[currentStage]?.includes(word.id)
  );
  
  let nextWord = null;
  
  if (unReviewedWords.length > 0) {
    // 当前阶段还有未复习的单词，继续显示当前阶段的下一个单词
    nextWord = unReviewedWords[0];
  } else {
    // 当前阶段所有单词已复习完成，进入下一阶段
    const nextStage = Math.min(currentStage + 1, 9);
    const nextStageWords = updatedWords.filter(word => word.stage === nextStage);
    
    if (nextStageWords.length > 0) {
      // 下一阶段有单词，显示下一阶段的第一个单词
      nextWord = nextStageWords[0];
    } else if (currentStage < 9) {
      // 下一阶段没有单词但未达到最后阶段，继续查找更高阶段
      for (let s = currentStage + 1; s <= 9; s++) {
        const stageWords = updatedWords.filter(word => word.stage === s);
        if (stageWords.length > 0) {
          nextWord = stageWords[0];
          break;
        }
      }
    }
    
    // 如果找到下一阶段单词，重置该阶段的复习记录
    if (nextWord) {
      setReviewedWordIds({
        ...updatedReviewedIds,
        [nextWord.stage]: []
      });
    }
  }
    setCurrentWord(nextWord || updatedWords[0]);
    
    // 保存到localStorage
    saveWordData(updatedWords);
  };
  
  // 保存单词数据到localStorage
  const saveWordData = (words: ReviewWord[]) => {
    try {
      const mistakeWords: MistakeWord[] = LocalStorageService.getMistakeWords();
      const updatedMistakeWords = mistakeWords.map(word => {
        const reviewWord = words.find(w => w.id === word.id);
        return reviewWord ? { ...word, reviewLevel: reviewWord.stage } : word;
      });
      
      LocalStorageService.saveMistakeWords(updatedMistakeWords);
    } catch (error) {
      console.error('Failed to save word data:', error);
    }
  };
  
  // 处理阶段格子点击
  const handleStageClick = (stage: GridStage) => {
    setActiveStage(stage);
    setShowWordList(true);
  };
  
  // 处理拖拽开始
  const handleDragStart = (word: ReviewWord, e: React.DragEvent) => {
    setDraggingWord(word);
    if (e.dataTransfer.setDragImage) {
      // 创建拖拽预览元素
      const dragPreview = document.createElement('div');
      dragPreview.textContent = word.word;
      dragPreview.style.position = 'absolute';
      dragPreview.style.left = '-1000px';
      dragPreview.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      dragPreview.style.padding = '4px 8px';
      dragPreview.style.borderRadius = '4px';
      dragPreview.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      document.body.appendChild(dragPreview);
      e.dataTransfer.setDragImage(dragPreview, 20, 20);
      setTimeout(() => document.body.removeChild(dragPreview), 0);
    }
  };
  
  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggingWord(null);
  };
  
  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // 处理放置
  const handleDrop = (stage: GridStage) => {
    if (!draggingWord || draggingWord.stage === stage.id) return;
    
    // 更新单词阶段
    const updatedWords = wordList.map(word => 
      word.id === draggingWord.id ? { ...word, stage: stage.id } : word
    );
    
    setWordList(updatedWords);
    updateStageCounts(updatedWords);
    
    // 显示数字变化动画
    setNumberAnimation({ id: draggingWord.stage, change: -1 });
    setTimeout(() => {
      setNumberAnimation({ id: stage.id, change: 1 });
    }, 300);
    
    // 保存到localStorage
    saveWordData(updatedWords);
  };
  
 // 获取阶段连接线的样式
  const getConnectorStyle = (from: [number, number], to: [number, number]) => {
    const startX = from[1] * 115 + 50;
    const startY = from[0] * 115 + 50;
    const endX = to[1] * 115 + 50;
    const endY = to[0] * 115 + 50;
    
    return {
      position: 'absolute',
      left: `${Math.min(startX, endX)}px`,
      top: `${Math.min(startY, endY)}px`,
      width: `${Math.abs(endX - startX)}px`,
      height: `${Math.abs(endY - startY)}px`,
      borderTop: from[1] < to[1] ? '1px dashed #ccc' : 'none',
      borderLeft: from[0] < to[0] ? '1px dashed #ccc' : 'none',
      zIndex: 1
    };
  };
  
  // 生成复习报告并下载
  const generateReviewReport = () => {
    try {
      // 获取学生信息
      const student = LocalStorageService.getCurrentUser();
      const studentName = student?.name || '默认学生';
      
      // 获取统计数据
      const stats = calculateStats();
      
      // 计算统计数据的辅助函数
      function calculateStats() {
        return {
          total: wordList.length,
          mastered: wordList.filter(word => reviewedWordIds[word.stage]?.includes(word.id)).length,
          error: wordList.filter(word => word.stage === 1).length
        };
      }
      

      // 创建报告数据
      const reportData = [
        ['单词复习报告', '', '', '', '', ''],
        ['学生姓名:', studentName, '', '', '', ''],
        ['复习日期:', new Date().toLocaleDateString(), '', '', '', ''],
        ['总单词数:', stats.total, '', '掌握单词数:', stats.mastered, ''],
        ['错误单词数:', stats.error, '', '复习完成率:', `${Math.round((stats.mastered / stats.total) * 100)}%`, ''],
        ['', '', '', '', '', ''],
        ['单词', '音标', '释义', '复习阶段', '错误次数', '状态'],
      ];
      
      // 添加单词详细数据
      wordList.forEach(word => {
        const status = questionStatuses[word.id];
        const stage = gridStages.find(s => s.id === word.stage);
        const stageName = stage?.displayName || '未分类';
        const statusText = status === 'correct' ? '正确' : status === 'incorrect' ? '错误' : '未复习';
        
        reportData.push([
          word.word,
          word.phonetic || '',
          word.definition || '',
          stageName,
          word.errorCount?.toString() || '0',
          statusText
        ]);
      });
      
      // 创建工作表和工作簿
      const worksheet = XLSX.utils.aoa_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '复习报告');
      
      // 保存文件并下载
      XLSX.writeFile(workbook, `单词复习报告_${studentName}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
      
      toast.success('复习报告已成功下载');
    } catch (error) {
      console.error('生成复习报告失败:', error);
      toast.error('生成复习报告失败，请重试');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* 顶部单词展示区域 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 text-center">
          {currentWord ? (
            <>
               <h2 className="text-3xl font-bold text-purple-600 mb-2">{currentWord.word}</h2>
               <p className="text-lg text-gray-500 italic mb-2">{currentWord.phonetic || ''}</p>
               <p className="text-gray-600 mb-6">{currentWord.definition}</p>
               <div className="flex justify-center gap-6">
                 <button 
                   onClick={handleKnow}
                   className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 ripple-effect transition-all duration-200 transform hover:scale-105"
                 >
                   <i className="fa-solid fa-check"></i>
                   <span>认识</span>
                 </button>
                 <button 
                   onClick={handleNotKnow}
                   className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 ripple-effect transition-all duration-200 transform hover:scale-105"
                 >
                   <i className="fa-solid fa-times"></i>
                   <span>不认识</span>
                 </button>
               </div>
            </>
          ) : (
            <div className="py-8">
              <i className="fa-solid fa-book-open text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">没有可复习的单词</p>
               <div className="flex justify-center gap-3 mt-4">
                 <button 
                   onClick={() => navigate('/anti-forgetting-review')}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                 >
                   抗遗忘复习
                 </button>
                 <button 
                   onClick={() => navigate('/word-library')}
                   className="px-4 py-2 bg-gray-600 hover:text-gray-700 text-white rounded-md text-sm"
                 >
                   去添加单词
                 </button>
               </div>
             </div>
          )}
        </div>
        
        {/* B九宫格复习区域 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">复习进度</h3>
          
          {/* 九宫格容器 - 相对定位用于连接线 */}
          <div className="relative max-w-md mx-auto">
            {/* 连接线 */}
            <div style={getConnectorStyle([0, 0], [0, 1])}></div>
            <div style={getConnectorStyle([0, 1], [0, 2])}></div>
            <div style={getConnectorStyle([0, 2], [1, 2])}></div>
            <div style={getConnectorStyle([1, 2], [2, 2])}></div>
            <div style={getConnectorStyle([2, 2], [2, 1])}></div>
            <div style={getConnectorStyle([2, 1], [2, 0])}></div>
            <div style={getConnectorStyle([2, 0], [1, 0])}></div>
            <div style={getConnectorStyle([1, 0], [1, 1])}></div>
            
            {/* 九宫格网格 */}
            <div className="grid grid-cols-3 gap-15 relative z-20">
              {gridStages.map(stage => (
                <div 
                  key={stage.id}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 shadow-sm ${
                    stage.hasBorder ? 'border-2 border-white' : ''
                  }`}
                  style={{ 
                    backgroundColor: stage.background,
                    transform: draggingWord ? 'scale(1.05)' : 'scale(1)'
                  }}
                  onClick={() => handleStageClick(stage)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage)}
                >
                  <div className="relative">
                     <span 
                      className="text-xl sm:text-2xl font-bold"
                      style={{ 
                        color: stage.numberColor,
                        transition: 'all 0.3s ease',
                        transform: numberAnimation?.id === stage.id 
                          ? numberAnimation.change > 0 
                            ? 'translateY(-10px)' 
                            : 'translateY(10px)' 
                          : 'translateY(0)'
                      }}
                    >
                      {stage.count}
                    </span>
                    {numberAnimation?.id === stage.id && (
                      <span 
                        className="absolute top-0 left-full ml-1 text-sm font-bold"
                        style={{ 
                          color: numberAnimation.change > 0 ? 'green' : 'red'
                        }}
                      >
                        {numberAnimation.change > 0 ? '+' : ''}{numberAnimation.change}
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-700 mt-1">
                    {stage.displayName}
                  </span>
                  {stage.icon && (
                    <i className={`fa-solid ${stage.icon} text-white mt-1`}></i>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 流转路径说明 */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-2">流转路径：新错词 → 复习1次 → 复习2次 → 复习3次 → 当前复习 → 复习4次 → 复习5次 → 复习6次 → 已掌握</p>
          <p>根据艾宾浩斯遗忘曲线设计，科学安排复习间隔，提高记忆效率</p>
        </div>
      </div>
      
      {/* 单词列表弹窗 */}
      {showWordList && activeStage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">{activeStage.displayName}</h3>
              <button 
                onClick={() => setShowWordList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="p-4">
              {wordList.filter(word => word.stage === activeStage.id).length > 0 ? (
                <ul className="space-y-3">
                  {wordList
                    .filter(word => word.stage === activeStage.id)
                    .map(word => (
                      <li 
                        key={word.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        draggable
                        onDragStart={(e) => handleDragStart(word, e)}
                        onDragEnd={handleDragEnd}
                      >
                        <div>
                          <div className="font-medium">{word.word}</div>
                          <div className="text-sm text-gray-600">{word.definition}</div>
                        </div>
                        <i className="fa-solid fa-grip-vertical text-gray-400 cursor-move"></i>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="fa-solid fa-inbox text-3xl mb-2"></i>
                  <p>该阶段暂无单词</p>
                </div>
              )}
              
              {/* 下载复习报告按钮 */}
              <div className="mt-6 text-center">
                <button
                  onClick={generateReviewReport}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium ripple-effect transition-all duration-200 flex items-center justify-center mx-auto"
                >
                  <i className="fa-solid fa-download mr-2"></i>下载复习报告
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GridReview;