import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { WordBank, Word } from "@/types";
import BulkImportModal from "@/components/BulkImportModal";
import { LocalStorageService } from "@/lib/localStorage";
import { SyllableUtils } from "@/lib/utils";

interface ParsedWord {
    id: string;
    word: string;
    phonetic: string;
    meaning: string;
    unit: string;
    partOfSpeech?: string;
    example?: string;
    textbook?: string;
}

const StudyWordBank: React.FC = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [wordBanks, setWordBanks] = useState<WordBank[]>([]);
    const [selectedBankId, setSelectedBankId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [newBankName, setNewBankName] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [importStatus, setImportStatus] = useState("");
    const [importProgress, setImportProgress] = useState(0);
    const [importedWords, setImportedWords] = useState<ParsedWord[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [showSaveProgress, setShowSaveProgress] = useState(false);
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [allWords, setAllWords] = useState<Word[]>([]);
    const [statusMessage, setStatusMessage] = useState("");
    const [selectedBankWords, setSelectedBankWords] = useState<Word[]>([]);
    const [isLoadingWords, setIsLoadingWords] = useState(false);

    const filterWords = () => {
        setStatusMessage("单词列表已更新");
    };

    const addDebugLog = (message: string) => {
        const newLog = `[${new Date().toLocaleTimeString()}] ${message}`;
        setDebugLog(prev => [...prev.slice(-50), newLog]);
        console.log(newLog);
    };

     useEffect(() => {
         // 从localStorage读取上次选中的词库
         const savedBankId = localStorage.getItem('selectedWordBankId');
         if (savedBankId) {
             // 重新获取所有词库以确保包含新创建的词库
             const updatedBanks = LocalStorageService.getWordBanks();
             setWordBanks(updatedBanks);
             
             if (updatedBanks.some(bank => bank.id === savedBankId)) {
                 setSelectedBankId(savedBankId);
             }
         }
         
         // 监听localStorage变化，实现跨页面同步
         const handleStorageChange = (e: StorageEvent) => {
             if (e.key === 'selectedWordBankId') {
                 const newBankId = e.newValue;
                 if (newBankId) {
                     // 重新获取所有词库以确保包含新创建的词库
                     const updatedBanks = LocalStorageService.getWordBanks();
                     setWordBanks(updatedBanks);
                     
                     if (updatedBanks.some(bank => bank.id === newBankId)) {
                         setSelectedBankId(newBankId);
                     }
                 }
             } else if (e.key === 'wordBanks') {
                 // 词库数据发生变化，更新本地状态
                 const updatedBanks = LocalStorageService.getWordBanks();
                 setWordBanks(updatedBanks);
             }
         };
         
         window.addEventListener('storage', handleStorageChange);
         
         const loadData = async () => {
             try {
                 addDebugLog("开始加载词库数据...");
                 setIsLoading(true);
                const banks = LocalStorageService.getWordBanks() || [];
                setWordBanks(banks);
                addDebugLog(`成功加载 ${banks.length} 个词库`);

                if (banks.length > 0) {
                    setSelectedBankId(banks[0].id);
                    addDebugLog(`默认选择词库: ${banks[0].name} (ID: ${banks[0].id})`);
                    addDebugLog("注意：学习管理单词上限为100000个单词");
                } else {
                    addDebugLog("没有找到已保存的词库");
                }
                 } catch (error) {
                     const errorMsg = error instanceof Error ? error.message : "未知错误";
                     addDebugLog(`加载数据失败: ${errorMsg}`);
                     toast.error(`加载词库数据失败: ${errorMsg}`);
                 } finally {
                     setIsLoading(false);
                 }
             };
             
             loadData();
             
             return () => {
                 window.removeEventListener('storage', handleStorageChange);
                setIsLoading(false);
            };
        }, []);

    useEffect(() => {
        if (selectedBankId) {
            setIsLoadingWords(true);
            const words = LocalStorageService.getBankWords(selectedBankId);
            setSelectedBankWords(words);
            setIsLoadingWords(false);
        } else {
            setSelectedBankWords([]);
        }
    }, [selectedBankId]);

    const checkStorageSpace = (data: any): boolean => {
        try {
            const currentUsage = encodeURIComponent(JSON.stringify(localStorage)).length;
            const newDataSize = encodeURIComponent(JSON.stringify(data)).length;
            const maxSize = 5 * 1024 * 1024;

            addDebugLog(
                `存储检查 - 当前使用: ${Math.round(currentUsage / 1024)}KB, 新增数据: ${Math.round(newDataSize / 1024)}KB`
            );

            return currentUsage + newDataSize < maxSize * 0.9;
        } catch (error) {
            addDebugLog(`存储检查失败: ${error instanceof Error ? error.message : "未知错误"}`);
            return false;
        }
    };

    const saveWordsInBatches = async (bankId: string, words: ParsedWord[]): Promise<{
        saved: number;
        total: number;
    }> => {
        return new Promise(resolve => {
            try {
                addDebugLog(`开始保存单词到词库 ${bankId}, 共 ${words.length} 个单词`);
                const allWords: Word[] = LocalStorageService.getWords() || [];
                addDebugLog(`已存在 ${allWords.length} 个单词`);
                const existingWords = new Map(allWords.map(word => [`${word.word}_${word.unit}`, true]));
                const newWords = words.filter(word => !existingWords.has(`${word.word}_${word.unit}`));
                const totalNewWords = newWords.length;

                if (totalNewWords === 0) {
                    addDebugLog("没有发现新单词需要保存（已去重）");

                    resolve({
                        saved: 0,
                        total: words.length
                    });

                    return;
                }

                addDebugLog(`去重后需要保存 ${totalNewWords} 个新单词`);

                if (!checkStorageSpace(newWords)) {
                    addDebugLog("警告: 存储空间不足，可能导致保存失败");
                    toast.warning("存储空间不足，系统将尝试分批保存，但可能需要多次尝试");
                }

                const batchSize = 1000;
                const totalBatches = Math.ceil(totalNewWords / batchSize);
                let savedCount = 0;
                setShowSaveProgress(true);
                setSaveProgress(0);

                const saveBatch = (batchIndex: number) => {
                    if (batchIndex >= totalBatches) {
                        addDebugLog(`所有批次保存完成，共保存 ${savedCount} 个单词`);
                        const wordBanks = LocalStorageService.getWordBanks() || [];

                        const updatedBanks = wordBanks.map(bank => {
                            if (bank.id === bankId) {
                                const units = new Set(newWords.map(word => word.unit));

                                return {
                                    ...bank,
                                    wordCount: bank.wordCount + savedCount,
                                    unitCount: bank.unitCount + units.size
                                };
                            }

                            return bank;
                        });

                        LocalStorageService.saveWordBanks(updatedBanks);
                        setWordBanks(updatedBanks);
                        setShowSaveProgress(false);
                        setSaveProgress(0);

                        resolve({
                            saved: savedCount,
                            total: words.length
                        });

                        return;
                    }

                    const startIndex = batchIndex * batchSize;
                    const endIndex = Math.min((batchIndex + 1) * batchSize, totalNewWords);
                    const currentBatch = newWords.slice(startIndex, endIndex);
                    addDebugLog(`开始保存批次 ${batchIndex + 1}/${totalBatches} (${currentBatch.length}个单词)`);

                    try {
                        const currentWords = LocalStorageService.getWords() || [];
                        const updatedWords = [...currentWords, ...currentBatch];
                        LocalStorageService.saveWords(updatedWords);
                        savedCount += currentBatch.length;
                        const progress = Math.round(savedCount / totalNewWords * 100);
                        setSaveProgress(progress);
                        addDebugLog(`批次 ${batchIndex + 1} 保存成功，累计保存 ${savedCount} 个单词 (${progress}%)`);
                        setTimeout(() => saveBatch(batchIndex + 1), 100);
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : "未知错误";
                        addDebugLog(`批次 ${batchIndex + 1} 保存失败: ${errorMsg}`);
                        toast.error(`保存失败: ${errorMsg}，已成功保存 ${savedCount} 个单词`);
                        const wordBanks = LocalStorageService.getWordBanks() || [];

                        const updatedBanks = wordBanks.map(bank => {
                            if (bank.id === bankId) {
                                const units = new Set(newWords.slice(0, startIndex).map(word => word.unit));

                                return {
                                    ...bank,
                                    wordCount: bank.wordCount + savedCount,
                                    unitCount: bank.unitCount + units.size
                                };
                            }

                            return bank;
                        });

                        LocalStorageService.saveWordBanks(updatedBanks);
                        setWordBanks(updatedBanks);
                        setShowSaveProgress(false);
                        setSaveProgress(0);

                        resolve({
                            saved: savedCount,
                            total: words.length
                        });
                    }
                };

                saveBatch(0);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "未知错误";
                addDebugLog(`保存单词失败: ${errorMsg}`);
                toast.error(`保存单词失败: ${errorMsg}`);
                setShowSaveProgress(false);

                resolve({
                    saved: 0,
                    total: words.length
                });
            }
        });
    };

    const parseExcelFile = (file: File): Promise<ParsedWord[]> => {
        return new Promise((resolve, reject) => {
            addDebugLog(`开始解析文件: ${file.name}, 大小: ${Math.round(file.size / 1024)}KB`);
            const reader = new FileReader();

            reader.onload = e => {
                try {
                    if (!e.target?.result) {
                        throw new Error("文件读取结果为空");
                    }

                    const data = new Uint8Array(e.target.result as ArrayBuffer);

                    const workbook = XLSX.read(data, {
                        type: "array"
                    });

                    addDebugLog(`Excel文件解析成功，包含 ${workbook.SheetNames.length} 个工作表`);
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    addDebugLog(`正在解析工作表: ${firstSheetName}`);
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        throw new Error("工作表中没有发现数据");
                    }

                    const firstRow = jsonData[0] as Record<string, any>;
  // 支持更多可能的表头名称变体
  const columnMapping = {
    "单词": ["单词", "word", "词语", "英文", "english"],
    "音标": ["音标", "phonetic", "拼音", "注音", "pronunciation"],
    "释义": ["释义", "解释", "中文", "意思", "translation", "definition"]
  };
  
  // 查找匹配的列名
  const findColumnMatch = (columnNames: string[], row: Record<string, any>) => {
    for (const name of columnNames) {
      const foundKey = Object.keys(row).find(key => 
        key.toLowerCase() === name.toLowerCase()
      );
      if (foundKey) return foundKey;
    }
    return null;
  };
  
  // 检查必要列
  const columnMatches: Record<string, string> = {};
  const missingColumns: string[] = [];
  
  for (const [required, aliases] of Object.entries(columnMapping)) {
    const match = findColumnMatch(aliases, firstRow);
    if (match) {
      columnMatches[required] = match;
    } else {
      missingColumns.push(required);
    }
  }
  
  if (missingColumns.length > 0) {
    // 生成更友好的错误消息，显示实际找到的表头
    const foundColumns = Object.entries(columnMatches)
      .map(([required, found]) => `${required} (${found})`);
      
    const errorMessage = `Excel文件缺少必要的表头: ${missingColumns.join(", ")}\n\n已找到的表头: ${foundColumns.join(", ")}\n\n请确保第一行包含所有必需表头（顺序任意）：\n单词,音标,释义`;
    throw new Error(errorMessage);
  }

                    addDebugLog("表头验证通过，开始解析单词数据");

        // 添加自动拆分音节选项（默认启用）
        const autoSplitSyllables = true;
        
        const words: ParsedWord[] = jsonData.map((row: any, index: number) => {
          const word = row["单词"]?.toString().trim() || "";
          const phonetic = row["音标"]?.toString().trim() || "";
          let syllables = row["音节"]?.toString().trim() || "";
          
          // 如果没有提供音节且启用了自动拆分，则自动拆分音节
          if (!syllables && autoSplitSyllables && word) {
            try {
              // 使用优化后的音节拆分算法
              const syllableArray = SyllableUtils.autoSplitSyllables(word);
              syllables = syllableArray.join(',');
              addDebugLog(`单词 "${word}" 音节拆分结果: ${syllables}`);
            } catch (error) {
              console.error(`单词 "${word}" 音节拆分失败:`, error);
              addDebugLog(`单词 "${word}" 音节拆分失败: ${error instanceof Error ? error.message : "未知错误"}`);
            }
          }
          
          return {
            id: `${Date.now()}_${index}`,
            word,
            phonetic,
            meaning: row["释义"]?.toString().trim() || "",
            unit: row["单元"]?.toString().trim() || "1",
            partOfSpeech: row["词性"]?.toString().trim() || "",
            example: row["例句"]?.toString().trim() || "",
            textbook: row["教材版本"]?.toString().trim() || "",
            syllables // 添加音节字段
          };
        });

                    const validWords = words.filter(word => word.word && word.meaning);
                    addDebugLog(`文件解析完成，共发现 ${words.length} 个条目，过滤后得到 ${validWords.length} 个有效单词`);
                    resolve(validWords);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : "未知错误";
                    addDebugLog(`解析文件失败: ${errorMsg}`);
                    reject(new Error(`解析文件失败: ${errorMsg}`));
                }
            };

            reader.onerror = () => {
                addDebugLog(`文件读取错误: ${reader.error?.message || "未知错误"}`);
                reject(new Error(`文件读取错误: ${reader.error?.message || "未知错误"}`));
            };

            reader.onabort = () => {
                addDebugLog("文件读取被中止");
                reject(new Error("文件读取被中止"));
            };

            addDebugLog("开始读取文件内容...");
            reader.readAsArrayBuffer(file);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            addDebugLog("未选择任何文件");
            return;
        }

        setImportStatus("处理中...");
        setImportedWords([]);

        try {
            addDebugLog(
                `开始处理文件: ${file.name}, 类型: ${file.type}, 大小: ${Math.round(file.size / 1024)}KB`
            );

  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls'].includes(fileExtension || '')) {
    addDebugLog(`文件类型验证失败: ${file.name} 不是Excel文件，扩展名: ${fileExtension}`);
    setImportStatus("导入失败");
    toast.error("请上传Excel格式的文件(.xlsx或.xls)");
    
    // 显示文件格式帮助提示
    setTimeout(() => {
      toast.info("提示: 如果您使用的是旧版Excel(.xls)，建议另存为.xlsx格式后再尝试导入", {
        duration: 8000
      });
    }, 1000);
    
    return;
  }

            if (!selectedBankId) {
                addDebugLog("未选择目标词库");
                setImportStatus("导入失败");
                toast.error("请先选择一个目标词库");
                return;
            }

            const words = await parseExcelFile(file);
            setImportedWords(words);
            setShowPreview(true);
            setImportStatus(`解析完成，共发现 ${words.length} 个单词`);
            addDebugLog(`文件处理完成，准备显示预览`);
        } catch (error) {
  const errorMsg = error instanceof Error ? error.message : "未知错误";
  addDebugLog(`文件处理失败: ${errorMsg}`);
  setImportStatus("导入失败");
  
  // 针对常见错误类型提供更具体的提示
  if (errorMsg.includes('Unsupported file format') || errorMsg.includes('File is not a zip file')) {
    toast.error("文件格式不支持，请确保上传的是有效的Excel文件(.xlsx或.xls)");
  } else if (errorMsg.includes('缺少必需的表头')) {
    toast.error(`文件格式错误:\n${errorMsg}`, {
      duration: 10000,
      position: 'bottom-right'
    });
  } else {
    toast.error(`文件处理失败: ${errorMsg}`);
  }
        } finally {
            if (e.target)
                e.target.value = "";
        }
    };

    const confirmImportWords = async () => {
        if (!selectedBankId) {
            addDebugLog("确认导入时未选择词库");
            toast.error("请先选择一个目标词库");
            return;
        }

        if (importedWords.length === 0) {
            addDebugLog("没有可导入的单词数据");
            toast.error("没有可导入的单词数据");
            return;
        }

        try {
            addDebugLog(`开始导入 ${importedWords.length} 个单词到词库 ${selectedBankId}`);

            const {
                saved,
                total
            } = await saveWordsInBatches(selectedBankId, importedWords);

            setShowPreview(false);
            const storageUsage = LocalStorageService.getStorageUsage();

            if (storageUsage.percent > 80) {
                toast.warning(`存储空间即将满额 (${storageUsage.percent}%)，建议清理不需要的词库以释放空间`);
            }

            if (saved > 0) {
                addDebugLog(`成功导入 ${saved}/${total} 个单词`);
                toast.success(`成功导入 ${saved}/${total} 个单词`);
                const updatedBank = wordBanks.find(bank => bank.id === selectedBankId);

                if (updatedBank) {
                    toast.info(`词库"${updatedBank.name}"当前包含 ${updatedBank.wordCount} 个单词`);
                    const savedWords = LocalStorageService.getBankWords(selectedBankId);

                    if (savedWords.length === 0) {
                        toast.error("警告: 单词保存失败，请检查存储空间或尝试分批导入");
                    }
                }
            } else {
                addDebugLog("没有新单词需要导入（已去重）");
                toast.info("没有新单词需要导入（已去重）");
            }

            setImportStatus("导入完成");
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "未知错误";
            addDebugLog(`确认导入失败: ${errorMsg}`);

            if (errorMsg.includes("storage") || errorMsg.includes("配额")) {
                toast.error(`导入失败: 存储空间不足，请删除不需要的词库或分批次导入。错误详情: ${errorMsg}`);
                const storageUsage = LocalStorageService.getStorageUsage();

                toast.info(
                    `当前存储使用率: ${storageUsage.percent}%，已使用: ${(storageUsage.used / 1024 / 1024).toFixed(2)}MB，剩余: ${((storageUsage.total - storageUsage.used) / 1024 / 1024).toFixed(2)}MB`
                );
            } else {
                toast.error(`导入失败: ${errorMsg}. 请检查文件格式或联系技术支持。`);
            }

            setImportStatus("导入失败");
        }
    };

    const handleCreateBank = () => {
        try {
            addDebugLog("尝试创建新词库");

            if (!newBankName.trim()) {
                addDebugLog("创建词库失败: 名称为空");
                toast.error("请输入词库名称");
                return;
            }

            const newBank: WordBank = {
                id: Date.now().toString(),
                name: newBankName.trim(),
                unitCount: 0,
                wordCount: 0,
                createdAt: new Date().toLocaleString()
            };

            const updatedBanks = [...wordBanks, newBank];
            LocalStorageService.saveWordBanks(updatedBanks);
            setWordBanks(updatedBanks);
            setSelectedBankId(newBank.id);
            setShowCreateModal(false);
            setNewBankName("");
            addDebugLog(`成功创建新词库: ${newBank.name} (ID: ${newBank.id})`);
            toast.success(`新词库 "${newBank.name}" 创建成功`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "未知错误";
            addDebugLog(`创建词库失败: ${errorMsg}`);
            toast.error(`创建词库失败: ${errorMsg}`);
        }
    };

    const handleDeleteBank = (bankId: string) => {
        try {
            addDebugLog(`尝试删除词库: ${bankId}`);

            if (window.confirm("确定要删除这个词库吗？此操作不可恢复。")) {
                const updatedBanks = wordBanks.filter(bank => bank.id !== bankId);
                LocalStorageService.saveWordBanks(updatedBanks);
                const allWords = LocalStorageService.getWords() || [];
                const wordsWithoutBank = allWords.filter(word => word.bankId !== bankId);
                LocalStorageService.saveWords(wordsWithoutBank);
                setWordBanks(updatedBanks);

                if (selectedBankId === bankId) {
                    setSelectedBankId(updatedBanks.length > 0 ? updatedBanks[0].id : "");
                }

                addDebugLog(`词库 ${bankId} 已成功删除`);
                toast.success("词库已成功删除");
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "未知错误";
            addDebugLog(`删除词库失败: ${errorMsg}`);
            toast.error(`删除词库失败: ${errorMsg}`);
        }
    };

     const handleSelectBank = (bankId: string) => {
         addDebugLog(`选择词库: ${bankId}`);
         setSelectedBankId(bankId);
         // 保存选中的词库ID到localStorage
         localStorage.setItem('selectedWordBankId', bankId);
         // 触发storage事件以通知其他页面
         window.dispatchEvent(new Event('storage'));
         
         const selectedBank = wordBanks.find(bank => bank.id === bankId);
         
         if (selectedBank) {
             toast.success(`已选择词库: ${selectedBank.name}`);
         }
     };

    const getSelectedBank = () => {
        return wordBanks.find(bank => bank.id === selectedBankId);
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex flex-col items-center mb-8">
                <div className="flex flex-col space-y-3 w-full max-w-xs">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ripple-effect flex items-center justify-center">
                        <i className="fas fa-plus-circle mr-2"></i>创建新词库
                    </button>
                                <button
                                   onClick={() => {
                                     if (!selectedBankId) {
                                       toast.error("请先选择词库");
                                       return;
                                     }
                                     
                                     try {
                                       const allWords = LocalStorageService.getBankWords(selectedBankId);
                                       if (allWords.length === 0) {
                                         toast.warning("当前词库中没有单词可复习");
                                         return;
                                       }
                                       
                                       // 导航到抗遗忘复习页面
                                       navigate('/anti-forgetting-review', { 
                                         state: { bankId: selectedBankId } 
                                       });
                                     } catch (error) {
                                       console.error("获取单词失败:", error);
                                       toast.error("获取单词失败，请重试");
                                     }
                                   }}
                                   className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md text-sm ripple-effect"
                                    onClick={() => {
                                      if (!selectedBankId) {
                                        toast.error("请先选择词库");
                                        return;
                                      }
                                     
                                     try {
                                       const allWords = LocalStorageService.getBankWords(selectedBankId);
                                       if (allWords.length === 0) {
                                         toast.warning("当前词库中没有单词可同步");
                                         return;
                                       }
                                       
                                       // 保存当前词库ID到localStorage
                                       localStorage.setItem('selectedWordBankId', selectedBankId);
                                       
                                       // 同步单词到自然拼读记忆页面
                                       LocalStorageService.syncLearningWords(allWords);
                                       
                                       // 获取当前词库信息
                                       const currentBank = wordBanks.find(bank => bank.id === selectedBankId);
                                       
                                       if (currentBank) {
                                         toast.success(`成功同步 ${allWords.length} 个单词到自然拼读记忆页面`);
                                         
                                         // 触发自定义事件通知其他页面
                                         const event = new CustomEvent('wordSyncCompleted', {
                                           detail: { 
                                             bankId: selectedBankId,
                                             bankName: currentBank.name,
                                             wordCount: allWords.length
                                           }
                                         });
                                         window.dispatchEvent(event);
                                         
                                         // 显示同步成功通知
                                         const notification = document.createElement('div');
                                         notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
                                         notification.innerHTML = `
                                           <div class="flex items-center">
                                             <i class="fa-solid fa-check-circle mr-2"></i>
                                             <span>成功同步 ${allWords.length} 个单词到自然拼读记忆页面</span>
                                           </div>
                                         `;
                                         document.body.appendChild(notification);
                                         
                                         setTimeout(() => {
                                           notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                                           setTimeout(() => document.body.removeChild(notification), 300);
                                         }, 3000);
                                       }
                                     } catch (error) {
                                       console.error("同步单词失败:", error);
                                       toast.error("同步单词失败，请重试");
                                     }
                                   }}
                         className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ripple-effect flex items-center justify-center"
                         disabled={!selectedBankId}>
                         <i className="fas fa-sync-alt mr-2"></i>同步到自然拼读记忆页面
                     </button>
                </div>
            </div>
            <div className="mb-6"></div>
                <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">词库单词列表</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单词</th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">音标</th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">释义</th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">音节</th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教材版本</th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">年级</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoadingWords ? <tr>
                                    <td colSpan="6" className="py-10 text-center">
                                        <div
                                            className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                        <span className="text-sm text-gray-500">正在加载单词数据...</span>
                                    </td>
                                </tr> : selectedBankWords.length > 0 ? selectedBankWords.map(
                                    (word, index) => <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{word.word}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{word.phonetic}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">{word.definitions?.[0] || ""}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {Array.isArray(word.syllables) ? word.syllables.join(", ") : word.syllables}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{word.textbook || "-"}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{word.grade || "-"}</td>
                                    </tr>
                                ) : <tr>
                                    <td colSpan="6" className="py-12 text-center">
                                        <div
                                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                                            <i className="fas fa-file-excel text-2xl text-blue-500"></i>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">所选词库暂无单词</h3>
                                        <p className="text-gray-500 mb-4">请导入单词数据以开始学习</p>
                                        <button
                                            onClick={() => setShowImportModal(true)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm">
                                            <i className="fas fa-upload mr-1"></i>导入单词
                                                                      </button>
                                    </td>
                                </tr>}
                            </tbody>
                        </table>
                    </div>
                    {selectedBankWords.length > 0 && <div className="mt-3 text-sm text-gray-600">共 {selectedBankWords.length}个单词
                                        </div>}
                </div>
            <div className="bg-white rounded-lg shadow p-5 mb-6">
                {}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">选择词库</h2>
                    <div className="relative">
                        <select
                            value={selectedBankId}
                            onChange={e => handleSelectBank(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}>
                            <option value="">-- 请选择词库 --</option>
                            {wordBanks.map(bank => <option key={bank.id} value={bank.id}>
                                {bank.name}({bank.wordCount}个单词)
                                                                                                                </option>)}
                            {wordBanks.length === 0 && <option value="" disabled>暂无词库，请先创建</option>}
                        </select>
                    </div>
        </div>
        {selectedBankId ? <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">导入单词</h3>
                    <div className="flex items-center space-x-3 mb-2">
                        <input
                            type="file"
                            id="file-upload"
                            onChange={handleFileUpload}
                            accept=".xlsx,.xls"
                            className="hidden" />
                        <button
                            onClick={() => {
                                if (!selectedBankId) {
                                    toast.error("请先选择词库");
                                    return;
                                }

                  try {
                    const allWords = LocalStorageService.getBankWords(selectedBankId);
                    if (allWords.length === 0) {
                      toast.warning("当前词库中没有单词可同步");
                      return;
                    }
                    
                    LocalStorageService.syncLearningWords(allWords.map(word => word.id));
                    
                    // 获取当前词库信息
                    const currentBank = wordBanks.find(bank => bank.id === selectedBankId);
                    
                    if (currentBank) {
                      toast.success(`成功同步 ${allWords.length} 个单词到自然拼读记忆页面`);
                      
                      // 触发单词同步完成事件
                      const event = new CustomEvent('wordSyncCompleted', {
                        detail: { 
                          bankId: selectedBankId,
                          bankName: currentBank.name,
                          wordCount: allWords.length
                        }
                      });
                      window.dispatchEvent(event);
                    }
                  } catch (error) {
                    console.error("同步单词失败:", error);
                    toast.error("同步单词失败，请重试");
                  }
                            }}
          onClick={() => {
            if (!selectedBankId) {
              toast.error("请先选择词库");
              return;
            }
            
            try {
              const allWords = LocalStorageService.getBankWords(selectedBankId);
              if (allWords.length === 0) {
                toast.warning("当前词库中没有单词可同步");
                return;
              }
              
              // 保存当前词库ID到localStorage
              localStorage.setItem('selectedWordBankId', selectedBankId);
              
              // 同步单词到自然拼读记忆页面
              LocalStorageService.syncLearningWords(allWords);
              
              // 获取当前词库信息
              const currentBank = wordBanks.find(bank => bank.id === selectedBankId);
              
              if (currentBank) {
                toast.success(`成功同步 ${allWords.length} 个单词到自然拼读记忆页面`);
                
                // 触发自定义事件通知其他页面
                const event = new CustomEvent('wordSyncCompleted', {
                  detail: { 
                    bankId: selectedBankId,
                    bankName: currentBank.name,
                    wordCount: allWords.length
                  }
                });
                window.dispatchEvent(event);
              }
            } catch (error) {
              console.error("同步单词失败:", error);
              toast.error("同步单词失败，请重试");
            }
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-md text-sm ripple-effect"
                            onClick={() => {
                              if (!selectedBankId) {
                                toast.error("请先选择词库");
                                return;
                              }
                              
                              try {
                                // 获取当前词库的所有单词
                                const allWords = LocalStorageService.getBankWords(selectedBankId);
                                
                                if (allWords.length === 0) {
                                  toast.warning("当前词库中没有单词可同步");
                                  return;
                                }
                                
                                // 保存当前词库ID到localStorage
                                localStorage.setItem('selectedWordBankId', selectedBankId);
                                
                                // 同步单词到自然拼读记忆页面
                                const syncResult = LocalStorageService.syncLearningWords(allWords);
                                
                                if (syncResult.success) {
                                  // 获取当前词库信息
                                  const wordBanks = LocalStorageService.getWordBanks();
                                  const currentBank = wordBanks.find(bank => bank.id === selectedBankId);
                                  
                                  if (currentBank) {
                                    toast.success(`成功同步 ${allWords.length} 个单词到自然拼读记忆页面`);
                                    
                                    // 触发自定义事件通知其他页面
                                    const event = new CustomEvent('wordSyncCompleted', {
                                      detail: { 
                                        bankId: selectedBankId,
                                        bankName: currentBank.name,
                                        wordCount: allWords.length
                                      }
                                    });
                                    window.dispatchEvent(event);
                                    
                                    // 显示同步成功通知
                                    const notification = document.createElement('div');
                                    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
                                    notification.innerHTML = `
                                      <div class="flex items-center">
                                        <i class="fa-solid fa-check-circle mr-2"></i>
                                        <span>成功同步 ${allWords.length} 个单词到自然拼读记忆页面</span>
                                      </div>
                                    `;
                                    document.body.appendChild(notification);
                                    
                                    setTimeout(() => {
                                      notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                                      setTimeout(() => document.body.removeChild(notification), 300);
                                    }, 3000);
                                  }
                                }
                              } catch (error) {
                                console.error("同步单词失败:", error);
                                toast.error("同步单词失败，请重试");
                              }
                            }}>
                            <i className="fas fa-sync-alt mr-1"></i>同步到自然拼读记忆页面
                                    </button>
                        <BulkImportModal
                            isOpen={showImportModal}
                            onClose={() => setShowImportModal(false)}
                            selectedBankId={selectedBankId}
  onImportComplete={(words, bankId, autoSplitSyllables) => {
const newWords = words.map((word: any) => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  bankId: selectedBankId, // 添加词库ID关联
  word: word.单词 || "",
  phonetic: word.音标 || "",
                                    definitions: [word.释义 || ""],
  syllables: word.音节 
    ? word.音节.split(",").map(s => s.trim()) 
    : autoSplitSyllables && word.单词 
      ? SyllableUtils.autoSplitSyllables(word.单词, word.音标)
      : [],
                                    textbook: word.教材 || "",
                                    grade: word.年级 || "",
                                    examples: []
                                }));

                                const existingWords = LocalStorageService.getBankWords(bankId);
                                const allWords = [...existingWords, ...newWords];
                                const saveResult = LocalStorageService.saveBankWords(bankId, allWords);

                                if (saveResult.success) {
                                    setWordBanks(LocalStorageService.getWordBanks());
                                    filterWords();
                                    toast.success(`成功导入 ${newWords.length} 个单词到词库`);
                                    LocalStorageService.syncLearningWords(allWords.map(word => word.id));
                                    const event = new Event("wordSyncCompleted");
                                    window.dispatchEvent(event);

                                    if (saveResult.usage && saveResult.usage.percent > 80) {
                                        toast.warning(`存储空间即将满额 (${saveResult.usage.percent}%)，建议清理不需要的词库以释放空间`);
                                    }
                                } else {
                                    toast.error(`导入失败: ${saveResult.message}`);

                                    if (saveResult.usage) {
                                        toast.info(`当前存储使用率: ${saveResult.usage.percent}%，请删除不需要的词库或清理浏览器缓存`);
                                    }
                                }
                            }} />
                        {/* 空标签占位 */}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">通过Excel文件批量导入单词到当前词库，支持.xlsx和.xls格式
                                                                                    </p>
                    <div
                        className={`p-2 rounded text-center ${importStatus.includes("成功") ? "bg-green-50 text-green-700" : importStatus.includes("失败") ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"}`}>状态: <strong>{importStatus || "未开始"}</strong>
                    </div>
                    {getSelectedBank() && <div className="text-xs text-gray-500 mt-2">当前词库: {getSelectedBank()?.name}| 单词数量: {getSelectedBank()?.wordCount}| 单元数量: {getSelectedBank()?.unitCount}
                    </div>}
                </div> : <div
                    className="text-center py-6 text-gray-500 border border-dashed rounded-md">请先选择一个词库，然后才能导入单词
                                                                      </div>}
            </div>
            {}
            <div className="bg-white rounded-lg shadow p-5">
                <h2 className="text-lg font-semibold mb-4">我的词库</h2>
                {wordBanks.length === 0 ? <div className="text-center py-8 text-gray-500">暂无自定义词库，点击"创建新词库"开始
                                                                      </div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {wordBanks.map(bank => <div
                        key={bank.id}
                        onClick={() => handleSelectBank(bank.id)}
                        className={`border rounded-lg p-4 transition-all cursor-pointer ${selectedBankId === bank.id ? "border-blue-500 bg-blue-50 shadow-md" : "hover:border-blue-300 hover:bg-blue-50"}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium">{bank.name}</h3>
                            <div className="space-x-1">
                            <button
                  onClick={() => {
                    navigate(`/word-library?bankId=${bank.id}`);
                    // 保存选中的词库ID到localStorage
                    localStorage.setItem('selectedWordBankId', bank.id);
                    // 触发自定义事件而非通用storage事件，避免不必要的全局刷新
                    const event = new CustomEvent('wordBankSelected', {
                      detail: { bankId: bank.id }
                    });
                    window.dispatchEvent(event);
                    // 同步更新当前选中词库状态
                     setSelectedBankId(bank.id);
                    toast.success(`已选择词库: ${bank.name}`);
                  }}
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">选择
                                                                                                                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm("确定要删除这个词库吗？此操作不可恢复。")) {
                                            try {
                                                LocalStorageService.deleteBank(bank.id);
                                                setWordBanks(LocalStorageService.getWordBanks());
                                                toast.success("词库已成功删除");
                                            } catch (error) {
                                                toast.error("删除失败: 存储空间不足，请先清理其他数据");
                                            }
                                        }
                                    }}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200">删除
                                                                                                                                </button>
                            </div>
                        </div>
                        {}
                        <div className="mt-4 text-sm text-gray-600">
                            <i className="fas fa-info-circle text-blue-500 mr-1"></i>点击词库卡片上的"选择"按钮查看词库中的单词列表
                                                    </div>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>单词数量: {bank.wordCount}</p>
                            <p>单元数量: {bank.unitCount}</p>
                            <p className="text-xs text-gray-400 mt-2">创建时间: {bank.createdAt}
                            </p>
                        </div>
                    </div>)}
                </div>}
            </div>
            {}
            {showCreateModal && <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg w-full max-w-md">
                    <div className="p-5 border-b">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-lg">创建新词库</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-500 hover:text-gray-700">×
                                                                                                                </button>
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">词库名称 *
                                                                                                                </label>
                            <input
                                type="text"
                                value={newBankName}
                                onChange={e => setNewBankName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="输入词库名称" />
                        </div>
                        <p className="text-xs text-gray-500 mb-4">创建自定义词库后，您可以导入单词并进行针对性学习
                                                                                                  </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm ripple-effect">取消
                                                                                                                </button>
                            <button
                                onClick={handleCreateBank}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm ripple-effect">创建
                                                                                                                </button>
                        </div>
                    </div>
                </div>
            </div>}
            {}
            {showPreview && <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="p-5 border-b">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-lg">导入单词预览</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-500 hover:text-gray-700">×
                                                                                                                </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5">
                        <p className="mb-4">共发现 {importedWords.length}个单词，确认导入到当前词库？</p>
                        {}
                        {showSaveProgress && <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span>正在保存单词...</span>
                                <span>{saveProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{
                                        width: `${saveProgress}%`
                                    }}></div>
                            </div>
                        </div>}
                        <div className="border rounded-md overflow-hidden mb-4">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单词</th>
                                        <th
                                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">音标</th>
                                        <th
                                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">释义</th>
                                        <th
                                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单元</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {importedWords.slice(0, 10).map((word, index) => <tr key={index}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{word.word}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{word.phonetic}</td>
                                        <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">{word.meaning}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{word.unit}</td>
                                    </tr>)}
                                    {importedWords.length > 10 && <tr>
                                        <td colSpan={4} className="px-3 py-2 text-center text-sm text-gray-500">... 还有 {importedWords.length - 10}个单词未显示 ...
                                                                                                                                                            </td>
                                    </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="p-5 border-t flex justify-end space-x-3">
                        <button
                            onClick={() => setShowPreview(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm ripple-effect"
                            disabled={showSaveProgress}>取消
                                                                                                  </button>
                        <button
                            onClick={confirmImportWords}
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm ripple-effect"
                            disabled={showSaveProgress}>确认导入
                                                                                                  </button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default StudyWordBank;