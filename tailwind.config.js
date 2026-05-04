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
      },
      borderRadius: {
        note: "10px",
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionProperty: {
        width: "width",
        spacing: "margin, padding",
      },
    },
  },
  plugins: [],
};
