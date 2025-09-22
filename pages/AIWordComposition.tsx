
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWords } from '@/hooks/useLocalStorage';
import { Word } from '@/types';
import { cn } from '@/lib/utils';

// AI串词成篇页面组件
const AIWordComposition: React.FC = () => {
  const navigate = useNavigate();
  const { words } = useWords();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [generatedEssay, setGeneratedEssay] = useState('');
  const [translation, setTranslation] = useState('');
  const [grammarAnalysis, setGrammarAnalysis] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [essayTitle, setEssayTitle] = useState('');
  
  // 从单词库获取推荐单词
  const [recommendedWords, setRecommendedWords] = useState<Word[]>([]);
  
  // 初始化推荐单词
  useEffect(() => {
    if (words.length > 0) {
      // 随机选择15个单词作为推荐
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setRecommendedWords(shuffled.slice(0, 15));
    }
  }, [words]);
  
  // 处理单词选择
  const handleWordClick = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < 10) {
      setSelectedWords([...selectedWords, word]);
    } else {
      toast.error('最多只能选择10个单词');
    }
  };
  
  // 生成文章
  const generateEssay = () => {
    if (selectedWords.length < 3) {
      toast.error('请至少选择3个单词');
      return;
    }
    
    setIsGenerating(true);
    setShowResult(false);
    
    // 模拟AI生成文章过程
    setTimeout(() => {
      // 生成标题
      const title = generateTitle(selectedWords);
      setEssayTitle(title);
      
      // 生成英文文章
      const essay = generateEnglishEssay(selectedWords);
      setGeneratedEssay(essay);
      
      // 生成中文翻译
      setTranslation(generateChineseTranslation(essay));
      
      // 生成语法分析
      setGrammarAnalysis(generateGrammarAnalysis(essay));
      
      setIsGenerating(false);
      setShowResult(true);
    }, 1500);
  };
  
  // 生成标题
  const generateTitle = (words: string[]): string => {
    const titles = [
      "My Learning Journey",
      "A Day in My Life",
      "The Power of Words",
      "My English Story",
      "Learning Through Words"
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  };
  
  // 生成英文文章
  const generateEnglishEssay = (words: string[]): string => {
    // 根据选择的单词生成简单的英文文章
    const essays = [
      `One day, I wanted to learn about ${words[0]}. I used my ${words[1]} to find information. It was a ${words[2]} journey. I learned that ${words[3]} is very ${words[4]}. I found a ${words[5]} to help me. This experience taught me new ${words[6]} and improved my ${words[7]}. I will continue to ${words[8]} and ${words[9]}.`,
      `During my English learning, I discovered the importance of ${words[0]}. With ${words[1]} and ${words[2]}, I can express myself better. My teacher always says ${words[3]} is key to success. I practice ${words[4]} every day and try to use ${words[5]} in sentences. Learning ${words[6]} helps me understand ${words[7]} better. I am proud of my ${words[8]} and ${words[9]}.`
    ];
    
    return essays[Math.floor(Math.random() * essays.length)];
  };
  
  // 生成中文翻译
  const generateChineseTranslation = (englishText: string): string => {
    // 简单模拟英文到中文的翻译
    const translations = {
      "One day": "有一天",
      "I wanted to learn about": "我想学习关于",
      "I used my": "我用我的",
      "to find information": "来查找信息",
      "It was a": "这是一段",
      "journey": "旅程",
      "I learned that": "我了解到",
      "is very": "非常",
      "I found a": "我找到了一个",
      "to help me": "来帮助我",
      "This experience taught me new": "这次经历教会了我新的",
      "and improved my": "并提高了我的",
      "I will continue to": "我将继续",
      "During my English learning": "在我的英语学习过程中",
      "I discovered the importance of": "我发现了的重要性",
      "With": "有了",
      "I can express myself better": "我能更好地表达自己",
      "My teacher always says": "我的老师总是说",
      "is key to success": "是成功的关键",
      "I practice": "我每天练习",
      "every day and try to use": "并尝试在句子中使用",
      "in sentences": "在句子中",
      "helps me understand": "帮助我更好地理解",
      "I am proud of my": "我为我的感到自豪"
    };
    
    let translation = englishText;
    Object.entries(translations).forEach(([eng, chn]) => {
      translation = translation.replace(eng, chn);
    });
    
    return translation;
  };
  
  // 生成语法分析
  const generateGrammarAnalysis = (text: string): string[] => {
    return [
      "过去时态运用：使用了'wanted', 'used', 'learned'等动词过去式描述过去发生的事情",
      "宾语从句：'I learned that...'中that引导的宾语从句",
      "不定式结构：'wanted to learn', 'try to use'中的不定式作目的状语",
      "连接词使用：使用'and'连接并列谓语，使句子结构更连贯"
    ];
  };
  
  // 下载文章
  const downloadEssay = () => {
    const content = `Title: ${essayTitle}\n\nEnglish Essay:\n${generatedEssay}\n\nChinese Translation:\n${translation}\n\nGrammar Analysis:\n- ${grammarAnalysis.join('\n- ')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${essayTitle.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('文章已下载');
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6 module-transition min-h-[calc(100vh-120px)]">
      <div className="flex justify-between items-center mb-8">
        <button 
          className="text-gray-600 hover:text-gray-900 flex items-center"
          onClick={() => navigate('/word-library')}
        >
          <i className="fas fa-arrow-left mr-2"></i> 返回单词库
        </button>
        <h2 className="text-2xl font-bold text-gray-900">AI串词成篇</h2>
        <div className="w-24"></div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧单词选择区域 */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">单词列表 (已选择: {selectedWords.length})</h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedWords.map((word, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full flex items-center">
                  {word}
                  <button 
                    className="ml-1 text-blue-600 hover:text-blue-900"
                    onClick={() => handleWordClick(word)}
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                </span>
              ))}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">选择单词后点击"生成作文"按钮</p>
            
            <div className="grid grid-cols-2 gap-2">
              {recommendedWords.map(word => (
                <button
                  key={word.id}
                  className={`p-3 rounded-lg text-left transition-all ${
                    selectedWords.includes(word.word)
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-gray-50 text-gray-800 border border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleWordClick(word.word)}
                >
                  <div className="font-medium">{word.word}</div>
                  <div className="text-xs text-gray-500">{word.phonetic}</div>
                  <div className="text-xs text-gray-600 mt-1">{word.definitions?.[0] || ''}</div>
                </button>
              ))}
            </div>
            
            <button
              onClick={generateEssay}
              disabled={isGenerating || selectedWords.length < 3}
              className={`w-full mt-6 py-3 rounded-lg font-medium transition-colors ${
                isGenerating || selectedWords.length < 3
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>生成中...
                </>
              ) : (
                <>
                  <i className="fas fa-magic mr-2"></i>生成作文
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* 右侧作文展示区域 */}
        <div className="lg:col-span-2">
          {showResult ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{essayTitle}</h3>
                <div className="flex space-x-2">
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg ripple-effect transition-all"
                    onClick={downloadEssay}
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">根据您选择的单词，AI生成了以下作文：</p>
                <div className="bg-gray-50 p-4 rounded-lg font-mono leading-relaxed">
                  {generatedEssay}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">中文翻译</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {translation}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">中英文对照</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {generatedEssay.split('. ').map((sentence, index) => (
                      <p key={index} className="mb-2">{sentence}.</p>
                    ))}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {translation.split('。').map((sentence, index) => (
                      <p key={index} className="mb-2">{sentence}。</p>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">语法分析</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {grammarAnalysis.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-6">
                <i className="fas fa-file-alt text-3xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">选择单词生成作文</h3>
              <p className="text-gray-600 max-w-md">从左侧选择3-10个单词，AI将根据这些单词生成一篇连贯的英语作文，并提供中文翻译和语法分析</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIWordComposition;