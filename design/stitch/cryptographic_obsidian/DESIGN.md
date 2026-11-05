---
name: Cryptographic Obsidian
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d1f27'
  surface-container-high: '#272a32'
  surface-container-highest: '#32353d'
  on-surface: '#e1e2ec'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2d3038'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dce6'
  primary: '#e0fdff'
  on-primary: '#00373a'
  primary-container: '#00f2fe'
  on-primary-container: '#006a70'
  inverse-primary: '#00696f'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ddfff4'
  on-tertiary: '#00382e'
  tertiary-container: '#4bf4d5'
  on-tertiary-container: '#006d5c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ff6ff'
  primary-fixed-dim: '#00dce6'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#55fbdc'
  tertiary-fixed-dim: '#26dec0'
  on-tertiary-fixed: '#00201a'
  on-tertiary-fixed-variant: '#005144'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353d'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 46px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses ultra-modern cryptographic precision, institutional-grade trust, and frictionless mobile execution. Designed for next-generation keyless, non-custodial crypto management, it bridges institutional hardware security and modern consumer biometric velocity.

### Visual Aesthetic & Philosophy
The aesthetic blends **Dark Technical Glassmorphism** with **Precision Cryptographic Minimalism**:
- **Obsidian Dark Architecture:** Deep, light-absorbing obsidian foundations remove visual fatigue and frame security-critical actions with clinical focus.
- **Controlled Luminescence:** Cyan and indigo photon emissions indicate verified status, biometric activity, and secure multi-party quorum states without gratuitous neon pollution.
- **Tactile Security Physics:** Surfaces behave like machined cryptographic hardware plates—subtle layered depth, crisp hairline edge definition, and restrained micro-glows on authentication states.
- **Emotional Stance:** Zero-anxiety security. The interface removes the terror of lost seed phrases by visualizing active peer guardian shields and native hardware passkey guarantees.

## Colors

The palette establishes an authoritative, deep obsidian baseline punctuated by high-frequency cyan and indigo security states.

### Core Swatches & Roles
- **Base Obsidian Canvas:** `#0A0D14` (root viewport), stepping up to `#101522` (primary background canvas).
- **Surface & Glass Containers:** `#161C2E` (base card surface) and `#1F263E` (elevated sheets, floating modale plates).
- **Hairline Structural Borders:** `rgba(255, 255, 255, 0.08)` baseline; `#2D3756` for focused or interactable container bounds.
- **Primary Cryptographic Accent:** `#00F2FE` (Radiant Cyan) for primary interactive highlights, verification pulses, and hardware passkey active triggers. Secondary complement `#05D5B7` (Electric Teal) handles cryptographic signatures and confirmation buttons.
- **Guardian & Shield Tone:** `#6366F1` (Deep Indigo) and `#818CF8` (Soft Violet) represent distributed social recovery, guardian rings, and biometric standby states.
- **Typography Scale:**
  - `#FFFFFF` (Stark White): Primary balances, numerical assets, and critical headlines.
  - `#CBD5E1` (Slate 300): Descriptive metadata, input field copy, and body instructions.
  - `#64748B` (Slate 500): Hex addresses, public keys, transaction timestamps, and structural labels.
- **Protocol Semantic Accents:**
  - Verified / Safe / Quorum Active: `#10B981` (Emerald).
  - Pending Recovery / Guardian Approval In-Flight: `#F59E0B` (Amber).
  - Signature Mismatch / Biometric Rejection: `#EF4444` (Crimson).

## Typography

The typographic hierarchy pairs high-clarity geometric letterforms (`Plus Jakarta Sans`) with zero-ambiguity monospaced structures (`JetBrains Mono`).

### Application Rules
- **Numerical Assets & Large Balances:** Displayed using `headline-xl` or `headline-lg` with `font-feature-settings: "tnum" on, "zero" on` to enforce strict tabular numerical alignment during live balance oscillations.
- **Cryptographic Hashes & Public Keys:** Must strictly use `code-sm` or `code-md`. Never apply variable-width fonts to checksums, EVM/Solana addresses, or WebAuthn credential IDs.
- **Letter Spacing:** Headlines utilize tighter tracking (`-0.02em`) for a solid, institutional character. Labels and all monospaced strings adopt open tracking (`+0.04em`) to maximize legibility on dense OLED screens.

## Layout & Spacing

A mobile-first fluid layout architecture centered around high-efficiency reach zones, thumb clusters, and compact vertical cadence.

### Grid & Ergonomic Rhythm
- **Mobile Viewports (under 600px):** Single-column layout bound to a 4-column sub-grid with `1rem` safe margins. Critical confirmation actions, biometric prompts, and key transfer buttons reside strictly within the lower 40% ergonomic thumb quadrant.
- **Tablet / Responsive Expanders (600px+):** Fluid 8-column layout capped at `540px` max-width for the primary transaction canvas, ensuring financial focus is never diffused across broad empty horizontal planes.
- **Vertical Spacing Scale:** Built upon an 8px base rhythm. Micro adjustments (tags, inline verification pills) snap to 4px (`space-xs`).

