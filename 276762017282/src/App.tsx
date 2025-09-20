import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthContext } from '@/contexts/authContext';
import { NotificationProvider } from '@/components/NotificationContext';
import MainLayout from '@/components/MainLayout';
import WordLibrary from '@/pages/WordLibrary';
import Students from '@/pages/Students';
import CoursePlans from '@/pages/CoursePlans';
import MemoryCurve from '@/pages/MemoryCurve';
import GridReview from '@/pages/GridReview';
import AntiForgettingReview from '@/pages/AntiForgettingReview';
import Schedule from '@/pages/Schedule';

import PhonicsMemory from '@/pages/PhonicsMemory';
import StudyWordBank from '@/pages/StudyWordBank';
import LearningRecords from '@/pages/LearningRecords';

import WordMasterChallenge from '@/pages/WordMasterChallenge';
import AISongComposition from '@/pages/AISongComposition';
import WordMatchingGame from '@/pages/WordMatchingGame';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';

import NotFound from '@/pages/NotFound';
import { mockNotifications, mockUser } from '@/lib/mockData';
import { User } from '@/types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return !!savedUser;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const location = useLocation();
  
  // 监听路由变化，确保导航状态正确
  useEffect(() => {
    // 可以在这里添加任何路由变化时需要执行的逻辑
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  // 监听头像更新事件
  useEffect(() => {
    const handleAvatarUpdate = () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    };
    
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, []);
  
    // 确定当前模块名称用于页面标题
    const getCurrentModuleName = () => {
      const path = location.pathname;
      switch (path) {
        case '/study-word-bank':
          return '学习词库';
        case '/word-library':
          return '单词库';
        case '/students':
          return '学生管理';
        case '/course-plans':return '课程计划';
        case '/phonics-memory':
          return '自然拼读记忆';
        case '/anti-forgetting-review':
          return '抗遗忘复习';
        case '/grid-review':
          return '九宫格复习';
        case '/runtime/word-master-challenge':
          return '单词达人测试挑战';
        case '/settings':
          return '系统设置';
        default:
          return 'PhonicsMaster';
      }
    };

         const login = (username: string, password: string, userType: 'teacher' | 'student' = 'teacher') => {
   // 模拟登录验证
   if (userType === 'teacher' && username === 'teacher' && password === 'password') {
     setIsAuthenticated(true);
     // 保存用户信息到localStorage
     localStorage.setItem('currentUser', JSON.stringify(mockUser));
     setCurrentUser(mockUser);
     return true;
     } else if (userType === 'student' && (username === 'student' || username === '岩石') && password === 'password') {
     setIsAuthenticated(true);
     // 创建学生用户信息
     const studentUser = {
       ...mockUser,
       id: 'student1',
       name: '学生用户',
       role: '学生'
     };
     localStorage.setItem('currentUser', JSON.stringify(studentUser));
     setCurrentUser(studentUser);
     return true;
   }
 return false;
 };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    // 清除localStorage中的用户信息
    localStorage.removeItem('currentUser');
  };
  
  // 更新用户信息
  const updateUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };
 
   // 保护路由组件
   const ProtectedRoute: React.FC<{ children: React.ReactNode, requiredRole?: string }> = ({ children, requiredRole }) => {
     if (!isAuthenticated) {
       return <Navigate to="/login" replace />;
     }
     if (requiredRole && currentUser?.role !== requiredRole) {
       return <Navigate to="/word-library" replace />;
     }
     return <>{children}</>;
   };

  // 确保路由路径匹配导航链接
  const renderRoute = (path: string, element: React.ReactNode) => (
    <Route 
      key={path}
      path={path} 
      element={element} 
      onClick={() => {
        // 路由切换时触发重渲染
        window.dispatchEvent(new Event('routeChange'));
      }}
    />
  );

  return (
    <AuthContext.Provider
  value={{ isAuthenticated, currentUser, login, logout, updateUser }}
    >
      <NotificationProvider initialNotifications={mockNotifications}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/word-library" /> : <Login />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout currentModule={getCurrentModuleName()} />
              </ProtectedRoute>
            }
          >
              <Route index element={<Navigate to="/study-word-bank" replace />} />
              {renderRoute("word-matching", <WordMatchingGame />)}
              {renderRoute("word-library", <WordLibrary />)}
              {renderRoute("students", <Students />)}
              {renderRoute("course-plans", <CoursePlans />)}
               {renderRoute("schedule", <Schedule />)}
               {renderRoute("study-word-bank", <StudyWordBank />)}
               {renderRoute("learning-records/:studentId", <LearningRecords />)}
              {renderRoute("anti-forgetting-review", <AntiForgettingReview />)}
              {renderRoute("ai-song-composition", <AISongComposition />)}
              {renderRoute("grid-review", <GridReview />)}
              {renderRoute("runtime/word-master-challenge", <WordMasterChallenge />)}
              {renderRoute("settings", <Settings />)}
              {renderRoute("phonics-memory", <PhonicsMemory />)}
           </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </NotificationProvider>
    </AuthContext.Provider>
  );
}