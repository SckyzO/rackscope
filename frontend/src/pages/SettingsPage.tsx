import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Moon, Sun, Check } from 'lucide-react';

export const SettingsPage = () => {
  const { mode, accent, setMode, setAccent } = useTheme();
  const [errors, setErrors] = useState<{ ts: number; message: string; context?: string }[]>([]);

  const colors = [
    { id: 'blue', value: '#3b82f6' },
    { id: 'green', value: '#10b981' },
    { id: 'purple', value: '#8b5cf6' },
    { id: 'orange', value: '#f97316' },
    { id: 'red', value: '#ef4444' },
    { id: 'cyan', value: '#06b6d4' },
  ];

  useEffect(() => {
    setErrors(api.getErrorLog());
  }, []);

  return (
    <div className="p-12 max-w-4xl mx-auto">
      <h1 className="text-4xl font-black mb-8 tracking-tight">Settings</h1>
      
      <div className="space-y-12">
        {/* Appearance Section */}
        <section>
          <h2 className="text-xl font-bold mb-6 border-b border-rack-border pb-2">Appearance</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Theme Mode */}
            <div className="bg-rack-panel border border-rack-border rounded-xl p-6">
              <h3 className="font-mono text-sm uppercase text-gray-500 mb-4 tracking-widest">Interface Mode</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => setMode('light')}
                  className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'light' ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-rack-border hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="font-bold text-sm">Light</span>
                </button>
                <button 
                  onClick={() => setMode('dark')}
                  className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'dark' ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-rack-border hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="font-bold text-sm">Dark</span>
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div className="bg-rack-panel border border-rack-border rounded-xl p-6">
              <h3 className="font-mono text-sm uppercase text-gray-500 mb-4 tracking-widest">Accent Color</h3>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAccent(c.id as any)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${accent === c.id ? 'ring-2 ring-offset-2 ring-offset-rack-panel ring-gray-400' : ''}`}
                    style={{ backgroundColor: c.value }}
                  >
                    {accent === c.id && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* System Section */}
        <section>
          <h2 className="text-xl font-bold mb-6 border-b border-rack-border pb-2">System</h2>
          <div className="bg-rack-panel border border-rack-border rounded-xl p-6">
             <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-sm">Application Cache</h3>
                    <p className="text-xs text-gray-500 mt-1">Clear local preferences and temporary states.</p>
                </div>
                <button 
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors text-sm font-bold uppercase"
                >
                    Clear Cache & Reload
                </button>
             </div>
          </div>
          <div className="bg-rack-panel border border-rack-border rounded-xl p-6 mt-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm">Client Error Log</h3>
                <p className="text-xs text-gray-500 mt-1">Last API failures stored locally.</p>
              </div>
              <button
                onClick={() => {
                  api.clearErrorLog();
                  setErrors([]);
                }}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs font-bold uppercase text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="mt-4 max-h-48 overflow-auto custom-scrollbar">
              {errors.length === 0 && (
                <div className="text-[11px] font-mono text-gray-500">No errors logged.</div>
              )}
              {errors.map((e, i) => (
                <div key={i} className="text-[11px] font-mono text-gray-400 border-b border-white/5 py-2 last:border-0">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">{new Date(e.ts).toLocaleTimeString()}</div>
                  <div className="truncate">{e.message}{e.context ? ` — ${e.context}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
