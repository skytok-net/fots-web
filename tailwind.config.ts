import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
          // Food on the Stove flame red variations
          50: 'hsl(5, 85%, 95%)',
          100: 'hsl(5, 85%, 90%)',
          200: 'hsl(5, 85%, 80%)',
          300: 'hsl(5, 85%, 70%)',
          400: 'hsl(5, 85%, 60%)',
          500: 'hsl(5, 85%, 50%)',
          600: 'hsl(5, 85%, 45%)',
          700: 'hsl(5, 85%, 40%)',
          800: 'hsl(5, 85%, 35%)',
          900: 'hsl(5, 85%, 30%)',
          950: 'hsl(5, 85%, 20%)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))',
          // Food on the Stove charcoal gray variations
          50: 'hsl(220, 10%, 95%)',
          100: 'hsl(220, 10%, 90%)',
          200: 'hsl(220, 10%, 80%)',
          300: 'hsl(220, 10%, 70%)',
          400: 'hsl(220, 10%, 60%)',
          500: 'hsl(220, 10%, 50%)',
          600: 'hsl(220, 10%, 40%)',
          700: 'hsl(220, 10%, 30%)',
          800: 'hsl(220, 10%, 20%)',
          900: 'hsl(220, 10%, 15%)',
          950: 'hsl(220, 10%, 10%)'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
          // Food on the Stove brand colors
          fots: {
            red: 'hsl(5, 85%, 45%)',
            charcoal: 'hsl(220, 10%, 20%)',
            lightGray: 'hsl(220, 15%, 90%)',
            darkGray: 'hsl(220, 10%, 30%)'
          }
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
