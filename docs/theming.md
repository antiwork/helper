# Complete Theming Guide for Helper

This comprehensive guide explains how to customize the appearance of your Helper application through CSS-based theming. Since Helper is designed for self-hosted, single-tenant deployments, all theme customization is done by directly editing the CSS file.

## Table of Contents

1. [How Theming Works](#how-theming-works)
2. [Quick Start Guide](#quick-start-guide)
3. [Understanding the Theme Structure](#understanding-the-theme-structure)
4. [Complete Variable Reference](#complete-variable-reference)
5. [Step-by-Step Customization Guide](#step-by-step-customization-guide)
6. [Pre-built Theme Examples](#pre-built-theme-examples)
7. [Advanced Customization](#advanced-customization)
8. [Testing and Validation](#testing-and-validation)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## How Theming Works

Helper uses **CSS Custom Properties** (CSS Variables) for theming, defined in `app/globals.css`. This approach provides:

- **Real-time updates**: Changes appear immediately without server restart
- **Light/Dark mode support**: Automatic theme switching based on user preference
- **Consistent styling**: All components automatically use the theme variables
- **Easy maintenance**: Single file controls the entire application appearance

### Theme Architecture

```
app/globals.css
├── Light Theme Variables (:root, .light)
├── Dark Theme Variables (.dark)
├── Tailwind Integration (@theme inline)
├── Component Styles (@layer components)
└── Utility Classes (@layer base)
```

## Quick Start Guide

### 1. Locate the Theme File

The main theme file is located at:
```
app/globals.css
```

### 2. Find the Theme Variables

Light theme variables are defined in:
```css
:root,
.light {
  /* Your light theme variables */
}
```

Dark theme variables are defined in:
```css
.dark {
  /* Your dark theme variables */
}
```

### 3. Make Your First Change

Try changing the primary color:

```css
/* In the :root section */
--primary: hsl(280 100% 50%); /* Change to purple */

/* In the .dark section */
--primary: hsl(280 80% 60%); /* Lighter purple for dark mode */
```

### 4. Save and View Changes

Save the file and refresh your browser. Changes appear immediately!

## Understanding the Theme Structure

### Color Format

All colors use HSL (Hue, Saturation, Lightness) format **without** the `hsl()` wrapper:

```css
/* ✅ Correct */
--primary: 220 100% 50%;

/* ❌ Incorrect */
--primary: hsl(220, 100%, 50%);
--primary: #3b82f6;
```

### HSL Breakdown

- **Hue (0-360)**: The color itself (0=red, 120=green, 240=blue)
- **Saturation (0-100%)**: Color intensity (0=gray, 100=vivid)
- **Lightness (0-100%)**: Brightness (0=black, 50=normal, 100=white)

### Light vs Dark Themes

Each variable should be defined for both themes:

```css
:root, .light {
  --background: 0 0% 100%;     /* White background */
  --foreground: 0 0% 0%;       /* Black text */
}

.dark {
  --background: 0 0% 0%;       /* Black background */
  --foreground: 0 0% 100%;     /* White text */
}
```

## Complete Variable Reference

### Core Application Colors

| Variable | Usage | Light Theme Default | Dark Theme Default |
|----------|-------|-------------------|-------------------|
| `--background` | Main app background | `hsl(220 50% 95%)` | `hsl(0 58% 10%)` |
| `--foreground` | Primary text color | `hsl(220 40% 15%)` | `hsl(0 0% 100%)` |
| `--card` | Card backgrounds | `hsl(220 70% 97%)` | `hsl(0 58% 10%)` |
| `--card-foreground` | Card text | `hsl(220 40% 15%)` | `hsl(0 0% 100%)` |
| `--popover` | Dropdown/modal backgrounds | `hsl(220 70% 97%)` | `hsl(0 58% 10%)` |
| `--popover-foreground` | Dropdown/modal text | `hsl(220 40% 15%)` | `hsl(0 0% 100%)` |

### Button Colors

| Variable | Usage | Light Theme Default | Dark Theme Default |
|----------|-------|-------------------|-------------------|
| `--primary` | Primary buttons | `hsl(220 100% 50%)` | `hsl(0 0% 100%)` |
| `--primary-foreground` | Primary button text | `hsl(0 0% 100%)` | `hsl(0 58% 10%)` |
| `--secondary` | Secondary buttons | `hsl(220 30% 90%)` | `hsl(0 20% 22%)` |
| `--secondary-foreground` | Secondary button text | `hsl(220 40% 15%)` | `hsl(0 0% 100%)` |

### State Colors

| Variable | Usage | Light Theme Default | Dark Theme Default |
|----------|-------|-------------------|-------------------|
| `--destructive` | Error/danger buttons | `hsl(17 88% 40%)` | `hsl(0 84% 65%)` |
| `--destructive-foreground` | Error text | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` |
| `--success` | Success indicators | `hsl(142 72% 29%)` | `hsl(142 72% 29%)` |
| `--success-foreground` | Success text | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` |
| `--muted` | Disabled elements | `hsl(220 25% 90%)` | `hsl(0 20% 22%)` |
| `--muted-foreground` | Disabled text | `hsl(220 15% 50%)` | `hsl(0 0% 100% / 70%)` |
| `--accent` | Hover/focus states | `hsl(220 60% 85%)` | `hsl(0 20% 22%)` |
| `--accent-foreground` | Accent text | `hsl(220 40% 15%)` | `hsl(0 0% 100%)` |

### Sidebar Colors

| Variable | Usage | Light Theme Default | Dark Theme Default |
|----------|-------|-------------------|-------------------|
| `--sidebar-background` | Sidebar background | `hsl(220 100% 15%)` | `hsl(0 58% 10%)` |
| `--sidebar-foreground` | Sidebar text | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` |
| `--sidebar-primary` | Active sidebar items | `hsl(220 100% 15%)` | `hsl(0 58% 10%)` |
| `--sidebar-primary-foreground` | Active sidebar text | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` |
| `--sidebar-accent` | Sidebar hover states | `hsl(0 0% 100% / 10%)` | `hsl(0 0% 100% / 10%)` |
| `--sidebar-accent-foreground` | Sidebar hover text | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` |
| `--sidebar-border` | Sidebar borders | `hsl(0 0% 100% / 20%)` | `hsl(0 0% 100% / 20%)` |
| `--sidebar-ring` | Sidebar focus rings | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` |

### Form Elements

| Variable | Usage | Light Theme Default | Dark Theme Default |
|----------|-------|-------------------|-------------------|
| `--border` | Default borders | `hsl(220 30% 75%)` | `hsl(0 0% 100% / 20%)` |
| `--input` | Input field borders | `hsl(220 30% 75%)` | `hsl(0 0% 100% / 20%)` |
| `--ring` | Focus ring color | `hsl(220 100% 50%)` | `hsl(0 0% 100% / 20%)` |

### Chart Colors

| Variable | Usage | Color |
|----------|-------|-------|
| `--chart-1` | Chart data series 1 | `hsl(12 76% 61%)` |
| `--chart-2` | Chart data series 2 | `hsl(173 58% 39%)` |
| `--chart-3` | Chart data series 3 | `hsl(197 37% 24%)` |
| `--chart-4` | Chart data series 4 | `hsl(43 74% 66%)` |
| `--chart-5` | Chart data series 5 | `hsl(27 87% 67%)` |
| `--chart-open` | Open tickets | `hsl(1 75% 17%)` |
| `--chart-closed-manual` | Manually closed | `hsl(45 99% 55%)` |
| `--chart-closed-ai` | AI-closed tickets | `hsl(73 58% 56%)` |
| `--chart-negative` | Negative values | `hsl(17 88% 40%)` |

### Special Colors

| Variable | Usage | Default |
|----------|-------|---------|
| `--bright` | Accent highlights | `hsl(41 99% 55%)` |
| `--bright-foreground` | Bright accent text | `hsl(0 58% 10%)` |
| `--radius` | Border radius | `0.5rem` |

## Step-by-Step Customization Guide

### Creating a Custom Theme

#### Step 1: Choose Your Base Colors

Pick your primary colors using HSL values:

```css
/* Example: Purple theme */
Primary: hsl(280 100% 50%)    /* Bright purple */
Secondary: hsl(280 30% 90%)   /* Light purple */
Background: hsl(280 20% 98%)  /* Very light purple */
```

#### Step 2: Update Light Theme Variables

Open `app/globals.css` and find the `:root, .light` section:

```css
:root,
.light {
  /* Update these core colors */
  --background: 280 20% 98%;           /* Very light purple */
  --foreground: 280 40% 15%;           /* Dark purple text */
  --card: 280 30% 96%;                 /* Light purple cards */
  --card-foreground: 280 40% 15%;      /* Dark purple card text */
  --primary: 280 100% 50%;             /* Bright purple buttons */
  --primary-foreground: 0 0% 100%;     /* White text on purple */
  --secondary: 280 30% 90%;            /* Light purple secondary */
  --secondary-foreground: 280 40% 15%; /* Dark purple secondary text */
  --accent: 280 60% 85%;               /* Medium purple accents */
  --accent-foreground: 280 40% 15%;    /* Dark purple accent text */
  --border: 280 30% 75%;               /* Purple-grey borders */
  --input: 280 30% 75%;                /* Purple-grey input borders */
  --ring: 280 100% 50%;                /* Bright purple focus rings */
}
```

#### Step 3: Update Dark Theme Variables

Find the `.dark` section and update for dark mode:

```css
.dark {
  /* Dark theme versions */
  --background: 280 20% 8%;            /* Very dark purple */
  --foreground: 0 0% 100%;             /* White text */
  --card: 280 20% 12%;                 /* Dark purple cards */
  --card-foreground: 0 0% 100%;        /* White card text */
  --primary: 280 80% 60%;              /* Lighter purple for dark mode */
  --primary-foreground: 280 20% 8%;    /* Dark text on light purple */
  --secondary: 280 20% 20%;            /* Dark purple secondary */
  --secondary-foreground: 0 0% 100%;   /* White secondary text */
  /* ... continue with other variables */
}
```

#### Step 4: Test Your Changes

1. Save the file
2. Refresh your browser
3. Toggle between light and dark modes
4. Check all major UI elements

### Sidebar Customization

The sidebar has its own color scheme:

```css
/* Custom sidebar colors */
--sidebar-background: 280 100% 15%;      /* Deep purple sidebar */
--sidebar-foreground: 0 0% 100%;         /* White sidebar text */
--sidebar-primary: 280 100% 15%;         /* Active item background */
--sidebar-accent: 0 0% 100% / 10%;       /* Hover state (10% white) */
```

### Fine-tuning Colors

Use these formulas to create harmonious color schemes:

```css
/* Monochromatic (same hue, different saturation/lightness) */
--primary: 220 100% 50%;     /* Base blue */
--secondary: 220 30% 90%;    /* Light blue */
--accent: 220 60% 85%;       /* Medium blue */
--border: 220 30% 75%;       /* Blue-grey */

/* Analogous (adjacent hues) */
--primary: 220 100% 50%;     /* Blue */
--secondary: 200 80% 60%;    /* Blue-cyan */
--accent: 240 70% 65%;       /* Blue-purple */

/* Complementary (opposite hues) */
--primary: 220 100% 50%;     /* Blue */
--accent: 40 100% 50%;       /* Orange */
```

## Pre-built Theme Examples

### 1. Current Blue Theme (Default)

```css
:root, .light {
  --background: 220 50% 95%;
  --foreground: 220 40% 15%;
  --primary: 220 100% 50%;
  --sidebar-background: 220 100% 15%;
  --accent: 220 60% 85%;
  --border: 220 30% 75%;
}
```

### 2. Professional Dark Blue

```css
:root, .light {
  --background: 0 0% 100%;
  --foreground: 222 84% 5%;
  --primary: 221 83% 53%;
  --sidebar-background: 222 84% 5%;
  --accent: 221 83% 53%;
  --border: 218 10% 84%;
}

.dark {
  --background: 222 84% 5%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --sidebar-background: 222 84% 5%;
  --accent: 217 91% 60%;
  --border: 0 0% 100% / 20%;
}
```

### 3. Warm Orange Theme

```css
:root, .light {
  --background: 30 50% 98%;
  --foreground: 20 14% 5%;
  --primary: 25 95% 53%;
  --sidebar-background: 20 14% 5%;
  --accent: 25 95% 53%;
  --border: 30 20% 80%;
}

.dark {
  --background: 20 14% 5%;
  --foreground: 60 9% 98%;
  --primary: 20 91% 60%;
  --sidebar-background: 20 14% 5%;
  --accent: 20 91% 60%;
  --border: 0 0% 100% / 20%;
}
```

### 4. Green Nature Theme

```css
:root, .light {
  --background: 120 30% 98%;
  --foreground: 120 40% 15%;
  --primary: 142 72% 29%;
  --sidebar-background: 120 40% 15%;
  --accent: 120 60% 85%;
  --border: 120 30% 75%;
}

.dark {
  --background: 120 40% 8%;
  --foreground: 0 0% 100%;
  --primary: 142 72% 45%;
  --sidebar-background: 120 40% 8%;
  --accent: 142 72% 45%;
  --border: 0 0% 100% / 20%;
}
```

### 5. Purple Creative Theme

```css
:root, .light {
  --background: 280 30% 98%;
  --foreground: 280 40% 15%;
  --primary: 280 100% 50%;
  --sidebar-background: 280 40% 15%;
  --accent: 280 60% 85%;
  --border: 280 30% 75%;
}

.dark {
  --background: 280 20% 8%;
  --foreground: 0 0% 100%;
  --primary: 280 80% 60%;
  --sidebar-background: 280 20% 8%;
  --accent: 280 80% 60%;
  --border: 0 0% 100% / 20%;
}
```

### 6. Monochrome Minimalist

```css
:root, .light {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  --primary: 0 0% 20%;
  --sidebar-background: 0 0% 15%;
  --accent: 0 0% 90%;
  --border: 0 0% 80%;
}

.dark {
  --background: 0 0% 8%;
  --foreground: 0 0% 100%;
  --primary: 0 0% 80%;
  --sidebar-background: 0 0% 5%;
  --accent: 0 0% 20%;
  --border: 0 0% 100% / 20%;
}
```

## Advanced Customization

### Customizing Animations

You can modify the built-in animations:

```css
/* In the @theme inline section */
@keyframes custom-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

--animate-pulse: custom-pulse 2s ease-in-out infinite;
```

### Custom Font Integration

Update the font family:

```css
/* In the @theme inline section */
--font-system-ui: 'Your Custom Font', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Syntax Highlighting Colors

Customize code block colors:

```css
/* Light theme syntax highlighting */
--syntax-plain: #24292e;
--syntax-comment: #6a737d;
--syntax-keyword: #d73a49;
--syntax-function: #6f42c1;
--syntax-string: #032f62;
--syntax-number: #005cc5;
```

### Custom Border Radius

Adjust the overall roundness:

```css
--radius: 0.25rem;  /* More square */
--radius: 0.75rem;  /* More rounded */
--radius: 1rem;     /* Very rounded */
```

### Sidebar Width Customization

Adjust sidebar dimensions:

```css
--sidebar-width: 18rem;        /* Wider sidebar */
--sidebar-width-icon: 4rem;    /* Wider collapsed sidebar */
--sidebar-width-mobile: 70%;   /* Larger mobile sidebar */
```

## Testing and Validation

### Browser Testing Checklist

Test your theme across different scenarios:

- [ ] Light mode appearance
- [ ] Dark mode appearance  
- [ ] All button states (hover, focus, disabled)
- [ ] Form elements (inputs, dropdowns, checkboxes)
- [ ] Cards and modals
- [ ] Sidebar navigation
- [ ] Charts and data visualization
- [ ] Error and success states
- [ ] Mobile responsiveness

### Accessibility Testing

Ensure your theme meets accessibility standards:

#### Contrast Ratios

Use tools like [WebAIM's Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify:

- **Normal text**: 4.5:1 minimum contrast ratio
- **Large text**: 3:1 minimum contrast ratio
- **Interactive elements**: 3:1 minimum contrast ratio

#### Quick Contrast Check

```css
/* Good contrast examples */
--background: 0 0% 100%;      /* White */
--foreground: 0 0% 13%;       /* Very dark grey (7.6:1 ratio) */

--primary: 220 100% 40%;      /* Dark blue */
--primary-foreground: 0 0% 100%; /* White (4.8:1 ratio) */
```

### Common Issues and Solutions

#### Issue: Colors appear washed out

**Solution**: Increase saturation values
```css
/* Before */
--primary: 220 30% 50%;

/* After */
--primary: 220 70% 50%;
```

#### Issue: Dark mode is too bright

**Solution**: Reduce lightness values
```css
/* Before */
--background: 0 0% 20%;

/* After */
--background: 0 0% 8%;
```

#### Issue: Insufficient contrast

**Solution**: Increase contrast between foreground and background
```css
/* Before */
--background: 220 50% 95%;
--foreground: 220 30% 40%;

/* After */
--background: 220 50% 95%;
--foreground: 220 40% 15%;
```

## Troubleshooting

### Theme Not Applying

1. **Check file location**: Ensure you're editing `app/globals.css`
2. **Verify syntax**: Make sure HSL values don't have `hsl()` wrapper
3. **Clear browser cache**: Hard refresh with Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. **Check for typos**: Ensure variable names are spelled correctly

### Dark Mode Issues

1. **Missing dark variables**: Ensure all variables are defined in both `:root` and `.dark`
2. **Wrong selector**: Use `.dark` not `.dark-mode` or similar
3. **Inheritance issues**: Make sure parent elements have proper theme classes

### Performance Issues

1. **Too many custom properties**: Limit custom variables to necessary ones
2. **Complex animations**: Simplify keyframe animations if they cause lag
3. **Large background images**: Optimize or remove heavy background assets

## Best Practices

### Color Management

1. **Use a consistent color palette**: Stick to 2-3 base hues
2. **Maintain proper contrast**: Always test accessibility
3. **Consider color blindness**: Test with color blindness simulators
4. **Document your choices**: Add comments explaining color decisions

### Code Organization

1. **Group related variables**: Keep sidebar colors together, form colors together
2. **Use descriptive comments**: Explain what each variable affects
3. **Test incrementally**: Make small changes and test frequently
4. **Back up your work**: Save copies of working themes

### Development Workflow

1. **Start with a plan**: Sketch or mockup your desired theme
2. **Begin with core colors**: Set background, foreground, and primary first
3. **Work systematically**: Complete light theme before dark theme
4. **Test continuously**: Check changes in browser frequently
5. **Document changes**: Keep notes of what works and what doesn't

## AI-Assisted Theme Generation

You can use AI to help generate themes. Here's a template prompt:

```
I want to create a [THEME_DESCRIPTION] theme for my Helper application. 

Please provide CSS custom properties for both light and dark modes using HSL values (without hsl() wrapper) for these variables:

Core Colors:
- --background: Main background color
- --foreground: Main text color
- --primary: Primary button/accent color
- --primary-foreground: Text on primary buttons
- --card: Card background
- --card-foreground: Text on cards
- --sidebar-background: Sidebar background
- --sidebar-foreground: Sidebar text
- --secondary: Secondary button color
- --secondary-foreground: Text on secondary buttons
- --border: Border color
- --accent: Hover/focus accent color
- --accent-foreground: Text on accent elements

Requirements:
- Use HSL format: "220 100% 50%" (not "hsl(220, 100%, 50%)")
- Ensure good contrast ratios (4.5:1 minimum for text)
- Make dark mode appropriately darker
- Keep colors harmonious and professional

Theme concept: [Describe your desired theme - e.g., "warm orange corporate theme" or "cool blue tech theme"]
```

## Conclusion

This theming system gives you complete control over your Helper application's appearance. Start with small changes, test frequently, and build up to your desired look. Remember that good themes balance aesthetics with usability - always prioritize readability and accessibility.

For questions or issues, refer to the troubleshooting section or create an issue in the project repository.

---

**Quick Reference Card:**

- **Theme file**: `app/globals.css`
- **Light theme**: `:root, .light { }`
- **Dark theme**: `.dark { }`
- **Color format**: HSL without wrapper (e.g., `220 100% 50%`)
- **Test changes**: Save file and refresh browser
- **Accessibility**: Maintain 4.5:1 contrast ratio minimum