
import React from 'react';
import { useStore } from '../../store';
import clsx from 'clsx';

// Note: The following components are placeholders and need to be imported from their actual files.
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="text-sm font-bold">{children}</div>;

export const AgvTabPanel: React.FC = () => {
  const { agv } = useStore();

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <SectionTitle>AGV 状态</SectionTitle>
      <div className="space-y-3">
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-3 py-2 bg-gray-800/40 border-b border-gray-800">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">设备状态</span>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">状态</span>
              <span className={clsx('font-bold', agv.status === 'idle' ? 'text-gray-400' : agv.status === 'moving' ? 'text-neon-cyan' : 'text-neon-green')}>
                {agv.status === 'idle' ? '待机' : agv.status === 'moving' ? '移动中' : '就位'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">电量</span>
              <span className="font-bold text-neon-green">{agv.battery}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">位置</span>
              <span className="font-mono text-gray-300">({agv.location.x.toFixed(1)}, {agv.location.y.toFixed(1)})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
