interface ThemeSelectorProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ThemeSelector({ theme, onThemeChange }: ThemeSelectorProps) {
  return (
    <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Theme</h2>
        </div>
        
        <button
          onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
          className={`relative w-16 h-8 rounded-full transition-colors ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
              : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
              theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
            }`}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </div>
        </button>
      </div>
    </section>
  );
}
