import { Word, Student, CoursePlan, SystemSettings, MistakeWord, User, MemoryStage, LearningRecord, ScheduleItem, WordBank } from '@/types';

// 存储键名常量
export const STORAGE_KEYS = {
  WORDS: 'phonicsMaster_words',
  STUDENTS: 'phonicsMaster_students',
  COURSE_PLANS: 'phonicsMaster_coursePlans',
  SETTINGS: 'phonicsMaster_settings',
  LAST_SYNC: 'phonicsMaster_lastSync',
  SCHEDULE_DATA: 'scheduleData'
};

// 数据持久化服务类
export class LocalStorageService {
   // 获取当前学生ID，确保学生存在
  static getCurrentStudentId(): string {
    try {
      // 先尝试从localStorage获取当前用户
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id) {
        return currentUser.id;
      }
      
      // 如果没有当前用户，创建默认学生ID
      const studentId = 'student_' + Math.floor(Math.random() * 1000000);
      localStorage.setItem('currentStudentId', studentId);
      
      // 确保默认学生存在并正确初始化
      let students = this.getStudents();
      if (!students.some(s => s.id === studentId)) {
        // 创建默认学生
        const defaultStudent = {
          id: studentId,
          name: '默认学生',
          className: '默认班级',
          studyHours: 0,
          currentWordLibrary: '',
          invitationCode: '',
          coursePlan: '',
          progress: 0,
          learningRecords: []
        };
        
        students = [...students, defaultStudent];
        this.saveStudents(students);
      }
      
      // 同时保存当前用户信息
      this.saveCurrentUser({
        id: studentId,
        name: '默认学生',
        role: 'student',
        avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=student+avatar&sign=029837c01a92e460db523ebdd26ca87a'
      });
      
      return studentId;
    } catch (error) {
      console.error('Error getting current student ID:', error);
      // 出错时生成新的随机学生ID
      const fallbackId = 'student_fallback_' + Math.floor(Math.random() * 1000000);
      localStorage.setItem('currentStudentId', fallbackId);
      return fallbackId;
    }
  }

  // 词库数据管理
  static getWordBanks(): WordBank[] {
    const data = localStorage.getItem('wordBanks');
    return data ? JSON.parse(data) : [];
  }

   static saveWordBanks(banks: WordBank[]): void {
       localStorage.setItem('wordBanks', JSON.stringify(banks));
       // 触发storage事件以通知其他页面词库已更新
       window.dispatchEvent(new Event('storage'));
   }

  static getBankWords(bankId: string): Word[] {
    try {
      // 尝试获取专用的词库单词存储
      const bankData = localStorage.getItem(`bankWords_${bankId}`);
      if (bankData) {
        return JSON.parse(bankData);
      }
      
      // 如果没有专用存储，从所有单词中筛选
      console.log(`Falling back to filtering all words for bank ${bankId}`);
      const allWords = this.getWords();
      const bankWords = allWords.filter(word => word.bankId === bankId);
      
      // 缓存结果以备将来使用
      if (bankWords.length > 0) {
        localStorage.setItem(`bankWords_${bankId}`, JSON.stringify(bankWords));
      }
      
      return bankWords;
    } catch (error) {
      console.error(`Error getting bank words for ${bankId}:`, error);
      return [];
    }
  }

  // 检查存储配额
  // 计算数据大小（字节）
  static calculateDataSize(data: any): number {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return new Blob([str]).size;
  }

  // 获取localStorage使用情况
  static getStorageUsage(): { used: number; total: number; percent: number } {
    const total = 10 * 1024 * 1024; // 10MB默认配额
    let used = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        used += value ? this.calculateDataSize(value) : 0;
      }
    }
    
    return {
      used,
      total,
      percent: Math.round((used / total) * 100)
    };
  }

  // 检查存储配额
  static checkStorageQuota(data: string): { success: boolean; message?: string; usage?: { used: number; total: number; percent: number } } {
    try {
      const usage = this.getStorageUsage();
      const dataSize = this.calculateDataSize(data);
      const availableSpace = usage.total - usage.used;
      
      // 如果剩余空间不足，返回失败
      if (dataSize > availableSpace) {
        return {
          success: false,
          message: `存储空间不足，需要${Math.round(dataSize/1024)}KB，但仅剩余${Math.round(availableSpace/1024)}KB`,
          usage
        };
      }
      
      // 创建测试数据来验证存储容量
      const testKey = 'storage_test_' + Date.now();
      localStorage.setItem(testKey, data);
      localStorage.removeItem(testKey);
      
      return { success: true, usage };
    } catch (error) {
      const usage = this.getStorageUsage();
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      console.error('Storage quota exceeded:', errorMsg);
      return {
        success: false,
        message: `存储配额不足: ${errorMsg}`,
        usage
      };
    }
  }

   static saveBankWords(bankId: string, words: Word[]): {success: boolean; message?: string; usage?: { used: number; total: number; percent: number }} {
    try {
      // 计算每批大小（约200KB每批，约1000个单词）
      const batchSize = 1000;
      const totalBatches = Math.ceil(words.length / batchSize);
      const bankWordsKey = `bankWords_${bankId}`;
      
      // 先保存批次信息
      localStorage.setItem(`${bankWordsKey}_batch_info`, JSON.stringify({
        totalBatches,
        totalWords: words.length,
        completedBatches: 0
      }));
      
      // 获取现有单词
      let existingWords: Word[] = [];
      const existingData = localStorage.getItem(bankWordsKey);
      if (existingData) {
        try {
          existingWords = JSON.parse(existingData);
        } catch (e) {
          console.error('Failed to parse existing words, starting fresh:', e);
          existingWords = [];
        }
      }
      
      // 添加新单词（去重）
      const existingWordSet = new Set(existingWords.map(w => `${w.word}_${w.unit}`));
      const newWords = words.filter(word => !existingWordSet.has(`${word.word}_${word.unit}`));
      
      // 添加bankId关联
      const wordsWithBankId = newWords.map(word => ({
        ...word,
        bankId
      }));
      
      if (newWords.length === 0) {
        return { 
          success: true, 
          message: '没有发现新单词需要导入（已去重）',
          usage: this.getStorageUsage()
        };
      }
      
      // 检查存储配额
      const wordData = JSON.stringify([...existingWords, ...wordsWithBankId]);
      const quotaCheck = this.checkStorageQuota(wordData);
      
      if (!quotaCheck.success && totalBatches === 1) {
        console.error('存储配额不足，无法保存词库数据:', quotaCheck.message);
        return quotaCheck;
      }
      
      // 如果空间足够，一次性保存
      if (quotaCheck.success) {
        localStorage.setItem(bankWordsKey, JSON.stringify([...existingWords, ...wordsWithBankId]));
        
        // 更新词库单词数量
        const banks = this.getWordBanks();
        const updatedBanks = banks.map(bank => {
          if (bank.id === bankId) {
            return {
              ...bank,
              wordCount: existingWords.length + newWords.length
            };
          }
          return bank;
        });
        this.saveWordBanks(updatedBanks);
        
        return { success: true, usage: quotaCheck.usage };
      }
      
      // 空间不足，使用分批保存策略
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, newWords.length);
        const batch = newWords.slice(start, end);
        const batchKey = `${bankWordsKey}_batch_${i}`;
        
        // 保存批次数据
        localStorage.setItem(batchKey, JSON.stringify(batch));
        
        // 更新批次进度
        const batchInfo = JSON.parse(localStorage.getItem(`${bankWordsKey}_batch_info`) || '{}');
        batchInfo.completedBatches = i + 1;
        localStorage.setItem(`${bankWordsKey}_batch_info`, JSON.stringify(batchInfo));
      }
      
      // 更新词库信息
      const banks = this.getWordBanks();
      const updatedBanks = banks.map(bank => {
        if (bank.id === bankId) {
          return {
            ...bank,
            wordCount: existingWords.length + newWords.length,
            batchImport: {
              totalBatches,
              completedBatches: totalBatches,
              totalWords: newWords.length
            }
          };
        }
        return bank;
      });
      this.saveWordBanks(updatedBanks);
      
      return { 
        success: true, 
        message: `已成功导入 ${newWords.length} 个单词（分 ${totalBatches} 批保存）`,
        usage: this.getStorageUsage()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '保存词库时发生未知错误';
      console.error('保存词库失败:', errorMsg);
      return { success: false, message: errorMsg };
    }
  }


  static deleteBank(bankId: string): void {
    // 删除词库
    const banks = this.getWordBanks();
    const updatedBanks = banks.filter(bank => bank.id !== bankId);
    this.saveWordBanks(updatedBanks);
    
  // 删除词库中的单词
  localStorage.removeItem(`bankWords_${bankId}`);
  
  // 清理可能的批量存储数据
  const batchKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('phonicsMaster_words_batch_') || 
    key.startsWith(`bankWords_${bankId}`)
  );
  
  batchKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 触发存储事件以刷新UI
  window.dispatchEvent(new Event('storage'));
  }

  // 单词数据管理


  // 分块保存单词以避免超出localStorage限制
  static saveWords(words: Word[]): void {
    try {
      // 对于大量单词使用分块保存
      if (words.length > 100) {
        this.saveWordsInBatches(words);
      } else {
        localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
        console.log(`单词数据保存成功，共保存 ${words.length} 个单词`);
      }
    } catch (error) {
      console.error("保存单词数据到本地存储失败:", error);
      throw error;
    }
  }

  // 分块保存单词以避免超出localStorage限制
  static saveWordsInBatches(words: Word[], batchSize: number = 500): void {
    try {
      // 清除现有单词数据
      localStorage.removeItem(STORAGE_KEYS.WORDS);
      
      // 分块保存
      const totalBatches = Math.ceil(words.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, words.length);
        const batch = words.slice(start, end);
        
        localStorage.setItem(`${STORAGE_KEYS.WORDS}_batch_${i}`, JSON.stringify(batch));
      }
      
      // 保存分块信息
      localStorage.setItem(`${STORAGE_KEYS.WORDS}_batch_info`, JSON.stringify({
        totalBatches,
        totalWords: words.length,
        batchSize
      }));
      
      console.log(`单词数据已分 ${totalBatches} 块保存，共 ${words.length} 个单词`);
    } catch (error) {
      console.error("分块保存单词数据失败:", error);
      throw error;
    }
  }

  // 检查存储空间是否充足
  static checkStorageSpace(data: any): boolean {
    try {
      // 获取当前localStorage使用情况
      const currentUsage = encodeURIComponent(JSON.stringify(localStorage)).length;
      const newDataSize = encodeURIComponent(JSON.stringify(data)).length;
    const maxSize = 9.5 * 1024 * 1024; // 预留500KB空间
      
      return currentUsage + newDataSize < maxSize;
    } catch (error) {
      console.error("检查存储空间失败:", error);
      return false;
    }
  }

  // 分块保存单词
  static saveWordsInChunks(words: Word[]): void {
    // 清除现有单词数据
    localStorage.removeItem(STORAGE_KEYS.WORDS);
    
    // 计算每块大小（约400个单词一块）
    const chunkSize = Math.max(1, Math.floor(words.length / 10));
    const totalChunks = Math.ceil(words.length / chunkSize);
    
    // 保存分块信息
    localStorage.setItem(`${STORAGE_KEYS.WORDS}_chunkInfo`, JSON.stringify({
      totalChunks,
      totalWords: words.length,
      savedChunks: 0
    }));
    
    // 分块保存
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, words.length);
      const chunk =words.slice(start, end);
      
      localStorage.setItem(`${STORAGE_KEYS.WORDS}_chunk_${i}`, JSON.stringify(chunk));
      
      // 更新已保存块数
      const chunkInfo = JSON.parse(localStorage.getItem(`${STORAGE_KEYS.WORDS}_chunkInfo`) || '{}');
      chunkInfo.savedChunks = i + 1;
      localStorage.setItem(`${STORAGE_KEYS.WORDS}_chunkInfo`, JSON.stringify(chunkInfo));
    }
    
    console.log(`单词数据已分 ${totalChunks} 块保存，共 ${words.length} 个单词`);
  }

  // 获取所有单词（处理分块存储情况）
  // 分块保存单词到localStorage

  
  static getWords(): Word[] {
    try {
      // 检查是否存在分块存储
      const chunkInfoStr = localStorage.getItem(`${STORAGE_KEYS.WORDS}_chunkInfo`);
      
      if (chunkInfoStr) {
        const chunkInfo = JSON.parse(chunkInfoStr);
        const allWords: Word[] = [];
        
        // 读取所有块
        for (let i = 0; i < chunkInfo.totalChunks; i++) {
          const chunkStr = localStorage.getItem(`${STORAGE_KEYS.WORDS}_chunk_${i}`);
          if (chunkStr) {
            allWords.push(...JSON.parse(chunkStr));
          }
        }
        
        return allWords;
      }
      
      // 常规存储方式
      const data = localStorage.getItem(STORAGE_KEYS.WORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("获取单词数据失败:", error);
      return [];
    }
  }

  // 批量添加单词
  static bulkAddWords(words: Omit<Word, 'id'>[]): string[] {
    const existingWords = this.getWords();
    const newWordIds: string[] = [];
    const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));
    
    words.forEach(word => {
      // 跳过重复单词
      if (existingWordSet.has(word.word.toLowerCase())) {
        return;
      }
      
      // 生成唯一ID
      const newId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
      existingWords.push({ ...word, id: newId });
      newWordIds.push(newId);
      existingWordSet.add(word.word.toLowerCase());
    });
    
    this.saveWords(existingWords);
    
    // 更新最后同步时间
    this.updateLastSync();
    
    return newWordIds;
  }

  // 学生数据管理
  static getStudents(): Student[] {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  }

  static saveStudents(students: Student[]): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.updateLastSync();
  }

  // 添加学习记录
  // 保存学习进度
  static saveLearningProgress(studentId: string, wordId: string, progress: number): void {
    try {
      const progressData = {
        studentId,
        wordId,
        progress,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`learningProgress_${studentId}`, JSON.stringify(progressData));
      
      // 同时更新最后同步时间
      this.updateLastSync();
    } catch (error) {
      console.error('Failed to save learning progress:', error);
    }
  }
  
  // 获取学习进度
  static getLearningProgress(studentId: string): {wordId: string, progress: number, timestamp: string} | null {
    try {
      const progressData = localStorage.getItem(`learningProgress_${studentId}`);
      return progressData ? JSON.parse(progressData) : null;
    } catch (error) {
      console.error('Failed to get learning progress:', error);
      return null;
    }
  }
  
  static addLearningRecord(studentId: string, record: Omit<LearningRecord, 'id'>): void {
    try {
      const students = this.getStudents();
      const studentIndex = students.findIndex(s => s.id === studentId);
      
      if (studentIndex !== -1) {
        // 创建带时间戳的新记录
        const timestamp = new Date().toISOString();
        const newRecord: LearningRecord = {
          ...record,
          id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: timestamp
        };
        
        // 初始化学习记录数组（如果不存在）
        if (!students[studentIndex].learningRecords) {
          students[studentIndex].learningRecords = [];
        }
        
        // 添加新记录到数组开头
        students[studentIndex].learningRecords.unshift(newRecord);
        
        // 精确计算总学时（保留两位小数）
        const currentHours = students[studentIndex].studyHours || 0;

        
        // 计算掌握率对进度的影响
        const progressIncrement = Math.round(record.duration * 10 * (record.masteryRate / 100));
        students[studentIndex].progress = Math.min(100, students[studentIndex].progress + progressIncrement);
        
        this.saveStudents(students);
        
        // 触发自定义事件通知学习记录页面更新
        const event = new CustomEvent('learningRecordsUpdated', { 
          detail: { 
            studentId,
            record: newRecord,
            timestamp: timestamp
          } 
        });
        window.dispatchEvent(event);
        
        console.log(`Added learning record for student ${studentId}:`, newRecord);
      } else {
        console.error(`Student with ID ${studentId} not found`);
      }
    } catch (error) {
      console.error('Failed to add learning record:', error);
      // 尝试恢复数据
      try {
        localStorage.removeItem('learningRecordsBackup');
        localStorage.setItem('learningRecordsBackup', JSON.stringify(this.getStudents()));
      } catch (backupError) {
        console.error('Failed to backup student data:', backupError);
      }
      throw error;
    }
  }

  // 获取学生学习记录
  static getLearningRecords(studentId: string): LearningRecord[] {
    try {
      const student = this.getStudents().find(s => s.id === studentId);
      return student?.learningRecords || [];
    } catch (error) {
      console.error('Failed to get learning records:', error);
      return [];
    }
  }

  static addStudent(student: Student): void {
    const students = this.getStudents();
    // 确保ID唯一
    const existingIds = new Set(students.map(s => s.id));
    while (existingIds.has(student.id)) {
      student.id = (parseInt(student.id) + 1).toString();
    }
    
    students.push(student);
    this.saveStudents(students);
  }

  static updateStudent(updatedStudent: Student): void {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === updatedStudent.id);
    if (index !== -1) {
      students[index] = updatedStudent;
      this.saveStudents(students);
    }
  }

  static deleteStudent(id: string): void {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    this.saveStudents(students);
  }

  // 课程计划数据管理
  static getCoursePlans(): CoursePlan[] {
    const data = localStorage.getItem(STORAGE_KEYS.COURSE_PLANS);
    return data ? JSON.parse(data) : [];
  }

  static saveCoursePlans(plans: CoursePlan[]): void {
    localStorage.setItem(STORAGE_KEYS.COURSE_PLANS, JSON.stringify(plans));
    this.updateLastSync();
  }

  // 系统设置管理
  static getSettings(): SystemSettings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {
      textbookVersion: '人教版',
      pronunciationSpeed: 'slow',
      memoryCurveReminder: 'daily',
      theme: 'blue'
    };
  }

  static saveSettings(settings: SystemSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // 同步时间管理
  static getLastSync(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || '';
  }

  static updateLastSync(): void {
    const now = new Date();
    const formattedDateTime = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, formattedDateTime);
  }

   // 数据导入导出
   static exportAllData(): Blob {
     const data = {
       words: this.getWords(),
       students: this.getStudents(),
       coursePlans: this.getCoursePlans(),
       settings: this.getSettings(),
       exportDate: new Date().toISOString()
     };     
     return new Blob([JSON.stringify(data, null, 2)], {
       type: 'application/json'
     });
   }
   
   // 同步选中的学习单词，限制最大数量为30000
      static syncLearningWords(words: Word[]): {success: boolean; message?: string} {
        try {
          // 检查单词数量是否超过限制
          if (words.length > 100000) {
            console.error('单词数量超过上限100000个');
            // 触发错误事件，让UI层可以捕获并显示错误信息
            const event = new CustomEvent('wordSyncError', {
              detail: { 
                message: '同步失败：单次同步单词数量不能超过100000个',
                code: 'WORD_LIMIT_EXCEEDED'
              }
            });
            window.dispatchEvent(event);
            return {success: false, message: '单词数量超过上限100000个'};
          }
          
          // 针对大量单词优化存储方式
          if (words.length > 5000) {
            console.log(`检测到大量单词(${words.length}个)，使用分块存储优化`);
            this.saveLargeDataInChunks('syncedWords', words);
            return {success: true, message: `已使用分块存储优化，共存储 ${words.length} 个单词`};
          }
         
         // 检查存储空间
         const storageCheck = this.checkStorageQuota(JSON.stringify(words));
         if (!storageCheck.success) {
           console.error('存储空间不足', storageCheck.message);
           const event = new CustomEvent('wordSyncError', {
             detail: { 
               message: storageCheck.message || '存储空间不足，无法同步所有单词',
               code: 'STORAGE_QUOTA_EXCEEDED'
             }
           });
           window.dispatchEvent(event);
           return {success: false, message: storageCheck.message};
         }
         
         // 获取当前选中的词库ID
         const currentBankId = localStorage.getItem('selectedWordBankId');
         if (currentBankId) {
           // 保存当前词库ID到同步记录中
           localStorage.setItem('lastSyncedBankId', currentBankId);
           
           // 获取当前词库信息
           const wordBanks = this.getWordBanks();
           const currentBank = wordBanks.find(bank => bank.id === currentBankId);
           
           // 触发词库同步事件
           const event = new CustomEvent('bankSyncUpdated', {
             detail: { 
               bankId: currentBankId,
               bankName: currentBank?.name || '未知词库',
               wordCount: words.length
             }
           });
           window.dispatchEvent(event);
         }
         
         // 分块保存大量单词
         if (words.length > 5000) {
           this.saveLargeDataInChunks('syncedWords', words);
         } else {
           localStorage.setItem('syncedWords', JSON.stringify(words));
         }
         
         this.updateLastSync();
         
         // 验证保存是否成功
         const savedWords = this.getSyncedWords();
         if (savedWords.length !== words.length) {
           console.error("Word sync failed: saved words count does not match");
           throw new Error("单词同步失败: 存储数据不完整");
         }
         
         // 触发自定义事件通知其他页面数据已更新
         const event = new CustomEvent('wordSyncCompleted', {
           detail: {
             wordCount: words.length,
             timestamp: new Date().toISOString()
           }
         });
         window.dispatchEvent(event);
         
         console.log(`成功同步 ${words.length} 个单词到自然拼读记忆页面`);
         return {success: true};
       } catch (error) {
         console.error("单词同步失败:", error);
         // 触发错误事件
         const event = new CustomEvent('wordSyncError', {
           detail: { 
             message: error instanceof Error ? error.message : '单词同步失败',
             code: 'SYNC_FAILED'
           }
         });
         window.dispatchEvent(event);
         return {success: false, message: error instanceof Error ? error.message : '单词同步失败'};
       }
     }
     
     // 分块保存大量数据到localStorage
     static saveLargeDataInChunks(key: string, data: any[]): void {
       // 清除旧数据
       this.clearChunkedData(key);
       
       // 每块500条数据
       const chunkSize = 500;
       const totalChunks = Math.ceil(data.length / chunkSize);
       
       // 保存块信息
       localStorage.setItem(`${key}_chunk_info`, JSON.stringify({
         totalChunks,
         totalItems: data.length,
         chunkSize
       }));
       
       // 分块保存
       for (let i = 0; i < totalChunks; i++) {
         const start = i * chunkSize;
         const end = Math.min((i + 1) * chunkSize, data.length);
         const chunk = data.slice(start, end);
         localStorage.setItem(`${key}_chunk_${i}`, JSON.stringify(chunk));
       }
     }
     
     // 清除分块数据
     static clearChunkedData(key: string): void {
       const chunkInfoStr = localStorage.getItem(`${key}_chunk_info`);
       if (chunkInfoStr) {
         const chunkInfo = JSON.parse(chunkInfoStr);
         for (let i = 0; i < chunkInfo.totalChunks; i++) {
           localStorage.removeItem(`${key}_chunk_${i}`);
         }
         localStorage.removeItem(`${key}_chunk_info`);
       }
       localStorage.removeItem(key);
     }
      
         // 获取同步的单词 - 增强版，支持分块数据和数据验证
         static getSyncedWords(): Word[] {
           try {
             // 先检查是否有分块数据
             const chunkInfoStr = localStorage.getItem('syncedWords_chunk_info');
             
             if (chunkInfoStr) {
               const chunkInfo = JSON.parse(chunkInfoStr);
               const allWords: Word[] = [];
               
               // 读取所有块
               for (let i = 0; i < chunkInfo.totalChunks; i++) {
                 const chunkStr = localStorage.getItem(`syncedWords_chunk_${i}`);
                 if (chunkStr) {
                   const chunk = JSON.parse(chunkStr);
                   if (Array.isArray(chunk)) {
                     allWords.push(...chunk);
                   }
                 }
               }
               
               return this.validateWordData(allWords);
             }
             
             // 普通方式读取
             const syncedWordsStr = localStorage.getItem('syncedWords');
             if (!syncedWordsStr) return [];
             
             const syncedWords = JSON.parse(syncedWordsStr);
             
             // 验证数据格式
             if (!Array.isArray(syncedWords)) {
               console.error('Synced words is not an array');
               return [];
             }
             
             return this.validateWordData(syncedWords);
           } catch (error) {
             console.error('Failed to get synced words:', error);
             
             // 尝试恢复数据
             try {
               this.clearChunkedData('syncedWords');
             } catch (cleanupError) {
               console.error('Failed to clean up corrupted synced words:', cleanupError);
             }
             
             return [];
           }
        }
        
        // 验证单词数据并补全必要字段
        static validateWordData(words: any[]): Word[] {
          return words.filter(word => {
            // 基本验证
            if (!word || typeof word !== 'object' || !word.word || !word.id) {
              console.warn('Invalid word format:', word);
              return false;
            }
            
            // 补全必要字段
            if (!word.syllables) word.syllables = [];
            if (!word.definitions) word.definitions = [];
            if (!word.bankId) word.bankId = localStorage.getItem('selectedWordBankId') || '';
            
            return true;
          });
        }
     
     // 获取学习历史
     static getLearningHistory(): Record<string, number> {
       try {
         return JSON.parse(localStorage.getItem('learningHistory') || '{}');
       } catch (error) {
         console.error('Failed to get learning history:', error);
         return {};
       }
     }
     
     // 更新单词学习进度
      static updateWordProgress(wordId: string, progress: number): void {
        try {
          const learningHistory = this.getLearningHistory();
          learningHistory[wordId] = progress;
          localStorage.setItem('learningHistory', JSON.stringify(learningHistory));
          
          // 触发自定义事件通知其他页面数据已更新
          const event = new Event('learningProgressUpdated');
          window.dispatchEvent(event);
        } catch (error) {
          console.error('Failed to update word progress:', error);
        }
      }
      
      // 错词本管理
       static getMistakeWords(): MistakeWord[] {
         try {
           return JSON.parse(localStorage.getItem('mistakeWords') || '[]');
         } catch (error) {
           console.error('Failed to get mistake words:', error);
           return [];
         }
       }

       // 获取补丁计划单词
       static getPatchPlanWords(): MistakeWord[] {
         try {
           return JSON.parse(localStorage.getItem('patchPlanWords') || '[]');
         } catch (error) {
           console.error('Failed to get patch plan words:', error);
           return [];
         }
       }

       // 保存补丁计划单词
       static savePatchPlanWords(words: MistakeWord[]): void {
         try {
           localStorage.setItem('patchPlanWords', JSON.stringify(words));
           this.updateLastSync();
           
           // 触发事件通知九宫格复习页面更新
           const event = new CustomEvent('patchPlanUpdated', {
             detail: { wordCount: words.length }
           });
           window.dispatchEvent(event);
         } catch (error) {
           console.error('Failed to save patch plan words:', error);
         }
       }
       
       static addToMistakeWords(word: Word): void {
         try {
           const mistakeWords = this.getMistakeWords();
           const existingIndex = mistakeWords.findIndex(w => w.id === word.id);
           
           if (existingIndex >= 0) {
             // 更新已有错词的错误次数和日期
             mistakeWords[existingIndex] = {
               ...mistakeWords[existingIndex],
               mistakeCount: mistakeWords[existingIndex].mistakeCount + 1,
               lastMistakeDate: new Date().toISOString()
             };
           } else {
             // 添加新错词
           mistakeWords.push({
              ...word,
              mistakeCount: 1,
              lastMistakeDate: new Date().toISOString(),
              reviewLevel: 1 // 默认新错词为等级1
            });
            
            // 更新新错词计数显示
            const event = new CustomEvent('newMistakeAdded', {
              detail: { 
                wordId: word.id,
                totalCount: mistakeWords.length
              }
            });
            window.dispatchEvent(event);
          }
          
       localStorage.setItem('mistakeWords', JSON.stringify(mistakeWords));
       
       // 触发自定义事件通知单词状态已更新
       const event = new CustomEvent('wordStatusUpdated', {
          detail: {
            wordId: word.id,
            reviewLevel: 1
          }
        });
       window.dispatchEvent(event);
          
          // 触发错词更新事件
          const mistakeEvent = new Event('mistakeWordsUpdated');
          window.dispatchEvent(mistakeEvent);
        } catch (error) {
          console.error('Failed to add to mistake words:', error);
        }
      }
      
      static clearMistakeWords(): void {
        try {
          localStorage.removeItem('mistakeWords');
          const event = new Event('mistakeWordsUpdated');
          window.dispatchEvent(event);
        } catch (error) {
          console.error('Failed to clear mistake words:', error);
        }
      }
   // 获取同步的学习单词ID
  static getSyncedWordIds(): string[] {
  const data = localStorage.getItem('syncedWordIds');

  return data ? JSON.parse(data) : [];
}

  // 获取用于复习的错词
  static getMistakeWordsForReview(): MistakeWord[] {
    try {
      const data = localStorage.getItem('mistakeWordsForReview');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get mistake words for review:', error);
      return [];
    }
  }

 static importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.words) this.saveWords(data.words);
      if (data.students) this.saveStudents(data.students);
      if (data.coursePlans) this.saveCoursePlans(data.coursePlans);
      if (data.settings) this.saveSettings(data.settings);
      
      this.updateLastSync();
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

   // 获取当前用户信息
  static getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        return JSON.parse(userData);
      }
      
      // 如果没有当前用户，创建默认学生用户
      const defaultUser = {
        id: 'student1',
        name: '默认学生',
        role: '学生',
        avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=student+avatar&sign=029837c01a92e460db523ebdd26ca87a'
      };
      
      localStorage.setItem('currentUser', JSON.stringify(defaultUser));
      return defaultUser;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      localStorage.removeItem('currentUser');
      
      // 创建默认学生用户
      const defaultUser = {
        id: 'student1',
        name: '默认学生',
        role: '学生',
        avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=student+avatar&sign=029837c01a92e460db523ebdd26ca87a'
      };
      
      localStorage.setItem('currentUser', JSON.stringify(defaultUser));
      return defaultUser;
    }
  }
  
  // 保存当前用户信息
  static saveCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
  
  // 九宫格复习记录管理
  static getGridReviewRecords(): MemoryStage[] {
    try {
      const data = localStorage.getItem('gridReviewRecords');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get grid review records:', error);
      return [];
    }
  }

  static saveGridReviewRecords(records: MemoryStage[]): void {
    try {
      localStorage.setItem('gridReviewRecords', JSON.stringify(records));
      this.updateLastSync();
    } catch (error) {
      console.error('Failed to save grid review records:', error);
    }
  }
  
  // 课表数据管理
   // 清理缓存数据
  static clearCache(): {success: boolean; message: string; freedSpace: number} {
    try {
      const initialUsage = this.getStorageUsage();
      const keysToRemove: string[] = [];
      
      // 清理批量导入的临时文件
      Object.keys(localStorage).forEach(key => {
        // 清理词库单词批次数据
        if (key.startsWith('bankWords_') && key.includes('_batch_')) {
          keysToRemove.push(key);
        }
        // 清理单词分块数据
        if (key.startsWith('phonicsMaster_words_chunk_') || 
            key.startsWith('phonicsMaster_words_batch_')) {
          keysToRemove.push(key);
        }
        // 清理临时同步数据
        if (key === 'syncedWords' || key === 'importTempData') {
          keysToRemove.push(key);
        }
        // 清理调试和测试数据
        if (key.startsWith('debug_') || key.startsWith('test_')) {
          keysToRemove.push(key);
        }
      });
      
      // 执行清理
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 计算释放的空间
      const finalUsage = this.getStorageUsage();
      const freedSpace = initialUsage.used - finalUsage.used;
      
      // 触发存储更新事件
      window.dispatchEvent(new Event('storage'));
      
      return {
        success: true,
        message: `成功清理缓存，释放了${Math.round(freedSpace / 1024)}KB空间`,
        freedSpace
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '清理缓存时发生未知错误';
      console.error('清理缓存失败:', errorMsg);
      return {
        success: false,
        message: errorMsg,
        freedSpace: 0
      };
    }
  }

   static saveScheduleData(date: string, schedule: ScheduleItem[]): void {
    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    scheduleData[date] = schedule;
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    this.updateLastSync();
  }
  
  static getScheduleData(date: string): ScheduleItem[] {
    const scheduleData = JSON.parse(localStorage.getItem('scheduleData') || '{}');
    return scheduleData[date] || [];
  }
  
  static initializeDefaultDataIfNeeded(defaultData: {
    words: Word[],
    students: Student[],
    coursePlans: CoursePlan[],
    user: User
  }): void {
    if (this.getWords().length === 0 && defaultData.words.length > 0) {
      this.saveWords(defaultData.words);
    }
    
    if (this.getStudents().length === 0 && defaultData.students.length > 0) {
      this.saveStudents(defaultData.students);
    }
    
  // 不初始化课程计划数据，确保默认显示空状态
  // if (this.getCoursePlans().length === 0 && defaultData.coursePlans.length > 0) {
  //   this.saveCoursePlans(defaultData.coursePlans);
  // }
    
  if (!this.getCurrentUser()) {
    this.saveCurrentUser(defaultData.user);
  }

  // 确保学生数据和课程计划始终从空开始
  this.saveStudents([]);
  this.saveCoursePlans([]);
  }
}