## Elevation & Depth

Visual hierarchy does not rely on traditional drop shadows; instead, it uses a three-tier system: **chromatic edge glow**, **backdrop filtration**, and **stacked tonal opacity**.

### Hierarchy Tiers
1. **Tier 0 (Root Obsidian Base):** `#0A0D14` pure backdrop, non-reflective.
2. **Tier 1 (Surface Canvas & Grouping Mats):** `#101522` with a `1px` inner hairline border tinted with `rgba(255, 255, 255, 0.05)`.
3. **Tier 2 (Glassmorphic Cards & Wallet Modules):** Background `#161C2E` with 80% opacity, `backdrop-filter: blur(16px)`, border: `1px solid rgba(255, 255, 255, 0.08)`.
4. **Tier 3 (Floating Sheets, Action Drawers, Biometric Modals):** `#1F263E` at 92% opacity, `backdrop-filter: blur(24px)`, framed with `1px solid rgba(0, 242, 254, 0.20)` and an ambient security bloom of `0 12px 40px -10px rgba(0, 242, 254, 0.12)`.

### Lighting & Outlines
Borders simulate top-down cryptographic illumination: top edges feature slightly higher opacity (`rgba(255, 255, 255, 0.12)`), tapering to low-opacity floor edges (`rgba(255, 255, 255, 0.03)`).

## Shapes

The design system maintains balanced curvature (`roundedness: 2`), reflecting technical precision without clinical harshness.

### Curvature Taxonomy
- **Standard Cards & Module Enclosures:** `1rem` (16px) corner radius.
- **Biometric Prompts, Action Sheets & Modal Plates:** `1.5rem` (24px) corner radius.
- **Inputs, Buttons, and Guardian Nodes:** `0.75rem` (12px) to maintain structured tap boundaries.
- **Status Pills, Quorum Markers, and Biometric Indicators:** Fully rounded pill shapes (`9999px`) to distinguish cryptographic state badges from interactive actionable surfaces.

## Components

### Buttons
- **Primary Passkey Trigger:** Gradient fill from `#00F2FE` to `#05D5B7`, text `#0A0D14` (`Plus Jakarta Sans`, 600 weight). Subtle inset top highlight `rgba(255, 255, 255, 0.4)`. Hover/Press states trigger a glowing halo (`box-shadow: 0 0 20px rgba(0, 242, 254, 0.45)`).
- **Secondary (Guardian / Recovery):** Ghost plate `#1F263E` with `1px solid #6366F1`, text `#818CF8`. Focus state scales border brightness with zero background shift.
- **Destructive / Revoke:** Ghost border with tinted crimson text (`#EF4444`), transitioning to solid background only upon two-step confirmation.

### Biometric & Passkey Badges
- Floating pills incorporating Face ID / Touch ID / WebAuthn glyphs.
- Features a dual-ring concentric layout: an inner glowing dot and an outer pulsing radar circle (`#00F2FE` with 2.5s infinite keyframe expansion) that activates during signature negotiation.

### Guardian Quorum Progress Ring
- Radial SVG visualization displaying recovery threshold states (e.g., `3 of 5 Guardians Verified`).
- Unverified slots: Translucent slate rings (`rgba(100, 116, 139, 0.2)`).
- Pending signatures: Pulsing Amber (`#F59E0B`).
- Confirmed signatures: Interlocked Emerald-to-Cyan path segments with distinct node badges showing peer avatar initials or ENS/public hash slices.

### Cards & Balance Hero Modules
- Hero card utilizes `#161C2E` glass with an ambient deep-indigo radial gradient underlay situated at the top-right corner.
- Contains the total net worth in `headline-xl`, network indicator pills, and an inline rapid-action bar (Send, Receive, Security Audit).

### Crypto Inputs & Hash Visualizers
- **Address & Amount Fields:** Background `#101522`, border `1px solid #2D3756`. Active focus yields an immediate border transition to `#00F2FE` with a soft cyan focus ring.
- **Truncated Hash Displays:** Integrated copy trigger, displaying formatted addresses (`0x71C...49A2`) with zero-width tap padding and instant copy confirmation tooltips.

### Tactile Mobile Navigation Dock
- Floating frosted dock pinned to the safe viewport bottom.
- Background: `#101522` at 85% opacity with `backdrop-filter: blur(20px)`, top border `1px solid rgba(255, 255, 255, 0.08)`.
- Center item: Prominent quick-auth vault button elevated 8px above the dock axis, enclosed in a cyan-accented ring.