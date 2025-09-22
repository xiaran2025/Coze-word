import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useSettings, useDataImportExport } from '@/hooks/useLocalStorage';
import { useTheme } from '@/hooks/useTheme';
import { SystemSettings } from '@/types';
import { cn } from '@/lib/utils';

// 系统设置页面
const Settings: React.FC = () => {
  const { settings, saveSettings } = useSettings();
  const { importing, exporting, exportData, importData } = useDataImportExport();
  const { theme, toggleTheme, isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(true);
  const [isSystemPrefsOpen, setIsSystemPrefsOpen] = useState(true);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(true);
  
  // 处理设置变更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // 保存设置
  const handleSaveSettings = () => {
    saveSettings(formData);
    toast.success('系统设置已保存');
  };
  
  // 处理主题选择
  const handleThemeSelect = (theme: string) => {
    setFormData(prev => ({ ...prev, theme }));
  };
  
  // 触发文件导入
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
     // 检查文件类型和扩展名以支持JSON和Excel
     const fileName = file.name.toLowerCase();
     const isJson = file.type === 'application/json' || fileName.endsWith('.json');
     const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileName.endsWith('.xlsx');
     
     if (!isJson && !isExcel) {
       toast.error('请上传JSON或Excel格式的文件');
       return;
     }
    
    const success = await importData(file);
    if (success) {
      toast.success('数据导入成功');
    } else {
      toast.error('数据导入失败，请检查文件格式');
    }
    
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // 确认清空数据
  const confirmClearData = () => {
    if (window.confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      // 清空localStorage
      localStorage.clear();
      toast.success('所有数据已清空，请刷新页面');
      // 重新加载页面
      setTimeout(() => window.location.reload(), 1000);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6 module-transition">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">系统设置</h3>
      
      <div className="space-y-6">

        
        {/* 系统偏好设置 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
            onClick={() => setIsSystemPrefsOpen(!isSystemPrefsOpen)}
          >
            <h4 className="text-md font-semibold text-gray-700">系统偏好</h4>
            <i className={`fas ${isSystemPrefsOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-gray-500`}></i>
          </div>
          
          {isSystemPrefsOpen && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">默认教材版本</label>
                  <select
                    name="textbookVersion"
                    value={formData.textbookVersion}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                  >
                    <option value="人教版">人教版</option>
                    <option value="北师大版">北师大版</option>
                    <option value="外研版">外研版</option>
                    <option value="牛津版">牛津版</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发音速度</label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="pronunciationSpeed"
                        value="slow"
                        checked={formData.pronunciationSpeed === 'slow'}
                        onChange={handleChange}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2 text-sm">慢速</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="pronunciationSpeed"
                        value="medium"
                        checked={formData.pronunciationSpeed === 'medium'}
                        onChange={handleChange}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2 text-sm">中速</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="pronunciationSpeed"
                        value="fast"
                        checked={formData.pronunciationSpeed === 'fast'}
                        onChange={handleChange}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2 text-sm">快速</span>
                    </label>
                  </div>
                </div>
                
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">九宫格复习提醒</label>
              <select
                    name="memoryCurveReminder"
                    value={formData.memoryCurveReminder}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                  >
                    <option value="daily">每天提醒</option>
                    <option value="weekly">每周提醒</option>
                    <option value="none">不提醒</option>
                  </select>
                </div>
                

              </div>
              
              <div className="pt-2 flex justify-end">
                <button
                  className="px-4 py-2 bg-[#165DFF] text-white rounded-md text-sm ripple-effect"
                  onClick={handleSaveSettings}
                >
                  保存设置
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* 数据管理 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
            onClick={() => setIsDataManagementOpen(!isDataManagementOpen)}
          >
            <h4 className="text-md font-semibold text-gray-700">数据管理</h4>
            <i className={`fas ${isDataManagementOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-gray-500`}></i>
          </div>
          
          {isDataManagementOpen && (
            <div className="p-6 space-y-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-circle text-yellow-500"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      上次备份: {localStorage.getItem('phonicsMaster_lastSync') || '从未备份'}
                      <br />建议定期备份数据以防止丢失
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-md text-sm ripple-effect flex items-center justify-center"
                    onClick={exportData}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>导出中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-export mr-2"></i>导出数据
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">导出所有单词、学生和课程数据</p>
                </div>
                
                <div>
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md text-sm ripple-effect flex items-center justify-center"
                    onClick={handleImportClick}
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>导入中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-import mr-2"></i>导入数据
                      </>
                    )}
                  </button>
  <p className="text-xs text-gray-500 mt-2 text-center">导入Excel或JSON格式的数据</p>
  
  <div className="bg-blue-50 p-[12px] rounded-lg text-left mt-4">
    <h4 className="font-medium text-blue-800 mb-2">文件格式要求：</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li><i className="fa-solid fa-file-excel-o text-green-500 mr-1"></i><strong>Excel (.xlsx)</strong>：第一行必须为表头，包含：单词,音标,释义,音节,教材,年级（顺序可任意）</li>
                      <li><i className="fa-solid fa-check-circle text-green-500 mr-1"></i>支持多种表头变体，系统会智能识别常见表头名称</li>                      
                      <li><i className="fa-solid fa-file-code-o text-blue mr-1"></i><strong>JSON (.json)</strong>：使用系统导出的标准格式文件</li>
                      <li><i className="fa-solid fa-info-circle text-blue mr-1"></i>音节列可使用逗号、空格或顿号分隔多个音节</li>
                      <li><i className="fa-solid fa-info-circle text-blue mr-1"></i>音标列支持带/符号或不带/符号的格式（系统会自动添加）</li>
                    </ul>
                    
                    {/* 导入错误提示区域 */}
                    <div id="import-error-messages" className="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <h5 className="font-medium mb-1 flex items-center">
                        <i className="fa-solid fa-exclamation-triangle mr-2"></i>导入提示
                      </h5>
                       <ul id="error-list" className="list-disc list-inside space-y-1 text-xs">
                         <li>请确保phonetic列包含有效的音标格式（如/ˈwɜːd/）</li>
                         <li>检查是否有隐藏的空格或特殊字符</li>
                         <li>确保所有必填列都有数据</li>
                       </ul>
                     </div>
  </div>
  
  <input
    type="file"
    ref={fileInputRef}
    onChange={handleFileUpload}
    className="hidden"
    accept=".json,.xlsx"
  />
                </div>
                
                <div>
                  <button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-md text-sm ripple-effect flex items-center justify-center"
                    onClick={() => {
                      // 创建备份数据
                      const success = exportData(true);
                      if (success) {
                        toast.success('数据备份成功');
                      } else {
                        toast.error('数据备份失败，请重试');
                      }
                    }}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>备份中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-database mr-2"></i>备份数据
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">创建当前数据的备份文件</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-md text-sm ripple-effect flex items-center justify-center"
                  onClick={confirmClearData}
                >
                  <i className="fas fa-trash-alt mr-2"></i>清空所有数据
                </button>
                <p className="text-xs text-red-500 mt-2 text-center">警告：此操作将删除所有本地数据，且无法恢复</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;