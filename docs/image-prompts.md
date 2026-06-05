# Boss Up Bootcamp Image Prompt Library

Use these when FAL/OpenAI image generation is enabled. The site direction is: clean but real hip-hop, black/white/yellow poster energy, abstract art, AI creator lab, bright purple/blue/green/pink accents.

## Global style anchor

Append this to most prompts:

```text
Style: gritty but polished hip-hop event flyer, black charcoal base, torn white paper, bold yellow paint strokes, electric purple blue green and magenta accents, spray paint texture, halftone dots, abstract collage, high contrast, clean website-ready composition, no readable text, no fake logos, no watermarks.
```

## 1. Homepage Hero Background

```text
Create a cinematic website hero background for Boss Up Bootcamp, an AI entrepreneurship and digital creation workshop. Abstract hip-hop creator studio with laptop, microphone silhouette, design tablet, music waveform, website wireframes, app icons, money/business symbolism, paint splashes, torn paper edges. Black charcoal base, white paper layers, bold yellow paint strokes, neon purple blue green and magenta accents. Premium but gritty, clean enough for a landing page, no readable text, no logos, no watermark.
```

Suggested use:

```text
app/assets/generated/hero-boss-up.jpg
```

## 2. AI Creator Lab Visual

```text
A diverse AI creator workspace collage: laptop glowing with abstract AI interface, headphones, microphone, sketchbook, camera, phone showing social content, website mockup cards floating around. Urban hip-hop energy, black and yellow palette with purple blue green magenta highlights, torn-paper poster texture, dramatic studio lighting, no readable text, no logos, no watermark.
```

Suggested use:

```text
app/assets/generated/creator-lab.jpg
```

## 3. Bootcamp Poster / Flyer Background

```text
A bold event flyer background for an AI entrepreneurship bootcamp. Abstract graffiti brush strokes, torn white paper, black ink texture, yellow warning-tape accents, purple and blue digital glow, green money/level-up accents, magenta music/video accents. Leave empty negative space for typography. No readable text, no logos, no watermark.
```

Suggested use:

```text
app/assets/generated/bootcamp-poster-bg.jpg
```

## 4. Music Project Cover Placeholder

```text
Square album cover art for an inspirational hip-hop AI music project by DJ Just Pray. Cinematic spiritual energy, sunrise glow, microphone, city silhouette, abstract soundwaves, black white gold base with purple and blue accents. Modern cover art, no readable text, no logos, no watermark.
```

Suggested use:

```text
app/assets/music/dj-just-pray-cover.jpg
```

## 5. Graphic Design Gallery Thumbnail

```text
A gallery thumbnail collage showing event flyers, business ads, restaurant promotions, and social media graphics spread across a table. Hip-hop poster energy, black/yellow/white base, neon purple blue green pink accents, clean presentation, no readable text, no brand logos, no watermark.
```

Suggested use:

```text
app/assets/graphics/design-gallery-thumb.jpg
```

## 6. Video Project Thumbnail

```text
A dynamic AI-generated video production thumbnail: camera frame, motion streaks, animated flyer panels, music video lighting, promotional commercial energy. Black/yellow urban poster style with purple blue green magenta highlights, clean landing-page thumbnail, no readable text, no logos, no watermark.
```

Suggested use:

```text
app/assets/videos/video-project-thumb.jpg
```

## 7. Website/App Showcase Mockup

```text
A sleek website and app showcase mockup floating in a hip-hop creative studio. Multiple browser windows and phone screens, abstract UI blocks only, black and white layout, yellow highlights, purple/blue/green neon glows, torn paper and spray texture around edges. No readable text, no logos, no watermark.
```

Suggested use:

```text
app/assets/screenshots/web-app-showcase.jpg
```

## 8. Future Student Projects Visual

```text
A hopeful creative classroom/workshop scene represented as abstract silhouettes around laptops and phones, building music, graphics, videos, websites and businesses with AI. Hip-hop entrepreneurship energy, uplifting, black/yellow/white base with bright purple blue green pink accents, no readable text, no logos, no watermark.
```

Suggested use:

```text
app/assets/generated/student-projects.jpg
```

## Negative prompt ideas

```text
blurry, low quality, misspelled words, readable fake text, fake logos, watermark, corporate stock photo, sterile SaaS design, plain white office, boring classroom, photorealistic faces with artifacts, extra fingers, distorted hands
```

## Site asset replacement plan

1. Generate hero image first.
2. Replace `app/assets/hero-abstract.svg` or use the generated JPG as the hero image.
3. Generate category thumbnails for Music, Graphics, Videos, Websites/Apps, Students.
4. Add real Jonti project assets as they become available.
5. Keep SVG texture/sticker assets as backup and decorative overlays.
