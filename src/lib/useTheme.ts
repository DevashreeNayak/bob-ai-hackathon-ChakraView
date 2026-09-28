import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

// Apply theme to <html> immediately — called once at module load so the class
// is set synchronously before the first React paint, preventing a flash.
function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('chakraview-theme') as Theme | null;
  return stored ?? 'dark';
}

// Set the class synchronously at module evaluation time (before React renders).
const _initial = getInitialTheme();
applyTheme(_initial);

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(_initial);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('chakraview-theme', theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
