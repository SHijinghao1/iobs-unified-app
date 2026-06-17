import React from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store';

// 后端报错横幅：有异常时在顶部集中提示。

export const BackendErrorBanner: React.FC = () => {
  const globalError = useStore((s) => s.backendGlobalError);
  const deviceErrors = useStore((s) => s.backendDeviceErrors);
  const serverError = useStore((s) => s.backendServerError);
  const [collapsed, setCollapsed] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  const hasErrors = globalError || deviceErrors.length > 0 || serverError;

  if (!hasErrors || dismissed) return null;

  const mainMessage = serverError || globalError || deviceErrors.map((e) => e.error).join('；');

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[90vw]">
      <div className="mt-2 rounded-lg border border-red-700/80 bg-red-950/90 backdrop-blur-md shadow-lg shadow-red-900/30 overflow-hidden">
        <div
          className="flex items-center gap-2 px-4 py-2 cursor-pointer select-none"
          onClick={() => setCollapsed((v) => !v)}
        >
          <AlertTriangle className="text-red-400 shrink-0" size={16} />
          <span className="text-red-300 text-xs font-bold tracking-wide whitespace-nowrap">
            {mainMessage}
          </span>
          <div className="flex-1" />
          {collapsed ? (
            <ChevronDown className="text-red-400/60" size={14} />
          ) : (
            <ChevronUp className="text-red-400/60" size={14} />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="text-red-400/60 hover:text-red-300 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>

        {!collapsed && deviceErrors.length > 0 && (
          <div className="border-t border-red-800/50 px-4 py-2 space-y-1">
            {deviceErrors.map((de, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-red-400/80 font-mono font-bold min-w-[60px]">
                  [{de.device}]
                </span>
                <span className="text-red-300/90">{de.error}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
