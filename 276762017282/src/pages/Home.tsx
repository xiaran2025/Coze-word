import React from 'react';

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">欢迎使用 PhonicsMaster</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          这是您的语言学习管理系统主页。请从左侧导航栏选择一个功能开始使用。
        </p>
      </div>
    </div>
  );
}