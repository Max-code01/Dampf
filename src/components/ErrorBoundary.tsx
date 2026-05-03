import React, { Component, ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

interface EBProps {
  children: ReactNode;
}

interface EBState {
  hasError: boolean;
  errorSnippet: string;
}

export class ErrorBoundary extends Component<EBProps, EBState> {
  public state: EBState;
  public props: EBProps;

  constructor(props: EBProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, errorSnippet: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { 
      hasError: true, 
      errorSnippet: error?.message?.substring(0, 200) || 'Unknown Crash' 
    };
  }

  componentDidCatch(error: any, info: any) {
    console.error("Critical Crash Caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="space-y-8 max-w-lg bg-zinc-900/50 border border-white/5 p-12 rounded-3xl backdrop-blur-2xl">
            <div className="relative inline-block">
              <TriangleAlert size={100} className="text-red-500 mx-auto drop-shadow-2xl" strokeWidth={1} />
              <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 -z-1" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Application <span className="text-red-500">Crash</span></h1>
              <div className="h-1 w-20 bg-red-600 mx-auto rounded-full" />
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                Ein kritischer Fehler ist aufgetreten. Dies passiert oft bei Überlastung oder Quota-Limits.<br/>
                <span className="text-red-400 mt-2 block opacity-50 text-[10px]">ERROR: {this.state.errorSnippet}</span>
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="group relative px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all outline-none"
            >
              <span className="relative z-10">Seite neu laden</span>
              <div className="absolute inset-0 bg-red-500 translate-x-1 translate-y-1 -z-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
