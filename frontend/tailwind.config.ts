import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            keyframes: {
                'progress-indeterminate': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'progress-stripes': {
                    '0%': { backgroundPosition: '40px 0' },
                    '100%': { backgroundPosition: '0 0' },
                }
            },
            animation: {
                'progress-indeterminate': 'progress-indeterminate 1.5s infinite linear',
                'fade-in': 'fade-in 0.3s ease-out',
                'progress-stripes': 'progress-stripes 1s linear infinite',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};
export default config;
