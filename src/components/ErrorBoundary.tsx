import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-900/10 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-700" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-emerald-950">
              MUSLIM SHOP
            </h1>
            <p className="text-sm text-stone-600">
              Произошла непредвиденная ошибка при загрузке данных. Нажмите кнопку ниже для обновления страницы.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono bg-stone-100 p-3 rounded-xl text-stone-600 text-left overflow-auto max-h-24">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('muslim_shop_products');
                } catch {
                  // ignore
                }
                window.location.reload();
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Перезагрузить страницу</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
