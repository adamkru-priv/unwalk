interface ThemeSelectorProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ThemeSelector({ theme, onThemeChange }: ThemeSelectorProps) {
  return (
    <button
      onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/70 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 shadow-sm text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="text-base leading-none">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  );
}
