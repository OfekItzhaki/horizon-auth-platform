/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                app: 'rgb(var(--bg-app) / <alpha-value>)',
                surface: 'rgb(var(--bg-surface) / <alpha-value>)',
                elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
                hover: 'rgb(var(--bg-hover) / <alpha-value>)',
                'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
                'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
                primary: 'rgb(var(--text-primary) / <alpha-value>)',
                secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
                tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
                inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
                accent: {
                    DEFAULT: 'rgb(var(--accent-primary) / <alpha-value>)',
                    primary: 'rgb(var(--accent-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--accent-secondary) / <alpha-value>)',
                    success: 'rgb(var(--accent-success) / <alpha-value>)',
                    warning: 'rgb(var(--accent-warning) / <alpha-value>)',
                    danger: 'rgb(var(--accent-danger) / <alpha-value>)',
                },
            },
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
