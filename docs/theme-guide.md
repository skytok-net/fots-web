# Food on the Stove Theme Guide

This guide documents the color themes and design system for the Food on the Stove application, based on the brand logo.

## Brand Colors

The Food on the Stove brand is built around these key colors:

- **Flame Red** (`hsl(5, 85%, 45%)`) - The primary brand color, representing the flame/stove element
- **Charcoal Gray** (`hsl(220, 10%, 20%)`) - The secondary brand color, representing strength and reliability
- **Light Gray** (`hsl(220, 15%, 90%)`) - Used for backgrounds and subtle accents in light mode
- **Dark Gray** (`hsl(220, 10%, 30%)`) - Used for backgrounds and subtle accents in dark mode

## Theme Implementation

The application implements a complete light and dark mode theme system using:

1. CSS variables defined in `app/tailwind.css`
2. Tailwind configuration in `tailwind.config.ts`
3. Theme state management with Zustand in `app/stores/theme-store.ts`
4. React hook for theme access in `app/hooks/use-theme.ts`

## Color Palette

### Light Mode

| Component | Color | HSL Value |
|-----------|-------|-----------|
| Background | White | `0 0% 100%` |
| Foreground | Charcoal | `220 10% 20%` |
| Primary | Flame Red | `5 85% 45%` |
| Secondary | Charcoal | `220 10% 20%` |
| Accent | Light Gray | `220 15% 90%` |
| Muted | Very Light Gray | `220 15% 96%` |
| Border | Light Gray | `220 13% 91%` |

### Dark Mode

| Component | Color | HSL Value |
|-----------|-------|-----------|
| Background | Dark Charcoal | `220 10% 15%` |
| Foreground | Off-White | `0 0% 98%` |
| Primary | Bright Flame Red | `5 85% 55%` |
| Secondary | Darker Charcoal | `220 10% 12%` |
| Accent | Medium Gray | `220 10% 25%` |
| Muted | Dark Gray | `220 10% 20%` |
| Border | Medium Gray | `220 10% 30%` |

## Using the Theme

### CSS Variables

Access theme colors using CSS variables:

```css
.my-element {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

### Tailwind Classes

Use Tailwind utility classes to apply theme colors:

```jsx
<div className="bg-primary text-primary-foreground">
  Primary-colored element
</div>

<div className="bg-secondary text-secondary-foreground">
  Secondary-colored element
</div>
```

### Direct Color Scale Access

Access specific shades from the color scales:

```jsx
<div className="bg-primary-600">
  Slightly darker primary color
</div>

<div className="text-secondary-300">
  Lighter secondary text
</div>
```

### Brand-Specific Colors

Use the dedicated brand color utilities:

```jsx
<div className="bg-fots-red">
  Brand red background
</div>

<div className="text-fots-charcoal">
  Brand charcoal text
</div>
```

### Theme Toggle

The application includes a theme toggle in the header that switches between light and dark modes. The theme preference is stored in local storage.

## Design Principles

1. **Accessibility**: Maintain sufficient contrast between text and background colors
2. **Consistency**: Use the defined color palette consistently throughout the application
3. **Brand Identity**: Emphasize the flame red and charcoal gray colors to reinforce brand identity
4. **User Preference**: Respect user preference for light or dark mode

## Component Examples

### Buttons

- Primary Button: `bg-primary text-primary-foreground hover:bg-primary/90`
- Secondary Button: `bg-secondary text-secondary-foreground hover:bg-secondary/90`
- Outline Button: `border border-input bg-background hover:bg-accent hover:text-accent-foreground`
- Ghost Button: `hover:bg-accent hover:text-accent-foreground`

### Cards

- Standard Card: `bg-card text-card-foreground shadow-sm`
- Featured Card: `bg-primary/10 text-primary-foreground border border-primary/20`

### Text

- Body Text: `text-foreground`
- Muted Text: `text-muted-foreground`
- Accent Text: `text-primary`
