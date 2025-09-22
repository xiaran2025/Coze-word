import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { LocalStorageService } from "@/lib/localStorage";
import { WordBank } from '@/types';
import BulkImportModal from '@/components/BulkImportModal';
import { SyllableUtils } from '@/lib/utils';


interface Word {
  id: number;
  word: string;
  phonetic: string;
  definition: string;
  syllables: string;
  book: string;  // 教材版本
  grade: string; // 年级
}

const WordLibrary: React.FC = () => {
  const navigate = useNavigate();
  
  // 从localStorage加载选中词库的单词
   useEffect(() => {
    try {
      // 从localStorage获取选中的词库ID
      const selectedBankId = localStorage.getItem('selectedWordBankId');
      
      if (selectedBankId) {
        // 设置选中的词库
        setSelectedBookValue(selectedBankId);
        setSelectedBook(selectedBankId);
        
        // 从localStorage获取该词库的单词
        const bankWords = LocalStorageService.getBankWords(selectedBankId);
        setAllWords(bankWords);
        filterWords();
      }
      
      // 监听词库选择变化事件
      const handleWordBankSelected = () => {
        const selectedBankId = localStorage.getItem('selectedWordBankId');
        if (selectedBankId) {
          setSelectedBookValue(selectedBankId);
          setSelectedBook(selectedBankId);
          const bankWords = LocalStorageService.getBankWords(selectedBankId);
          setAllWords(bankWords);
          filterWords();
        }
      };
      
      // 监听单词同步完成事件
      const handleWordSyncCompleted = (e: CustomEvent) => {
        const selectedBankId = localStorage.getItem('selectedWordBankId');
        if (selectedBankId) {
          setSelectedBookValue(selectedBankId);
          setSelectedBook(selectedBankId);
          const bankWords = LocalStorageService.getBankWords(selectedBankId);
          setAllWords(bankWords);
          filterWords();
          
          // 显示同步成功通知
          displayStatus(`成功同步 ${e.detail.wordCount} 个单词`, "success");
          
          // 显示悬浮通知
          const notification = document.createElement('div');
          notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
          notification.innerHTML = `
            <i class="fa-solid fa-check-circle mr-2"></i>
            <span>已同步 ${e.detail.wordCount} 个单词</span>
          `;
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => document.body.removeChild(notification), 300);
          }, 3000);
        }
      };
      
      window.addEventListener('wordSyncCompleted', handleWordSyncCompleted);
      window.addEventListener('wordBankSelected', handleWordBankSelected);
      
      return () => {
        window.removeEventListener('wordSyncCompleted', handleWordSyncCompleted);
        window.removeEventListener('wordBankSelected', handleWordBankSelected);
      };
    } catch (error) {
      console.error('Failed to load word bank words:', error);
      displayStatus("加载词库单词失败", "error");
    }
  }, []);
  // 从本地存储加载单词数据
  const [allWords, setAllWords] = useState<Word[]>(() => {
    try {
      return LocalStorageService.getWords();
    } catch (error) {
      console.error("Failed to load words from storage:", error);
      return [];
    }
  });
  
  // 状态管理
  const [isEditing, setIsEditing] = useState(false);
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [importStartTime, setImportStartTime] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [showStatus, setShowStatus] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddWordModal, setShowAddWordModal] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [selectedBookValue, setSelectedBookValue] = useState("all");
  const [bookOptions, setBookOptions] = useState(["all"]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [processedCount, setProcessedCount] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; time: string; } | null>(null);
  const [newWord, setNewWord] = useState<Partial<Word>>({ 
    word: "", 
    phonetic: "", 
    definition: "", 
    syllables: "", 
    book: "", 
    grade: "" 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // 初始化数据
  useEffect(() => {
    try {
      const storedWords = LocalStorageService.getWords();
      setAllWords(storedWords);
      // 获取所有词库作为教材选项
      const wordBanks = LocalStorageService.getWordBanks();
      setBookOptions(["all", ...wordBanks.map(bank => bank.name)]);
      
      // 从localStorage获取选中的词库ID
      const savedBankId = localStorage.getItem('selectedWordBankId');
      setSelectedBookValue(savedBankId || "all");
      
      // 添加存储事件监听器以同步词库变化
      const handleStorageChange = () => {
        const updatedBanks = LocalStorageService.getWordBanks();
        setBookOptions(["all", ...updatedBanks.map(bank => bank.name)]);
      };
      
      // 监听自定义事件，同步选中的词库
      const handleWordBankSelected = (e: CustomEvent) => {
        const newBankId = e.detail.bankId;
        setSelectedBookValue(newBankId || "all");
        // 更新筛选状态
        setSelectedBook(newBankId || "");
        filterWords();
      };
      
      // 同时保留对storage事件的监听，确保全面兼容
      const handleStorageChange2 = (e: StorageEvent) => {
        if (e.key === 'selectedWordBankId') {
          const selectedId = localStorage.getItem('selectedWordBankId') || "all";
          setSelectedBookValue(selectedId);
          // 更新筛选状态
          setSelectedBook(selectedId);
          filterWords();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('wordBankSelected', handleWordBankSelected);
      window.addEventListener('storage', handleStorageChange2);
      
      // 获取所有词库
      const updatedWordBanks = LocalStorageService.getWordBanks();
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('wordBankSelected', handleWordBankSelected);
        window.removeEventListener('storage', handleStorageChange2);
      };
    } catch (error) {
      console.error("Failed to load words from storage:", error);
      displayStatus("加载单词数据失败", "error");
    }
  }, []);

  // 当筛选条件变化时重新筛选
  useEffect(() => {
    filterWords();
  }, [allWords, searchTerm, selectedGrade, selectedBook]);

  // 检查本地存储并显示初始状态
  const checkLocalStorage = () => {
    const storedWords = localStorage.getItem("wordDatabase");
    if (storedWords) {
      try {
        const words: Word[] = JSON.parse(storedWords);
        setAllWords(words);
        displayStatus(`已加载 ${words.length} 个单词`, "success");
      } catch (error) {
        console.error("解析存储数据失败:", error);
        localStorage.removeItem("wordDatabase");
        displayStatus("加载单词数据失败，已重置", "error");
      }
    } else {
      displayStatus("欢迎使用单词管理系统，请添加或导入单词", "info");
    }
  };

  // 显示状态提示
  const displayStatus = (message: string, type: "info" | "success" | "error" = "info") => {
    setStatusMessage(message);
    setStatusType(type);
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), 5000);
  };

  // 保存数据到本地存储
  const saveToLocalStorage = () => {
    try {
      LocalStorageService.saveWords(allWords);
    } catch (error) {
      console.error("保存到本地存储失败:", error);
      displayStatus("保存数据失败，可能是因为数据量过大", "error");
    }
  };

  // 核心筛选功能实现：严格匹配教材版本和年级，模糊匹配搜索词
  const filterWords = () => {
    setStatusMessage(`正在筛选 ${selectedGrade ? selectedGrade : '全部年级'} / ${selectedBook ? selectedBook : '全部教材'} 的单词...`);
    setStatusType('info');
    setShowStatus(true);

    // 使用setTimeout模拟筛选过程，提升用户体验
    setTimeout(() => {
      const filtered = allWords.filter(word => {
        // 搜索词匹配：匹配单词、音标、释义或音节
        const matchesSearch = searchTerm === "" || 
          word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.phonetic.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.syllables.toLowerCase().includes(searchTerm.toLowerCase());

        // 年级严格匹配
        const matchesGrade = !selectedGrade || word.grade === selectedGrade;

        // 教材版本严格匹配
        const matchesBook = !selectedBook || word.book === selectedBook;

  // 词库匹配 - 当选择"all"时不过滤词库
  const matchesBank = selectedBookValue === "all" || !selectedBookValue || word.bankId === selectedBookValue;

  return matchesSearch && matchesGrade && matchesBook && matchesBank;
      });

      setFilteredWords(filtered);
      setCurrentPage(1); // 重置到第一页

      // 更新筛选状态提示
      const filterText = [];
      if (selectedGrade) filterText.push(`年级: ${selectedGrade}`);
      if (selectedBook) filterText.push(`教材: ${selectedBook}`);
      
      const statusText = filterText.length > 0 
        ? `已筛选: ${filterText.join('，')}，共找到 ${filtered.length} 个匹配单词` 
        : `共找到 ${filtered.length} 个单词`;
        
      setStatusMessage(statusText);
      setStatusType('success');
    }, 300);
  };

  // 查看单词详情，支持编辑模式
  const showWordDetailsWithEdit = (word: Word, editMode: boolean = false) => {
    setCurrentWord(word);
    setIsEditing(editMode);
    if (editMode) {
      setEditWord({...word});
    }
    setShowWordModal(true);
  };

  // 编辑单词
  const handleEditWord = (word: Word) => {
    setEditWord({...word});
    setShowEditModal(true);
  };

  // 保存编辑后的单词
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWord || !editWord.word || !editWord.definition) return;
    
    const updatedWords = allWords.map(word => 
      word.id === editWord.id ? editWord : word 
    );
    
    setAllWords(updatedWords);
    LocalStorageService.updateWord(editWord);
    setShowEditModal(false);
    displayStatus(`单词 "${editWord.word}" 已更新`, "success");
  };

  // 处理文件上传（批量导入）
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      displayStatus("请上传Excel格式的文件（.xlsx 或 .xls）", "error");
      return;
    }

    setImportProgress(0);
    setImportStatus("准备解析文件...");
    setProcessedCount(0);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        setImportStartTime(Date.now());
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!validateDataStructure(jsonData)) {
          displayStatus("Excel文件格式不正确，请确保包含正确的列：单词、音标、释义、音节、教材、年级", "error");
          resetImportUI();
          return;
        }

        processImportData(jsonData);
      } catch (error) {
        console.error("解析Excel文件错误:", error);
        displayStatus("解析文件时发生错误：" + (error as Error).message, "error");
        resetImportUI();
      }
    };

    reader.onerror = function() {
      displayStatus("读取文件时发生错误", "error");
      resetImportUI();
    };

    reader.readAsArrayBuffer(file);
  };

  // 验证导入数据结构
  const validateDataStructure = (data: any[]): boolean => {
    if (!data || data.length === 0) return false;
    const firstItem = data[0];
    const hasWord = Object.prototype.hasOwnProperty.call(firstItem, "单词") || 
                    Object.prototype.hasOwnProperty.call(firstItem, "word");
    const hasDefinition = Object.prototype.hasOwnProperty.call(firstItem, "释义") || 
                          Object.prototype.hasOwnProperty.call(firstItem, "definition");
    return hasWord && hasDefinition;
  };

  // 处理导入数据
  const processImportData = (data: any[]) => {
    const totalItems = data.length;
    let processed = 0;
    let success = 0;
    let failed = 0;
    
    setAllWords([]);
    const chunkSize = 1000;
    let index = 0;

    const processChunk = () => {
      const chunk = data.slice(index, index + chunkSize);
      
      chunk.forEach(item => {
        try {
          const cleanedItem = cleanAndStandardizeDataItem(item);
          if (cleanedItem.word.trim() !== "") {
            cleanedItem.id = Date.now() + Math.floor(Math.random() * 1000);
            
            // 检查重复（同单词、同教材、同年级）
            const exists = allWords.some( 
              word => word.word.toLowerCase() === cleanedItem.word.toLowerCase() && 
                      word.book === cleanedItem.book && 
                      word.grade === cleanedItem.grade 
            );

            if (!exists) {
              setAllWords(prev => [...prev, cleanedItem]);
              success++;
              
              if (success % 10 === 0) {
                saveToLocalStorage();
              }
            } else {
              failed++;
            }
          } else {
            failed++;
          }
        } catch (error) {
          console.error("处理数据项错误:", error, item);
          failed++;
        }
        
        processed++;
        if (processed % 100 === 0 || processed === totalItems) {
          const progress = Math.round(processed / totalItems * 100);
          setImportProgress(progress);
          setImportStatus("正在处理数据...");
          setProcessedCount(processed);
        }
      });

      index += chunkSize;
      if (index < data.length) {
        requestAnimationFrame(processChunk);
      } else {
        finishImportProcessing(totalItems, success, failed);
      }
    };

    processChunk();
  };

  // 清理和标准化数据项
  const cleanAndStandardizeDataItem = (item: any): Word => {
    return {
      id: 0,
      word: (item["单词"] || item["word"] || "").toString().trim(),
      phonetic: (item["音标"] || item["phonetic"] || "").toString().trim(),
      definition: (item["释义"] || item["definition"] || "").toString().trim(),
      syllables: (item["音节"] || item["syllables"] || "").toString().trim(),
      book: (item["教材"] || item["book"] || "").toString().trim(),
      grade: (item["年级"] || item["grade"] || "").toString().trim()
    };
  };

  // 完成导入处理
  const finishImportProcessing = (totalItems: number, success: number, failed: number) => {
    saveToLocalStorage();
    const timeTaken = ((Date.now() - importStartTime) / 1000).toFixed(2);
    setImportResults({ success, failed, time: timeTaken });
    saveToLocalStorage();
    setImportStatus("导入完成");
    displayStatus(`成功导入 ${success} 个单词，失败 ${failed} 个，耗时 ${timeTaken} 秒`, "success");
  };

  // 重置导入UI状态
  const resetImportUI = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImportProgress(0);
    setImportStatus("");
    setProcessedCount(0);
  };

  // 添加新单词
  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.word || !newWord.definition || !newWord.book || !newWord.grade) {
      displayStatus("请填写必填字段", "error");
      return;
    }

    const wordToAdd: Word = {
      id: allWords.length > 0 ? Math.max(...allWords.map(w => w.id)) + 1 : 1,
      word: newWord.word.trim() as string,
      phonetic: (newWord.phonetic || "").trim(),
      definition: newWord.definition.trim() as string,
      syllables: (newWord.syllables || "").trim(),
      book: newWord.book.trim() as string,
      grade: newWord.grade.trim() as string
    };

    setAllWords(prev => [...prev, wordToAdd]);
    saveToLocalStorage();
    setNewWord({ word: "", phonetic: "", definition: "", syllables: "", book: "", grade: "" });
    setShowAddWordModal(false);
    displayStatus("单词添加成功", "success");
  };

  // 删除单词
  const deleteWord = (wordId: number) => {
    if (window.confirm("确定要删除这个单词吗？")) {
      setAllWords(prev => prev.filter(word => word.id !== wordId));
      saveToLocalStorage();
      displayStatus("单词已删除", "success");
    }
  };

  // 批量删除单词
  const handleBatchDelete = () => {
    const checkboxes = document.querySelectorAll<HTMLInputElement>("#wordsTableBody input[type=\"checkbox\"]:checked");
    if (checkboxes.length === 0) {
      displayStatus("请先选择要删除的单词", "error");
      return;
    }

    if (window.confirm(`确定要删除选中的 ${checkboxes.length} 个单词吗？`)) {
      const idsToDelete = Array.from(checkboxes).map(checkbox => checkbox.getAttribute("data-id") || "");
      const updatedWords = allWords.filter(word => !idsToDelete.includes(word.id.toString()));
      
      setAllWords(updatedWords);
      saveToLocalStorage();
      displayStatus(`已成功删除 ${checkboxes.length} 个单词`, "success");
      
      if (selectAllRef.current) {
        selectAllRef.current.checked = false;
      }
      
      setFilteredWords([...updatedWords]);
    }
  };

  // 查看单词详情
  const showWordDetails = (word: Word) => {
    setCurrentWord(word);
    setShowWordModal(true);
  };

  // 随机选择单词
  const handleRandomSelect = () => {
    const countInput = document.getElementById("randomCount") as HTMLInputElement;
    const count = parseInt(countInput.value) || 5;
    
    if (allWords.length === 0) {
      displayStatus("没有单词数据可供随机选择", "error");
      return;
    }

    const max = Math.min(count, allWords.length);
    const randomWords: Word[] = [];
    
    for (let i = 0; i < max; i++) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * allWords.length);
      } while (randomWords.includes(allWords[randomIndex]));
      
      randomWords.push(allWords[randomIndex]);
    }

    setFilteredWords(randomWords);
    displayStatus(`已随机选择 ${randomWords.length} 个单词`, "success");
  };

  // 导出为Coze格式
  const exportToCozeFormat = () => {
    if (allWords.length === 0) {
      displayStatus("没有单词数据可供导出", "error");
      return;
    }

    requestAnimationFrame(() => {
      const csvContent = convertToCSV(allWords);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `coze_words_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    });

    displayStatus("Coze数据导出成功", "success");
  };

  // 转换为CSV格式
  const convertToCSV = (data: Word[]) => {
    if (data.length === 0) return "";
    
    const headers = ["单词", "音频", "释义", "音节", "教材版本", "年级"].join(",");
    const rows = data.map(item => [
      `"${item.word}"`,
      `"${item.phonetic}"`,
      `"${item.definition.replace(/"/g, "\"\"")}"`,
      `"${item.syllables}"`,
      `"${item.book}"`,
      `"${item.grade}"`
    ].join(","));
    
    return `${headers}\n${rows.join("\n")}`;
  };

  // 转义HTML特殊字符
  const escapeHtml = (text: string) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  // 获取总页数
  const getTotalPages = () => {
    return Math.ceil(filteredWords.length / pageSize);
  };

  // 跳转到指定页
  const goToPage = (page: number) => {
    const totalPages = getTotalPages();
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  // 渲染分页控件
  const renderPagination = () => {
    const totalPages = getTotalPages();
    if (totalPages === 0) {
      return <div>无数据</div>;
    }

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 mx-1 rounded ${currentPage === i ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center mt-4">
        <button
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          第一页
        </button>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          上一页
        </button>
        
        {pages}
        
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          下一页
        </button>
        <button
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          最后一页
        </button>
      </div>
    );
  };

  // 获取当前页的单词
  const getCurrentPageWords = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredWords.slice(startIndex, startIndex + pageSize);
  };

  // 获取年级选项（去重并排序）
  const getGradeOptions = () => {
    const grades = [...new Set(allWords.map(word => word.grade).filter(Boolean))];
    
    return ["", ...grades.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    })];
  };

  // 获取教材选项（去重并排序）
  const getBookOptions = () => {
    const books = [...new Set(allWords.map(word => word.book).filter(Boolean))];
    return ["", ...books.sort()];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">单词库管理</h1>
        <div className="text-sm text-gray-600 font-medium">
          当前筛选: {selectedGrade || "全部年级"} / {selectedBook || "全部教材"} | 找到 {filteredWords.length} 个匹配单词
        </div>
      </div>

      {/* 操作按钮区 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* 选择词库下拉菜单 */}
                      <select
                          value={selectedBookValue}
                          onChange={(e) => {
                              setSelectedBookValue(e.target.value);
                              // 保存选中的词库ID到localStorage
                              localStorage.setItem('selectedWordBankId', e.target.value);
                              // 触发storage事件以通知其他页面
                              window.dispatchEvent(new Event('storage'));
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                          <option value="all">全部词库</option>
                          {bookOptions.filter(book => book !== "all").map(book => (
                              <option key={book} value={book}>{book}</option>
                          ))}
                      </select>

        {/* 开始学习按钮 */}
        <button
          onClick={() => navigate("/phonics-memory")}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
        >
          <i className="fa-solid fa-play mr-2"></i>开始学习
        </button>

        {/* 随机选择区域 */}
        <span className="flex items-center">
          <span className="mr-2 text-gray-700">随机</span>
          <input
            type="number"
            id="randomCount"
            defaultValue="5"
            min="1"
            max="100"
            className="w-16 border rounded px-2 py-2 text-center"
          />
          <span className="mx-2 text-gray-700">数量</span>
          <button onClick={handleRandomSelect} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-all">
            随机选择
          </button>
        </span>

        {/* 同步单词按钮 */}
       <button
         onClick={() => {
           try {
             // 获取当前词库的所有单词
             const bankWords = LocalStorageService.getBankWords(selectedBookValue);
             
             if (bankWords.length === 0) {
               toast.warning("当前词库中没有单词可同步");
               return;
             }
             
             // 同步单词到本地存储
             LocalStorageService.syncLearningWords(bankWords);
             
             // 更新当前页面单词数据
             setAllWords(bankWords);
             filterWords();
             
             toast.success(`已同步 ${bankWords.length} 个单词到当前词库`);
             
             // 显示悬浮通知
             const notification = document.createElement('div');
             notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
             notification.innerHTML = `
               <i class="fa-solid fa-check-circle mr-2"></i>
               <span>成功同步 ${bankWords.length} 个单词</span>
             `;
             document.body.appendChild(notification);
             
             setTimeout(() => {
               notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
               setTimeout(() => document.body.removeChild(notification), 300);
             }, 3000);
           } catch (error) {
             console.error('同步单词失败:', error);
             toast.error('同步单词失败，请重试');
           }
         }}
         className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
       >
         同步单词
       </button>

        {/* 开始学习按钮 */}
        <button
          onClick={() => navigate("/phonics-memory")}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
        >
          开始学习 ({allWords.length}个)
        </button>

        {/* 学前测试按钮 */}
        <button
          onClick={() => navigate(`/vocabulary-test?book=${selectedBookValue}`)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
        >
          学前测试
        </button>

        {/* 批量删除按钮 */}
        <button
          onClick={handleBatchDelete}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
        >
          批量删除
        </button>

        {/* 批量导入按钮 */}
        <button
          onClick={() => setShowImportModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
        >
          批量导入
        </button>

        {/* 添加单词按钮 */}
        <button
          onClick={() => setShowAddWordModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
        >
          添加单词
        </button>

        {/* 嵌入本地按钮 */}
           <button
            onClick={() => {
              localStorage.setItem("embeddedWords", JSON.stringify(filteredWords));
              toast.success(`已成功嵌入 ${filteredWords.length} 个单词到本地存储`);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md"
          >
            嵌入本地
          </button>
          <button
            onClick={() => {
              // 获取选中的单词
              const checkboxes = document.querySelectorAll<HTMLInputElement>("#wordsTableBody input[type=\"checkbox\"]:checked");
              if (checkboxes.length === 0) {
                toast.warning("请先选择要测试的单词");
                return;
              }
              
              const idsToTest = Array.from(checkboxes).map(checkbox => checkbox.getAttribute("data-id") || "");
              const wordsToTest = allWords.filter(word => idsToTest.includes(word.id.toString()));
              
              // 同步选中单词到本地存储
              LocalStorageService.syncLearningWords(wordsToTest);
              
              // 跳转到单词达人测试挑战页面
              navigate("/runtime/word-master-challenge");
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-all flex items-center hover:translate-y-[-1px] hover:shadow-md ml-2"
          >
            <i className="fa-solid fa-trophy mr-2"></i>单词达人测试挑战
          </button>
      </div>

      {/* 筛选区 */}
      <div className="search-bar mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="输入单词或音节"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-md"
        />
        
        <select 
          value={selectedGrade}
          onChange={(e) => {
            setSelectedGrade(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-md"
        >
          <option value="">选择年级</option>
          {getGradeOptions().filter(grade => grade !== "").map(grade => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>
        
        <select 
          value={selectedBook}
          onChange={(e) => {
            setSelectedBook(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-md"
        >
          <option value="">选择教材</option>
          {getBookOptions().filter(book => book !== "").map(book => (
            <option key={book} value={book}>{book}</option>
          ))}
        </select>
      </div>

      {/* 状态提示区域 */}
      {showStatus && (
        <div className={`status-message p-3 rounded-md mb-4 ${
          statusType === 'success' ? 'bg-green-100 text-green-800' :
          statusType === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {statusMessage}
          <button onClick={() => setShowStatus(false)} className="ml-2 text-gray-500">×</button>
        </div>
      )}

      {/* 单词表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  onChange={(e) => {
                    const checkboxes = document.querySelectorAll("#wordsTableBody input[type=\"checkbox\"]");
                    checkboxes.forEach(checkbox => {
                      (checkbox as HTMLInputElement).checked = e.target.checked;
                    });
                  }}
                />
              </th>
              <th className="py-2 px-4 border-b">单词</th>
              <th className="py-2 px-4 border-b">音标</th>
              <th className="py-2 px-4 border-b">释义</th>
              <th className="py-2 px-4 border-b">音节</th>
              <th className="py-2 px-4 border-b">教材版本</th>
              <th className="py-2 px-4 border-b">年级</th>
              <th className="py-2 px-4 border-b">操作</th>
            </tr>
          </thead>
          <tbody id="wordsTableBody">
            {getCurrentPageWords().length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-center text-gray-500">没有找到匹配的单词</td>
              </tr>
            ) : (
              getCurrentPageWords().map(word => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">
                    <input type="checkbox" data-id={word.id} />
                  </td>
                  <td className="py-2 px-4 border-b">{escapeHtml(word.word)}</td>
                  <td className="py-2 px-4 border-b">{escapeHtml(word.phonetic)}</td>
                  <td className="py-2 px-4 border-b">{escapeHtml(word.definition)}</td>
                  <td className="py-2 px-4 border-b">{escapeHtml(word.syllables)}</td>
                  <td className="py-2 px-4 border-b">{escapeHtml(word.book)}</td>
                  <td className="py-2 px-4 border-b">{escapeHtml(word.grade)}</td>
                  <td className="py-2 px-4 border-b">
                    <button onClick={() => showWordDetails(word)} className="text-blue-500 mr-2">👁️</button>
                    <button onClick={() => handleEditWord(word)} className="text-green-500 mr-2">✏️</button>
                    <button onClick={() => deleteWord(word.id)} className="text-red-500">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 底部信息 */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">共 {filteredWords.length}条单词</div>
        <button
          onClick={() => {
            const tableBody = document.getElementById('wordsTableBody');
            if (tableBody) {
              tableBody.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          返回顶部
        </button>
      </div>

      {/* 分页控件 */}
      <div className="mt-4">
        {renderPagination()}
      </div>

      {/* 批量导入模态框 */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        selectedBankId={selectedBookValue}
        onImportComplete={(words, bankId, autoSplitSyllables) => {
          // 处理导入完成逻辑
          const newWords = words.map((word: any) => ({
            id: Date.now() + Math.floor(Math.random() * 1000),
            bankId: selectedBookValue,
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
    // 重新加载所有单词并更新筛选结果
    const updatedWords = LocalStorageService.getBankWords(bankId);
    setAllWords(updatedWords);
    filterWords();
             filterWords();
            toast.success(`成功导入 ${newWords.length} 个单词到词库`);
            
            // 同步单词到学习页面
            LocalStorageService.syncLearningWords(allWords);
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
        }}
      />

      {/* 添加单词模态框 */}
      {showAddWordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">添加单词</h2>
              <button onClick={() => setShowAddWordModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <form onSubmit={handleAddWord} className="p-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">单词 *</label>
                <input
                  type="text"
                  value={newWord.word}
                  onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                  required
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">音标</label>
                <input
                  type="text"
                  value={newWord.phonetic}
                  onChange={(e) => setNewWord({ ...newWord, phonetic: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">释义 *</label>
                <textarea
                  value={newWord.definition}
                  onChange={(e) => setNewWord({ ...newWord, definition: e.target.value })}
                  required
                  rows={2}
                  className="w-full border rounded-md px-3 py-2"
                ></textarea>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">音节</label>
                <input
                  type="text"
                  value={newWord.syllables}
                  onChange={(e) => setNewWord({ ...newWord, syllables: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">教材版本 *</label>
                <select
                  value={newWord.book}
                  onChange={(e) => setNewWord({ ...newWord, book: e.target.value })}
                  required
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">选择教材</option>
                  {getBookOptions()
                    .filter(book => book !== "").map(book => (
                      <option key={book} value={book}>{book}</option>
                    ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">年级 *</label>
                <select
                  value={newWord.grade}
                  onChange={(e) => setNewWord({ ...newWord, grade: e.target.value })}
                  required
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">选择年级</option>
                  {getGradeOptions()
                    .filter(grade => grade !== "").map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddWordModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm ripple-effect"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#165DFF] text-white rounded-md text-sm ripple-effect"
                >
                  添加单词
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordLibrary;