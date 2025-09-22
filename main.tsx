import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'sonner';
import App from "./App.tsx";
import "./index.css";

import { initializeLocalStorageData, mockUser } from './lib/mockData';

// 初始化本地存储数据（如果为空）- 不初始化学生数据
initializeLocalStorageData({
  words: [],
  students: [],
  coursePlans: [],
  user: mockUser
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>
);
