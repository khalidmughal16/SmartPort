/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  // preflight is off: the legacy SmartPort stylesheet owns the base styles.
  // Tailwind-built components sit inside a .tw-root wrapper that restores the bits of preflight they need.
  corePlugins: { preflight: false },
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))", "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))", "primary-foreground": "hsl(var(--primary-foreground))",
        destructive: "hsl(var(--destructive))",
      },
      boxShadow: { xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
    },
  },
  plugins: [],
};
