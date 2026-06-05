# Boss Up Bootcamp Design Direction

Source: attached Boss Up Bootcamp flyer.

## Visual Energy

The site should feel like a high-energy hip-hop entrepreneurship workshop: bold, gritty, creative, motivational, and street-polished. It should not feel like a clean corporate SaaS page. It should feel like a flyer, stage poster, mixtape campaign, and AI creator lab all merged together.

## Color Palette

Core colors:

- Black / charcoal background: gritty base, poster texture, high contrast.
- White: torn paper panels, brush lettering, high-impact copy.
- Yellow / gold: primary brand punch, CTA paint strokes, crown/wealth/energy accents.
- Purple: hip-hop creative glow, lower-card accents, digital/nightclub energy.
- Electric blue: AI/technology accents.
- Neon green: AI callouts and income/learning highlights.
- Hot pink/magenta: music/video/social creative accents.

Suggested CSS variables:

```css
--boss-black: #050505;
--boss-ink: #111111;
--boss-white: #ffffff;
--boss-paper: #f4f1e8;
--boss-yellow: #ffc400;
--boss-purple: #7c2cff;
--boss-blue: #00a3ff;
--boss-green: #7CFF00;
--boss-pink: #ff2bd6;
```

## Typography

Use aggressive mixed typography:

- Brush/graffiti-style display for hero words like “Boss Up” and “Bootcamp.”
- Bold condensed uppercase for section headers and feature labels.
- Clean readable sans-serif for body copy and registration details.
- Handwritten/marker accent text for motivational callouts like “Create it. Build it. Boss Up!”

Current skeleton can use web-safe fallbacks first, then add stronger fonts later:

- Display brush candidate: Permanent Marker, Bangers, Road Rage, or a custom brush SVG/PNG wordmark.
- Condensed label candidate: Oswald, Anton, Bebas Neue.
- Body: Inter or Montserrat.

## Layout Notes

The flyer uses stacked poster sections. Apply that to the website:

1. Big hero title with torn/paint underline.
2. Photo/creator-lab hero area on one side.
3. Paint badge for “Only 20 spots available.”
4. Torn paper explanation strip.
5. Icon row for learn/build/create/level up.
6. “Leave with your own” portfolio/project row.
7. Two-part experience panel.
8. Audience panel.
9. Investment / registration CTA panel.
10. Footer/contact strip.

## Texture + Shape Language

Use:

- torn paper edges
- paint strokes
- spray/grunge overlays
- rough borders
- sticker badges
- dashed QR placeholder boxes
- black cards with glowing neon accents
- yellow highlight bars
- purple paint swashes behind labels
- crown/lion/rocket/money/lightbulb/AI icons

Avoid:

- sterile white SaaS blocks
- too much rounded glassmorphism
- minimalist luxury look
- generic corporate gradients

## Website Application

Homepage should keep the flyer’s hierarchy but expand it into sections:

- Hero: black gritty background, huge brush title, yellow bootcamp emphasis, 20-seat badge, laptop/creator image placeholder.
- Learn icons: AI tools, build your brand, create income, level up your future.
- Portfolio: logo/visuals/music/website/game plan cards.
- Experience: orientation + live workshop day.
- Audience: entrepreneurs, artists, musicians, content creators, small business owners, side hustlers.
- Register: $25 deposit placeholder can be included if confirmed; otherwise keep “Join Waitlist” until pricing is final.
- Footer: H.I.P.H.O.P. Academy identity and contact slots.

## Implementation Priority

1. Push current skeleton to GitHub first.
2. Update the design from Framer-style black/blue to flyer-inspired black/yellow/white/neon hip-hop energy.
3. Add asset slots for real flyer, logos, graphics, audio, and videos.
4. Connect waitlist form.
