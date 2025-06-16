"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("system");

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        setTheme(savedTheme);
      }
    }
  }, []);

  // Apply theme changes to document following Tailwind v4 docs pattern
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyTheme = () => {
      // Following the exact pattern from Tailwind v4 docs
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" ||
          (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches),
      );
    };

    applyTheme();

    // Listen for system theme changes when in system mode
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);

      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Save to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      switch (prevTheme) {
        case "light":
          return "dark";
        case "dark":
          return "system";
        case "system":
          return "light";
        default:
          return "light";
      }
    });
  };

  const setSpecificTheme = (newTheme) => {
    if (["light", "dark", "system"].includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  // Get the actual resolved theme (for system, determine if it's light or dark)
  const getResolvedTheme = () => {
    if (typeof window === "undefined") return "light"; // Default during SSR

    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  };

  const value = {
    theme,
    resolvedTheme: getResolvedTheme(),
    toggleTheme,
    setTheme: setSpecificTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
