import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Notification } from '@/types';
import { LocalStorageService } from '@/lib/localStorage';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  syncWithTeacher: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 复习阶段配置
const REVIEW_STAGES = [
  { id: 'review1', name: '复习一次', interval: 15 * 60 * 1000 }, // 15分钟
  { id: 'review2', name: '复习二次', interval: 60 * 60 * 1000 }, // 1小时
  { id: 'review3', name: '复习三次', interval: 24 * 60 * 60 * 1000 }, // 1天
  { id: 'review4', name: '复习四次', interval: 2 * 24 * 60 * 60 * 1000 }, // 2天
  { id: 'review5', name: '复习五次', interval: 4 * 24 * 60 * 60 * 1000 }, // 4天
  { id: 'review6', name: '复习六次', interval: 7 * 24 * 60 * 60 * 1000 }, // 7天
];

export const NotificationProvider: React.FC<{ children: ReactNode, initialNotifications: Notification[] }> = ({
  children,
  initialNotifications
}) => {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  
  // 从localStorage加载通知
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('studentNotifications');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);
  
  // 保存通知到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('studentNotifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, [notifications]);
  
  // 计算未读通知数量
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // 将单个通知标记为已读
  const markAsRead = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  // 将所有通知标记为已读
  const markAllAsRead = () => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };
  
  // 添加新通知
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString()
    };
    
    setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
  };
  
  // 设置复习提醒
  useEffect(() => {
    // 获取学习历史
    const learningHistory = LocalStorageService.getLearningHistory();
    const now = new Date().getTime();
    
    // 检查每个单词的复习时间
    Object.keys(learningHistory).forEach(wordId => {
      const progress = learningHistory[wordId];
      const lastReviewed = localStorage.getItem(`lastReviewed_${wordId}`);
      
      if (lastReviewed) {
        const lastTime = parseInt(lastReviewed);
        
        // 根据当前进度确定下一个复习阶段
        const stageIndex = Math.min(Math.floor(progress * REVIEW_STAGES.length), REVIEW_STAGES.length - 1);
        const nextStage = REVIEW_STAGES[stageIndex];
        
        // 计算下次复习时间
        const nextReviewTime = lastTime + nextStage.interval;
        
        // 如果到了复习时间，发送通知
        if (now >= nextReviewTime) {
          const notificationId = `review_${wordId}_${nextStage.id}`;
          
          // 检查是否已经发送过该通知
          const notificationExists = notifications.some(n => n.id === notificationId);
          
          if (!notificationExists) {
            // 获取单词信息
            const words = LocalStorageService.getWords();
            const word = words.find(w => w.id === wordId);
            
            if (word) {
              addNotification({
                id: notificationId,
                title: `${nextStage.name}提醒`,
                message: `单词"${word.word}"已到达${nextStage.name}时间，请及时复习`,
                time: new Date().toLocaleTimeString(),
                read: false,
                type: 'reminder'
              });
            }
          }
        }
      }
    });
    
    // 设置定期检查的定时器
    const intervalId = setInterval(() => {
      // 这里会定期检查是否有到达复习时间的单词
    }, 5 * 60 * 1000); // 每5分钟检查一次
    
    return () => clearInterval(intervalId);
  }, [notifications]);
  
  // 同步到教师端
  const syncWithTeacher = () => {
    try {
      // 获取复习记录
      const reviewRecords = notifications.filter(n => n.type === 'reminder' && n.read);
      
      // 保存到共享存储区域，供教师端查看
      localStorage.setItem('reviewRecords', JSON.stringify(reviewRecords));
    } catch (error) {
      console.error('Failed to sync with teacher:', error);
    }
  };
  
  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      addNotification,
      syncWithTeacher
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}