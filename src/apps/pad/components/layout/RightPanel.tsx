import React, { useState } from 'react';
import { useStore } from '../../store';
import clsx from 'clsx';
import { Power } from 'lucide-react';
import { BedTabPanel } from '../tabs/BedTabPanel';
import { CArmTabPanel } from '../tabs/CArmTabPanel';
import { AgvTabPanel } from '../tabs/AgvTabPanel';
import { EnvTabPanel } from '../tabs/EnvTabPanel';
import { SceneTabPanel } from '../tabs/SceneTabPanel';
import { SettingsTabPanel } from '../tabs/SettingsTabPanel';
import { sendEmergencyStop } from '../../store/services/api';

export const RightPanel: React.FC = () => {
  const { activeTab, setActiveTab, collisionWarning, addToast } = useStore();
  const [emergencyStopping, setEmergencyStopping] = useState(false);

  const TABS = [
    { id: 'bed',      label: '手术床', sub: 'BED'    },
    { id: 'carm',     label: 'C臂',    sub: 'C-ARM'  },
    { id: 'agv',      label: 'AGV',    sub: 'ROBOT'  },
    { id: 'env',      label: '环境',   sub: 'ENV'    },
    { id: 'scene',    label: '3D场景', sub: 'SCENE'  },
    { id: 'settings', label: '设置',   sub: 'CFG'    },
  ];

  const handleEmergencyStop = async () => {
    setEmergencyStopping(true);
    try {
      const result = await sendEmergencyStop();
      if (!result.ok) {
        addToast(`紧急停止失败：${result.error || 'unknown_error'}`, 'error');
        return;
      }
      addToast('已发送紧急停止指令', 'success');
    } finally {
      setEmergencyStopping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-carbon-black border-l border-gray-800">

      <div className="flex border-b border-gray-800 shrink-0 bg-gray-950">
        {TABS.map(({ id, label, sub }) => (
          <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
            className={clsx(
              'flex-1 py-2.5 flex flex-col items-center justify-center gap-0 transition-all relative group',
              activeTab === id ? 'text-neon-cyan bg-gray-900' : 'text-gray-600 hover:text-gray-300 hover:bg-gray-900/40'
            )}>
            <span className={clsx(
              'text-[12px] font-bold tracking-tight leading-none',
              activeTab === id ? 'text-neon-cyan' : 'text-gray-400 group-hover:text-gray-200'
            )}>{label}</span>
            <span className={clsx(
              'text-[7px] font-mono tracking-widest leading-none mt-0.5',
              activeTab === id ? 'text-neon-cyan/50' : 'text-gray-600 group-hover:text-gray-500'
            )}>{sub}</span>
            {activeTab === id && <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-neon-cyan rounded-full" />}
          </button>
        ))}
      </div>

      {collisionWarning && (
        <div className="bg-alert-red/10 border border-alert-red text-alert-red px-4 py-2 flex items-center gap-2 animate-pulse shrink-0">
          <Power size={16} />
          <span className="text-xs font-bold">碰撞警告：{collisionWarning}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'bed'      && <BedTabPanel />}
        {activeTab === 'carm'     && <CArmTabPanel />}
        {activeTab === 'agv'      && <AgvTabPanel />}
        {activeTab === 'env'      && <EnvTabPanel />}
        {activeTab === 'scene'    && <SceneTabPanel />}
        {activeTab === 'settings' && <SettingsTabPanel />}
      </div>

      <div className="shrink-0 border-t border-red-900/60 bg-gradient-to-t from-gray-950/95 to-gray-900/90 p-3">
        <button
          type="button"
          onClick={() => void handleEmergencyStop()}
          disabled={emergencyStopping}
          className="w-full h-11 rounded-xl border border-red-500/70 bg-red-500/15 px-4 text-[13px] font-bold text-red-100 hover:border-red-300 hover:bg-red-500/25 disabled:opacity-50 transition-all"
        >
          {emergencyStopping ? '紧急停止发送中…' : '一键停止'}
        </button>
      </div>
    </div>
  );
};
