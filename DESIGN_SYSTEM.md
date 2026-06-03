Copy

# Care 24 Japan — Design System

## Logo
File: /public/images/logo.svg
Always render via next/image. Minimum width 120px. Never recolor or crop.

## Aesthetic Direction
Clean, friendly, trustworthy Japanese healthcare.
Inspired directly by the Care 24 Japan logo:
rounded forms, blue-dominant palette, sakura accent, modern sans-serif.
NOT warm/beige. NOT serif-heavy. NOT dark.

## Color Palette (define in globals.css as CSS variables + Tailwind config)
--color-bg:             #FAFBFF   /* Near-white with cool blue tint */
--color-surface:        #FFFFFF
--color-heading:        #1B1F5E   /* Deep navy — from "Japan" wordmark */
--color-body:           #3D4A5C
--color-primary:        #2B7EC1   /* Primary blue — from icon background */
--color-primary-mid:    #4A7FB5   /* Mid blue — from "care24" gradient start */
--color-primary-light:  #EAF3FB   /* Tint for backgrounds and hover states */
--color-accent:         #C94F7C   /* Sakura pink — from cherry leaf mark */
--color-accent-light:   #FCEEF4   /* Pink tint */
--color-border:         #D8E4F0
--color-muted:          #8A9BB0

## Typography
- Font: Noto Sans JP (load via next/font/google)
- Headings: font-weight 700, color --color-heading
- Body: font-weight 400, color --color-body
- EN secondary labels: font-weight 400, 0.7rem, uppercase, tracking-widest, color --color-muted

## Spacing
- Section padding: py-20 (desktop), py-12 (mobile)
- Max content width: max-w-5xl mx-auto px-6

## Component Rules
- Cards: rounded-2xl border border-[--color-border] bg-white shadow-sm hover:shadow-md transition-shadow duration-200
- Button primary: bg-[--color-primary] text-white px-8 py-3 rounded-full font-medium hover:bg-[--color-primary-mid] transition
- Button secondary: border-2 border-[--color-primary] text-[--color-primary] px-8 py-3 rounded-full font-medium hover:bg-[--color-primary-light] transition
- Button accent (CTA highlight): bg-[--color-accent] text-white px-8 py-3 rounded-full font-medium hover:opacity-90 transition
- Section heading pattern:
    
日本語見出し

    

English label



## Bilingual Text Pattern
Every piece of copy renders like this:
  

日本語テキスト


  

English label



## Navbar
- Background: white, border-bottom border-[--color-border], sticky top-0 z-50
- Logo: next/image of /public/images/logo.png, height 40px
- Nav links: text-sm text-[--color-body] hover:text-[--color-primary] transition
- CTA button in navbar: Button primary (small), rounded-full

## Animation
- Page load: staggered fade-up on hero + sections (Tailwind animate utilities + delay)
- Card hover: shadow lift only
- No autoplay video, no parallax, no jarring motion

## Do NOT
- Use warm beige, gold, or earthy tones (those don't match this logo)
- Use serif fonts — Noto Sans JP only throughout
- Use purple gradients or dark mode backgrounds
- Hardcode any copy or ¥ price values inline in components
- Use CSS modules or styled-components — Tailwind only