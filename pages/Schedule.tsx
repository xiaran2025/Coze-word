import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { STORAGE_KEYS } from "@/lib/localStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LocalStorageService } from "@/lib/localStorage";


interface ScheduleItem {
    id: string;
    time: string;
    student: string;
    duration: string;
    content: string;
    level: string;
    type: "word" | "reading" | "grammar";
    checkedIn?: boolean;
    className?: string;
    location?: string;
    day: number;
    startTime: string;
    endTime: string;
}

interface CalendarDay {
    date: Date;
    day: number;
    weekday: string;
    isCurrent: boolean;
}

interface TimeSlot {
    id: string;
    time: string;
    start: number;
}

const Schedule: React.FC = () => {
    const navigate = useNavigate();
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [checkedInItems, setCheckedInItems] = useState<Record<string, boolean>>({});
    const [showTooltip, setShowTooltip] = useState(false);

    const classPeriods = Array.from({
        length: 24
    }, (_, i) => ({
        id: i + 1,
        timeRange: `${i.toString().padStart(2, "0")}:00-${(i + 1).toString().padStart(2, "0")}:00`
    }));

    const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

    const getStatusStyles = (status: boolean) => {
        return status ? "bg-green-100 border-l-4 border-green-500" : "bg-white border border-gray-200";
    };

    const getStatusLabel = (status: boolean) => {
        return status ? <span
            className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <i className="fa-solid fa-check mr-1"></i>已完成
                              </span> : <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">未完成</span>;
    };

    const loadScheduleFromCoursePlans = () => {
        setIsLoading(true);

        try {
            const coursePlans = LocalStorageService.getCoursePlans();
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0];

            const scheduleItems = coursePlans.map(course => {
                const periods = Array.from({
                    length: 24
                }, (_, i) => ({
                    id: i + 1,
                    timeRange: `${i.toString().padStart(2, "0")}:00-${(i + 1).toString().padStart(2, "0")}:00`
                }));

                const courseHour = parseInt(course.startTime.split(":")[0]);
                const period = periods.find(p => p.id === courseHour + 1);
                const timeRange = period ? period.timeRange : `${course.startTime}-${course.endTime}`;

return {
    id: course.id,
    time: timeRange,
    student: course.studentName,
    duration: "45分钟",
content: course.wordBankName,
    level: "初级",
    type: "word",
    className: course.subject,
    location: "",
    checkedIn: course.status === "completed",
    day: course.day,
    startTime: course.startTime,
    endTime: course.endTime
};
            });

            setScheduleItems(scheduleItems);
            LocalStorageService.saveScheduleData(todayStr, scheduleItems);
            const savedCheckedIn = localStorage.getItem("checkedInItems");
            const checkedInState = savedCheckedIn ? JSON.parse(savedCheckedIn) : {};
            setCheckedInItems(checkedInState);
        } catch (error) {
            console.error("Failed to load schedule from course plans:", error);
            setScheduleItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadScheduleFromCoursePlans();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEYS.COURSE_PLANS) {
                loadScheduleFromCoursePlans();
            }
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    const handleCheckIn = (itemId: string) => {
        const updatedCheckedIn = {
            ...checkedInItems,
            [itemId]: !checkedInItems[itemId]
        };

        setCheckedInItems(updatedCheckedIn);
        localStorage.setItem("checkedInItems", JSON.stringify(updatedCheckedIn));

        setScheduleItems(prev => prev.map(item => item.id === itemId ? {
            ...item,
            checkedIn: !checkedInItems[itemId]
        } : item));

        toast.success(updatedCheckedIn[itemId] ? "打卡成功！" : "已取消打卡");
    };

  const exportSchedule = () => {
    try {
      // 动态加载html2pdf库
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        // 获取课程表表格元素
        const tableElement = document.querySelector('.min-w-full.border.border-gray-200');
        if (!tableElement) {
          toast.error("未找到课程表数据");
          return;
        }

        // 创建导出容器，包含标题和表格
        const exportContainer = document.createElement('div');
        exportContainer.style.padding = '20px';
        exportContainer.style.width = '100%';
        exportContainer.style.boxSizing = 'border-box';
        
        // 添加标题
        const title = document.createElement('h2');
        title.textContent = `课程表_${new Date().toLocaleDateString()}`;
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        
        // 添加表格
        exportContainer.appendChild(title);
        
        // 创建表格副本并修复样式问题
        const tableCopy = tableElement.cloneNode(true) as HTMLElement;
        tableCopy.style.width = '100%';
        tableCopy.style.borderCollapse = 'collapse';
        
        // 确保表格内容可见
        const allCells = tableCopy.querySelectorAll('td, th');
        allCells.forEach(cell => {
          (cell as HTMLElement).style.padding = '8px';
          (cell as HTMLElement).style.border = '1px solid #ddd';
          (cell as HTMLElement).style.whiteSpace = 'nowrap';
        });
        
        exportContainer.appendChild(tableCopy);

        // 配置PDF选项
        const opt = {
          margin: 10,
          filename: `课程表_${new Date().toLocaleDateString()}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            letterRendering: true,
            scrollY: 0
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'landscape' 
          }
        };

        // 生成并下载PDF
        (window as any).html2pdf().from(exportContainer).set(opt).save();
        
        toast.success("课程表导出成功");
      };
      
      script.onerror = () => {
        toast.error("PDF导出功能加载失败，请检查网络连接");
      };
      
      document.body.appendChild(script);
    } catch (error) {
      console.error("课程表导出失败:", error);
      const errorMsg = error instanceof Error ? error.message : "未知错误";
      toast.error(`课程表导出失败: ${errorMsg}`);
    }
  }

    const getScheduleItem = (periodId: number) => {
        return scheduleItems.find(
            item => item.time.startsWith(classPeriods[periodId - 1].timeRange.split("-")[0])
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-lg shadow p-6 module-transition min-h-[calc(100vh-120px)]">
            {}
            <div className="flex justify-between items-center mb-6">
                <button
                    className="text-gray-600 hover:text-gray-900 flex items-center"
                    onClick={() => navigate("/course-plans")}>
                    <i className="fa-solid fa-arrow-left mr-2"></i>返回课程计划
                                                </button>
                <div className="flex items-center">
                    <button
                        onClick={exportSchedule}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg mr-2 flex items-center">
                        <i className="fa-solid fa-download mr-2"></i>导出课程表
                                                          </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="帮助">
                            <i className="fa-solid fa-info-circle text-xl"></i>
                        </button>
                        {showTooltip && <div
                            className="absolute right-0 mt-2 w-64 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-10">
                            <p className="text-sm text-gray-700">点击课程卡片中的"打卡"按钮完成当日学习打卡</p>
                        </div>}
                    </div>
                </div>
            </div>
            {}
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th
                                className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500">时间</th>
                            {weekdays.map((day, index) => <th
                                key={index}
                                className="py-3 px-4 border-b text-center text-sm font-medium text-gray-500">
                                {day}
                            </th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                          // 预处理课程数据，计算每个课程应跨越的行数
                          const courseSpans = Array(classPeriods.length).fill(null).map(() => 
                            Array(weekdays.length).fill({ hasCourse: false, rowSpan: 1 })
                          );
                          
                          scheduleItems.forEach(item => {
                            try {
                              // 计算课程持续时间（小时）
                              const startHour = parseInt(item.startTime.split(":")[0]);
                              const startMinute = parseInt(item.startTime.split(":")[1]);
                              const endHour = parseInt(item.endTime.split(":")[0]);
                              const endMinute = parseInt(item.endTime.split(":")[1]);
                              
                              // 计算总分钟数
                              const startTotalMinutes = startHour * 60 + startMinute;
                              const endTotalMinutes = endHour * 60 + endMinute;
                              const durationMinutes = endTotalMinutes - startTotalMinutes;
                              
                              // 转换为小时数，向上取整得到需要跨越的行数
                              const durationHours = Math.ceil(durationMinutes / 60);
                              
                              // 计算课程对应的时间段索引和星期几索引
                              const courseDay = item.day === 0 ? 6 : item.day - 1; // 转换为星期几索引
                              const startPeriodIndex = startHour; // period.id从1开始，对应0-23小时
                              
                              // 标记课程跨越的单元格
                              if (startPeriodIndex >= 0 && startPeriodIndex < classPeriods.length && courseDay >= 0 && courseDay < weekdays.length) {
                                courseSpans[startPeriodIndex][courseDay] = { 
                                  hasCourse: true, 
                                  rowSpan: durationHours,
                                  courseId: item.id
                                };
                                
                                // 标记后续行被跨越
                                for (let i = 1; i < durationHours; i++) {
                                  if (startPeriodIndex + i < classPeriods.length) {
                                    courseSpans[startPeriodIndex + i][courseDay] = { 
                                      hasCourse: true, 
                                      rowSpan: 0, // 0表示被跨越，不显示内容
                                      courseId: item.id
                                    };
                                  }
                                }
                              }
                            } catch (error) {
                              console.error("Error calculating course spans:", error);
                            }
                          });
                          
                          // 渲染表格行
                          return classPeriods.map((period, periodIndex) => {
                            // 检查当前时间段是否有课程开始
                            const hasAnyCourse = weekdays.some((_, dayIndex) => 
                              courseSpans[periodIndex][dayIndex].hasCourse && courseSpans[periodIndex][dayIndex].rowSpan > 0
                            );
                            
                            return (
                              <tr 
                                key={period.id} 
                                className={cn(
                                  "transition-colors",
                                  hasAnyCourse ? "bg-gray-50" : "hover:bg-gray-50"
                                )}
                                style={{ 
                                  height: hasAnyCourse ? "auto" : "60px" // 没有课程时保持固定高度
                                }}
                              >
                                <td className="py-3 px-4 border-b text-sm text-gray-700 font-medium">
                                  <div className="text-xs text-gray-500">{period.timeRange}</div>
                                </td>
                                
                                {weekdays.map((day, dayIndex) => {
                                  const spanInfo = courseSpans[periodIndex][dayIndex];
                                  
                                  // 如果是被跨越的单元格，不显示内容
                                  if (spanInfo.rowSpan === 0) {
                                    return null;
                                  }
                                  
                                  // 查找当前单元格的课程
                                  const dayCourses = scheduleItems.filter(item => {
                                    const courseDay = item.day === 0 ? 6 : item.day - 1; // 转换为星期几索引
                                    const courseHour = parseInt(item.startTime.split(":")[0]);
                                    return courseDay === dayIndex && courseHour === period.id - 1;
                                  });
                                  
                                  const scheduleItem = dayCourses.length > 0 ? dayCourses[0] : null;
                                  
                                  return (
                                    <td 
                                      key={dayIndex} 
                                      className="py-2 px-3 border-b"
                                      rowSpan={spanInfo.rowSpan > 1 ? spanInfo.rowSpan : undefined}
                                    >
                                      {scheduleItem ? (
                                        <div 
                                          className={`p-3 rounded-lg shadow-sm ${getStatusStyles(scheduleItem.checkedIn || false)} 
                                            border-l-4 border-l-${scheduleItem.className === "英语" ? "blue-500" : 
                                              scheduleItem.className === "数学" ? "green-500" : "purple-500"}
                                            transition-all duration-300 hover:shadow-md`}
                                            style={{ 
                                              minHeight: spanInfo.rowSpan > 1 ? `${spanInfo.rowSpan * 60}px` : 'auto',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              justifyContent: 'space-between'
                                            }}
                                        >
                                          <div>
                                            <div className="text-sm font-medium text-gray-800 mb-1">{scheduleItem.startTime} - {scheduleItem.endTime}</div>
                                            <div className="text-sm text-gray-600 mb-2 flex items-center">
                                              <i className="fa-solid fa-user mr-1 text-gray-400"></i>
                                              {scheduleItem.student}
                                            </div>
                                            <div className="text-sm text-gray-600 mb-2 flex items-center">
                                              <i className="fa-solid fa-book mr-1 text-gray-400"></i>
                                              {scheduleItem.content}
                                            </div>
                                          </div>
                                          <div className="flex justify-between items-center mt-2">
                                            {getStatusLabel(scheduleItem.checkedIn || false)}
                                            <button
                                              onClick={() => handleCheckIn(scheduleItem.id)}
                                              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
                                              <i className="fa-solid fa-check-circle mr-1"></i>{scheduleItem.checkedIn ? "已打卡" : "打卡"}
                                            </button>
                                          </div>
                                        </div>
                                      ) : spanInfo.rowSpan > 0 ? (
                                        <div className="h-full"></div> // 空单元格
                                      ) : null}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        })()}
                    </tbody>
                </table>
            </div>
            {}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-100 border-l-4 border-green-500 mr-2"></div>
                    <span>已完成课程</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-white border border-gray-200 mr-2"></div>
                    <span>未完成课程</span>
                </div>
                <div className="flex items-center">
                    <></>
                    <></>
                </div>
            </div>
        </div>
    );
};

export default Schedule;