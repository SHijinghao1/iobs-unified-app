import React from 'react';
import { useStore } from '../../store';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import clsx from 'clsx';

// 底部状态栏：滚动展示日志和语音反馈。

const LogItem: React.FC<{ log: { id: string; message: string; type: string; timestamp: number } }> = ({ log }) => (
  <span className="flex items-center space-x-2 mr-10 shrink-0">
    {log.type === 'warning' && <AlertTriangle size={14} className="text-alert-yellow" />}
    {log.type === 'success' && <CheckCircle size={14} className="text-neon-green" />}
    {log.type === 'info'    && <Info size={14} className="text-neon-cyan" />}
    <span
      className={clsx(
        'text-sm font-mono',
        log.type === 'warning' ? 'text-alert-yellow' :
        log.type === 'success' ? 'text-neon-green'   : 'text-gray-300',
      )}
    >
      [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
    </span>
  </span>
);

export const BottomBar: React.FC = () => {
  const logs = useStore((state) => state.logs);

  return (
    <div className="h-10 w-full bg-deep-space/90 border-t border-gray-800 flex items-center px-4 relative z-50 backdrop-blur-sm overflow-hidden">
      {/* Voice Command Feedback */}
      <div className="flex items-center shrink-0 border-r border-gray-800 pr-4 mr-4 gap-2">
        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
        <span className="text-sm text-gray-400">VOICE:</span>
        <span className="text-sm text-neon-cyan font-mono">&quot;Bed, height 98&quot;</span>
        <CheckCircle size={14} className="text-neon-green" />
      </div>

      {/* Scrolling log ticker — duplicate items for seamless loop */}
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {logs.map((log) => <LogItem key={log.id} log={log} />)}
          {/* duplicate for seamless wrap */}
          {logs.map((log) => <LogItem key={`dup-${log.id}`} log={log} />)}
        </div>
      </div>
    </div>
  );
};
