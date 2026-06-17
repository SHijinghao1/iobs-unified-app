// React 错误边界：捕获组件渲染错误，防止白屏
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-red-50/50 dark:bg-red-950/20 rounded-3xl border border-red-100 dark:border-red-900/30 m-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">模块加载失败</h2>
          <p className="text-red-600/80 dark:text-red-400/80 mb-6 max-w-md">
            {this.state.error?.message || '发生未知错误，请尝试刷新页面或联系技术支持。'}
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重新加载
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
