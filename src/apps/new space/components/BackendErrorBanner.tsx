import React from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNewSpaceStore } from '../store';

export const BackendErrorBanner: React.FC = () => {
  const globalError = useNewSpaceStore((s) => s.backendGlobalError);
  const deviceErrors = useNewSpaceStore((s) => s.backendDeviceErrors);
  const serverError = useNewSpaceStore((s) => s.backendServerError);
  const [collapsed, setCollapsed] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  const hasErrors = Boolean(globalError || serverError || deviceErrors.length > 0);
  const mainMessage = serverError || globalError || deviceErrors.map((e) => e.error).join('；');

  React.useEffect(() => {
    if (hasErrors) setDismissed(false);
  }, [hasErrors, globalError, serverError, deviceErrors.length]);

  if (!hasErrors || dismissed) return null;

  return (
    <div className="inline-flex items-center">
      <div className="rounded-lg border border-red-700/80 bg-red-950/90 backdrop-blur-md shadow-lg shadow-red-900/30 overflow-hidden">
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
              <div key={`${de.device}-${i}`} className="flex items-center gap-2 text-[11px]">
                <span className="text-red-400/80 font-mono font-bold min-w-[60px]">[{de.device}]</span>
                <span className="text-red-300/90">{de.error}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
