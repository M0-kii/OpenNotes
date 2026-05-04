/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: "var(--sidebar-bg)",
          hover: "var(--sidebar-hover)",
          active: "var(--sidebar-active)",
          text: "var(--sidebar-text)",
          textSecondary: "var(--sidebar-text-secondary)",
        },
        editor: {
          bg: "var(--editor-bg)",
          text: "var(--editor-text)",
        },
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        border: "var(--border)",
      },
      borderRadius: {
        note: "12px",
        sidebar: "14px",
        input: "10px",
        btn: "8px",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
      letterSpacing: {
        apple: "-0.01em",
      },
    },
  },
  plugins: [],
};
