import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useNewSpaceStore, type NewSpaceToastType } from '../store';

const iconMap: Record<NewSpaceToastType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const toneMap: Record<NewSpaceToastType, string> = {
  info: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  error: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
};

function ToastItem({ id, message, type }: { id: string; message: string; type: NewSpaceToastType }) {
  const removeToast = useNewSpaceStore((state) => state.removeToast);

  useEffect(() => {
    const timer = window.setTimeout(() => removeToast(id), 3200);
    return () => window.clearTimeout(timer);
  }, [id, removeToast]);

  const Icon = iconMap[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className={`pointer-events-auto w-[min(420px,calc(100vw-32px))] rounded-2xl border backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] ${toneMap[type]}`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="mt-0.5 shrink-0">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-75 mb-1">{type}</div>
          <div className="text-[13px] leading-relaxed break-words">{message}</div>
        </div>
        <button
          onClick={() => removeToast(id)}
          className="shrink-0 text-white/45 hover:text-white transition-colors text-[11px] font-bold"
        >
          关闭
        </button>
      </div>
    </motion.div>
  );
}

export default function ToastViewport() {
  const toasts = useNewSpaceStore((state) => state.toasts);

  return (
    <div className="fixed top-5 right-5 z-[120] pointer-events-none flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} id={toast.id} message={toast.message} type={toast.type} />
        ))}
      </AnimatePresence>
    </div>
  );
}
