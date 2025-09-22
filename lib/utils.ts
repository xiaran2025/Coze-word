import { Word } from '@/types';

/**
 * 英文单词音节自动拆分工具
 * 基于发音规则和常见音节划分模式
 */
export const SyllableUtils = {
  // 元音字母集合
  vowels: new Set(['a', 'e', 'i', 'o', 'u', 'y']),
  
  // 常见双元音组合
  diphthongs: new Set([
    'ai', 'au', 'ay', 'ea', 'ee', 'ei', 'ey', 'ia', 'ie', 'oa', 
    'oe', 'oi', 'oo', 'ou', 'ow', 'oy', 'ua', 'ue', 'ui',
    'augh', 'eigh', 'ough', 'igh', 'air', 'are', 'ear', 'eer', 'ere',
    'ier', 'oar', 'oor', 'our', 'ure'
  ]),
  
  // 常见元音+r组合
  rVowels: new Set(['ar', 'er', 'ir', 'or', 'ur', 'yr', 'ear', 'air', 'oor', 'our']),
  
  // 不可拆分的辅音组合
  consonantClusters: new Set([
    // L组合音
    'bl', 'cl', 'fl', 'gl', 'pl', 'sl', 'dl', 'kl', 'ml', 'vl',
    // R组合音
    'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'sr', 'wr',
    // S组合音
    'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'sh', 'sch', 'squ', 'str',
    // 其他常见组合
    'ch', 'th', 'wh', 'ph', 'gh', 'ng', 'nk', 'tch', 'dge', 'qu', 'ck',
    'mn', 'gn', 'kn', 'wr', 'ps', 'pt', 'ts', 'dz', 'ds', 'ms', 'ns', 'rs', 'ls'
  ]),
  
  // 特殊后缀（视为一个音节）
  specialSuffixes: new Set(['tion', 'sion', 'cian', 'ture', 'sure', 'ough', 'augh', 'eigh', 'ing', 'ly', 'ment', 'ness', 'ful', 'less', 'able', 'ible', 'ous', 'ive', 'ize', 'ise', 'ify']),
  
  /**
   * 判断字符是否为元音
   */
  isVowel: (char: string, index: number, word: string): boolean => {
    // 'y'在词首不是元音，在其他位置可能是元音
    if (char === 'y') {
      return index > 0;
    }
    return SyllableUtils.vowels.has(char.toLowerCase());
  },
  
  /**
   * 检查是否为不可拆分的辅音组合
   */
  isConsonantCluster: (word: string, startIndex: number, length: number = 2): boolean => {
    // 检查指定长度的辅音组合
    if (startIndex + length <= word.length) {
      const cluster = word.substring(startIndex, startIndex + length).toLowerCase();
      if (SyllableUtils.consonantClusters.has(cluster)) {
        return true;
      }
    }
    return false;
  },
  
  /**
   * 检查是否为特殊后缀
   */
  hasSpecialSuffix: (word: string): {hasSuffix: boolean, suffix: string, length: number} => {
    const lowerWord = word.toLowerCase();
    for (const suffix of SyllableUtils.specialSuffixes) {
      if (lowerWord.endsWith(suffix)) {
        return { hasSuffix: true, suffix, length: suffix.length };
      }
    }
    return { hasSuffix: false, suffix: '', length: 0 };
  },
  
  /**
   * 查找单词中的元音位置（考虑双元音）
   */
  findVowelPositions: (word: string): {index: number, length: number}[] => {
    const positions: {index: number, length: number}[] = [];
    let i = 0;
    
    while (i < word.length) {
      // 检查双元音
      if (i + 1 < word.length) {
        const twoLetters = word.substring(i, i + 2).toLowerCase();
        if (SyllableUtils.diphthongs.has(twoLetters)) {
          positions.push({ index: i, length: 2 });
          i += 2;
          continue;
        }
      }
      
      // 检查元音+r组合
      if (i + 1 < word.length) {
        const twoLetters = word.substring(i, i + 2).toLowerCase();
        if (SyllableUtils.rVowels.has(twoLetters)) {
          positions.push({ index: i, length: 2 });
          i += 2;
          continue;
        }
      }
      
      // 检查单个元音
      if (SyllableUtils.isVowel(word[i], i, word)) {
        positions.push({ index: i, length: 1 });
      }
      
      i++;
    }
    
    return positions;
  },
  
  /**
   * 应用"一归后，二平分，三一二"规则分配辅音
   */
  applyConsonantRules: (word: string, start: number, end: number): number => {
    const consonantCount = end - start;
    
    if (consonantCount <= 0) {
      return start;
    }
    
    // 检查是否包含不可拆分的辅音组合
     // 检查是否包含不可拆分的辅音组合
    for (let i = start; i < end - 1; i++) {
      // 先检查3个字符的辅音组合
      if (i + 2 < end && SyllableUtils.isConsonantCluster(word, i, 3)) {
        return i;
      }
      // 再检查2个字符的辅音组合
      if (SyllableUtils.isConsonantCluster(word, i)) {
        return i;
      }
    }
    
    // 应用规则：一归后，二平分，三一二
    if (consonantCount === 1) {
      // 一归后
      return end;
    } else if (consonantCount === 2) {
      // 二平分
      return start + 1;
    } else if (consonantCount >= 3) {
      // 三一二（前1后2）
      return start + 1;
    }
    
    return start;
  },
  
  /**
   * 处理特殊音节情况（自成音节的辅音）
   */
  handleSpecialSyllables: (word: string, syllables: string[]): string[] => {
    // 处理成音节规则 (辅音+le, cle, ple等)
    const syllabicRules = [
      /(ble)$/, /(cle)$/, /(dle)$/, /(fle)$/, /(gle)$/, /(kle)$/, 
      /(ple)$/, /(tle)$/, /(zle)$/, /(me)$/, /(ne)$/, /(se)$/
    ];
    
    // 检查是否符合成音节规则
    for (const rule of syllabicRules) {
      if (rule.test(word.toLowerCase())) {
        const lastSyllable = syllables.pop() || '';
        if (lastSyllable.length > 2) {
          // 从倒数第二个字符处拆分
          syllables.push(lastSyllable.substring(0, lastSyllable.length - 2));
          syllables.push(lastSyllable.substring(lastSyllable.length - 2));
        } else {
          syllables.push(lastSyllable);
        }
        return syllables;
      }
    }
    
    // 处理特殊组合音节
    const specialCombinations = [
      'ough', 'augh', 'eigh', 'igh', 'ought', 'tough', 'through', 
      'though', 'thought', 'bough', 'dough', 'plough'
    ];
    
    for (const combo of specialCombinations) {
      const comboLower = combo.toLowerCase();
      if (word.toLowerCase().includes(comboLower)) {
        return syllables.map(syllable => {
          if (syllable.toLowerCase().includes(comboLower)) {
            // 确保特殊组合不被拆分
            return syllable.replace(new RegExp(`(${comboLower})`, 'gi'), `$1`);
          }
          return syllable;
        });
      }
    }
    
    return syllables;
  },
  
  /**
   * 自动拆分单词音节（基于用户提供的规则）
   * @param word 单词
   * @returns 音节数组
   */
  autoSplitSyllables: (word: string): string[] => {
    try {
      // 处理特殊后缀
      const { hasSuffix, suffix, length } = SyllableUtils.hasSpecialSuffix(word);
      let baseWord = word;
      let suffixSyllable: string[] = [];
      
      if (hasSuffix) {
        baseWord = word.substring(0, word.length - length);
        suffixSyllable = [suffix];
      }
      
      // 查找元音位置
      const vowelPositions = SyllableUtils.findVowelPositions(baseWord);
      
      // 单音节词直接返回
      if (vowelPositions.length <= 1) {
        return hasSuffix ? [baseWord, ...suffixSyllable] : [word];
      }
      
      // 多音节词拆分
      const syllables: string[] = [];
      let start = 0;
      
      for (let i = 0; i < vowelPositions.length - 1; i++) {
        const currentVowel = vowelPositions[i];
        const nextVowel = vowelPositions[i + 1];
        
        // 元音之间的辅音
        const consonantStart = currentVowel.index + currentVowel.length;
        const consonantEnd = nextVowel.index;
        
        // 应用辅音分配规则
        const splitIndex = SyllableUtils.applyConsonantRules(
          baseWord, consonantStart, consonantEnd
        );
        
        // 添加音节
        syllables.push(baseWord.substring(start, splitIndex));
        start = splitIndex;
      }
      
      // 添加最后一个音节
      syllables.push(baseWord.substring(start));
      
      // 处理特殊音节情况
      const processedSyllables = SyllableUtils.handleSpecialSyllables(baseWord, syllables);
      
      // 添加后缀音节
      return hasSuffix ? [...processedSyllables, ...suffixSyllable] : processedSyllables;
    } catch (error) {
      console.error('音节拆分失败:', error);
      // 失败时返回整个单词作为一个音节
      return [word];
    }
  }
};

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}