import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { LocalStorageService } from "@/lib/localStorage";

// 定义单词学习记录接口
interface WordRecord {
  id: number;
  word: string;
  phonetic: string;
  definition: string;
  status: 'known' | 'unknown' | 'error' | 'review' | 'mastered';
  lastReviewed: string;
  reviewCount: number;
  errorCount: number;
  book: string;
  grade: string;
}

// 定义学生信息接口
interface Student {
  id: string;
  name: string;
  className: string;
  totalStudyHours: number;
  currentWordBank: string;
  progress: number;
}

const LearningRecords: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  
  // 状态管理
  const [student, setStudent] = useState<Student | null>(null);
  const [allRecords, setAllRecords] = useState<WordRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<WordRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookFilter, setBookFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentWord, setCurrentWord] = useState<WordRecord | null>(null);
  
  // 学习趋势数据
  const [trendData, setTrendData] = useState<any[]>([]);

  // 加载学生学习记录
  useEffect(() => {
    if (!studentId) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 从本地存储获取学生信息和学习记录
        const students = LocalStorageService.getStudents();
        const studentData = students.find(s => s.id === studentId) || null;
        
        // 获取嵌入本地的单词作为学习记录
        const embeddedWords = LocalStorageService.getEmbeddedWords();
        
        // 生成模拟学习记录
        const records: WordRecord[] = embeddedWords.map((word: any, index: number) => ({
          id: index + 1,
          word: word.word,
          phonetic: word.phonetic,
          definition: word.definitions?.[0] || "",
          status: ['known', 'unknown', 'error', 'review', 'mastered'][Math.floor(Math.random() * 5)] as 'known' | 'unknown' | 'error' | 'review' | 'mastered',
          lastReviewed: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
          reviewCount: Math.floor(Math.random() * 10) + 1,
          errorCount: Math.floor(Math.random() * 5),
          book: word.textbook || "",
          grade: word.grade || ""
        }));
        
        // 生成学习趋势数据
        const generateTrendData = () => {
          const data = [];
          const today = new Date();
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            
            data.push({
              date: `${date.getMonth() + 1}/${date.getDate()}`,
              复习单词数: Math.floor(Math.random() * 15) + 5,
              掌握单词数: Math.floor(Math.random() * 10) + 2
            });
          }
          
          return data;
        };
        
        if (studentData) {
          setStudent(studentData);
          setAllRecords(records);
          setFilteredRecords(records);
          setTrendData(generateTrendData());
        } else {
          toast.error("未找到学生学习记录");
        }
      } catch (error) {
        console.error("加载学习记录失败:", error);
        toast.error("加载学习记录失败，请重试");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [studentId]);

  // 筛选记录
  useEffect(() => {
    let result = [...allRecords];
    
    // 搜索词筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(record => 
        record.word.toLowerCase().includes(term) ||
        record.definition.toLowerCase().includes(term)
      );
    }
    
    // 状态筛选
    if (statusFilter !== "all") {
      result = result.filter(record => record.status === statusFilter);
    }
    
    // 教材筛选
    if (bookFilter !== "all") {
      result = result.filter(record => record.book === bookFilter);
    }
    
    setFilteredRecords(result);
    setCurrentPage(1); // 重置到第一页
  }, [searchTerm, statusFilter, bookFilter, allRecords]);

  // 获取状态标签样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'known':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">认识</span>;
      case 'unknown':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">不认识</span>;
      case 'error':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">错误</span>;
      case 'review':
        return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">复习中</span>;
      case 'mastered':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">已掌握</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">未知</span>;
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'known':
        return <i className="fa-solid fa-circle-dot text-blue-500 mr-1"></i>;
      case 'unknown':
        return <i className="fa-solid fa-question-circle text-yellow-500 mr-1"></i>;
      case 'error':
        return <i className="fa-solid fa-exclamation-circle text-red-500 mr-1"></i>;
      case 'review':
        return <i className="fa-solid fa-sync-alt text-purple-500 mr-1"></i>;
      case 'mastered':
        return <i className="fa-solid fa-check-circle text-green-500 mr-1"></i>;
      default:
        return <i className="fa-solid fa-circle text-gray-500 mr-1"></i>;
    }
  };

  // 计算各类单词数量
  const calculateStats = () => {
    return {
      total: allRecords.length,
      known: allRecords.filter(r => r.status === 'known').length,
      unknown: allRecords.filter(r => r.status === 'unknown').length,
      error: allRecords.filter(r => r.status === 'error').length,
      review: allRecords.filter(r => r.status === 'review').length,
      mastered: allRecords.filter(r => r.status === 'mastered').length
    };
  };

  // 获取当前页数据
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  };

  // 获取总页数
  const getTotalPages = () => {
    return Math.ceil(filteredRecords.length / pageSize);
  };

  // 切换页码
  const changePage = (page: number) => {
    if (page < 1 || page > getTotalPages()) return;
    setCurrentPage(page);
  };

  // 查看单词详情
  const viewWordDetail = (word: WordRecord) => {
    setCurrentWord(word);
    setShowDetailModal(true);
  };

  // 导出记录
  const exportRecords = () => {
    if (filteredRecords.length === 0) {
      toast.info("没有可导出的记录");
      return;
    }
    
    // 转换为CSV格式
    const headers = "单词,音标,释义,状态,最后复习时间,复习次数,错误次数,教材,年级\n";
    const rows = filteredRecords.map(record => {
      const statusMap: Record<string, string> = {
        'known': '认识',
        'unknown': '不认识',
        'error': '错误',
        'review': '复习中',
        'mastered': '已掌握'
      };
      
      return `"${record.word}","${record.phonetic}","${record.definition}","${statusMap[record.status]}","${new Date(record.lastReviewed).toLocaleString()}",${record.reviewCount},${record.errorCount},"${record.book}","${record.grade}"`;
    }).join("\n");
    
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student?.name || '学生'}_单词学习记录_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("记录导出成功");
  };

  // 获取所有教材选项
  const getBookOptions = () => {
    const books = Array.from(new Set(allRecords.map(r => r.book)));
    return ["all", ...books];
  };

  // 渲染统计卡片
  const renderStatCards = () => {
    const stats = calculateStats();
    const cardData = [
      { title: "总单词数", value: stats.total, icon: "fa-book", color: "blue" },
      { title: "认识", value: stats.known, icon: "fa-circle-dot", color: "blue" },
      { title: "不认识", value: stats.unknown, icon: "fa-question-circle", color: "yellow" },
      { title: "错误", value: stats.error, icon: "fa-exclamation-circle", color: "red" },
      { title: "复习中", value: stats.review, icon: "fa-sync-alt", color: "purple" },
      { title: "已掌握", value: stats.mastered, icon: "fa-check-circle", color: "green" }
    ];
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {cardData.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-full bg-${card.color}-50 text-${card.color}-600`}>
                <i className={`fa-solid ${card.icon}`}></i>
              </div>
              <span className="text-2xl font-bold">{card.value}</span>
            </div>
            <div className="mt-2 text-sm text-gray-500">{card.title}</div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染分页控件
  const renderPagination = () => {
    const totalPages = getTotalPages();
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-center mt-6">
        <button
          onClick={() => changePage(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          首页
        </button>
        <button
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 roundedborder mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        
        {[...Array(Math.min(5, totalPages))].map((_, i) => {
          // 计算显示的页码
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          
          return (
            <button
              key={pageNum}
              onClick={() => changePage(pageNum)}
              className={`px-3 py-1 rounded border mx-1 ${
                currentPage === pageNum 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : ''
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        
        <button
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
        <button
          onClick={() => changePage(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          末页
        </button>
        
        <span className="mx-3 text-sm text-gray-500">
          第 {currentPage} / {totalPages} 页
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">加载学习记录中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 页面标题和导航 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/students')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {student ? `${student.name}的学习记录` : '学生学习记录'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={exportRecords}
            className="flex items-center text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md transition-colors"
          >
            <i className="fa-solid fa-download mr-2"></i>
            导出记录
          </button>
        </div>
      </div>
      
      {/* 学生基本信息 */}
      {student && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">学生姓名</p>
              <p className="font-medium">{student.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">班级</p>
              <p className="font-medium">{student.className}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">总学习时长</p>
              <p className="font-medium">{student.totalStudyHours.toFixed(1)}小时</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">当前词库</p>
              <p className="font-medium">{student.currentWordBank}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 学习趋势图表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">学习趋势</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="复习单词数" fill="#36BFFA" name="复习单词数" />
              <Bar dataKey="掌握单词数" fill="#00B42A" name="掌握单词数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* 统计卡片 */}
      {renderStatCards()}
      
      {/* 筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="搜索单词或释义..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            )}
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">所有状态</option>
              <option value="known">认识</option>
              <option value="unknown">不认识</option>
              <option value="error">错误</option>
              <option value="review">复习中</option>
              <option value="mastered">已掌握</option>
            </select>
          </div>
          
          <div>
            <select
              value={bookFilter}
              onChange={(e) => setBookFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">所有教材</option>
              {getBookOptions().filter(book => book !== "all").map(book => (
                <option key={book} value={book}>{book}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* 记录表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单词</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">音标</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">复习次数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">错误次数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后复习</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教材</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    没有找到匹配的学习记录
                  </td>
                </tr>
              ) : (
                getCurrentPageData().map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{record.word}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 italic">
                      {record.phonetic || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(record.status)}
                        <span className="ml-2">{getStatusBadge(record.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {record.reviewCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {record.errorCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                      {new Date(record.lastReviewed).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {record?.book || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewWordDetail(record)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <i className="fa-solid fa-eye mr-1"></i>详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页控件 */}
        {renderPagination()}
      </div>
      
      {/* 单词详情模态框 */}
      {showDetailModal && currentWord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">单词详情</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-2xl font-bold mb-2">{currentWord.word}</div>
              <div className="text-gray-600 italic mb-4">{currentWord.phonetic}</div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">释义</h4>
                <p className="text-gray-800">{currentWord.definition}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">学习状态</h4>
                <div className="flex items-center">
                  {getStatusIcon(currentWord.status)}
                  <span className="ml-2">{getStatusBadge(currentWord.status)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">复习次数</h4>
                  <p className="text-gray-800 flex items-center">
                    <i className="fa-solid fa-sync-alt mr-1 text-purple-500"></i>
                    {currentWord.reviewCount}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">错误次数</h4>
                  <p className="text-gray-800 flex items-center">
                    <i className="fa-solid fa-exclamation-circle mr-1 text-red-500"></i>
                    {currentWord.errorCount}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">最后复习时间</h4>
                <p className="text-gray-800 flex items-center">
                  <i className="fa-solid fa-clock mr-1 text-gray-500"></i>
                  {new Date(currentWord.lastReviewed).toLocaleString()}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">教材版本</h4>
                  <p className="text-gray-800">{currentWord.book}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">年级</h4>
                  <p className="text-gray-800">{currentWord.grade}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningRecords;