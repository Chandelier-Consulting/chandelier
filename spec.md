# Chandelier Consulting Public Site Specification

## Launch Goal

Ship the first production version of the Chandelier Consulting marketing site: a polished single-page experience that explains the offer, builds trust with local business owners, and routes interested prospects to the contact form.

## Brand

- Public brand: Chandelier Consulting
- Legal operator: Perceo Inc.
- Required legal footer copy: "Chandelier Consulting. Operated by Perceo Inc."
- Domain: chandelierconsulting.dev
- Tone: premium, direct, practical, and local-business focused

## Audience

Primary audience:

- Restaurants, cafes, retailers, service businesses, clinics, trades, and growing multi-location operators.

Audience needs:

- Understand what Chandelier builds without technical jargon.
- See that the work is practical and tied to business outcomes.
- Contact Chandelier with enough context to qualify the project.

## Current V1 Scope

The site is a single Next.js App Router page with anchored sections:

- Hero
- Services
- Why Chandelier
- Who We Serve
- Contact
- Footer

Out of scope for v1:

- Admin portal
- Supabase lead storage
- Stripe flows
- Multi-page routing
- Blog, portfolio CMS, or proposal generation

## Messaging

Primary headline:

> We illuminate what's possible for your business.

Support copy:

> Chandelier brings Fortune-500 technology to the businesses on your block: custom builds, agentic AI, and operations systems engineered to make you shine.

Core services:

- Custom Website Builds
- Agentic AI Deployment
- Ordering & Operations

## Visual Direction

- Premium dark interface with gold as the primary brand accent.
- Avoid a heavy purple theme.
- Use restrained teal/copper atmospheric accents only as secondary depth.
- Keep page sections clean and full-width.
- Keep cards tight, sharp, and utilitarian with an 8px radius.
- Logo should read as Chandelier Consulting first, not as a generic decorative mark.

## Interaction Requirements

- Hero can use subtle parallax on desktop.
- Services can use a short sticky scroll reveal on desktop.
- Client cards can scroll horizontally on desktop through page scroll.
- Tablet and mobile must fall back to normal stacked or swipeable content.
- Respect reduced-motion preferences by removing scroll transforms and progress bars.
- No section should trap the user in an overlong scroll animation.

## Responsive Requirements

- Navigation collapses to a drawer below tablet width.
- Hero content and chandelier visual stack cleanly on tablet/mobile.
- Buttons must not squeeze text on small screens.
- Service cards and stats must stack without overflow.
- Client cards must be swipeable on smaller screens.
- Contact form becomes one column on mobile.

## Metadata

Production metadata must identify:

- Site title: Chandelier Consulting | Websites, AI, and Operations Systems
- Description: custom websites, agentic AI, and ordering and operations systems for growing brick-and-mortar businesses
- Canonical URL: https://chandelierconsulting.dev/
- Publisher: Perceo Inc.
- Open Graph and Twitter summary metadata for the public brand

## Technical Stack

- Next.js 16.2.9
- React 19.2.4
- TypeScript
- Tailwind CSS 4
- Framer Motion

## Verification Before Publishing

Before publishing or committing launch work:

- Run lint.
- Run production build.
- Review metadata and footer branding.
- Smoke-test desktop and mobile responsive layout.
- Confirm no unintentional unrelated files are included in the commit.
