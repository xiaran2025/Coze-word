import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// 定义九宫格每个扇形的数据结构
interface SectorData {
  id: number;
  number: number;
  title: string;
  description: string;
  color: string;
  angle: number;
}

// 九宫格循环记忆法页面组件
const MemoryCurve: React.FC = () => {
  // 状态管理
  const [isAnimating, setIsAnimating] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [activeSector, setActiveSector] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentSector, setCurrentSector] = useState<SectorData | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [animationStep, setAnimationStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // 环形容器引用
  const ringContainerRef = useRef<HTMLDivElement>(null);
  
  // 检测设备类型并设置响应式布局
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始化检测
    checkDevice();
    // 监听窗口大小变化
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);
  
  // 九宫格数据 - 9个扇形区域
  // 定义九宫格每个扇形的数据结构
  interface SectorData {
    id: number;
    number: number;
    title: string;
    description: string;
    color: string;
    angle: number;
    quickDesc: string;
  }

  // 九宫格数据 - 9个扇形区域，根据原图色系调整颜色
  const sectors: SectorData[] = [
    { id: 1, number: 1, title: "新学会", description: "首次学习新单词，建立初步记忆。建议集中注意力，理解词义和用法，可结合例句记忆。", 
      color: "#F53F3F", angle: 0, quickDesc: "新学会：建立初步记忆" },
    { id: 2, number: 36, title: "复习1次", description: "学习后10-15分钟内复习，强化短期记忆。快速回顾单词，检验记忆效果。", 
      color: "#FF7D00", angle: 40, quickDesc: "复习1次：10-15分钟内" },
    { id: 3, number: 12, title: "复习2次", description: "学习后1小时复习，巩固记忆。可通过简单自测方式进行，如遮盖中文释义回忆单词。", 
      color: "#FFAA00", angle: 80, quickDesc: "复习2次：1小时后" },
    { id: 4, number: 24, title: "复习3次", description: "学习后1天复习，防止遗忘。建议结合上下文或句子记忆，加深理解。", 
      color: "#00B42A", angle: 120, quickDesc: "复习3次：间隔1天" },
    { id: 5, number: 48, title: "复习4次", description: "学习后2天复习，强化神经连接。可尝试使用单词造句或进行联想记忆。", 
      color: "#0FC6C2", angle: 160, quickDesc: "复习4次：间隔2天" },
    { id: 6, number: 72, title: "复习5次", description: "学习后4天复习，巩固长期记忆。重点关注之前记忆模糊的单词。", 
      color: "#36BFFA", angle: 200, quickDesc: "复习5次：间隔4天" },
    { id: 7, number: 144, title: "复习6次", description: "学习后7天复习，强化记忆痕迹。可进行单词应用练习，如写作或对话。", 
      color: "#4A6CF7", angle: 240, quickDesc: "复习6次：间隔7天" },
    { id: 8, number: 288, title: "复习7次", description: "学习后15天复习，巩固长期记忆。此时单词已基本掌握，可进行综合应用练习巩固。", 
      color: "#722ED1", angle: 280, quickDesc: "复习7次：间隔15天" },
    { id: 9, number: 576, title: "长期记忆", description: "学习后30天复习，形成永久记忆。定期回顾，保持记忆活跃度，实现长期记忆转化。", 
      color: "#86909C", angle: 320, quickDesc: "长期记忆：间隔30天" },
  ];
  
  // 开始/暂停动画
  const toggleAnimation = () => {
    if (isAnimating) {
      setIsAnimating(false);
    } else {
      setIsAnimating(true);
      setAnimationStep(0);
      setAnimationProgress(0);
      // 设置第一个激活的扇形
      setActiveSector(sectors[0].id);
      setCurrentSector(sectors[0]);
    }
  };
  
  // 动画控制逻辑
  useEffect(() => {
    let interval: number;
    
    if (isAnimating) {
      interval = setInterval(() => {
        // 每个扇形动画持续2秒，进度条更新
        setAnimationProgress(prev => {
          const newProgress = prev + 1;
          
          // 进度达到100%时切换到下一个扇形
          if (newProgress >= 100) {
            const newStep = animationStep + 1;
            
            // 所有扇形动画完成
            if (newStep >= sectors.length) {
              setIsAnimating(false);
              setActiveSector(null);
              setAnimationStep(0);
              return 0;
            }
            
            // 设置新的当前扇形
            setAnimationStep(newStep);
            setActiveSector(sectors[newStep].id);
            return 0;
          }
          
          return newProgress;
        });
      }, 20); // 每20ms更新一次进度，2秒完成100%
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnimating, animationStep]);
  
  // 打开扇形详情弹窗
  const openSectorModal = (sector: SectorData) => {
    setCurrentSector(sector);
    setShowModal(true);
  };
  
  // 计算扇形样式
  const getSectorStyle = (sector: SectorData) => {
    const size = isMobile ? '120px' : '180px';
    const innerSize = isMobile ? '40px' : '60px';
    
    return {
      transform: `rotate(${sector.angle}deg) skewY(-30deg)`,
      width: size,
      height: size,
      clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)',
      fontSize: isMobile ? '14px' : '18px',
      lineHeight: isMobile ? '16px' : '24px',
    };
  };
  
  // 计算扇形内文本样式
  const getSectorTextStyle = (sector: SectorData) => {
    return {
      transform: `skewY(30deg) rotate(${-sector.angle}deg)`,
    };
  };
  
  // 状态管理 - 移动端触摸和提示
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<number | null>(null);

  // 处理触摸开始事件
  const handleTouchStart = (e: React.TouchEvent, sector: SectorData) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });

    // 显示快速提示
    setToastMessage(sector.quickDesc);
    
    // 设置自动隐藏toast
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 2000);
  };

  // 处理触摸结束事件
  const handleTouchEnd = (e: React.TouchEvent, sector: SectorData) => {
    if (!touchStart) return;
    
    // 计算触摸位移
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = Math.abs(touchEndX - touchStart.x);
    const dy = Math.abs(touchEndY - touchStart.y);
    
    // 位移小于10px视为点击
    if (dx < 10 && dy < 10) {
      openSectorModal(sector);
    }
    
    setTouchStart(null);
  };

  // 计算中心按钮大小
  const getCenterButtonSize = () => {
    return isMobile ? '80px' : '120px';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      {/* 头部区域 */}
      <header className="text-center mb-8 max-w-3xl mx-auto">
        <h1 className="text-[clamp(24px,5vw,42px)] font-bold text-gray-800 mb-4 text-shadow-lg">九宫格循环记忆法</h1>
        
        <div 
          className="bg-gray-[#f5f5f5] rounded-xl p-4 md:p-6 mb-6 cursor-pointer transition-all duration-300 hover:shadow-md"
          onClick={() => setGuideExpanded(!guideExpanded)}
        >
          <p className="text-gray-700 text-[clamp(14px,3vw,18px)] leading-relaxed">
            九宫格循环记忆法基于艾宾浩斯遗忘曲线设计，通过科学的复习间隔安排，帮助学习者高效记忆单词，从短期记忆转化为长期记忆。
            {guideExpanded && (
              <>
                <br/><br/>该方法将记忆过程分为9个阶段，从新学会到长期记忆，每个阶段都有特定的复习时间点和方法。通过这种循环复习方式，能够显著提高记忆保持率，降低遗忘速度。
              </>
            )}
          </p>
          <button className="mt-2 text-[#165DFF] font-medium flex items-center mx-auto">
            {guideExpanded ? (
              <>收起 <i className="fas fa-chevron-up ml-1"></i></>
            ) : (
              <>了解更多 <i className="fas fa-chevron-down ml-1"></i></>
            )}
          </button>
        </div>
      </header>
      
      {/* 主体区域 - 环形九宫格 */}
      <main className="flex flex-col items-center justify-center mb-12">
        <div 
          ref={ringContainerRef}
          className="relative w-full max-w-3xl aspect-square mx-auto"
          style={{
            maxWidth: isMobile ? '300px' : '600px',
          }}
        >
          {/* 9个扇形区域 */}
          {/* 移动端提示toast */}
          {toastMessage && isMobile && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-50">
              {toastMessage}
            </div>
          )}

          {/* 9个扇形区域 */}
          {sectors.map((sector) => (  
            <div
              key={sector.id}
              className={cn(
                "absolute flex items-center justify-center cursor-pointer transition-all duration-300 ease-out border border-white shadow-md rounded-lg",
                activeSector === sector.id || (isAnimating && animationStep === sector.id - 1)
                  ? "scale-110 z-20 shadow-lg"
                  : "hover:scale-105 z-10"
              )}
              style={{
                ...getSectorStyle(sector),
                backgroundColor: sector.color,
                left: '50%',
                top: isMobile ? '45%' : '50%',
                marginLeft: isMobile ? '-60px' : '-90px',
                marginTop: isMobile ? '-60px' : '-90px',
              }}
              onClick={() => openSectorModal(sector)}
              onMouseOver={() => !isAnimating && setActiveSector(sector.id)}
              onMouseOut={() => !isAnimating && setActiveSector(null)}
              onTouchStart={(e) => handleTouchStart(e, sector)}
              onTouchEnd={(e) => handleTouchEnd(e, sector)}
              onTouchMove={() => setTouchStart(null)} // 移动时取消点击意图
            >
              <div 
                className="text-white font-medium text-center"
                style={getSectorTextStyle(sector)}
              >
                <div className="font-bold text-lg">{sector.number}</div>
                <div>{sector.title}</div>
              </div>
            </div>
          ))}
          
          {/* 中心START按钮 */}
          <button
            className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-300 ease-out font-bold text-white shadow-lg border-4 border-white ${
              isAnimating 
                ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:-translate-y-1'
            }`}
            style={{
              width: getCenterButtonSize(),
              height: getCenterButtonSize(),
              fontSize: isMobile ? '18px' : '24px',
              zIndex: 30,
              pointerEvents: isAnimating ? 'none' : 'auto'
            }}
            onClick={toggleAnimation}
          >
            {isAnimating ? '演示中...' : 'START'}
          </button>
          
          {/* 动画进度条 */}
          {isAnimating && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-200 h-2 rounded-full overflow-hidden z-40">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-full transition-all duration-200 ease-out"
                style={{ width: `${animationProgress}%` }}
              ></div>
            </div>
          )}
          
          {/* 动画步骤说明 */}
          {isAnimating && currentSector && (
            <div className="absolute bottom-8 left-0 right-0 text-center z-40 px-4">
              <div className="inline-block bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <p className="text-gray-800 font-medium text-[clamp(14px,3vw,18px)]">
                  {currentSector.title}: {currentSector.description.substring(0, 50)}...
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* 底部说明区域 */}
      <footer className="text-center max-w-2xl mx-auto text-gray-600 text-[clamp(14px,_3vw,_16px)]">
        <p className="mb-4">短期记忆 --&gt; 长期记忆 --&gt; 肌肉记忆 层层推进，科学高效记忆单词</p>
        <p>根据艾宾浩斯遗忘曲线设计，通过9个阶段的循环复习，巩固记忆效果，提高学习效率</p>
      </footer>
      
      {/* 扇形详情弹窗 */}
      {showModal && currentSector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto ${
            isMobile ? 'animate-slide-in-from-bottom' : 'animate-fade-in'
          }`}>
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">记忆阶段详情</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowModal(false)}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" 
                style={{ backgroundColor: currentSector.color }}>
                <span className="text-white text-2xl font-bold">{currentSector.number}</span>
              </div>
              
              <h3 className="text-center text-xl font-bold text-gray-800 mb-4">{currentSector.title}</h3>
              
              <div className="prose max-w-none">
                <p className="text-gray-700 mb-4">{currentSector.description}</p>
                
                <h4 className="font-semibold text-gray-800 mt-6 mb-2">学习建议：</h4>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  <li>集中注意力，避免分心</li>
                  <li>结合例句记忆，理解用法</li>
                  <li>定期自测，检验记忆效果</li>
                  <li>使用单词卡片，随时复习</li>
                  <li>将单词应用到实际对话中</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-b-2xl">
              <button 
                className="w-full bg-[#165DFF] hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors duration-200"
                onClick={() => setShowModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryCurve;