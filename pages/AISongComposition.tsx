import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWords } from '@/hooks/useLocalStorage';
import { Word } from '@/types';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 模拟音频波形数据
const generateWaveformData = () => {
  return Array.from({ length: 50 }, () => ({
    value: Math.floor(Math.random() * 100)
  }));
};

// 模拟歌曲生成历史记录接口
interface SongHistoryItem {
  id: string;
  keywords: string[];
  style: string;
  mood: string;
  bpm: number;
  title: string;
  createdAt: string;
  audioUrl: string;
}

// AI串词成曲页面组件
const AISongComposition: React.FC = () => {
  const navigate = useNavigate();
  const { words } = useWords();
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // 状态管理
  const [keywords, setKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('pop');
  const [selectedMood, setSelectedMood] = useState('happy');
  const [bpm, setBpm] = useState(120);
  const [rhymeScheme, setRhymeScheme] = useState('AABB');
  const [vocalsType, setVocalsType] = useState('female');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState(generateWaveformData());
  const [generationProgress, setGenerationProgress] = useState(0);
  const [songHistory, setSongHistory] = useState<SongHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [volume, setVolume] = useState(80);
  const [vocalVolume, setVocalVolume] = useState(80);
  const [instrumentVolume, setInstrumentVolume] = useState(80);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // 音乐风格选项
  const musicStyles = [
    { value: 'pop', label: '流行' },
    { value: 'rock', label: '摇滚' },
    { value: 'folk', label: '民谣' },
    { value: 'rnb', label: 'R&B' },
    { value: 'electronic', label: '电子' },
    { value: 'jazz', label: '爵士' },
    { value: 'country', label: '乡村' },
    { value: 'classical', label: '古典' }
  ];
  
  // 情绪选项
  const moods = [
    { value: 'happy', label: '欢快' },
    { value: 'sad', label: '忧伤' },
    { value: 'romantic', label: '浪漫' },
    { value: 'inspiring', label: '励志' },
    { value: 'calm', label: '平静' },
    { value: 'energetic', label: '活力' },
    { value: 'mysterious', label: '神秘' },
    { value: 'nostalgic', label: '怀旧' }
  ];
  
  // 加载历史记录
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('songGenerationHistory');
      if (savedHistory) {
        setSongHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Failed to load song history:', error);
    }
  }, []);
  
  // 清理动画
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // 处理关键词选择
  const handleKeywordClick = (word: string) => {
    if (keywords.length < 10 && !keywords.includes(word)) {
      setKeywords([...keywords, word]);
    } else if (keywords.includes(word)) {
      setKeywords(keywords.filter(k => k !== word));
    }
  };
  
  // 添加自定义关键词
  const handleAddCustomKeyword = () => {
    if (customKeyword.trim() && !keywords.includes(customKeyword.trim()) && keywords.length < 10) {
      setKeywords([...keywords, customKeyword.trim()]);
      setCustomKeyword('');
    }
  };
  
  // 移除关键词
  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };
  
  // 生成歌曲
  const generateSong = () => {
    if (keywords.length < 5) {
      toast.error('请至少选择5个关键词');
      return;
    }
    
    setIsGenerating(true);
    setGeneratedLyrics('');
    setAudioUrl('');
    setGenerationProgress(0);
    
    // 模拟生成进度
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 500);
    
    // 模拟歌曲生成过程
    setTimeout(() => {
      clearInterval(progressInterval);
      
      // 生成示例歌词
      const sampleLyrics = generateSampleLyrics();
      setGeneratedLyrics(sampleLyrics);
      
      // 生成波形数据
      setWaveformData(generateWaveformData());
      
        // 使用包含人声的测试音频URL确保播放功能正常
        setAudioUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
        
        // 添加文本转语音功能，朗读生成的歌词
        setTimeout(() => {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(generatedLyrics);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            utterance.volume = vocalVolume / 100;
            
            // 等待音频开始播放后再朗读歌词
            const audioElement = document.querySelector('audio');
            if (audioElement) {
              audioElement.onplay = () => {
                window.speechSynthesis.speak(utterance);
              };
            } else {
              // 如果音频元素不存在，直接朗读
              window.speechSynthesis.speak(utterance);
            }
          }
        }, 1000);
      
      // 创建历史记录项
      const newHistoryItem: SongHistoryItem = {
        id: Date.now().toString(),
        keywords: [...keywords],
        style: musicStyles.find(s => s.value === selectedStyle)?.label || selectedStyle,
        mood: moods.find(m => m.value === selectedMood)?.label || selectedMood,
        bpm,
        title: generateSongTitle(),
        createdAt: new Date().toLocaleString(),
        audioUrl: `https://example.com/generated-song-${Date.now()}.mp3`
      };
      
      // 更新历史记录
      const updatedHistory = [newHistoryItem, ...songHistory];
      setSongHistory(updatedHistory);
      localStorage.setItem('songGenerationHistory', JSON.stringify(updatedHistory));
      
      setIsGenerating(false);
      toast.success('歌曲生成成功！');
    }, 3000);
  };
  
  // 生成示例歌词
  const generateSampleLyrics = (): string => {
    // 根据选择的风格和情绪生成不同的歌词
    const styleLabel = musicStyles.find(s => s.value === selectedStyle)?.label || selectedStyle;
    const moodLabel = moods.find(m => m.value === selectedMood)?.label || selectedMood;
    
    // 基于关键词生成歌词（简化版）
    const keywordLines = {
      pop: [
        `${keywords[0]} shining bright in the sky`,
        `With ${keywords[1]} we'll reach high`,
        `${keywords[2]} whispers in the night`,
        `Our ${keywords[3]} takes flight`
      ],
      rock: [
        `Riding on the ${keywords[0]} through the night`,
        `With ${keywords[1]} burning bright`,
        `${keywords[2]} screaming loud and clear`,
        `We'll conquer all with ${keywords[3]} here`
      ],
      folk: [
        `Down the ${keywords[0]} path I roam`,
        `With ${keywords[1]} as my home`,
        `${keywords[2]} sings a gentle song`,
        `Of ${keywords[3]} all night long`
      ],
      default: [
        `On a ${keywords[0]} day we'll find our ${keywords[1]}`,
        `Chasing ${keywords[2]} under open sky`,
        `${keywords[3]} guides us through the ${keywords[4]}`,
        `Together we'll reach heights so high`
      ]
    };
    
    const lines = keywordLines[selectedStyle as keyof typeof keywordLines] || keywordLines.default;
    
    return lines.join('\n');
  };
  
  // 生成歌曲标题
  const generateSongTitle = (): string => {
    return `${keywords[0]} & ${keywords[1]} ${moods.find(m => m.value === selectedMood)?.label || selectedMood}`;
  };
  
  // 播放/暂停音频
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
        toast.error('音频播放失败，请尝试刷新页面');
      });
    }
    setIsPlaying(!isPlaying);
  };
  
  // 处理音频进度更新
  const handleAudioTimeUpdate = () => {
    // 在实际应用中，这里可以更新进度条和歌词高亮
  };
  
  // 下载音频
  const downloadAudio = () => {
    // 模拟下载功能
    toast.success('音频文件已开始下载');
    
    // 在实际应用中，这里应该触发真实的文件下载
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${generateSongTitle().replace(/\s+/g, '_')}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // 分享到社交媒体
  const shareToSocialMedia = () => {
    if (!generatedLyrics) return;
    
    const shareText = `我用AI生成了一首歌曲: "${generateSongTitle()}"\n\n歌词片段:\n${generatedLyrics.substring(0, 100)}...`;
    const encodedText = encodeURIComponent(shareText);
    
    // 模拟分享功能
    toast.success('分享链接已复制到剪贴板');
    
    // 在实际应用中，这里可以实现真实的分享功能
    navigator.clipboard.writeText(`https://example.com/share/song-${Date.now()}?text=${encodedText}`);
  };
  
  // 渲染关键词选择列表
  const renderKeywordOptions = () => {
    // 从单词库中获取英文单词作为关键词选项
    return words
      .filter(word => word.word && word.word.length > 2)
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)
      .map(word => (
        <button
          key={word.id}
          className={`px-3 py-1.5 rounded-full text-sm mr-2 mb-2 transition-all ${
            keywords.includes(word.word)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => handleKeywordClick(word.word)}
          disabled={keywords.includes(word.word) || keywords.length >= 10}
        >
          {word.word}
        </button>
      ));
  };
  
  // 渲染歌词
  const renderLyrics = () => {
    if (!generatedLyrics) return null;
    
    return (
      <div className="bg-gray-50 p-6 rounded-xl mt-6 font-mono text-gray-800 leading-relaxed whitespace-pre-line">
        {generatedLyrics}
      </div>
    );
  };
  
  // 渲染音频播放器
  const renderAudioPlayer = () => {
    if (!audioUrl) return null;
    
    return (
      <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">音频播放器</h3>
          <div className="flex space-x-3">
            <button 
              onClick={downloadAudio}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              aria-label="下载音频"
            >
              <i className="fas fa-download"></i>
            </button>
            <button 
              onClick={shareToSocialMedia}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              aria-label="分享"
            >
              <i className="fas fa-share-alt"></i>
            </button>
          </div>
        </div>
        
        {/* 波形可视化 */}
        <div className="h-32 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={waveformData}>
              <defs>
                <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#165DFF" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#165DFF" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis hide={true} />
              <YAxis hide={true} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`${value}%`, '音量']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="url(#waveGradient)" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* 音频控制 */}
        <div className="flex items-center justify-between">
            <button
              onClick={async () => {
                // 确保音频元素已加载
                if (!audioRef.current) return;
                
                try {
                  await audioRef.current.play();
                  setIsPlaying(true);
                } catch (error) {
                  console.error("播放失败:", error);
                  toast.error("播放失败，请点击播放器控件重试");
                }
              }}
              className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center"
            >
              {isPlaying ? (
                <i className="fas fa-pause text-xl"></i>
              ) : (
                <i className="fas fa-play text-xl"></i>
              )}
            </button>
            <button 
              className="ml-2 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full ripple-effect transition-all duration-200 flex items-center justify-center"
              onClick={() => {
                // 单独朗读歌词中的关键词
                keywords.forEach((keyword, index) => {
                  setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance(keyword);
                    utterance.lang = 'en-US';
                    utterance.rate = 0.7; // 慢速朗读关键词
                    utterance.pitch = 1.2;
                    window.speechSynthesis.speak(utterance);
                  }, index * 1000);
                });
              }}
            >
              <i className="fas fa-highlighter text-xl"></i>
            </button>
          
          {/* 音量控制 */}
          <div className="flex items-center">
            <i className="fas fa-volume-up text-gray-500 mr-2"></i>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-24 accent-blue-600"
            />
          </div>
          
          {/* 高级音量控制 */}
          {showAdvancedOptions && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">人声</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vocalVolume}
                  onChange={(e) => setVocalVolume(parseInt(e.target.value))}
                  className="w-20 accent-blue-600"
                />
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">伴奏</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={instrumentVolume}
                  onChange={(e) => setInstrumentVolume(parseInt(e.target.value))}
                  className="w-20 accent-blue-600"
                />
              </div>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              <i className="fas fa-sliders-h"></i>
            </button>
            <button
              onClick={downloadAudio}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
            >
              <i className="fas fa-download mr-1.5"></i>下载
            </button>
            <button
              onClick={shareToSocialMedia}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm"
            >
              <i className="fas fa-share-alt mr-1.5"></i>分享
            </button>
          </div>
        </div>
        
        {/* 音频元素 - 保持可见以确保正常加载 */}
        <audio
          ref={audioRef}
        src={audioUrl || "/audio/sample-song.mp3"}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("音频播放错误:", e);
            toast.error("音频播放失败，请重试");
            setIsPlaying(false);
          }}
   volume={vocalVolume / 100}
   onPlay={() => {
     // 音频播放时触发歌词朗读
     if (generatedLyrics && 'speechSynthesis' in window) {
       const utterance = new SpeechSynthesisUtterance(generatedLyrics);
       utterance.lang = 'en-US';
       utterance.rate = 0.8;
       utterance.pitch = 1.0;
       utterance.volume = vocalVolume / 100;
       window.speechSynthesis.speak(utterance);
     }
   }}
          className="hidden"
          controls
        />
      </div>
    );
  };
  
  // 渲染生成历史记录
  const renderHistoryItems = () => {
    return songHistory.map(item => (
      <div key={item.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-gray-900">{item.title}</h4>
          <span className="text-xs text-gray-500">{item.createdAt}</span>
        </div>
        <div className="flex flex-wrap items-center text-sm text-gray-600 mb-3">
          <span className="bg-gray-100 px-2 py-0.5 rounded mr-2 mb-1">{item.style}</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded mr-2 mb-1">{item.mood}</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded mb-1">{item.bpm} BPM</span>
        </div>
        <div className="flex flex-wrap mb-3">
          {item.keywords.map((keyword, idx) => (
            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2 mb-1">
              {keyword}
            </span>
          ))}
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setAudioUrl(item.audioUrl);
              setIsPlaying(false);
              setShowHistory(false);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            <i className="fas fa-play mr-1"></i>播放
          </button>
        </div>
      </div>
    ));
  };
  
  // 渲染生成进度
  const renderGenerationProgress = () => {
    if (!isGenerating) return null;
    
    return (
      <div className="mt-8 bg-white p-6 rounded-xl shadow-sm text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">正在创作您的歌曲...</h3>
        <p className="text-gray-600 mb-4">AI正在根据您选择的关键词和风格生成歌词和旋律</p>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${generationProgress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">{Math.round(generationProgress)}% 完成</p>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6 module-transition min-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/word-library')}
          className="text-gray-600 hover:text-gray-900 flex items-center"
        >
          <i className="fas fa-arrow-left mr-2"></i> 返回单词库
        </button>
        <h1 className="text-2xl font-bold text-gray-900">AI串词成曲</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm"
          >
            <i className="fas fa-history mr-1.5"></i>历史记录
          </button>
        </div>
      </div>
      
      {showHistory ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">创作历史</h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
            {songHistory.length > 0 ? (
              renderHistoryItems()
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-clock text-3xl mb-2 opacity-50"></i>
                <p>暂无创作历史</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧控制面板 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">歌曲设置</h2>
              
              {/* 关键词选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择关键词 (5-10个英文单词)
                </label>
                
                {/* 已选关键词 */}
                {keywords.length > 0 && (
                  <div className="flex flex-wrap mb-4">
                    {keywords.map((keyword, index) => (
                      <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm mr-2 mb-2">
                        {keyword}
                        <button
                          onClick={() => removeKeyword(index)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <i className="fas fa-times-circle"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 自定义关键词输入 */}
                <div className="flex mb-4">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="输入自定义关键词"
                    className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddCustomKeyword}
                    className="bg-blue-600 text-white px-3 py-2 rounded-r-md hover:bg-blue-700"
                    disabled={!customKeyword.trim() || keywords.includes(customKeyword.trim()) || keywords.length >= 10}
                  >
                    添加
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mb-3">或从下方推荐词库选择：</p>
                
                {/* 关键词选项 */}
                <div className="flex flex-wrap">
                  {renderKeywordOptions()}
                </div>
                <p className="text-xs text-gray-500 mt-3">提示：选择5-10个相关关键词以获得最佳效果</p>
              </div>
              
              {/* 风格选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">音乐风格</label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {musicStyles.map(style => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 情绪选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">歌曲情绪</label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {moods.map(mood => (
                    <option key={mood.value} value={mood.value}>
                      {mood.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* BPM控制 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">节奏速度 (BPM)</label>
                  <span className="text-sm font-medium text-blue-600">{bpm}</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>慢</span>
                  <span>中速</span>
                  <span>快</span>
                </div>
              </div>
              
              {/* 高级选项 */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">高级选项</h3>
                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showAdvancedOptions ? '收起' : '展开'}
                  </button>
                </div>
                
                {showAdvancedOptions && (
                  <div className="space-y-4">
                    {/* 押韵模式 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">押韵模式</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`px-3 py-2 rounded-md text-sm text-center transition-all ${
                            rhymeScheme === 'AABB'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          onClick={() => setRhymeScheme('AABB')}
                        >
                          AABB
                        </button>
                        <button
                          className={`px-3 py-2 rounded-md text-sm text-center transition-all ${
                            rhymeScheme === 'ABAB'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          onClick={() => setRhymeScheme('ABAB')}
                        >
                          ABAB
                        </button>
                      </div>
                    </div>
                    
                    {/* 人声类型 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">人声类型</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`px-3 py-2 rounded-md text-sm text-center transition-all ${
                            vocalsType === 'female'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          onClick={() => setVocalsType('female')}
                        >
                          女声
                        </button>
                        <button
                          className={`px-3 py-2 rounded-md text-sm text-center transition-all ${
                            vocalsType === 'male'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          onClick={() => setVocalsType('male')}
                        >
                          男声
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={generateSong}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium mt-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isGenerating || keywords.length < 5}
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>生成中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic mr-2"></i>生成歌曲
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* 右侧结果展示 */}
          <div className="lg:col-span-2 space-y-6">
            {isGenerating ? (
              renderGenerationProgress() 
            ) : generatedLyrics ? (
              <div className="space-y-6">
                {/* 歌词展示 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">生成的歌词</h2>
            <div id="ai-generated-essay" className="bg-white p-6 rounded-lg font-mono leading-relaxed whitespace-pre-line min-h-[300px] overflow-hidden relative">
              {/* 背景图片 */}
              <div className="absolute inset-0 opacity-10">
              <img src="https://space.coze.cn/api/coze_space/gen_image?image_size=landscape_4_3&prompt=English+learning+background+with+music+notes+and+words&sign=c69784f393738364d1ba748ccf94a659" alt="背景" className="w-full h-full object-cover" />
              </div>
              
              {/* 标题 */}
              <h3 className="text-3xl font-bold text-yellow-500 mb-6 relative z-10">磨耳朵英文歌</h3>
              
              {/* 右上角唱歌小孩图片 */}
              <div className="absolute top-4 right-4 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg z-10">
                <img src="https://lf-code-agent.coze.cn/obj/x-ai-cn/276762017282/attachment/image_20250808181757.png" alt="唱歌的小孩" className="w-full h-full object-cover" />
              </div>
              
              {/* 歌词内容 */}
              <div className="relative z-10 mt-8">
                {generatedLyrics.split('\n').map((line, index) => {
                  // 简单的中英文歌词分割逻辑，实际应用中应该根据API返回的结构化数据处理
                  const englishLine = line.trim();
                  // 这里使用模拟的中文翻译，实际应用中应该从API获取
                  const translations = {
                    "Sunday's coming I wanna drive my car": "周⽇就要到了",
                    "With love that shines like stars": "带着像星星⼀样闪耀的爱",
                    "The forecast said there might be some rain": "天⽓预报说可能会下⾬",
                    "But our love will light the way again": "但我们的爱会再次照亮前路",
                    "I wanna drive my car": "我想开着我的车",
                    "To your heart": "去你的⼼中",
                    "Shining bright": "明亮闪耀",
                    "All through the night": "整夜都是"
                  };
                  const chineseLine = translations[englishLine] || "";
                  
                  return (
                    <div key={index} className="mb-4">
                      <span className="text-green-600 font-medium text-lg">{englishLine}</span>
                      {chineseLine && <br />}
                      {chineseLine && <span className="text-gray-700 ml-2">{chineseLine}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
                </div>
                
                {/* 音频播放器 */}
                {renderAudioPlayer()}
              </div>
            ) : (
              <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center h-full flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <i className="fas fa-music text-4xl text-blue-600"></i>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">准备创作您的歌曲</h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  选择关键词、音乐风格和情绪，AI将为您生成一首独特的歌曲。开始您的音乐创作之旅吧！
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                      <i className="fas fa-list"></i>
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">选择关键词</h3>
                      <p className="text-sm text-gray-500">挑选5-10个英文关键词</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                      <i className="fas fa-sliders-h"></i>
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">设置风格</h3>
                      <p className="text-sm text-gray-500">选择音乐风格和情绪</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                      <i className="fas fa-magic"></i>
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">生成歌曲</h3>
                      <p className="text-sm text-gray-500">AI创作歌词和旋律</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISongComposition;