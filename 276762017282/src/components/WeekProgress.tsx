import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// 日期状态类型定义
type DayStatus = 'completed' | 'in-progress' | 'current' | 'pending';

// 日期卡片组件
const DayCard = ({ 
  dayName, 
  date, 
  status, 
  isToday,
  onClick 
}: { 
  dayName: string; 
  date: number; 
  status: DayStatus; 
  isToday: boolean;
  onClick: () => void; 
}) => {
  // 根据状态确定样式 - 移除颜色区分
  const getStatusStyles = () => {
    switch(status) {
      case 'current':
        return 'bg-white border-2 border-gray-300 shadow-sm';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  // 根据状态确定图标 - 使用统一图标
  const getStatusIcon = () => {
    return isToday ? (
      <i className="fa-solid fa-calendar-day text-gray-700"></i>
    ) : (
      <i className="fa-regular fa-calendar text-gray-500"></i>
    );
  };

  return (
    <div 
      className={cn(
        "flex-1 flex flex-col items-center p-4 rounded-lg cursor-pointer border transition-all duration-300 hover:shadow-md",
        getStatusStyles(),
        isToday ? "ring-2 ring-blue-500 ring-offset-2" : ""
      )}
      onClick={onClick}
    >
      <div className="text-2xl mb-2">{getStatusIcon()}</div>
      <div className="text-sm font-medium text-center">{dayName}</div>
      <div className="text-lg font-bold mt-1">{date}</div>
    </div>
  );
};

// 本周进度组件
const WeekProgress = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<Array<{
    dayName: string;
    date: number;
    status: DayStatus;
    dayOfWeek: number;
    isToday: boolean;
  }>>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 同步系统日期
  useEffect(() => {
    // 每分钟更新一次日期
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // 计算本周日期
  useEffect(() => {
    const calculateWeekDates = () => {
      const today = new Date(currentDate);
      const dayOfWeek = today.getDay() || 7; // 将周日转换为7
      const result = [];
      
      // 生成周一到周日的日期
      for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        const diff = i - dayOfWeek;
        date.setDate(today.getDate() + diff);
        
        // 模拟状态数据（实际应用中应从API获取）
        let status: DayStatus = 'pending';
        const isToday = i === dayOfWeek;
        
        if (isToday) {
          status = 'current';
        } else if (i === 3 || i === 6) {
          status = 'completed';
        } else if (i === 2 || i === 7) {
          status = 'in-progress';
        }

        result.push({
          dayName: ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
          date: date.getDate(),
          status,
          dayOfWeek: i,
          isToday
        });
      }
      
      setDays(result);
    };

    calculateWeekDates();
  }, [currentDate]);

  return (
    <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">本周进度</h3>
  <button
    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
    onClick={() => navigate('/schedule')}
  >
    <i className="fa-solid fa-calendar-alt mr-1"></i>
    <span>课表视图</span>
  </button>
      </div>
      <div className="flex justify-between gap-2">
        {days.map((day, index) => (
          <DayCard 
            key={index}
            dayName={day.dayName}
            date={day.date}
            status={day.status}
            isToday={day.isToday}
            onClick={() => console.log(`选中日期: ${day.dayName} ${day.date}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default WeekProgress;