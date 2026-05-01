/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'clear-gold': '#D4AF37', // Dorado para el ranking
                'clear-dark': '#0f172a', // Fondo premium
            },
        },
    },
    plugins: [],
}