// 日志系统主入口：路由配置和全局状态初始化
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from "./components/layout/Layout";
import { LogSettings } from "./pages/LogSettings";
import { LogData } from "./pages/LogData";
import { SensorManagement, ActuatorManagement, DeviceListManagement, DeviceStatus } from "./pages/DeviceManagement";
import { ProcedureManagement } from "./pages/ProcedureManagement";
import { UserManagement } from "./pages/UserManagement";
import { CardManagement } from "./pages/CardManagement";
import { MedicalRecordManagement } from "./pages/MedicalRecordManagement";
import { useAppStore } from "./store/useAppStore";
import { checkConnection } from "./services/api";

// Create a client outside of the component to avoid recreating it on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export default function App() {
  const { settings, setConnectionStatus, isDarkMode } = useAppStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    let isFirstRun = true;
    
    const pingServer = async () => {
      if (isFirstRun) {
        setConnectionStatus('connecting');
      }
      const isOnline = await checkConnection(settings.serverIp, isFirstRun);
      isFirstRun = false;
      
      if (isMounted) {
        setConnectionStatus(isOnline ? 'online' : 'offline');
      }
    };

    pingServer();
    const interval = setInterval(pingServer, 10000); // Check every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [settings.serverIp, setConnectionStatus]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LogData />} />
            <Route path="settings" element={<LogSettings />} />
            <Route path="devices" element={<Navigate to="devices/list" replace />} />
            <Route path="devices/sensors" element={<SensorManagement />} />
            <Route path="devices/actuators" element={<ActuatorManagement />} />
            <Route path="devices/list" element={<DeviceListManagement />} />
            <Route path="devices/status" element={<DeviceStatus />} />
            <Route path="procedures" element={<ProcedureManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="cards" element={<CardManagement />} />
            <Route path="records" element={<MedicalRecordManagement />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
