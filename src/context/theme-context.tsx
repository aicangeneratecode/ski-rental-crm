"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";
interface ThemeContextType {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const eventName = "rental-theme-change";
function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onChange);
  window.addEventListener(eventName, onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(eventName, onChange);
    media.removeEventListener("change", onChange);
  };
}
function readMode(): ThemeMode {
  try {
    const stored =
      localStorage.getItem("theme-mode") ?? localStorage.getItem("theme");
    return stored === "dark" || stored === "auto" ? stored : "light";
  } catch {
    return "light";
  }
}
function readSnapshot() {
  const mode = readMode();
  const resolved =
    mode === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  return `${mode}:${resolved}`;
}
function serverSnapshot() {
  return "light:light";
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    readSnapshot,
    serverSnapshot,
  );
  const [themeMode, theme] = snapshot.split(":") as [ThemeMode, ResolvedTheme];
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const setThemeMode = (mode: ThemeMode) => {
    try {
      localStorage.setItem("theme-mode", mode);
    } catch {
      return;
    }
    window.dispatchEvent(new Event(eventName));
  };
  const toggleTheme = () => setThemeMode(theme === "dark" ? "light" : "dark");
  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
