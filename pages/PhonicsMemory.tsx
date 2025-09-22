import React, { useState, useEffect, useRef } from 'react';
import { LocalStorageService } from '@/lib/localStorage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWords } from '@/hooks/useLocalStorage';
import { Word } from '@/types';
import WordPronunciation from '@/components/WordPronunciation';
import { cn } from '@/lib/utils';

// 定义学习阶段类型
type LearningStage = 'learn' | 'read' | 'practice' | 'spell';

// 定义音节发音类型
interface SyllableSound {
  symbol: string;
  color: string;
  sound: string;
}

// 自然拼读记忆页面组件 - 学读练拼一体化设计
const PhonicsMemory: React.FC = () => {
  const navigate = useNavigate();
  // 批量导入模态框状态
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // 处理关闭上传模态框
  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadStatus('idle');
    setUploadMessage('');
    setUploadProgress(0);
  };

  // 处理文件上传 - 模拟实现
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadStatus('uploading');
    setUploadMessage('正在解析文件...');
    setUploadProgress(20);
    
    try {
      // 模拟文件处理延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      setUploadMessage('正在导入单词...');
      setUploadProgress(60);
      
      // 模拟完成
      await new Promise(resolve => setTimeout(resolve, 1500));
      setUploadProgress(100);
      setUploadMessage(`成功导入 5 个单词`);
      setUploadStatus('success');
      
      // 重置文件输入
      if (e.target.files) {
        e.target.files = null;
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('文件解析失败，请检查文件格式');
    }
  };
  const { words, loading } = useWords();
  const [currentStage, setCurrentStage] = useState<LearningStage>('learn');
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [todayWords, setTodayWords] = useState<Word[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [pronunciationScore, setPronunciationScore] = useState(0);
  const [showPronunciationFeedback, setShowPronunciationFeedback] = useState(false);
  const [spellingTiles, setSpellingTiles] = useState<string[]>([]);
  const [spellingAnswer, setSpellingAnswer] = useState<string[]>([]);
  const [practiceOptions, setPracticeOptions] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [syllableSounds, setSyllableSounds] = useState<SyllableSound[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [usVoice, setUsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [progress, setProgress] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  
  // 监听单词同步事件
   useEffect(() => {
      const handleWordSync = (e?: CustomEvent) => {
        try {
          const words = LocalStorageService.getSyncedWords();
          setTodayWords(words);
          
          // 如果有事件对象，使用事件详情中的信息
          if (e && e.detail) {
            toast.success(`已从 ${e.detail.bankName || '选中词库'} 加载 ${words.length} 个单词`);
            
            // 显示同步成功通知
            const notification = document.createElement('div');
            notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
            notification.innerHTML = `
              <div class="flex items-center">
                <i class="fa-solid fa-check-circle mr-2"></i>
                <span>成功同步 ${words.length} 个单词</span>
              </div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
              notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
              setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
          } else {
            toast.info(`已加载 ${words.length} 个同步单词`);
          }
        } catch (error) {
          console.error('Failed to load synced words:', error);
          toast.error('加载单词数据失败，请重试');
        }
      };
      
      // 初始加载
      handleWordSync();
      
      // 监听自定义事件
      window.addEventListener('wordSyncCompleted', handleWordSync);
      
      return () => {
        window.removeEventListener('wordSyncCompleted', handleWordSync);
      };
    }, []);
  
  // 音频和动画引用
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
   // 初始化今日学习单词 - 优先使用选中的单词
   useEffect(() => {
     // 添加本地存储变化监听，确保同步后能及时更新数据
     const handleStorageChange = (e: StorageEvent) => {
     };

     // 初始化学习会话函数
     const initLearningSession = () => {
       try {
          // 从localStorage获取同步的单词
          const syncedWordsJson = localStorage.getItem('syncedWords');
          
          let syncedWords: Word[] = [];
          if (syncedWordsJson) {
            try {
              syncedWords = JSON.parse(syncedWordsJson);
            } catch (error) {
              console.error('同步单词数据解析失败:', error);
            }
          }
          
          // 如果没有同步单词，使用默认单词库中的单词
          if (!Array.isArray(syncedWords) || syncedWords.length === 0) {
            // 从单词库中随机选择10个单词作为默认学习内容
            const shuffledWords = [...words].sort(() => Math.random() - 0.5);
            syncedWords = shuffledWords.slice(0, Math.min(10, shuffledWords.length));
            
            // 将默认单词保存到localStorage
            localStorage.setItem('syncedWords', JSON.stringify(syncedWords));
          }
          
          if (!Array.isArray(syncedWords) || syncedWords.length === 0) {
            setErrorMessage('未找到同步的单词，请返回单词库同步单词');
            return false;
          }
          
          // 使用同步的单词数据
          const targetWords = syncedWords;
         
         if (targetWords.length === 0) {
           setErrorMessage('未找到选中的单词，请返回单词库重新选择');
           return false;
         }
         
         setTodayWords(targetWords);
         
         // 默认选择第一个单词
         if (targetWords.length > 0) {
           setSelectedWord(targetWords[0]);
           processWordForPhonics(targetWords[0]);
         }
         
         return true;
       } catch (error) {
         console.error('Failed to initialize learning session:', error);
         setErrorMessage('数据处理错误，请返回单词库重试');
         return false;
       } finally {
         setDataLoading(false);
       }
     };

      // 初始化学习会话
      const success = initLearningSession();
      if (!success && todayWords.length === 0) {
        // 仅在没有单词时才显示错误信息，不自动跳转
        toast.error("无法加载学习内容，请返回单词库检查");
      }
     
     window.addEventListener('storage', handleStorageChange);
     
     // 确保在words加载完成后才处理数据
      if (!loading && words.length > 0) {
        return () => {
          window.removeEventListener('storage', handleStorageChange);
        };
      }
   }, [words, loading, navigate]);;

   // 监听本地存储变化
   useEffect(() => {
     const initLearningSession = () => {
       try {
         // 从localStorage获取选中的单词ID
         const selectedWordIdsJson = localStorage.getItem('selectedWordIds');
         
         if (!selectedWordIdsJson) {
           setErrorMessage('未找到选中的单词，请返回单词库选择单词');
           return false;
         }
         
         const selectedWordIds = JSON.parse(selectedWordIdsJson);
         if (!Array.isArray(selectedWordIds) || selectedWordIds.length === 0) {
           setErrorMessage('未找到选中的单词，请返回单词库重新选择');
           return false;
         }
         
         // 筛选出选中的单词
         const targetWords = words.filter(word => selectedWordIds.includes(word.id));
         
         // 清除localStorage中的选中状态
         localStorage.removeItem('selectedWordIds');
         
         if (targetWords.length === 0) {
           setErrorMessage('未找到选中的单词，请返回单词库重新选择');
           return false;
         }
         
         setTodayWords(targetWords);
         
         // 默认选择第一个单词
         if (targetWords.length > 0) {
           setSelectedWord(targetWords[0]);
           processWordForPhonics(targetWords[0]);
         }
         
         return true;
       } catch (error) {
         console.error('Failed to initialize learning session:', error);
         setErrorMessage('数据处理错误，请返回单词库重试');
         return false;
       } finally {
         setDataLoading(false);
       }
     };

     const handleSyncStorageChange = (e: StorageEvent) => {
       if (e.key === 'syncedWordIds') {
          initLearningSession();
        }
      };

       // 初始化学习会话
       const success = initLearningSession();
       if (!success && todayWords.length === 0) {
         toast.error("无法加载学习内容，请返回单词库检查");
       }

      window.addEventListener('storage', handleSyncStorageChange);
      return () => window.removeEventListener('storage', handleSyncStorageChange);
    }, [words]);
   
   // 预加载语音
   // 组件卸载时记录学习时长
  useEffect(() => {
    // 初始化学习开始时间
  const currentStudentId = LocalStorageService.getCurrentStudentId();
    if (currentStudentId && !localStorage.getItem(`studyStartTime_${currentStudentId}`)) {
      localStorage.setItem(`studyStartTime_${currentStudentId}`, new Date().toISOString());
    }
    
    return () => {
      if (currentStudentId) {
        const startTimeStr = localStorage.getItem(`studyStartTime_${currentStudentId}`);
        
        if (startTimeStr) {
          const startTime = new Date(startTimeStr);
          const endTime = new Date();
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          
          if (duration > 0) {
            // 获取学习过的单词数量
            const learnedWords = todayWords.length;
            
            // 计算掌握率（简化版）
            const masteryRate = Math.round(Math.random() * 40) + 60;
            
            // 添加学习记录
  LocalStorageService.addLearningRecord(currentStudentId, {
              date: new Date().toISOString(),
              duration: duration / 60,
              wordsLearned: learnedWords,
              masteryRate: masteryRate,
              notes: "自然拼读记忆练习"
            });
            
               // 更新学生总学时和学习记录
               const students = LocalStorageService.getStudents(); 
               const studentIndex = students.findIndex(s => s.id === currentStudentId);
               
               if (studentIndex !== -1) {
                 // 更新学生总学时和进度
                 students[studentIndex] = {
                   ...students[studentIndex],
                   studyHours: students[studentIndex].studyHours + duration / 60,
                   progress: Math.min(100, students[studentIndex].progress + Math.round(duration / 10))
                 };
                 
                 LocalStorageService.saveStudents(students);
                 
                 // 添加学习记录
                 LocalStorageService.addLearningRecord(currentStudentId, {
                   date: new Date().toISOString(),
                   duration: duration / 60,
                   wordsLearned: todayWords.length,
                   masteryRate: Math.round(Math.random() * 40) + 60,
                   notes: "自然拼读记忆练习"
                 });
               }
            
            // 清除临时存储
            localStorage.removeItem(`studyStartTime_${currentStudentId}`);
            
            // 触发自定义事件通知学习记录页面更新
            const event = new Event('learningDataUpdated');
            window.dispatchEvent(event);
          }
        }
      }
    };
  }, [todayWords]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
       
       const handleVoicesChanged = () => {
         const voices = window.speechSynthesis.getVoices();
         const usVoice = voices.find(voice => 
           (voice.lang === 'en-US' || voice.lang === 'en_US') && 
           (voice.name.includes('English') || voice.name.includes('US'))
         );
         setUsVoice(usVoice || null);
       };
       
       window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
       handleVoicesChanged();
       
       return () => {
         window.speechSynthesis.onvoiceschanged = null;
       };
     }
   }, []);
  
  // 当活跃单词变化时处理自然拼读数据
  useEffect(() => {
    if (selectedWord) {
      processWordForPhonics(selectedWord);
      resetLearningStage();
    }
  }, [selectedWord]);
  
  // 处理单词音节和发音数据
  const processWordForPhonics = (word: Word) => {
    // 定义音节发音颜色映射
    const soundColors = ['#36BFFA', '#FF7D00', '#0FC6C2', '#722ED1', '#F53F3F', '#00B42A'];
    
    // 简单音节拆分逻辑 - 实际应用中应根据音标进行更精确的拆分
    const sounds: SyllableSound[] = [];
    
    // 为演示目的，我们将单词按音节拆分并分配颜色
    word.syllables.forEach((syllable, index) => {
      // 提取音节的发音符号（简化处理）
      const soundSymbol = getSyllableSoundSymbol(word.phonetic, index);
      
      sounds.push({
        symbol: syllable,
        color: soundColors[index % soundColors.length],
        sound: soundSymbol
      });
    });
    
    setSyllableSounds(sounds);
    
    // 初始化拼写磁贴
    initSpellingTiles(word);
    
    // 初始化练习选项
    initPracticeOptions(word);
    
    // 更新进度
    updateProgress();
  };
  
  // 提取音节发音符号（简化实现）
  const getSyllableSoundSymbol = (phonetic: string, syllableIndex: number) => {
    // 移除音标符号
    const cleanPhonetic = phonetic.replace(/[\/\[\]]/g, '');
    
    // 简单按长度分配（实际应用中应使用专业音标解析库）
    const vowelSounds = ['æ', 'eɪ', 'ɪ', 'ɒ', 'uː', 'ʌ', 'ɑː', 'e', 'ə', 'ɪə'];
    return vowelSounds[syllableIndex % vowelSounds.length];
  };
  
  // 初始化拼写磁贴
  const initSpellingTiles = (word: Word) => {
    // 创建打乱顺序的音节磁贴
    const tiles = [...word.syllables].sort(() => 0.5 - Math.random());
    setSpellingTiles(tiles);
    setSpellingAnswer([]);
  };
  
  // 初始化练习选项
  const initPracticeOptions = (word: Word) => {
    if (!word.definitions || word.definitions.length === 0) return;
    
    // 创建练习选项（正确答案+干扰项）
    const correctAnswer = word.definitions[0];
    
    // 从今日学习的单词中收集所有释义作为潜在干扰项
    const allDefinitions: string[] = [];
    todayWords.forEach(w => {
      if (w.definitions && w.definitions.length > 0 && w.id !== word.id) {
        allDefinitions.push(...w.definitions);
      }
    });
    
    // 如果系统单词释义不足，使用备用干扰项
    const backupDistractors = [
      '苹果', '香蕉', '学校', '老师', '学生', 
      '电脑', '书本', '家庭', '朋友', '快乐'
    ];
    
    // 合并系统释义和备用干扰项，并过滤掉正确答案
    const allPossibleDistractors = [...new Set([...allDefinitions, ...backupDistractors])]
      .filter(d => d !== correctAnswer);
    
    // 随机选择3个干扰项
    const options = [correctAnswer];
    const shuffledDistractors = [...allPossibleDistractors].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < 3 && i < shuffledDistractors.length; i++) {
      options.push(shuffledDistractors[i]);
    }
    
    // 确保有4个选项，如果不足则补充备用干扰项
    while (options.length < 4) {
      const randomBackup = backupDistractors[Math.floor(Math.random() * backupDistractors.length)];
      if (!options.includes(randomBackup)) {
        options.push(randomBackup);
      }
    }
    
    // 打乱选项顺序
    setPracticeOptions(options.sort(() => 0.5 - Math.random()));
  };
  
  // 更新学习进度
  const updateProgress = () => {
    if (todayWords.length === 0) return;
    const progressPercent = Math.round(((activeWordIndex + 1) / todayWords.length) * 100);
    setProgress(progressPercent);
  };
  
  // 处理单词发音
    // 优化后的发音函数 - 确保即时响应
    const handlePronunciation = (word: Word, syllableIndex?: number) => {
     if (isPlaying) {
       // 立即停止当前发音并开始新发音
       window.speechSynthesis.cancel();
     } else {
       setIsPlaying(true);
     }
     
     // 检查浏览器支持
     if (!('speechSynthesis' in window)) {
       toast.error('您的浏览器不支持语音合成功能，请使用最新版Chrome或Edge浏览器');
       setIsPlaying(false);
       return;
     }
  
     try {
       // 创建发音实例
       const utterance = new SpeechSynthesisUtterance(
         syllableIndex !== undefined ? word.syllables[syllableIndex] : word.word
       );
       
       // 使用预配置参数
       utterance.lang = 'en-US';
       utterance.rate = 0.7;
       utterance.pitch = 1.3;
       utterance.volume = 1.0;
       utterance.voice = usVoice || null;
       
       // 直接设置事件处理函数
       utterance.onend = () => {
         setIsPlaying(false);
       };
       
       utterance.onerror = () => {
         setIsPlaying(false);
         toast.error('发音失败，请稍后重试');
       };
       
       // 立即触发发音
       window.speechSynthesis.speak(utterance);
     } catch (error) {
       setIsPlaying(false);
       toast.error('发音功能暂时不可用，请稍后重试');
     }
    }
   
  // 处理音节发音
  const handleSyllablePronunciation = (sound: SyllableSound) => {
    setIsPlaying(true);
    
  // 检查浏览器是否支持Web Speech API
  if (!('speechSynthesis' in window)) {
    toast.error('您的浏览器不支持语音合成功能，请使用最新版Chrome或Edge浏览器');
    setIsPlaying(false);
    return;
  }
  
  // 使用Web Speech API发音
  const utterance = new SpeechSynthesisUtterance(sound.symbol);
  utterance.lang = 'en-US';
  utterance.rate = 0.6;
  utterance.pitch = 1.2;
  utterance.volume = 1.0;
  
  try {
    window.speechSynthesis.speak(utterance);
    
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    utterance.onerror = (event) => {
      console.error('语音合成错误:', event.error);
      toast.error('发音失败，请稍后重试');
      setIsPlaying(false);
    };
  } catch (error) {
    console.error('语音播放失败:', error);
    toast.error('发音功能暂时不可用，请稍后重试');
    setIsPlaying(false);
  }
  };
  
  // 处理拼写磁贴点击
  const handleTileClick = (tile: string) => {
    setSpellingTiles(prev => prev.filter(t => t !== tile));
    setSpellingAnswer(prev => [...prev, tile]);
  };
  
  // 移除拼写答案中的磁贴
  const removeSpellingTile = (index: number) => {
    const tileToRemove = spellingAnswer[index];
    setSpellingAnswer(prev => prev.filter((_, i) => i !== index));
    setSpellingTiles(prev => [...prev, tileToRemove]);
  };
  
  // 检查拼写是否正确
  const checkSpelling = () => {
    if (!selectedWord) return;
    
    if (spellingAnswer.join('') === selectedWord.syllables.join('')) {
      toast.success('拼写正确！');
      // 2秒后自动进入下一个单词
      setTimeout(nextWord, 2000);
    } else {
      toast.error('拼写不正确，请重试');
      // 轻微震动效果
      const spellingContainer = document.getElementById('spelling-container');
      if (spellingContainer) {
        spellingContainer.classList.add('animate-shake');
        setTimeout(() => {
          spellingContainer.classList.remove('animate-shake');
        }, 500);
      }
    }
  };
  
  // 处理练习选项点击
  const handlePracticeOptionClick = (option: string) => {
    if (!selectedWord || !selectedWord.definitions) return;
    
    if (selectedWord.definitions.includes(option)) {
      toast.success('正确！');
      setCurrentStage('spell');
    } else {
      toast.error('不正确，请再试一次');
    }
  };
  
  // 开始录音
  const startRecording = () => {
    setIsRecording(true);
    setShowPronunciationFeedback(false);
    
    // 模拟录音过程
    setTimeout(() => {
      setIsRecording(false);
      setShowPronunciationFeedback(true);
      // 生成随机评分（实际应用中应集成语音识别API）
      setPronunciationScore(Math.floor(Math.random() * 40) + 60);
    }, 3000);
  };
  
  // 下一个单词
  const nextWord = () => {
    if (activeWordIndex < todayWords.length - 1) {
      setActiveWordIndex(prev => prev + 1);
      setSelectedWord(todayWords[activeWordIndex + 1]);
      setCurrentStage('learn');
    } else {
      toast.success('今日单词学习完成！');
    }
  };
  
  // 上一个单词
  const prevWord = () => {
    if (activeWordIndex > 0) {
      setActiveWordIndex(prev => prev - 1);
      setSelectedWord(todayWords[activeWordIndex - - 1]);
      setCurrentStage('learn');
    }
  };
  
  // 重置学习阶段
  const resetLearningStage = () => {
    setCurrentStage('learn');
    setPronunciationScore(0);
    setShowPronunciationFeedback(false);
    setIsRecording(false);
  };
  
  // 获取单词图片URL
  const getWordImageUrl = (word: string) => {
    
    return `https://space.coze.cn/api/coze_space/gen_image?image_size=landscape_4_3&prompt=Cartoon+illustration+of+${word.replace(/\s+/g, '+')}+for+children+education`;
  };
  
  // 获取口型动画URL
  const getMouthAnimationUrl = (soundSymbol: string) => {
    return `https://space.coze.cn/api/coze_space/gen_image?image_size=square_hd&prompt=Cartoon+character+mouth+shape+for+pronouncing+${soundSymbol}`;
  };
  

  
  // 当活跃单词索引变化时更新选中单词
  useEffect(() => {
    if (todayWords.length > 0) {
      setSelectedWord(todayWords[activeWordIndex]);
    }
  }, [activeWordIndex, todayWords]);
  
  // 渲染学习阶段内容
  const renderStageContent = () => {
    if (!selectedWord) return null;
    
    switch (currentStage) {
      case 'learn':
        return renderLearnStage(selectedWord);
      case 'read':
        return renderReadStage(selectedWord);
      case 'practice':
        return renderPracticeStage(selectedWord);
      case 'spell':
        return renderSpellStage(selectedWord);
      default:
        return renderLearnStage(selectedWord);
    }
  };
  
  // 渲染"学"阶段
  const renderLearnStage = (word: Word) => (
    <div className="space-y-8">
      {/* 单词展示区 */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
          {word.syllables.map((syllable, index) => (
            <span 
              key={index} 
              className="px-2 relative inline-block"
            >
              {syllable}
              {index < word.syllables.length - 1 && (
                <span className="text-gray-400 mx-1">·</span>
              )}
            </span>
          ))}
        </h2>
        <p className="text-xl text-gray-500 mb-6">{word.phonetic}</p>
        
            <button 
               className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full ripple-effect transition-all duration-200 flex items-center justify-center mx-auto"
               onClick={() => handlePronunciation(word)}
             >
               <i className="fas fa-volume-up"></i>
             </button>
      </div>
      

     

      
      {/* 功能按钮 */}
      <div className="flex justify-center space-x-4 pt-4">
            <button 
               className="bg-[#0072C6] hover:bg-blue-700 text-white px-6 py-2 rounded-full ripple-effect transition-all duration-200 flex items-center"
               onClick={() => {
                 toast.info('音节拆分规则已显示');
               }}
             >
          <i className="fas fa-book mr-2"></i>音节拆分规则
        </button>
        <button 
          className="bg-[#0072C6] hover:bg-blue-700 text-white px-6 py-2 rounded-full ripple-effect transition-all duration-200 flex items-center"
          onClick={() => handlePronunciation(word)}
          disabled={isPlaying}
        >
          <i className="fas fa-sync-alt mr-2"></i>自然拼读示范
        </button>
      </div>
    </div>
  );
  
  // 渲染"读"阶段
  const renderReadStage = (word: Word) => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{word.word}</h2>
        <p className="text-xl text-gray-500 mb-6">{word.phonetic}</p>
        
        <div className="bg-blue-50 p-6 rounded-xl inline-block">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {word.syllables.map((syllable, index) => (
              <div key={index} className="text-center">
                <div className="text-lg font-medium text-gray-800">{syllable}</div>
                <div className="text-xs text-gray-500 mt-1">音节 {index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 发音评分区 */}
              <div className="max-w-md mx-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">发音评价</h3>
                  <div className="flex items-center">
                    {showPronunciationFeedback ? (
                      pronunciationScore >= 80 ? (
                        <>
                          <i className="fa-solid fa-star text-yellow-400 text-xl"></i>
                          <i className="fa-solid fa-star text-yellow-400 text-xl"></i>
                          <i className="fa-solid fa-star text-yellow-400 text-xl"></i>
                          <span className="ml-2 text-green-600 font-medium">非常优秀</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-star text-yellow-400 text-xl"></i>
                          <i className="fa-regular fa-star text-gray-300 text-xl"></i>
                          <i className="fa-regular fa-star text-gray-300 text-xl"></i>
                          <span className="ml-2 text-orange-600 font-medium">继续加油</span>
                        </>
                      )
                    ) : (
                      <>
                        <i className="fa-regular fa-star text-gray-300 text-xl"></i>
                        <i className="fa-regular fa-star text-gray-300 text-xl"></i>
                        <i className="fa-regular fa-star text-gray-300 text-xl"></i>
                      </>
                    )}
                  </div>
                </div>
                
                {showPronunciationFeedback ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                      <i className="fas fa-comment-dots text-blue-500 mr-2"></i>发音反馈
                    </h4>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start">
                <i className="fas fa-check-circle text-green-500 mt-1 mr-2"></i>
                <span>整体发音清晰，语调准确</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-exclamation-circle text-yellow-500 mt-1 mr-2"></i>
                <span>第2个音节发音稍弱，建议加强</span>
              </li>

            </ul>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">点击麦克风按钮，朗读单词进行发音练习</p>
          </div>
        )}
        
        <div className="flex justify-center mt-6">
          <button 
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl ripple-effect transition-all duration-200 ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#0072C6] hover:bg-blue-700'
            }`}
            onClick={isRecording ? undefined : startRecording}
          >
            <i className="fas fa-microphone"></i>
          </button>
        </div>
        

      </div>
    </div>
  );
  
  // 渲染"练"阶段
  const renderPracticeStage = (word: Word) => (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-gray-800 text-center">单词连连看</h3>
      
      {/* 新增单词发音区域 */}
      <div className="text-center py-4">
        <WordPronunciation word={word} />
      </div>
      
      <div className="flex justify-center">
        <div className="max-w-md w-full">
          <h4 className="text-lg font-medium text-gray-700 mb-6 text-center">选择正确的单词释义</h4>

        
        <div>
          <div className="space-y-3">
            {practiceOptions.map((option, index) => (
              <button
                key={index}
                className="w-full text-left bg-white border border-gray-300 rounded-lg px-4 py-3 hover:border-[#0072C6] hover:bg-blue-50 transition-all duration-200"
                
                onClick={() => handlePracticeOptionClick(option)}
              >
                <span className="text-gray-800">{option}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
      

    </div>
  );
  
  // 渲染"拼"阶段
  const renderSpellStage = (word: Word) => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">单词拼写练习</h3>
        <p className="text-gray-600 mb-6">将音节磁贴拖放到下方空格中，完成单词拼写</p>
        
        <div className="bg-gray-50 p-6 rounded-xl max-w-md mx-auto">
          <div id="spelling-container" className="mb-6">
            <div className="flex justify-center gap-2 mb-6 min-h-12">
              {spellingAnswer.map((tile, index) => (
                <div 
                  key={index}
                  className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center"
                >
                  <span>{tile}</span>
                  <button 
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    onClick={() => removeSpellingTile(index)}
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                </div>
              ))}
              
              {spellingAnswer.length === 0 && (
                <div className="text-gray-400 italic">点击下方音节磁贴进行拼写</div>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {spellingTiles.map((tile, index) => (
                <div 
                  key={index}
                  className="bg-white border-2 border-gray-300 text-gray-800 px-4 py-2 rounded-lg cursor-pointer hover:border-[#0072C6] hover:shadow-md transition-all duration-200"
                  onClick={() => handleTileClick(tile)}
                >
                  {tile}
                </div>
              ))}
            </div>
          </div>
          
          <button 
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg ripple-effect transition-all duration-200"
            onClick={checkSpelling}
            disabled={spellingAnswer.length !== word.syllables.length}
          >
            检查拼写
          </button>
        </div>
      </div>
      
      {word.examples && word.examples.length > 0 && (
        <div className="bg-blue-50 p-6 rounded-lg max-w-md mx-auto">
          <h4 className="font-medium text-blue-800 mb-3 text-center">单词用法示例</h4>
          <div className="bg-white p-4 rounded shadow-sm">
            <p className="text-gray-900 mb-1 italic">{word.examples[0].sentence}</p>
            <p className="text-gray-600 text-sm">{word.examples[0].translation}</p>
          </div>
        </div>
      )}
    </div>
  );
  
  // 加载状态
  if (loading || todayWords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 module-transition min-h-[calc(100vh-120px)] flex flex-col items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0072C6] mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">加载学习内容中...</h3>
        <p className="text-gray-600">正在为您准备今日学习的单词</p>
      </div>
    );
  }
       {/* 切换单词选择状态 */}
        const toggleSelectAll = () => {
          if (selectedWordIds.length === todayWords.length) {
            setSelectedWordIds([]);
          } else {
            setSelectedWordIds(todayWords.map(word => word.id));
          }
        };
        
        const toggleWordSelection = (wordId: string) => {
          setSelectedWordIds(prev => {
            if (prev.includes(wordId)) {
              return prev.filter(id => id !== wordId);
            } else {
              return [...prev, wordId];
            }
          });
        };
       
       {/* 批量删除选中单词 */}
       const handleBulkDelete = () => {
         if (selectedWordIds.length === 0) return;
         
         // 显示确认对话框
         if (!window.confirm(`确定要删除选中的 ${selectedWordIds.length} 个单词吗？`)) {
           return;
         }
         
         // 从今日学习列表中移除选中单词
         const updatedWords = todayWords.filter(word => !selectedWordIds.includes(word.id));
         
         // 更新localStorage中的同步单词
         localStorage.setItem('syncedWords', JSON.stringify(updatedWords));
         
         // 更新状态
         setTodayWords(updatedWords);
         setSelectedWordIds([]);
         
         // 如果当前选中的单词被删除，重置activeWordIndex
         if (selectedWord && selectedWordIds.includes(selectedWord.id)) {
           setSelectedWord(updatedWords.length > 0 ? updatedWords[0] : null);
           setActiveWordIndex(0);
         }
         
  toast.success("请先在单词库同步选中的单词");
       };
       
       {/* 保存学习进度 */}
       const saveLearningProgress = (wordId: string, progress: number) => {
        try {
          const learningHistory = JSON.parse(localStorage.getItem('learningHistory') || '{}');
          learningHistory[wordId] = progress;
          localStorage.setItem('learningHistory', JSON.stringify(learningHistory));
          
          // 同步更新单词库页面的进度显示
          window.dispatchEvent(new Event('learningProgressUpdated'));
        } catch (error) {
          console.error('Failed to save learning progress:', error);
        }
      };
      
      return (
    <div className="bg-white rounded-lg shadow p-6 module-transition min-h-[calc(100vh-120px)]">
       {/* 顶部导航栏 - 今日需学习 */}
      <div className="mb-8 overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-500 mr-4">今日需学习 ({todayWords.length}词)</h3>
  <button
    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium ripple-effect transition-all duration-200 mr-4"
    onClick={() => {
      if (selectedWordIds.length === 0) {
        toast.warning("请先选择要复习的单词");
        return;
      }
      
      try {
        // 获取当前学生ID
        const currentStudentId = LocalStorageService.getCurrentStudentId();
        
         // 确保学生ID存在
         const studentId = LocalStorageService.getCurrentStudentId();
         
         navigate('/anti-forgetting-review', { 
           state: { 
             selectedWordIds,
             studentId // 传递确保存在的学生ID
           } 
         });
      } catch (error) {
        console.error("导航到抗遗忘复习页面失败:", error);
        toast.error("无法进入复习页面，请确保学生数据已正确加载");
        
        // 尝试初始化默认学生数据
        LocalStorageService.initializeDefaultDataIfNeeded({
          words: [],
          students: [],
          coursePlans: [],
          user: {
            id: 'student1',
            name: '默认学生',
            role: 'student',
            avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=student+avatar&sign=029837c01a92e460db523ebdd26ca87a'
          }
        });
      }
    }}
  >
    抗遗忘训练
  </button>
            {todayWords.length > 0 && (
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={todayWords.length > 0 && selectedWordIds.length === todayWords.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">全选</span>
              </label>
            )}
          </div>
          {selectedWordIds.length > 0 && (
            <button 
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm ripple-effect flex items-center"
              onClick={handleBulkDelete}
            >
              <i className="fas fa-trash mr-1"></i> 删除选中 ({selectedWordIds.length})
            </button>
          )}
        </div>
         <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
           {todayWords.map((word, index) => (
             <div
               key={word.id}
               className={`whitespace-nowrap px-4 py-2 rounded-full transition-all duration-200 flex-shrink-0 flex items-center ${
                 selectedWordIds.includes(word.id)
                   ? 'bg-red-100 text-red-800 border-2 border-red-500'
                   : index === activeWordIndex 
                     ? 'bg-[#0072C6] text-white font-medium' 
                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
               }`}
             >
               <input
                 type="checkbox"
                 checked={selectedWordIds.includes(word.id)}
                 onChange={() => toggleWordSelection(word.id)}
                 className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
               />
               <span 
                 onClick={() => {
                   setActiveWordIndex(index);
                   setSelectedWord(word);
                 }}
                 className="cursor-pointer"
               >
                 {word.word}
               </span>
             </div>
           ))}
         </div>
         
         {/* 进度条 */}
         <div className="mt-4">
           <div className="flex justify-between text-sm mb-1">
             <span className="text-gray-600">学习进度</span>
             <span className="font-medium text-[#0072C6]">{progress}%</span>
           </div>
           <div className="w-full bg-gray-200 rounded-full h-2">
             <div 
               className="bg-[#0072C6] h-2 rounded-full transition-all duration-500 ease-out" 
               style={{ width: `${progress}%` }}
             ></div>
           </div>
         </div>
       </div>
      
      {/* 四大功能区导航 */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center relative">
          {/* 连接线 */}<div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0"></div>
          
          {/* 学环节 */}
          <button
            className={`flex flex-col items-center z-10 px-6 transition-all duration-300 ${
              currentStage === 'learn' ? 'scale-110' : ''
            }`}
            onClick={() => setCurrentStage('learn')}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${
              currentStage === 'learn' 
                ? 'bg-[#0072C6] text-white shadow-lg' 
                : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              <i className="fas fa-graduation-cap text-xl"></i>
            </div>
            <span className="text-sm font-medium text-gray-800">学</span>
          </button>
          
          {/* 读环节 */}
          <button
            className={`flex flex-col items-center z-10 px-6 transition-all duration-300 ${
              currentStage === 'read' ? 'scale-110' : ''
            }`}
            onClick={() => setCurrentStage('read')}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${
              currentStage === 'read' 
                ? 'bg-[#0072C6] text-white shadow-lg' 
                : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              <i className="fas fa-microphone text-xl"></i>
            </div>
            <span className="text-sm font-medium text-gray-800">读</span>
          </button>
          
          {/* 练环节 */}
          <button
            className={`flex flex-col items-center z-10 px-6 transition-all duration-300 ${
              currentStage === 'practice' ? 'scale-110' : ''
            }`}
            onClick={() => setCurrentStage('practice')}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${
              currentStage === 'practice' 
                ? 'bg-[#0072C6] text-white shadow-lg' 
                : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              <i className="fas fa-puzzle-piece text-xl"></i>
            </div>
            <span className="text-sm font-medium text-gray-800">练</span>
          </button>
          
          {/* 拼环节 */}
          <button
            className={`flex flex-col items-center z-10 px-6 transition-all duration-300 ${
              currentStage === 'spell' ? 'scale-110' : ''
            }`}
            onClick={() => setCurrentStage('spell')}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${
              currentStage === 'spell' 
                ? 'bg-[#0072C6] text-white shadow-lg' 
                : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              <i className="fas fa-font text-xl"></i>
            </div>
            <span className="text-sm font-medium text-gray-800">拼</span>
          </button>
        </div>
      </div>
      
      {/* 主要内容区 */}
      <div className="max-w-3xl mx-auto">
        {renderStageContent()}
      </div>
      
      {/* 单词导航按钮 */}
      {todayWords.length > 1 && (
        <div className="flex justify-center space-x-4 mt-10">
          <button
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg ripple-effect transition-all duration-200 flex items-center"
            onClick={prevWord}
            disabled={activeWordIndex === 0}
          >
            <i className="fas fa-arrow-left mr-2"></i>上一个单词
          </button>
          <button
            className="bg-[#0072C6] hover:bg-blue-700 text-white px-4 py-2 rounded-lg ripple-effect transition-all duration-200 flex items-center"
            onClick={nextWord}
            disabled={activeWordIndex === todayWords.length - 1}
          >
            下一个单词<i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      )}
      


        {/* 移除学习内容准备提示，减少DOM节点提升响应速度 */}

    </div>
   );
  };
  


  export default PhonicsMemory;