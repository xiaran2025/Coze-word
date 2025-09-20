import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-6xl font-bold text-gray-200 mb-4">404</div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">页面未找到</h2>
        <p className="text-gray-600 mb-6">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <Link
          to="/word-library"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#165DFF] hover:bg-blue-700 ripple-effect transition duration-150 ease-in-out"
        >
          <i className="fas fa-arrow-left mr-2"></i>返回首页
        </Link>
      </div>
    </div>
  );
};

export default NotFound;