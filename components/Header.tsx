import React, { useState, useEffect } from "react";
import { Notification, User } from "@/types";
import { cn } from "@/lib/utils";

interface HeaderProps {
    currentModule: string;
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    markAllAsRead: () => void;
    currentUser: User | null;
    updateUser: (user: User) => void;
}

const Header: React.FC<HeaderProps> = (
    {
        currentModule,
        notifications,
        onNotificationClick,
        markAllAsRead,
        currentUser,
        updateUser
    }
) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const now = new Date();
        setLastSyncTime(`今天 ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`);

        const syncInterval = setInterval(() => {
            const now = new Date();
            setLastSyncTime(`今天 ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`);
        }, 60000);

        return () => clearInterval(syncInterval);
    }, []);

    const toggleNotifications = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowNotifications(!showNotifications);
    };

    useEffect(() => {
        if (currentUser) {
            setEditUser({
                ...currentUser
            });
        }
    }, [currentUser]);

    useEffect(() => {
        const handleClickOutside = () => {
            setShowNotifications(false);
        };

        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-white shadow-sm z-10">
            <div className="flex items-center justify-between px-6 py-4">
                <></>
                <div className="flex items-center space-x-4">
                    {}
                    {currentUser && <div className="text-right mr-4 relative group">
                        <p className="font-medium text-gray-800">{currentUser.name}</p>
                        <p className="text-xs text-gray-500">{currentUser.role}</p>
                        <button
                            className="absolute -top-1 -right-10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setShowEditModal(true)}>
                            <i className="fas fa-edit text-gray-500 hover:text-blue-600"></i>
                        </button>
                    </div>}
                    {}
                    {showEditModal && <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div
                                className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
                                <h3 className="text-lg font-semibold text-gray-800">编辑个人信息</h3>
                                <button
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowEditModal(false)}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                                        <input
                                            type="text"
                                            value={editUser?.name || ""}
                                            onChange={e => setEditUser(prev => ({
                                                ...prev,
                                                name: e.target.value
                                            } as User))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                            disabled={!editUser} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                                        <input
                                            type="text"
                                            value={editUser?.role || ""}
                                            onChange={e => setEditUser(prev => ({
                                                ...prev,
                                                role: e.target.value
                                            } as User))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#165DFF] focus:border-[#165DFF]"
                                            disabled={!editUser} />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm ripple-effect">取消
                                                                                            </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editUser) {
                                                updateUser(editUser);
                                                setShowEditModal(false);
                                            }
                                        }}
                                        className="px-4 py-2 bg-[#165DFF] text-white rounded-md text-sm ripple-effect"
                                        disabled={!editUser}>保存信息
                                                                                            </button>
                                </div>
                            </div>
                        </div>
                    </div>}
                    {}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                            className="relative text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            onClick={toggleNotifications}
                            aria-label="通知中心">
                            <i className="fa-solid fa-bell text-xl"></i>
                            {unreadCount > 0 && <span
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                                {unreadCount}
                            </span>}
                        </button>
                        {}
                        {showNotifications && <div
                            className="absolute top-10 right-0 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200 module-transition">
                            <div
                                className="flex justify-between items-center border-b border-gray-200 px-4 py-3">
                                <h3 className="font-medium">通知中心 ({unreadCount})</h3>
                                <button
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                    onClick={markAllAsRead}>全部标为已读
                                                                                          </button>
                            </div>
                            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map(notification => <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150",
                                        !notification.read ? "bg-blue-50" : ""
                                    )}
                                    onClick={() => onNotificationClick(notification)}>
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 rounded-full p-2 mr-3">
                                            {notification.type === "reminder" && <i className="fa-solid fa-calendar-check text-blue-500"></i>}
                                            {notification.type === "announcement" && <i className="fa-solid fa-bullhorn text-green-500"></i>}
                                            {notification.type === "alert" && <i className="fa-solid fa-exclamation-circle text-yellow-500"></i>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                                            <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                        </div>
                                        {!notification.read && <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>}
                                    </div>
                                </div>) : <div className="p-6 text-center text-gray-500 text-sm">
                                    <i className="fa-solid fa-inbox mb-2 block text-2xl"></i>暂无通知
                                                                                            </div>}
                            </div>
                            <div className="border-t border-gray-200 px-4 py-2 text-center">
                                <button
                                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200">查看所有通知
                                                                                          </button>
                            </div>
                        </div>}
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <span className="text-sm text-gray-600">上次同步: <span className="font-medium">{lastSyncTime}</span></span>
                </div>
            </div>
        </header>
    );
};

export default Header;