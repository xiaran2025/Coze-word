import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useContext } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { AuthContext } from "@/contexts/authContext";
import { useNotifications } from "./NotificationContext";
import { Notification } from "@/types";

interface MainLayoutProps {
    currentModule: string;
}

const MainLayout: React.FC<MainLayoutProps> = (
    {
        currentModule
    }
) => {
    const {
        currentUser,
        logout,
        updateUser
    } = useContext(AuthContext);

    const {
        notifications,
        markAsRead,
        markAllAsRead,
        syncWithTeacher
    } = useNotifications();

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
    };

    // 网络连接状态检测
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    useEffect(() => {
        // 初始化网络状态
        setIsOnline(navigator.onLine);
        
        // 监听网络状态变化
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // 清理事件监听器
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!currentUser) {
        return null;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar user={currentUser} onLogout={logout} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    currentModule={currentModule}
                    notifications={notifications}
                    onNotificationClick={handleNotificationClick}
                    markAllAsRead={markAllAsRead}
                    currentUser={currentUser}
                    updateUser={updateUser} />
                
                {/* 网络连接状态提示 */}
                {!isOnline && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 flex items-start">
                        <i className="fa-solid fa-exclamation-triangle text-amber-500 mt-0.5 mr-3 text-lg"></i>
                        <div>
                            <h3 className="text-sm font-medium text-amber-800">网络连接已断开</h3>
                            <div className="mt-1 text-sm text-amber-700">
                                <p>您目前处于离线状态。部分功能可能受限，但您仍然可以：</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>查看已下载的单词</li>
                                    <li>使用本地学习记录</li>
                                    <li>进行离线练习</li>
                                </ul>
                                <p className="mt-2">请检查您的网络连接或稍后重试。</p>
                            </div>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-3 text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md"
                            >
                                <i className="fa-solid fa-sync mr-1"></i>重新连接
                            </button>
                        </div>
                    </div>
                )}
                
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;