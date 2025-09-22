import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { User } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
    user: User;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = (
    {
        user,
        onLogout
    }
) => {
    const [learningManagementOpen, setLearningManagementOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const learningManagementPaths = [
            "/word-library",
            "/phonics-memory",
            "/anti-forgetting-review",
            "/grid-review",
            "/runtime/word-master-challenge"
        ];

        setLearningManagementOpen(learningManagementPaths.some(path => location.pathname.startsWith(path)));
    }, [location.pathname]);

    const closeSubmenu = () => {
        setLearningManagementOpen(false);
    };

    return (
        <div className="w-64 bg-[#165DFF] text-white flex flex-col h-screen">
            <div className="p-4 text-center border-b border-blue-400">
                <></>
                <p
                    className="text-sm text-blue-100"
                    style={{
                        fontSize: "18px",
                        fontWeight: "bold"
                    }}>单词带背教学系统</p>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                <li>
                    <NavLink
                        to="/students"
                        className={(
                            {
                                isActive
                            }
                        ) => cn(
                            "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors duration-150",
                            isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                        )}
                        onClick={closeSubmenu}>
                        <i className="fa-solid fa-users mr-3"></i>
                        <span>学生管理</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/course-plans"
                        className={(
                            {
                                isActive
                            }
                        ) => cn(
                            "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors duration-150",
                            isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                        )}
                        onClick={closeSubmenu}>
                        <i className="fa-solid fa-calendar-alt mr-3"></i>
                        <span>课程计划</span>
                    </NavLink>
                </li>
                    <li>
                        <button
                            className="flex items-center justify-between w-full px-4 py-3 rounded-md text-sm font-medium text-blue-100 hover:bg-blue-600 hover:text-white transition-colors duration-150"
                            onClick={() => setLearningManagementOpen(!learningManagementOpen)}>
                            <div className="flex items-center">
                                <i className="fas fa-graduation-cap mr-3"></i>
                                <span>学习管理</span>
                            </div>
                            <i
                                className={`fas ${learningManagementOpen ? "fa-chevron-up" : "fa-chevron-down"} text-xs`}></i>
                        </button>
                        {learningManagementOpen && <ul className="mt-1 ml-4 space-y-1">
                            <li>
                                <NavLink
                                    to="/study-word-bank"
                                    className={(
                                        {
                                            isActive
                                        }
                                    ) => cn(
                                        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                        isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                                    )}>
                                    <i className="fa-solid fa-book mr-3"></i>
                                    <span>创建新词库</span>
                                </NavLink>
                                <NavLink
                                    to="/word-library"
                                    className={(
                                        {
                                            isActive
                                        }
                                    ) => cn(
                                        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                        isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                                    )}>
                                    <i className="fa-solid fa-book mr-3"></i>
                                    <span>单词学库</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink
                                    to="/phonics-memory"
                                    className={(
                                        {
                                            isActive
                                        }
                                    ) => cn(
                                        "flex items-center px-4 py-2 rounded-md text-sm font-medium",
                                        isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                                    )}>
                                    <i className="fa-solid fa-volume-up mr-3"></i>
                                    <span>自然拼读记忆</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink
                                    to="/anti-forgetting-review"
                                    className={(
                                        {
                                            isActive
                                        }
                                    ) => cn(
                                        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                        isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                                    )}>
                                    <i className="fa-solid fa-sync-alt mr-3"></i>
                                    <span>抗遗忘复习</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink
                                    to="/grid-review"
                                    className={(
                                        {
                                            isActive
                                        }
                                    ) => cn(
                                        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                        isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                                    )}>
                                    <i className="fa-solid fa-th-large mr-3"></i>
                                    <span>九宫格复习</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink
                                    to="/runtime/word-master-challenge"
                                    className={(
                                        {
                                            isActive
                                        }
                                    ) => cn(
                                        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                        isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                                    )}>
                                    <i className="fa-solid fa-trophy mr-3"></i>
                                    <span>单词达人测试挑战</span>
                                </NavLink>
                            </li>
                        </ul>}
                    </li>
                    <li>
                        <NavLink
                            to="/settings"
                            className={(
                                {
                                    isActive
                                }
                            ) => cn(
                                "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors duration-150",
                                isActive ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
                            )}
                            onClick={closeSubmenu}>
                            <i className="fa-solid fa-cog mr-3"></i>
                            <span>系统设置</span>
                        </NavLink>
                    </li>
                    <li>
                        <button
                            className="flex items-center w-full px-4 py-3 rounded-md text-sm font-medium text-blue-100 hover:bg-blue-600 hover:text-white transition-colors duration-150"
                            onClick={onLogout}>
                            <i className="fa-solid fa-sign-out-alt mr-3"></i>
                            <span>退出登录</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;