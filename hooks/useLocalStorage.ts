import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { LocalStorageService } from '@/lib/localStorage';
import { Word, Student, CoursePlan, SystemSettings } from '@/types';

// 自定义Hook - 单词数据管理
export function useWords() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载单词数据
  const loadWords = () => {
    setLoading(true);
    try {
      const data = LocalStorageService.getWords();      
      setWords(data);
    } catch (error) {
      console.error('Failed to load words:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadWords();
  }, []);

  // 添加单词
  const addWord = (word: Word) => {
    LocalStorageService.addWord(word);
    loadWords();
  };

  // 更新单词
  const updateWord = (word: Word) => {  
    LocalStorageService.updateWord(word);
    loadWords();
  };

  // 删除单词
  const deleteWord = (id: string) => {
    LocalStorageService.deleteWord(id);
    loadWords();
  };

  // 批量删除单词
  const batchDeleteWords = (ids: string[]) => {
    let words = LocalStorageService.getWords();
    words = words.filter(w => !ids.includes(w.id));
    LocalStorageService.saveWords(words);
    loadWords();
  };

  return { words, loading, addWord, updateWord, deleteWord, batchDeleteWords, refreshWords: loadWords };
}
 
  // 批量添加单词
  export function bulkAddWords(words: Omit<Word, 'id'>[]): Promise<string[]> {
    return new Promise((resolve) => {
      // 模拟异步操作
      setTimeout(() => {
        const newWordIds = LocalStorageService.bulkAddWords(words);
        resolve(newWordIds);
      }, 500);
    });
  }
  
