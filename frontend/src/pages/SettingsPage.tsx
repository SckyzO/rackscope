import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Check } from 'lucide-react';

export const SettingsPage = () => {
  const { mode, accent, setMode, setAccent } = useTheme();

  const colors = [
    { id: 'blue', value: '#3b82f6' },
    { id: 'green', value: '#10b981' },
    { id: 'purple', value: '#8b5cf6' },
    { id: 'orange', value: '#f97316' },
    { id: 'red', value: '#ef4444' },
    { id: 'cyan', value: '#06b6d4' },
  ];

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
        </section>
      </div>
    </div>
  );
};
