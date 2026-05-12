import { useState, useEffect } from 'react';
import { Terminal, Activity, X } from 'lucide-react';

export default function QADebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<{ id: number; message: string; timestamp: Date }[]>([]);

  // Interceptar console.info e console.warn para popular o painel visual.
  // IMPORTANTE: Isso só roda em dev, então não afeta performance de prod.
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    const interceptor = (originalMethod: any, type: string) => {
      return (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        if (msg.includes('[WalletNow]')) {
          setLogs(prev => {
            const newLogs = [{ id: Date.now() + Math.random(), message: `${type}: ${msg}`, timestamp: new Date() }, ...prev];
            return newLogs.slice(0, 50); // Keep last 50
          });
        }
        originalMethod.apply(console, args);
      };
    };

    console.info = interceptor(originalInfo, 'INFO');
    console.warn = interceptor(originalWarn, 'WARN');
    console.error = interceptor(originalError, 'ERROR');

    return () => {
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-[#161616] border border-[#00E676]/30 text-[#00E676] p-3 rounded-full shadow-lg hover:bg-[#00E676]/10 transition-colors animate-bounce"
        title="QA Debug Panel"
      >
        <Terminal className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 max-h-[400px] flex flex-col bg-[#0A0A0A] border border-[#00E676]/30 rounded-xl shadow-2xl overflow-hidden font-mono text-[10px]">
      <div className="flex items-center justify-between bg-[#161616] p-3 border-b border-[#00E676]/20">
        <div className="flex items-center gap-2 text-[#00E676]">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="font-bold uppercase tracking-wider">QA State Audit</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/50">
        {logs.length === 0 ? (
          <p className="text-gray-600 text-center py-4">Aguardando eventos [WalletNow]...</p>
        ) : (
          logs.map(log => {
            const isError = log.message.startsWith('ERROR');
            const isWarn = log.message.startsWith('WARN');
            return (
              <div key={log.id} className={`p-2 rounded border ${isError ? 'bg-red-500/10 border-red-500/30 text-red-400' : isWarn ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-[#00E676]/5 border-[#00E676]/20 text-[#00E676]/80'} break-words`}>
                <span className="text-gray-500 text-[9px] block mb-1">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                {log.message}
              </div>
            );
          })
        )}
      </div>
      
      <div className="p-2 bg-[#161616] border-t border-[#00E676]/20 flex justify-between items-center text-gray-500">
        <span>DEV_MODE: TRUE</span>
        <button onClick={() => setLogs([])} className="hover:text-[#00E676]">Clear</button>
      </div>
    </div>
  );
}
