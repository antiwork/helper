# Theming Guide

This application uses a globals.css-based theming system. All theme customizations should be made directly in the `app/globals.css` file.

## Architecture

The theming system is built on CSS custom properties (variables) and supports:

- **Light/Dark mode switching** via `next-themes`
- **Static theme definitions** in globals.css
- **Tailwind CSS v4** integration with CSS variables

## Theme Structure

### Base Theme Variables

The application defines CSS variables in `app/globals.css` for both light and dark modes:

```css
:root,
.light {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 58% 10%);
  --primary: hsl(0 67% 17%);
  --accent: hsl(220 14% 96%);
  --sidebar-background: hsl(0 69% 17%);
  /* ... other variables */
}

.dark {
  --background: hsl(0 58% 10%);
  --foreground: hsl(0 0% 100%);
  --primary: hsl(0 0% 100%);
  --accent: hsl(0 20% 22%);
  --sidebar-background: hsl(0 58% 10%);
  /* ... other variables */
}
```

### Variable Categories

1. **Layout Colors**
   - `--background` - Main background color
   - `--foreground` - Primary text color
   - `--card` - Card background
   - `--border` - Border color

2. **Interactive Colors**
   - `--primary` - Primary button/link color
   - `--secondary` - Secondary button color
   - `--accent` - Accent/hover color
   - `--destructive` - Error/danger color
   - `--success` - Success color

3. **Sidebar Colors**
   - `--sidebar-background` - Sidebar background
   - `--sidebar-foreground` - Sidebar text
   - `--sidebar-accent` - Sidebar hover state

4. **Chart Colors**
   - `--chart-1` through `--chart-5` - Data visualization colors

## Adding Custom Themes

To create a custom theme, add a new CSS class in `globals.css`:

```css
.theme-custom {
  --background: hsl(210 40% 98%);
  --foreground: hsl(210 40% 8%);
  --primary: hsl(210 100% 50%);
  --accent: hsl(210 40% 94%);
  --sidebar-background: hsl(210 100% 50%);
  --sidebar-foreground: hsl(0 0% 100%);
  /* Override other variables as needed */
}
```

Then apply the theme class to the root element or specific components.

## AI-Based Theme Updates

To update themes using AI, modify the CSS variables in `app/globals.css`:

1. **Identify the theme section** you want to modify (`:root`, `.light`, `.dark`, or custom theme classes)
2. **Update the HSL values** for the desired variables
3. **Test the changes** by applying the theme class
4. **Ensure proper contrast** ratios for accessibility

### Example AI Prompt for Theme Changes

```text
Update the dark theme in globals.css to use a blue color scheme:
- Background: dark blue (#0f172a)
- Foreground: light blue-gray (#cbd5e1)  
- Primary: bright blue (#3b82f6)
- Accent: darker blue (#1e40af)
- Sidebar: navy blue (#1e3a8a)
```

## Color Guidelines

- Use **HSL color format** for better readability and manipulation
- Maintain **sufficient contrast** ratios (4.5:1 for normal text, 3:1 for large text)
- Test themes in both **light and dark modes**
- Consider **accessibility** for users with visual impairments

## Tailwind Integration

The theme variables are automatically available in Tailwind CSS classes:

```jsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Primary Button
  </button>
</div>
```