// 设置弹窗组件
import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Button } from "@/components/ui/button";
import { X, Settings as SettingsIcon, Save } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAudit: (action: string, details: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onSaveAudit,
}: SettingsModalProps) {
  const { settings, updateSettings, isDarkMode } = useAppStore();

  const [localSettings, setLocalSettings] = useState(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onSaveAudit("系统设置", "更新了系统配置参数");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl ${isDarkMode ? "bg-slate-900 text-white border border-slate-700" : "bg-white text-slate-900"}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xl font-bold">
            <SettingsIcon className="w-6 h-6" />
            系统配置 (System Settings)
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-500/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Network Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider opacity-70 border-b border-slate-500/20 pb-1">
              网络与人员配置
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs opacity-80">设备网关 IP</label>
                <input
                  type="text"
                  value={localSettings.serverIp}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      serverIp: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs opacity-80">管理员姓名</label>
                <input
                  type="text"
                  value={localSettings.adminName}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      adminName: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
            </div>
          </div>

          {/* Alarm Logic Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider opacity-70 border-b border-slate-500/20 pb-1">
              智能告警逻辑
            </h3>
            <div className="space-y-1">
              <label className="text-xs opacity-80">
                抗干扰延迟 (秒) - 连续超过阈值才报警
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={localSettings.alarmDelaySeconds}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    alarmDelaySeconds: parseInt(e.target.value) || 0,
                  })
                }
                className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs opacity-80">CPU 预警阈值</label>
                <input
                  type="number"
                  value={localSettings.thresholds[1]?.warning || 0}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      thresholds: {
                        ...localSettings.thresholds,
                        1: {
                          ...localSettings.thresholds[1],
                          warning: parseFloat(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs opacity-80">CPU 危急阈值</label>
                <input
                  type="number"
                  value={localSettings.thresholds[1]?.critical || 0}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      thresholds: {
                        ...localSettings.thresholds,
                        1: {
                          ...localSettings.thresholds[1],
                          critical: parseFloat(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs opacity-80">内存预警阈值</label>
                <input
                  type="number"
                  value={localSettings.thresholds[4]?.warning || 0}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      thresholds: {
                        ...localSettings.thresholds,
                        4: {
                          ...localSettings.thresholds[4],
                          warning: parseFloat(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs opacity-80">内存危急阈值</label>
                <input
                  type="number"
                  value={localSettings.thresholds[4]?.critical || 0}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      thresholds: {
                        ...localSettings.thresholds,
                        4: {
                          ...localSettings.thresholds[4],
                          critical: parseFloat(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="h-10 px-6">
            取消
          </Button>
          <Button
            onClick={handleSave}
            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
          >
            <Save className="w-4 h-4 mr-2" />
            保存配置
          </Button>
        </div>
      </div>
    </div>
  );
}
