/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        pop: {
          from: { transform: "scale(0.96)", opacity: "0" },
        },
        rise: {
          from: { transform: "translateY(12px)", opacity: "0" },
        },
        shake: {
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        fromAbove: {
          from: { opacity: "0", transform: "translateY(-28px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        textCascade: {
          "0%": { opacity: "0", transform: "translateY(-18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        zoomOutEnter: {
          "0%": { opacity: "0", transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        zoomOutExit: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.96)" },
        },
        zoomInEnter: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        dropdownSlideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        tfBadgePop: {
          "0%": { transform: "scale(0.35)", opacity: "0" },
          "65%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        tfCheckDraw: {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "60%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        tfPlaneLaunch: {
          "0%": { transform: "scale(0.4) translate(-8px, 8px)", opacity: "0" },
          "60%": { transform: "scale(1.12) translate(2px, -2px)", opacity: "1" },
          "100%": { transform: "scale(1) translate(0, 0)", opacity: "1" },
        },
        haloDotPulse: {
          "0%": { opacity: "0.35", transform: "scale(0.75)" },
          "100%": { opacity: "1", transform: "scale(1.3)" },
        },
      },
      animation: {
        pop: "pop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        rise: "rise 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        shake: "shake 0.3s",
        "from-above": "fromAbove 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "text-cascade-1": "textCascade 0.44s cubic-bezier(0.16, 1, 0.3, 1) both",
        "text-cascade-2": "textCascade 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both",
        "text-cascade-3": "textCascade 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
        "text-cascade-4": "textCascade 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both",
        "zoom-out-enter": "zoomOutEnter 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
        "zoom-out-exit": "zoomOutExit 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "zoom-in-enter": "zoomInEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        "dropdown-slide": "dropdownSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "tf-badge-pop": "tfBadgePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "tf-check-draw": "tfCheckDraw 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "tf-plane-launch": "tfPlaneLaunch 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "halo-dot-pulse": "haloDotPulse 1.4s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
