import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Word } from '@/types';
import { cn } from '@/lib/utils';

interface WordPronunciationProps {
  word: Word;
}

const WordPronunciation: React.FC<WordPronunciationProps> = ({ word }) => {

  const [highlightedSyllable, setHighlightedSyllable] = useState<number | null>(null);
  const syllableRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [usVoice, setUsVoice] = useState<SpeechSynthesisVoice | null>(null);
  
    // 解析音标为音节对应的音素 - 增强版（严格遵循英语发音规则）
    const getPhoneticSyllables = () => {
      // 移除首尾的/符号和所有空格
      const cleanPhonetic = word.phonetic.replace(/^\/|\/$/g, '').replace(/\s+/g, '');
      
      // 音节数量
      const syllableCount = word.syllables.length;
      
      // 定义国际音标元音集合（包含单元音和双元音，按长度排序以确保正确匹配）
      const vowels = [
        // 长元音和双元音（2个字符）
        'ɑː', 'ɔː', 'ɜː', 'iː', 'uː', 'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'əʊ', 'ɪə', 'eə', 'ʊə',
        // 短元音（1个字符）
        'æ', 'ʌ', 'ə', 'ɒ', 'ɪ', 'ʊ', 'e', 'ɑ', 'ɛ'
      ];
      
      // 定义重音符号
      const stressMarkers = ['ˌ', 'ˈ'];
      
      // 辅音簇识别 - 这些组合不应被拆分
      const consonantClusters = ['tʃ', 'dʒ', 'θ', 'ð', 'ʃ', 'ʒ', 'ts', 'dz', 'tr', 'dr', 'kw', 'gw', 'pl', 'pr', 'kl', 'kr', 'bl', 'br', 'gl', 'gr', 'st', 'sp', 'sk', 'sw', 'tw', 'dw', 'qu'];
      
      // 精确音素解析 - 准确识别音素和重音
      const phonemes: (string | {type: 'stress', marker: string})[] = [];
      let i = 0;
      
      while (i < cleanPhonetic.length) {
        // 检查重音标记
        if (stressMarkers.includes(cleanPhonetic[i])) {
          phonemes.push({type: 'stress', marker: cleanPhonetic[i]});
          i++;
          continue;
        }
        
        // 检查辅音簇
        let clusterFound = false;
        // 先检查双字符辅音簇
        if (i + 1 < cleanPhonetic.length) {
          const cluster = cleanPhonetic.substring(i, i + 2);
          if (consonantClusters.includes(cluster)) {
            phonemes.push(cluster);
            i += 2;
            clusterFound = true;
          }
        }
        
        if (clusterFound) continue;
        
        // 检查双字符元音
        let found = false;
        if (i + 1 < cleanPhonetic.length) {
          const twoChar = cleanPhonetic.substring(i, i + 2);
          if (vowels.includes(twoChar)) {
            phonemes.push(twoChar);
            i += 2;
            found = true;
          }
        }
        
        // 检查单字符元音
        if (!found) {
          if (vowels.includes(cleanPhonetic[i])) {
            phonemes.push(cleanPhonetic[i]);
          } else {
            phonemes.push(cleanPhonetic[i]);
          }
          i++;
        }
      }
      
      // 识别音节边界（基于元音和重音）
      const syllableBoundaries: number[] = [];
      let vowelCount = 0;
      let primaryStressIndex = -1;
      
      // 记录主重音位置
      for (let i = 0; i < phonemes.length; i++) {
        const phoneme = phonemes[i];
        if (typeof phoneme !== 'string' && phoneme.type === 'stress' && phoneme.marker === 'ˈ') {
          primaryStressIndex = i;
          break;
        }
      }
      
      // 第一个音节从0开始
      syllableBoundaries.push(0);
      
      // 遍历音素，识别音节边界 - 增强版算法（遵循英语发音规则）
      for (let i = 0; i < phonemes.length; i++) {
        const phoneme = phonemes[i];
        
        // 如果是元音，增加元音计数
        if (typeof phoneme === 'string' && vowels.includes(phoneme)) {
          vowelCount++;
          
          // 如果元音数量达到音节数量，停止寻找边界
          if (vowelCount >= syllableCount) {
            break;
          }
          
          // 查找下一个音节的开始位置（音节核心是元音）
          let nextVowelIndex = -1;
          for (let j = i + 1; j < phonemes.length; j++) {
            const nextPhoneme = phonemes[j];
            if (typeof nextPhoneme === 'string' && vowels.includes(nextPhoneme)) {
              nextVowelIndex = j;
              break;
            }
          }
          
          // 如果找到了下一个元音，确定音节边界
          if (nextVowelIndex > -1) {
            // 音节边界通常在辅音簇的中间
            // 向前查找辅音簇的最佳分割点
            let boundaryIndex = -1;
            
            // 检查两个元音之间是否有重音标记
            for (let j = i + 1; j < nextVowelIndex; j++) {
              if (phonemes[j].type === 'stress') {
                boundaryIndex = j + 1; // 在重音标记后分割
                break;
              }
            }
            
            // 应用英语音节划分规则：
            // 1. 两个元音之间有一个辅音：归后一个音节 (V-C-V)
            // 2. 两个元音之间有两个辅音：通常分开发音 (V-CC-V)
            // 3. 两个元音之间有三个辅音：前两个归前一音节，第三个归后一音节 (V-CCC-V)
            if (boundaryIndex === -1) {
              const consonantCount = nextVowelIndex - i - 1;
              
              if (consonantCount === 0) {
                // 元音直接相连，边界在下一个元音前
                boundaryIndex = nextVowelIndex;
              } else if (consonantCount === 1) {
                // 一个辅音，归后一个音节
                boundaryIndex = nextVowelIndex - 1;
              } else if (consonantCount === 2) {
                // 两个辅音，通常分开
                boundaryIndex = i + 1;
              } else if (consonantCount >= 3) {
                // 三个或更多辅音，前两个归前一音节，其余归后一音节
                boundaryIndex = i + 2;
              }
            }
            
            syllableBoundaries.push(boundaryIndex);
          }
        }
      }
      
      // 确保边界数量正确
      while (syllableBoundaries.length < syllableCount) {
        syllableBoundaries.push(phonemes.length);
      }
      
      // 添加最后一个边界
      syllableBoundaries.push(phonemes.length);
      
      // 根据边界分割音素
      const syllablePhonemes: string[][] = [];
      for (let i = 0; i < syllableCount; i++) {
        const start = syllableBoundaries[i];
        const end = syllableBoundaries[i + 1];
        
        // 提取当前音节的音素，包括重音标记
        const syllable: string[] = [];
        for (let j = start; j < end; j++) {
          const phoneme = phonemes[j];
          if (typeof phoneme === 'string') {
            syllable.push(phoneme);
          } else if (phoneme.type === 'stress') {
            syllable.push(phoneme.marker);
          }
        }
          
        syllablePhonemes.push(syllable);
      }
      
      // 将音素数组合并为字符串，不添加/符号以避免语音引擎误读
      return syllablePhonemes.map(phonemes => phonemes.join(''));
   }
  
  // 备用音节分割方法 - 基于元音检测和等长分割
  const fallbackPhoneticSplit = (phonetic: string, syllableCount: number) => {
    // 首先尝试基于元音的智能分割
    const vowelSounds = ['a', 'e', 'i', 'o', 'u', 'æ', 'ɑ', 'ʌ', 'ə', 'ɚ', 'ɪ', 'i', 'ɛ', 'ɜ', 'u', 'ʊ', 'ɔ', 'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'oʊ', 'ju'];
    let phoneticSyllables: string[] = [];
    let currentSyllable = '';
    let vowelFound = false;
    let syllableIndex = 0;
    
    for (let i = 0; i < phonetic.length; i++) {
      // 检查双元音
      let char = phonetic[i];
      let nextChar = i + 1 < phonetic.length ? phonetic[i + 1] : '';
      let diphthong = vowelSounds.includes(char + nextChar) ? char + nextChar : '';
      
      if (diphthong) {
        currentSyllable += diphthong;
        i++; // 跳过下一个字符，因为已经处理了双元音
        vowelFound = true;
      } else {
        currentSyllable += char;
        
        // 检查单元音
        if (vowelSounds.includes(char) && !vowelFound) {
          vowelFound = true;
        }
      }
      
      // 当找到元音且不是最后一个音节时，分割
      if (vowelFound && syllableIndex < syllableCount - 1 && 
          (i === phonetic.length - 1 || vowelSounds.includes(phonetic[i + 1]))) {
        phoneticSyllables.push(currentSyllable);
        currentSyllable = '';
        vowelFound = false;
        syllableIndex++;
      }
    }
    
    // 添加最后一个音节
    if (currentSyllable) {
      phoneticSyllables.push(currentSyllable);
    }
    
    // 如果元音分割成功，返回结果
    if (phoneticSyllables.length === syllableCount) {
      return phoneticSyllables;
    }
    
    // 如果元音分割失败，使用等长分割作为最后的备选方案
    const syllableLength = Math.ceil(phonetic.length / syllableCount);
    const equalSplitSyllables: string[] = [];
    
    for (let i = 0; i < syllableCount; i++) {
      const start = i * syllableLength;
      let end = start + syllableLength;
      
      // 最后一个音节取到结尾
      if (i === syllableCount - 1) {
        end = phonetic.length;
      }
      
      equalSplitSyllables.push(phonetic.substring(start, end));
    }
    
    return equalSplitSyllables;
  }

    // 检查浏览器是否支持Web Speech API
    const isWebSpeechSupported = 'speechSynthesis' in window;
    
    // 预加载语音
    useEffect(() => {
      if (isWebSpeechSupported) {
        // 触发语音加载
        window.speechSynthesis.getVoices();
        
        // 监听语音加载完成事件
        const handleVoicesChanged = () => {
          const voices = window.speechSynthesis.getVoices();
          const usVoice = voices.find(voice => 
            (voice.lang === 'en-US' || voice.lang === 'en_US') && 
            (voice.name.includes('English') || voice.name.includes('US'))
          );
          setUsVoice(usVoice || null);
        };
        
        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        
        // 初始获取一次
        handleVoicesChanged();
        
        return () => {
          window.speechSynthesis.onvoiceschanged = null;
        };
      }
    }, [isWebSpeechSupported]);

    // 单词发音 - 优化版
      // 优化后的单词发音函数 - 确保即时响应
      const pronounceWord = () => {
      if (!isWebSpeechSupported) {
        toast.error('您的浏览器不支持语音合成功能，请使用最新版Chrome、Edge或Safari浏览器');
        return;
      }
      
      try {
        // 使用缓存的语音配置
        const utterance = new SpeechSynthesisUtterance(word.word);
        utterance.lang = 'en-US';
        utterance.voice = usVoice || null;
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;
        
        // 立即开始发音 - 清除队列并直接播放
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        toast.error('语音合成失败，请稍后重试');
      }
    }

    // 音节发音
    const pronounceSyllable = (syllable: string) => {
      if (!isWebSpeechSupported) {
        toast.error('您的浏览器不支持语音合成功能');
        return;
      }
      
      try {
        const utterance = new SpeechSynthesisUtterance(syllable);
        utterance.lang = 'en-US';
        
        if (usVoice) {
          utterance.voice = usVoice;
        }
        
        utterance.rate = 0.7;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;
        
        // 立即播放音节发音
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        toast.error('语音合成失败');
      }
    }
  
     // 按音节拆分单词并添加红色斜线
    const renderWordWithSlashes = () => {
      // 确保音节是数组，如果是字符串则按逗号分割
      const syllables = Array.isArray(word.syllables) 
        ? word.syllables 
        : word.syllables?.split(',').map(s => s.trim()) || [];
        
      return syllables.map((syllable, index) => (
        <React.Fragment key={index}>
          <span className="relative inline-block">
            {syllable}
            {index < syllables.length - 1 && (
              <span className="absolute right-0 top-0 h-full w-[2px] bg-red-600 transform translate-x-1/2"></span>
            )}
          </span>
        </React.Fragment>
      ));
    };
    
     // 按音节拆分音标
     const renderPhoneticWithSlashes = () => {
       const phoneticSyllables = getPhoneticSyllables();
       return phoneticSyllables.map((syllable, index) => (
         <React.Fragment key={index}>
           <span className="inline-block">
             {syllable}
           </span>
         </React.Fragment>
       ));
     };
    
    return (
      <div className="flex items-center justify-center w-full">
        <span className="font-medium text-gray-900 mr-3">
          {renderWordWithSlashes()}
        </span>
        <span className="text-gray-500 text-sm mr-4">
          {renderPhoneticWithSlashes()}
        </span>
        

        
         <button
           onClick={() => pronounceWord()}
            disabled={!isWebSpeechSupported}
            className={cn("p-3 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1",
              isWebSpeechSupported 
                ? "hover:bg-blue-100 text-[#165DFF]" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
           aria-label="发音整个单词"
           title={!isWebSpeechSupported ? "您的浏览器不支持语音合成功能" : "朗读整个单词"}
         >
            <i className="fa-solid fa-volume-up text-xl"></i>
         </button>
     </div>
   );
};

export default WordPronunciation;