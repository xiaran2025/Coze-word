import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // 移除所有主题类
    document.documentElement.classList.remove('light', 'dark');
    // 添加当前主题类
    document.documentElement.classList.add(theme);
    // 保存主题偏好
    localStorage.setItem('theme', theme);
    
    // 更新自定义属性以支持主题色
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--bg-color', '#1a1a1a');
      document.documentElement.style.setProperty('--text-color', '#f5f5f5');
      document.documentElement.style.setProperty('--card-bg', '#2d2d2d');
    } else {
      document.documentElement.style.setProperty('--bg-color', '#f5f5f5');
      document.documentElement.style.setProperty('--text-color', '#1a1a1a');
      document.documentElement.style.setProperty('--card-bg', '#ffffff');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };
} 