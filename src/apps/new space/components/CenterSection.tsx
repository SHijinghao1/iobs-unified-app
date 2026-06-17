/**
 * @file CenterSection.tsx
 * @description 手术室应用中央区域组件，包含3D场景和工作站视图
 * @author IOBS Team
 * @date 2024-01-01
 */

import { motion, AnimatePresence } from 'motion/react';

import CanvasView from './CenterSection/CanvasView';
import WorkstationView from './CenterSection/WorkstationView';

interface CenterSectionProps {
  activeCenterView: string | null;
  setActiveCenterView: (view: string | null) => void;
  setLeftPanelMode: (mode: 'dashboard' | 'positions' | 'carm' | 'agv') => void;
}

export default function CenterSection({ 
  activeCenterView, 
  setActiveCenterView, 
  setLeftPanelMode 
}: CenterSectionProps) {
  return (
    <motion.section
      layout
      initial={{ borderRadius: 0 }}
      animate={{
        borderRadius: 0,
        margin: 0
      }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col relative bg-[#0b111a] overflow-hidden w-full h-full"
    >
      <AnimatePresence mode="wait">
        {!activeCenterView ? (
          <CanvasView 
            key="canvas" 
            setLeftPanelMode={setLeftPanelMode}
          />
        ) : (
          <WorkstationView 
            key="workstation" 
            activeCenterView={activeCenterView} 
            setActiveCenterView={setActiveCenterView} 
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
