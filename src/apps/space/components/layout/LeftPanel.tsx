import React, { Suspense, memo, useEffect, useRef, useState } from 'react';
import { Heart, Activity, Droplets, Maximize2, Minimize2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { useStore } from '../../store';
import { ViewCubeTool } from '../ViewCubeTool';
import clsx from 'clsx';

const OperatingRoomScene = React.lazy(() => import('../../scenes/OperatingRoom').then((m) => ({ default: m.OperatingRoomScene })));

// 左侧主视图：承载 3D 场景、视图立方体和监护信息。

const LoadingFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-neon-cyan text-sm font-bold">加载 3D 模型中...</p>
    </div>
  </div>
);

// 视图波形样式只注入一次，避免每次渲染都重复插入 <style>。
const WAVEFORM_STYLE = `
  @keyframes dash {
    0%   { stroke-dashoffset: 200; }
    100% { stroke-dashoffset: 0; }
  }
  .animate-dash {
    stroke-dasharray: 200;
    animation: dash 2s linear infinite;
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('waveform-style')) {
  const s = document.createElement('style');
  s.id = 'waveform-style';
  s.textContent = WAVEFORM_STYLE;
  document.head.appendChild(s);
}

const Waveform: React.FC<{ color: string; speed?: number }> = memo(({ color, speed = 1 }) => (
  <div className="w-full h-full overflow-hidden">
    <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
      <path
        d="M0,25 L10,25 L15,10 L20,40 L25,25 L40,25 L45,15 L50,35 L55,25 L80,25 L85,10 L90,40 L95,25 L110,25 L115,15 L120,35 L125,25 L150,25 L155,10 L160,40 L165,25 L180,25 L185,15 L190,35 L195,25 L200,25"
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className="animate-dash"
        style={{ animationDuration: `${2 / speed}s` }}
      />
    </svg>
  </div>
));
Waveform.displayName = 'Waveform';

type FullscreenElementWithPrefixes = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type DocumentWithFullscreenPrefixes = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

export const LeftPanel: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSceneInteracting = useStore((s) => (s as unknown as { isSceneInteracting?: boolean }).isSceneInteracting ?? false);
  const cameraPosition = useStore((s) => s.cameraPosition);
  const panelRef = useRef<HTMLDivElement>(null);
  const sceneContainerRef = useRef<HTMLDivElement>(null);

  const syncPanelLayoutAfterFullscreen = () => {
    const panel = panelRef.current;
    const sceneContainer = sceneContainerRef.current;
    if (!panel || !sceneContainer) return;

    panel.style.width = '';
    panel.style.height = '';
    panel.style.flex = '';
    panel.style.maxWidth = '';
    panel.style.maxHeight = '';
    panel.style.position = '';
    panel.style.inset = '';

    sceneContainer.style.width = '';
    sceneContainer.style.height = '';
    sceneContainer.style.maxWidth = '';
    sceneContainer.style.maxHeight = '';

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  const toggleFullscreen = async () => {
    if (!sceneContainerRef.current) return;

    const prefixedDocument = document as DocumentWithFullscreenPrefixes;

    try {
      if (!isFullscreen) {
        // 进入全屏。
        const elem = sceneContainerRef.current as FullscreenElementWithPrefixes;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // 退出全屏。
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (prefixedDocument.webkitFullscreenElement && prefixedDocument.webkitExitFullscreen) {
          await prefixedDocument.webkitExitFullscreen();
        } else if (prefixedDocument.mozFullScreenElement && prefixedDocument.mozCancelFullScreen) {
          await prefixedDocument.mozCancelFullScreen();
        } else if (prefixedDocument.msFullscreenElement && prefixedDocument.msExitFullscreen) {
          await prefixedDocument.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  useEffect(() => {
    const prefixedDocument = document as DocumentWithFullscreenPrefixes;

    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement ||
        prefixedDocument.webkitFullscreenElement ||
        prefixedDocument.mozFullScreenElement ||
        prefixedDocument.msFullscreenElement ||
        null;
      const isCurrentPanelFullscreen = fullscreenElement === sceneContainerRef.current;

      setIsFullscreen(isCurrentPanelFullscreen);

      if (!isCurrentPanelFullscreen) {
        syncPanelLayoutAfterFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full bg-carbon-black border-r border-gray-800 relative overflow-hidden"
    >
      {/* 左侧上半区：3D 数字孪生视图。 */}
      <div
        ref={sceneContainerRef}
        className={clsx(
          'relative bg-gradient-to-b from-gray-900 to-black min-h-0 basis-2/3',
          isFullscreen ? 'h-screen w-screen' : 'flex-1',
          isSceneInteracting && 'cursor-grabbing'
        )}
      >
        <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 rounded border border-gray-700">
          <span className="text-xs text-neon-cyan font-mono uppercase">Digital Twin Live</span>
        </div>

        {/* 右上角：全屏按钮 */}
        <button
          type="button"
          aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 z-20 p-2 rounded-lg border border-neon-cyan/40 bg-black/50 hover:bg-black/70 transition-colors"
          title={isFullscreen ? '退出全屏 (ESC)' : '进入全屏'}
        >
          {isFullscreen ? (
            <Minimize2 size={18} className="text-neon-cyan" />
          ) : (
            <Maximize2 size={18} className="text-neon-cyan" />
          )}
        </button>

        {/* 3D 场景画布 */}
        <Canvas
          ref={(node) => {
            // 把 canvas 暴露到全局，右侧面板截图时会用到
            if (node) (window as unknown as Record<string, unknown>).__threeCanvas = node.querySelector('canvas') ?? node;
          }}
          shadows={false}
          camera={{ position: cameraPosition, fov: 50, near: 0.5, far: 200 }}
          dpr={[0.75, 1] as [number, number]}
          performance={{ min: 0.5, max: 1, debounce: 300 }}
          frameloop="demand"
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
            stencil: false,
            depth: true,
          }}
        >
          <Suspense fallback={null}>
            <OperatingRoomScene />
          </Suspense>
        </Canvas>

        {/* 类似游戏里的视图立方体：点击即可切换相机方向 */}
        <ViewCubeTool />

        <Suspense fallback={<LoadingFallback />}>
          {/* 只在 Canvas 挂起加载时显示 LoadingFallback */}
        </Suspense>
      </div>

      {/* 左侧下半区：监护参数面板。 */}
      <div className="min-h-0 basis-1/3 bg-[#0A0F1D] border-t border-gray-800 p-4 flex flex-col justify-center space-y-3">
        {/* HR Row */}
        <div className="flex items-center h-16 bg-[#0E1525] rounded-lg border border-gray-800 px-4 relative overflow-hidden">
          <div className="flex flex-col w-24">
            <div className="flex items-center text-gray-400 text-xs font-bold mb-1">
              <Heart size={14} className="mr-2 text-neon-green" /> HR
            </div>
            <div className="text-3xl font-mono font-bold text-neon-green leading-none">72</div>
          </div>
          <div className="flex-1 h-12 ml-4">
            <Waveform color="#00FF88" speed={1.2} />
          </div>
        </div>

        {/* NIBP Row */}
        <div className="flex items-center h-16 bg-[#0E1525] rounded-lg border border-gray-800 px-4 relative overflow-hidden">
          <div className="flex flex-col w-24">
            <div className="flex items-center text-gray-400 text-xs font-bold mb-1">
              <Activity size={14} className="mr-2 text-neon-green" /> NIBP
            </div>
            <div className="text-2xl font-mono font-bold text-neon-green leading-none">118/76</div>
          </div>
          <div className="flex-1 h-12 ml-4">
            <Waveform color="#00FF88" speed={1} />
          </div>
        </div>

        {/* SpO2 Row */}
        <div className="flex items-center h-16 bg-[#0E1525] rounded-lg border border-gray-800 px-4 relative overflow-hidden">
          <div className="flex flex-col w-24">
            <div className="flex items-center text-gray-400 text-xs font-bold mb-1">
              <Droplets size={14} className="mr-2 text-neon-cyan" /> SpO2
            </div>
            <div className="text-3xl font-mono font-bold text-neon-cyan leading-none">99%</div>
          </div>
          <div className="flex-1 h-12 ml-4">
            <div className="w-full h-full flex items-center">
              <div className="w-full h-0.5 bg-neon-cyan/20 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-neon-cyan animate-pulse w-full"
                  style={{ boxShadow: '0 0 10px #00FFFF' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
