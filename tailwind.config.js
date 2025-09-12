/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 微信主题色
        'wechat-primary': '#07C160',
        'wechat-primary-light': '#1AAD19',
        'wechat-primary-dark': '#029F5A',
        'wechat-bg-primary': '#EDEDED',
        'wechat-bg-secondary': '#FFFFFF',
        'wechat-bg-tertiary': '#F7F7F7',
        'wechat-bg-hover': '#F5F5F5',
        'wechat-text-primary': '#191919',
        'wechat-text-secondary': '#666666',
        'wechat-text-tertiary': '#999999',
        'wechat-border-light': '#E5E5E5',
        'wechat-border': '#D1D1D1',
        'wechat-success': '#07C160',
        'wechat-warning': '#FA9D3B',
        'wechat-error': '#FA5151',
        'wechat-info': '#10AEFF',
      },
      boxShadow: {
        'wechat-sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'wechat-md': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'wechat-lg': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'wechat-xl': '0 8px 24px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'wechat-sm': '2px',
        'wechat': '4px',
        'wechat-md': '8px',
      },
    },
  },
  plugins: [],
}