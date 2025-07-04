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

### Example AI Prompts for Theme Changes

**Design System Compliance:**

```text
Based on docs/THEMING.md, update the :root/.light and .dark theme sections in app/globals.css to comply with the Department of Veterans Affairs Web Design System. Use HSL format with proper contrast ratios: background hsl(0 0% 100%), foreground hsl(0 0% 13%), primary hsl(208 88% 27%), accent hsl(208 100% 97%), sidebar background hsl(208 88% 27%). Ensure 4.5:1 contrast for normal text and test in both light and dark modes. Apply theme class to root element.
```

**Brand-Specific Theming:**

```text
Based on docs/THEMING.md, create a new .github-theme class in app/globals.css using HSL format and following all variable categories: background hsl(0 0% 100%), foreground hsl(213 13% 19%), primary hsl(212 92% 45%), accent hsl(210 12% 97%), sidebar background hsl(220 14% 96%). Include all layout, interactive, sidebar, and chart colors. Maintain sufficient contrast ratios and test in both light and dark modes before applying to components.
```

**Accessibility-First Approach:**

```text
Based on docs/THEMING.md, add a new .high-contrast class in app/globals.css following the theming architecture. Use HSL format for all variable categories: background hsl(0 0% 0%), foreground hsl(0 0% 100%), primary hsl(200 100% 50%), accent hsl(0 0% 15%), sidebar background hsl(0 0% 5%). Ensure all combinations exceed 7:1 contrast ratio, include proper focus ring colors, and test accessibility for users with visual impairments. Apply class to root element when needed.
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