export function parseExcelFile(file: File, autoRepair = false): Promise<{words: Omit<Word, 'id'>[], errors: string[], repaired: boolean}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const errorDetails: string[] = [];
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 验证工作簿是否包含工作表
        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel文件中没有找到工作表，请确保文件包含至少一个工作表');
        }
        
        const firstSheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[firstSheetName];
        
        // 获取工作表范围以检查表头
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const headerRow = range.s.r; // 表头行
        
        // 提取表头并规范化处理
        const headers: Array<{original: string, normalized: string}> = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c });
          const cell = worksheet[cellAddress];
          // 规范化表头：保留原始值用于错误提示，同时创建规范化版本用于匹配
          const originalHeader = (cell?.v || '').toString().trim();
          const normalizedHeader = originalHeader
            .replace(/\s+/g, '') // 去除所有空格
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '') // Remove special characters
            .toLowerCase();
          headers.push({ original: originalHeader, normalized: normalizedHeader });
        }
        
        // 验证是否包含所有必需的中文表头 - 支持更多变体匹配
        const requiredHeaders = [
          { name: '单词', aliases: ['word', '词语', '英文', 'english', 'vocabulary'] },
          { name: '音标', aliases: ['phonetic', '拼音', '注音', 'pronunciation'] },
          { name: '释义', aliases: ['解释', '中文', '意思', 'translation', 'definition'] },
          { name: '音节', aliases: ['syllable', '音节划分', '音节数'] },
          { name: '教材', aliases: ['课本', '教材版本', 'textbook', 'book'] },
          { name: '年级', aliases: ['grade', '学年', 'level'] }
        ];
        
        const headerMap: Record<string, {index: number, originalHeader: string}> = {};
        const missingHeaders: string[] = [];
        
        // 智能表头匹配 - 增强版
        requiredHeaders.forEach(({ name, aliases }) => {
          // 创建所有可能的匹配关键词
          const keywords = [name.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
          
          // 在表头中查找匹配项 - 使用更宽松的匹配规则
          let foundIndex = -1;
          let originalHeader = '';
          
          // 首先尝试精确匹配
          for (let i = 0; i < headers.length; i++) {
            if (keywords.includes(headers[i].normalized)) {
              foundIndex = i;
              originalHeader = headers[i].original;
              break;
            }
          }
          
          // 如果没有精确匹配，尝试包含关系匹配
          if (foundIndex === -1) {
            for (let i = 0; i < headers.length; i++) {
              if (keywords.some(keyword => 
                headers[i].normalized.includes(keyword) || keyword.includes(headers[i].normalized)
              )) {
                foundIndex = i;
                originalHeader = headers[i].original;
                break;
              }
            }
          }
          
          if (foundIndex === -1) {
            missingHeaders.push(name);
          } else {
            headerMap[name] = { index: foundIndex, originalHeader };
          }
        });
        
        // 自动修复：如果缺少表头但有相似表头，尝试映射
        let repaired = false;
        if (missingHeaders.length > 0 && autoRepair) {
          const similarHeaders: {original: string, matched: string}[] = [];
          missingHeaders.forEach(missing => {
            const requiredHeader = requiredHeaders.find(h => h.name === missing);
            if (!requiredHeader) return;
            
            const keywords = [missing.toLowerCase(), ...requiredHeader.aliases.map(a => a.toLowerCase())];
            
            for (let i = 0; i < headers.length; i++) {
              if (Object.values(headerMap).some(h => h.index === i)) continue;
              
              if (keywords.some(keyword => 
                headers[i].normalized.includes(keyword) || keyword.includes(headers[i].normalized)
              )) {
                headerMap[missing] = { index: i, originalHeader: headers[i].original };
                similarHeaders.push({original: missing, matched: headers[i].original});
                missingHeaders.splice(missingHeaders.indexOf(missing), 1);
                repaired = true;
                errorDetails.push(`自动修复: 已将"${headers[i].original}"映射为"${missing}"`);
                break;
              }
            }
          });
        }
        
        if (missingHeaders.length > 0) {
          // 生成更友好的错误消息，显示实际找到的表头
          const foundHeaders = requiredHeaders
            .filter(h => !missingHeaders.includes(h.name) && headerMap[h.name])
            .map(h => `${h.name} (${headerMap[h.name].originalHeader})`);
            
          const errorMessage = `Excel文件缺少必需的表头: ${missingHeaders.join(', ')}\n\n已找到的表头: ${foundHeaders.join(', ')}\n\n请确保第一行包含所有必需表头（顺序任意）：\n单词,音标,释义,音节,教材,年级`;
          throw new Error(errorMessage);
        }
        
        // 将Excel数据转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // 如果没有数据行
        if (jsonData.length === 0) {
          throw new Error('Excel文件中没有找到数据行，请确保在表头下方有单词数据');
        }
        
        // 验证并转换数据格式
        const words: Omit<Word, 'id'>[] = [];
        const errors: string[] = [];
        
        jsonData.forEach((item: any, index) => {
          // 跳过空行
          if (!item || Object.keys(item).length === 0) return;
          
          // 验证行数据
          const rowNumber = index + 2; // 行号从2开始(表头+1)
          
          // 获取单元格值的辅助函数
          const getCellValue = (header: string) => {
            if (!headerMap[header]) return '';
            const colIndex = headerMap[header].index;
            const cellAddress = XLSX.utils.encode_cell({ r: headerRow + index + 1, c: colIndex });
            const cell = worksheet[cellAddress];
            return cell?.v?.toString().trim() || '';
          };
          
          // 提取各字段值
          const word = getCellValue('单词');
          const phonetic = getCellValue('音标');
          const definition = getCellValue('释义');
          const syllables = getCellValue('音节');
          const textbook = getCellValue('教材');
          const grade = getCellValue('年级');
          
          // 自动修复逻辑
          const rowErrors: string[] = [];
          
          // 验证单词字段
          if (!word) {
            rowErrors.push(`单词不能为空`);
          }
          
          // 验证音标格式
          if (phonetic && !phonetic.startsWith('/') && !phonetic.endsWith('/')) {
            rowErrors.push('音标格式应为"/.../"');
          }
          
          // 验证释义字段
          if (!definition) {
            rowErrors.push(`释义不能为空`);
          }
          
          // 验证教材字段
          if (!textbook) {
            rowErrors.push(`教材不能为空`);
          }
          
          // 验证年级字段
          if (!grade) {
            rowErrors.push(`年级不能为空`);
          }
          
          // 如果有错误，记录并跳过此行
          if (rowErrors.length > 0) {
            errors.push(`第${rowNumber}行: ${rowErrors.join('; ')}`);
            return;
          }
          
          // 处理音节格式
          let syllablesArray: string[] = [];
          if (syllables) {
            if (syllables.includes(',')) {
              syllablesArray = syllables.split(',').map(s => s.trim()).filter(s => s);
            } else if (syllables.includes(' ')) {
              syllablesArray = syllables.split(' ').map(s => s.trim()).filter(s => s);
            } else {
              syllablesArray = [syllables.trim()];
            }
          }
          
          // 处理音标格式
          let formattedPhonetic = phonetic;
          if (formattedPhonetic && !formattedPhonetic.startsWith('/')) {
            formattedPhonetic = `/${formattedPhonetic}`;
          }
          if (formattedPhonetic && !formattedPhonetic.endsWith('/')) {
            formattedPhonetic = `${formattedPhonetic}/`;
          }
          
          words.push({
            word,
            phonetic: formattedPhonetic,
            definitions: [definition],
            syllables: syllablesArray,
            textbook,
            grade,
            unit: "1" // 默认单元1
          });
        });
        
        if (words.length === 0) {
          const errorMessage = `未找到可导入的单词数据，共发现${errors.length}个错误。请检查Excel文件格式和内容是否符合要求。`;
          if (errors.length > 0) {
            throw new Error(`${errorMessage}\n\n错误详情:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... 还有${errors.length - 5}个错误` : ''}`);
          }
          throw new Error(errorMessage);
        }
        
        // 添加自动修复的错误信息
        if (errorDetails.length > 0) {
          errors.push(...errorDetails);
        }
        
        resolve({ 
          words, 
          errors, 
          repaired 
        });
      } catch (error) {
        // 错误处理增强
        if (error instanceof Error) {
          let errorMessage = error.message;
         
          // 文件格式错误
          if (error.message.includes('Unsupported file format') || error.message.includes('File is not a zip file')) {
            errorMessage = '不支持的文件格式，请确保上传的是.xlsx格式的Excel文件\n\n提示：.xls格式的旧版Excel文件需要先另存为.xlsx格式才能导入';
          } 
          // 解析错误
          else if (error.message.includes('Corrupted zip') || error.message.includes('Could not read zip')) {
            errorMessage = '文件可能已损坏或不是有效的Excel文件，请尝试：\n1. 确认文件扩展名是.xlsx\n2. 用Excel重新保存文件\n3. 检查文件是否被其他程序占用';
          }
        
          reject(new Error(errorMessage));
        } else {
          reject(new Error('解析Excel文件时发生未知错误'));
        }
      }
    };
    
    reader.onerror = () => {
      const errorMessage = '读取文件时发生错误，请检查：\n1. 文件是否有权限访问\n2. 文件大小是否超过限制\n3. 网络连接是否正常';
      reject(new Error(errorMessage));
    };
    
    reader.onabort = () => reject(new Error('文件读取已中止，请重试'));
    reader.readAsArrayBuffer(file);
  });
}

  // 自定义Hook - 学生数据管理
  export function useStudents() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加载学生数据
    const loadStudents = () => {
      setLoading(true);
      setError(null);
      try {
          const data = LocalStorageService.getStudents() || [];
        setStudents(data);
      } catch (error) {
        console.error('Failed to load students:', error);
        setError('加载学生数据失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    // 初始加载
    useEffect(() => {
      loadStudents();
    }, []);

    // 添加学生
    const addStudent = (student: Student) => {
      try {
        LocalStorageService.addStudent(student);
        // 立即重新加载学生列表以确保数据同步
        loadStudents();
        toast.success(`学生 ${student.name} 添加成功`);
      } catch (error) {
        console.error('Failed to add student:', error);
        toast.error('添加学生失败，请重试');
      }
    };

    // 更新学生
    const updateStudent = (student: Student) => {
      try {
        LocalStorageService.updateStudent(student);
        loadStudents();
        toast.success(`学生 ${student.name} 更新成功`);
      } catch (error) {
        console.error('Failed to update student:', error);
        toast.error('更新学生失败，请重试');
      }
    };

    // 删除学生
    const deleteStudent = (id: string) => {
      try {
        const studentToDelete = students.find(s => s.id === id);
        LocalStorageService.deleteStudent(id);
        loadStudents();
        toast.success(`学生 ${studentToDelete?.name} 删除成功`);
      } catch (error) {
        console.error('Failed to delete student:', error);
        toast.error('删除学生失败，请重试');
      }
    };

    return { students, loading, error, addStudent, updateStudent, deleteStudent, refreshStudents: loadStudents };
  }

// 自定义Hook - 课程计划数据管理
export function useCoursePlans() {
  const [coursePlans, setCoursePlans] = useState<CoursePlan[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载课程计划数据
  const loadCoursePlans = () => {
    setLoading(true);
    try {
      const data = LocalStorageService.getCoursePlans();
      setCoursePlans(data);
    } catch (error) {
      console.error('Failed to load course plans:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadCoursePlans();
  }, []);

  // 保存课程计划
  const saveCoursePlans = (plans: CoursePlan[]) => {
    LocalStorageService.saveCoursePlans(plans);
    loadCoursePlans();
  };

  // 获取特定学生的课程计划
  const getPlansByStudentId = (studentId: string) => {
    return coursePlans.filter(plan => plan.studentId === studentId);
  };

  return { coursePlans, loading, saveCoursePlans, refreshCoursePlans: loadCoursePlans, getPlansByStudentId };
}

// 自定义Hook - 系统设置管理
export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>(LocalStorageService.getSettings());

  // 保存设置
  const saveSettings = (newSettings: SystemSettings) => {
    LocalStorageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  return { settings, saveSettings };
}

// 自定义Hook - 数据导入导出
export function useDataImportExport() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 导出数据
    const exportData = (isBackup = false) => {
      setExporting(true);
      try {
        const blob = LocalStorageService.exportAllData();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 根据是否备份设置不同的文件名
        const fileName = isBackup 
          ? `phonicsmaster_backup_${new Date().toISOString().slice(0, 10)}.json`
          : `phonicsmaster_data_${new Date().toISOString().slice(0, 10)}.json`;
          
        a.download = fileName;
        document.body.appendChild(a);
        
        // 使用requestAnimationFrame确保DOM已更新
        requestAnimationFrame(() => {
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
        
        return true;
      } catch (error) {
        console.error('Failed to export data:', error);
        toast.error('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
        return false;
      } finally {
        setExporting(false);
      }
    };

  // 导入数据
   const importData = async (file: File) => {
     setImporting(true);
     try {
  if (file.name.endsWith('.xlsx')) {
    // 处理Excel文件
    const { words: wordData } = await parseExcelFile(file);
    const newWordIds = LocalStorageService.bulkAddWords(wordData);
    return newWordIds.length > 0;
  } else if (file.name.endsWith('.json')) {
    // 处理JSON文件
    const content = await file.text();
    return LocalStorageService.importAllData(content);
  } else {
    throw new Error('不支持的文件格式');
  }

      } catch (error) {
        console.error('Failed to import data:', error);
        // 提供更详细的错误信息
         if (error instanceof Error) {
           // 显示更详细的错误信息
           toast.error(`导入失败: ${error.message}`, {
             duration: 10000, // 延长显示时间
             position: 'bottom-right'
           });
           
           // 如果有具体的行错误，显示在页面上
           const errorListElement = document.getElementById('error-list');
           if (errorListElement && error.message.includes('导入过程中发现')) {
             // 显示错误提示区域
             document.getElementById('import-error-messages')?.classList.remove('hidden');
             
             // 清空现有错误列表
             errorListElement.innerHTML = '';
             
             // 将错误消息拆分为单独的行错误
             const errors = error.message.split('，');
             errors.forEach((err, index) => {
               if (index > 0 && index < errors.length - 1) { // 跳过第一条和最后一条
                 const li = document.createElement('li');
                 li.textContent = err.trim();
                 errorListElement.appendChild(li);
               }
             });
           }
         } else {
           toast.error('数据导入失败，请检查文件格式和内容');
         }
        return false;
      } finally {
       setImporting(false);
     }
   };

  return { importing, exporting, exportData, importData };
}
