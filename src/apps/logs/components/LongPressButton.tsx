// 长按确认按钮：防止误操作
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface LongPressButtonProps {
  onConfirm: () => void;
  duration?: number; // 持续时间，单位毫秒 (in milliseconds)
  children: React.ReactNode;
  className?: string;
  isDarkMode?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function LongPressButton({ 
  onConfirm, 
  duration = 3000, 
  children, 
  className = '', 
  isDarkMode = false,
  variant = 'default'
}: LongPressButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const intervalTimer = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    // 阻止默认行为以避免在移动端选中文本 (Prevent default to avoid text selection on mobile)
    if (e.type === 'touchstart' && e.cancelable) {
      e.preventDefault();
    }
    setIsPressing(true);
    setProgress(0);
    startTime.current = Date.now();

    intervalTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
    }, 50);

    pressTimer.current = setTimeout(() => {
      clearInterval(intervalTimer.current!);
      setProgress(100);
      setIsPressing(false);
      onConfirm();
    }, duration);
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (intervalTimer.current) clearInterval(intervalTimer.current);
    setIsPressing(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (intervalTimer.current) clearInterval(intervalTimer.current);
    };
  }, []);

  return (
    <div className="relative w-full">
      <Button
        variant={variant}
        className={`w-full relative overflow-hidden select-none touch-none ${className} ${isPressing ? 'scale-[0.98] transition-transform' : 'transition-all'}`}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
      >
        <div 
          className="absolute left-0 top-0 bottom-0 bg-black/20 dark:bg-white/20 transition-all ease-linear"
          style={{ width: `${progress}%`, transitionDuration: '50ms' }}
        />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
          {isPressing && <span className="text-xs opacity-80">({Math.ceil((duration - (progress / 100) * duration) / 1000)}s)</span>}
        </span>
      </Button>
    </div>
  );
}
