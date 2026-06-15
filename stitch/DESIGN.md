---
name: Velocity Systems
colors:
  surface: '#f9f9ff'
  surface-dim: '#cadbfc'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d6e3ff'
  on-surface: '#091c35'
  on-surface-variant: '#434654'
  inverse-surface: '#20314b'
  inverse-on-surface: '#ecf0ff'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#5e4db9'
  on-secondary: '#ffffff'
  secondary-container: '#9f8eff'
  on-secondary-container: '#341d8d'
  tertiary: '#004e32'
  on-tertiary: '#ffffff'
  tertiary-container: '#006844'
  on-tertiary-container: '#72e9af'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#e5deff'
  secondary-fixed-dim: '#c9bfff'
  on-secondary-fixed: '#1a0063'
  on-secondary-fixed-variant: '#4633a0'
  tertiary-fixed: '#82f9be'
  tertiary-fixed-dim: '#65dca4'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005235'
  background: '#f9f9ff'
  on-background: '#091c35'
  surface-variant: '#d6e3ff'
typography:
  display-sm:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 12px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system focuses on high-velocity project management through a **Corporate / Modern** lens. It prioritizes clarity, systematic organization, and a sense of progress. The target audience includes product managers, developers, and stakeholders who require a high-density information environment that remains legible and professional. 

The aesthetic is characterized by a "utilitarian elegance"—using whitespace as a functional tool rather than just a decorative one. The UI should evoke a sense of reliability and structural integrity, ensuring that users feel in control of complex workflows even on smaller mobile screens.

## Colors
The palette is rooted in a professional blue-and-gray spectrum. 
- **Primary:** A deep, accessible blue (#0052CC) used for actions, links, and selection states.
- **Secondary:** A muted purple for secondary metadata and alternative category highlights.
- **Tertiary:** A vibrant green specifically reserved for "Done" states and success confirmations.
- **Neutrals:** A comprehensive range of grays. `#42526E` serves as the primary text color, while `#F4F5F7` provides the canvas for the Kanban board background to differentiate it from white task cards.

## Typography
This design system utilizes **Hanken Grotesk** for headings to provide a sharp, contemporary edge that distinguishes titles from the surrounding interface. **Inter** is used for all functional and body text to maximize legibility and systematic scaling. 

Text follows a strict hierarchy. Titles for task cards use `title-md`, while section headers for columns use `label-lg` with uppercase styling to create a clear "meta" layer above the content.

## Layout & Spacing
The system employs a **fluid grid** with a mobile-first philosophy. 
- **Mobile:** Elements stack vertically. The Kanban board transitions to a horizontal swipe-through or a bottom-sheet selection for columns.
- **Desktop:** A 12-column grid is used. Kanban columns are fixed-width (280px to 320px) to maintain readability, with a horizontal scroll on the board container if columns exceed viewport width.
- **Rhythm:** A 4px baseline grid ensures tight, professional alignment. Use `md` (16px) for standard padding within cards and `sm` (8px) for spacing between related elements like labels and inputs.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** supplemented by subtle **Ambient Shadows**. 
- **Level 0 (Background):** `#F4F5F7` used for the global application background.
- **Level 1 (Columns/Sidebar):** `#EBECF0` or slight tint to separate the board areas.
- **Level 2 (Cards):** `#FFFFFF` with a 1px border of `#DFE1E6` and a very soft 2px blur shadow (4% opacity black).
- **Level 3 (Drag/Active):** When a task card is moved, it gains a higher elevation shadow (12px blur, 10% opacity) and a slight rotation (2 degrees) to mimic physical lifting.

## Shapes
The shape language is **Soft**, reflecting the precision of a professional tool without the harshness of sharp corners. 
- Standard components (Buttons, Inputs) use a 4px (0.25rem) radius.
- Task cards use a 4px radius to allow for high-density stacking.
- Status badges and user avatars use a "full" or pill-shaped radius (rounded-xl) to contrast against the geometric structure of the board.

## Components
- **Task Cards:** White background, 1px border, 16px padding. Include a `title-md` for the task name, a bottom row for the user avatar (aligned right), and a priority icon (aligned left).
- **Status Badges:** 
    - **To-Do:** Neutral gray background (`#DFE1E6`), dark gray text.
    - **In Progress:** Primary blue background (`#DEEBFF`), primary blue text.
    - **Done:** Tertiary green background (`#E3FCEF`), dark green text.
- **Buttons:** 
    - **Primary:** Solid `#0052CC` with white text.
    - **Subtle:** Transparent background, gray text, changes to light gray on hover.
- **Input Fields:** 2px solid border in `#DFE1E6` that transitions to `#0052CC` on focus.
- **Kanban Board:** Column headers use `label-lg` in uppercase. A "plus" icon for adding tasks should appear at the bottom of every column as a subtle dashed-outline button.
- **User Avatars:** Circular, 24px diameter for card-level, 32px for board-level filtering.