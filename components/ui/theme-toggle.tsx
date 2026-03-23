'use client';

import { useTheme } from '@/components/ui/theme-provider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        border: isDark ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(99,102,241,0.30)',
        background: isDark ? 'rgba(30,25,10,0.70)' : 'rgba(238,242,255,0.80)',
        color: isDark ? '#fbbf24' : '#4f46e5',
        backdropFilter: 'blur(12px)',
      }}
    >
      <span style={{ display: 'flex', transition: 'transform 0.4s ease', transform: `rotate(${isDark ? 0 : 180}deg)` }}>
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </span>
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
