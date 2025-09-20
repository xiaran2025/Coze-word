import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { LocalStorageService } from '@/lib/localStorage';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (words: any[], bankId: string, autoSplitSyllables: boolean) => void;
  selectedBankId: string;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImportComplete, selectedBankId }) => {
  // 监听单词同步错误事件和存储事件
  useEffect(() => {
    const handleWordSyncError = (e: CustomEvent) => {
      toast.error(e.detail.message);
    };
    
    const handleStorageChange = () => {
      // 当存储发生变化时更新存储使用情况
      updateStorageUsage();
    };
    
    window.addEventListener('wordSyncError', handleWordSyncError);
    window.addEventListener('storage', handleStorageChange);
    
    // 初始检查存储使用情况
    updateStorageUsage();
    
    return () => {
      window.removeEventListener('wordSyncError', handleWordSyncError);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 存储使用情况状态
  const [storageUsage, setStorageUsage] = useState<{
    used: number;
    total: number;
    percent: number;
  }>({ used: 0, total: 10 * 1024 * 1024, percent: 0 });
  
  // 更新存储使用情况
  const updateStorageUsage = () => {
    const usage = LocalStorageService.getStorageUsage();
    setStorageUsage(usage);
  };
  
  // 估算文件大小
  const estimateFileSize = (words: any[]): number => {
    // 每个单词约占用200字节估算
    return words.length * 200;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  // 处理文件选择
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型 - 仅支持.xlsx
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx') {
      toast.error('请上传.xlsx格式的Excel文件');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage('正在解析文件...');
    setErrorDetails([]);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // 验证数据格式并提取所需字段
        const requiredFields = ['单词', '释义'];
        const validWords = [];
        const invalidRows = [];
        
        jsonData.forEach((row: any, index: number) => {
          // 跳过空行
          if (!row || Object.keys(row).length === 0) return;
          
          // 检查必填字段
          const missingFields = requiredFields.filter(field => 
            !row[field] || !row[field].toString().trim()
          );
          
          if (missingFields.length > 0) {
            invalidRows.push({
              row: index + 2, // 行号从2开始(表头+1)
              reason: `缺少必填字段: ${missingFields.join(', ')}`
            });
            return;
          }
          
          // 验证单词和释义不为空
          const word = row['单词']?.toString().trim();
          const definition = row['释义']?.toString().trim();
          
          if (!word || !definition) {
            invalidRows.push({
              row: index + 2,
              reason: '单词或释义不能为空'
            });
            return;
          }
          
          // 添加有效单词
          validWords.push(row);
        });
        
        // 显示无效行信息
        if (invalidRows.length > 0) {
          const errorDetails = invalidRows.slice(0, 5).map(item => 
            `行 ${item.row}: ${item.reason}`
          ).join('\n');
          const moreErrors = invalidRows.length > 5 
            ? `\n... 还有 ${invalidRows.length - 5} 行错误` 
            : '';
          
          toast.warning(`发现 ${invalidRows.length} 行无效数据，已自动跳过`);
          console.warn(`批量导入警告:\n${errorDetails}${moreErrors}`);
        }
        
        const totalWords = validWords.length;
        
        if (totalWords === 0) {
          setErrorDetails(invalidRows.map(item => `行 ${item.row}: ${item.reason}`));
          setUploadStatus('error');
          setUploadMessage('未找到可导入的有效单词数据，请检查Excel文件格式和内容');
          toast.error('未找到可导入的有效单词数据');
          return;
        }
        
        // 估算所需存储空间
        const requiredSpace = estimateFileSize(validWords);
        const availableSpace = storageUsage.total - storageUsage.used;
        
        if (requiredSpace > availableSpace) {
          setUploadStatus('error');
          setUploadMessage(`存储空间不足，需要${Math.round(requiredSpace/1024)}KB，但仅剩余${Math.round(availableSpace/1024)}KB`);
          toast.error('存储空间不足，无法导入所有单词');
          return;
        }
        
        // 模拟进度更新
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = prev + 10;
            if (newProgress >= 100) {
              clearInterval(progressInterval);
              setUploadStatus('success');
              
              // 调用回调函数，传递解析后的数据和选中的词库ID
              const autoSplitSyllables = (document.getElementById('auto-split-syllables') as HTMLInputElement)?.checked || false;
              onImportComplete(validWords, selectedBankId, autoSplitSyllables);
              
              // 显示成功状态
              let message = `文件解析完成，共发现 ${jsonData.length} 个单词`;
              if (invalidRows.length > 0) {
                message += `，其中 ${invalidRows.length} 个单词格式无效（缺少单词或释义）`;
              }
              message += `\n\n存储使用情况: ${(storageUsage.used/1024/1024).toFixed(2)}MB / 10MB (${storageUsage.percent}%)`;
              setUploadMessage(message);
              
              // 3秒后自动关闭模态框
              setTimeout(() => {
                onClose();
              }, 3000);
              
              return 100;
            }
            return newProgress;
          });
        }, 100);
      } catch (error) {
        console.error('文件解析错误:', error);
        setUploadStatus('error');
        setUploadMessage('文件解析失败，请检查文件格式');
        toast.error('文件解析失败，请检查文件格式');
      }
    };

    reader.onerror = () => {
      setUploadStatus('error');
      setUploadMessage('文件读取失败');
      toast.error('文件读取失败');
    };
    
    reader.readAsArrayBuffer(file);
  };

  // 下载模板文件
  const handleDownloadTemplate = () => {
    try {
      // 创建模板数据
      const templateData = [
        { "单词": "example", "音标": "/ɪɡˈzɑːmpl/", "释义": "例子，范例", "音节": "ex,am,pel", "教材": "人教版", "年级": "三年级" },
        { "单词": "student", "音标": "/ˈstjuːdnt/", "释义": "学生", "音节": "stu,dent", "教材": "人教版", "年级": "四年级" },
        { "单词": "teacher", "音标": "/ˈtiːtʃə(r)/", "释义": "教师", "音节": "tea,cher", "教材": "人教版", "年级": "四年级" },
        { "单词": "", "音标": "", "释义": "", "音节": "", "教材": "", "年级": "" }
      ];
      
      // 创建工作簿和工作表
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData, { 
        header: ["单词", "音标", "释义", "音节", "教材", "年级"],
        skipHeader: false
      });
      
      // 调整列宽
      const columnWidths = [
        { wch: 12 }, // 单词
        { wch: 18 }, // 音标
        { wch: 20 }, // 释义
        { wch: 15 }, // 音节
        { wch: 12 }, // 教材
        { wch: 8 }   // 年级
      ];
      worksheet['!cols'] = columnWidths;
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, "单词导入模板");
      
      // 生成并下载文件
      XLSX.writeFile(workbook, "单词导入模板.xlsx");
      
      toast.success('模板下载成功，请按照示例格式填写数据');
    } catch (error) {
      console.error('模板下载失败:', error);
      toast.error('模板下载失败，请重试');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-fade-in">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">批量导入单词</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            aria-label="关闭"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-6">
          {/* 导入说明和存储状态 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
              <i className="fas fa-info-circle mr-2"></i>导入说明与存储状态
            </h3>
            
            {/* 存储使用情况 */}
            <div className="mb-4 p-3 bg-white rounded-md border border-blue-100">
              <div className="flex items-center mb-4">
                <input 
                  type="checkbox" 
                  id="auto-split-syllables" 
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  defaultChecked={true}
                />
                <label htmlFor="auto-split-syllables" className="text-sm font-medium text-gray-700">
                  自动拆分音节（如未提供）
                </label>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">存储空间使用情况</span>
                <span className={storageUsage.percent > 100 ? "text-red-600 font-bold" : ""}>
                  {storageUsage.percent.toFixed(0)}% 已使用
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    storageUsage.percent > 100 ? 'bg-red-500 animate-pulse' :
                    storageUsage.percent > 80 ? 'bg-red-500' : 
                    storageUsage.percent > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(storageUsage.percent, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 flex justify-between items-center">
                <span>已使用: {(storageUsage.used / (1024 * 1024)).toFixed(2)}MB / 10MB</span>
                <span>(约{Math.floor(storageUsage.used / 200)}个单词)</span>
              </div>
            </div>
          
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <i className="fas fa-check-circle text-blue-600 mt-1 mr-2"></i>
                <span>支持Excel格式文件(.xlsx)，暂不支持.xls格式</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-check-circle text-blue-600 mt-1 mr-2"></i>
                <span>文件第一行必须包含以下表头（顺序任意）：单词,音标,释义,音节,教材,年级</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-check-circle text-blue-600 mt-1 mr-2"></i>
                <span>系统支持一次性导入最多100000个单词（学习管理上限）</span>
              </li>
              <li className="flex items-start text-amber-700">
                <i className="fas fa-exclamation-circle text-amber-500 mt-1 mr-2"></i>
                <span>重要：浏览器存储有限制(约10MB)，当前可导入约{Math.max(0, Math.floor((storageUsage.total - storageUsage.used)/200))}个单词</span>
              </li>
              <li className="flex items-start text-amber-700">
                <i className="fas fa-exclamation-circle text-amber-500 mt-1 mr-2"></i>
                <span>音标格式应为"/.../"，如：/wɜːd/</span>
              </li>
              <li className="flex items-start text-amber-700">
                <i className="fas fa-exclamation-circle text-amber-500 mt-1 mr-2"></i>
                <span>音节请用英文逗号分隔，如：stu,dy</span>
              </li>
            </ul>
          </div>

          {/* 文件上传区域 */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={handleFileSelect}
          >
            <div className="flex flex-col items-center justify-center">
              {uploadStatus === 'idle' && (
                <>
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-file-excel text-3xl text-blue-600"></i>
                  </div>
                  <button
                    onClick={handleFileSelect}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-md transition-all mb-2"
                  >
                    选择Excel文件
                  </button>
                  <p className="text-sm text-gray-500">或直接拖放文件到此处</p>
                  <p className="text-xs text-gray-400 mt-2">支持最大200MB的.xlsx文件</p>
                </>
              )}
              
              {uploadStatus === 'uploading' && (
                <>
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-gray-700 mb-2">{uploadMessage}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{uploadProgress}% 完成</p>
                </>
              )}
              
              {uploadStatus === 'success' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-check text-2xl text-green-600"></i>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{uploadMessage}</p>
                  <p className="text-xs text-gray-500">3秒后自动关闭...</p>
                </>
              )}
              
              {uploadStatus === 'error' && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-times text-2xl text-red-600"></i>
                  </div>
                  <p className="text-sm text-red-700 mb-4">{uploadMessage}</p>
                  
                  {errorDetails.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded-md text-sm text-red-800 w-full max-w-md mx-auto mb-4">
                      <h4 className="font-medium mb-1 flex items-center">
                        <i className="fas fa-exclamation-circle mr-2"></i>错误详情
                      </h4>
                      <ul className="text-left text-xs space-y-1 max-h-32 overflow-y-auto">
                        {errorDetails.slice(0, 5).map((error, index) => (
                          <li key={index} className="flex items-start">
                            <i className="fas fa-circle text-red-500 text-[8px] mt-1.5 mr-2"></i>
                            <span>{error}</span>
                          </li>
                        ))}
                        {errorDetails.length > 5 && (
                          <li className="text-center text-xs text-red-600">
                            ...还有{errorDetails.length - 5}个错误
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setUploadStatus('idle');
                      setUploadProgress(0);
                      setUploadMessage('');
                      setErrorDetails([]);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-all text-sm"
                  >
                    重新上传
                  </button>
                </>
              )}
            </div>
          </div>
         
          {/* 下载模板 */}
          <div className="flex justify-between items-center">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                handleDownloadTemplate();
              }}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <i className="fas fa-download mr-1"></i>
              下载导入模板
            </a>
            
            <button
              onClick={() => {
                onClose();
                setUploadStatus('idle');
                setUploadProgress(0);
                setUploadMessage('');
                setErrorDetails([]);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm"
            >
              取消
            </button>
          </div>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default BulkImportModal;