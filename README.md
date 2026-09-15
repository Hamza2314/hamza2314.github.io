# portfolio-v2

Personal site for Hamza Masri. React 19 + Vite + GSAP + Lenis. No 3D library.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Two files you need to add

Drop these into `public/`:

| File | What it is |
|---|---|
| `face.jpg` | Portrait photo. The mesh is built from this. |
| `HamzaMasri_CV.pdf` | The CV the download button serves. |

Without `face.jpg` the mesh falls back to an abstract point sphere, so the site
still works. Nothing breaks.

### Getting a good face.jpg

The mesh samples dark pixels, so contrast is everything.

- Head and shoulders, centred, facing camera
- Strong directional light, one side clearly darker than the other
- Plain light background, or cut the background out and save as PNG
- Roughly square, 600px is plenty
- High contrast beats high resolution

If the result looks like noise, the photo is too flat. Raise the contrast in
any editor and try again. To tune it, see `SAMPLE_STEP`, `MAX_POINTS` and the
`weight < 0.28` threshold in `src/components/FaceMesh.tsx`.

## Deploying to GitHub Pages

1. Push to a repo's `main` branch
2. Settings → Pages → Source → **GitHub Actions** (not "deploy from a branch")
3. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push

`base` in `vite.config.ts` is `'/'`, which is correct for a user site at
`<username>.github.io`. If you deploy to a project repo instead, change it to
`'/repo-name/'`.

### Custom domain

Add a `public/CNAME` file containing just the domain, then point a CNAME DNS
record at `<username>.github.io`. HTTPS is issued automatically.

## Editing content

All copy lives in `src/data.ts`. Nothing else needs touching to change text,
projects, experience or skills.

## How the motion works

| Piece | Where | What it does |
|---|---|---|
| Face mesh | `components/FaceMesh.tsx` | Point cloud from the photo, z-depth from luminance. Scroll rotates it toward the viewer and pulls scattered points back in. Mouse adds parallax. |
| Magnetic button | `components/Magnetic.tsx` | CV button follows the cursor, springs back on leave. |
| Name reveal | `App.tsx` + `.word-inner` | Words rise from a clipped mask, staggered, once on load. |
| Section reveals | `App.tsx` | GSAP ScrollTrigger, fade and rise at 88% viewport. |
| Smooth scroll | Lenis | Weighted native scrolling. The scrollbar is never hijacked. |

`prefers-reduced-motion` disables Lenis, the mesh's mouse tracking, the word
reveal and all scroll animation. Device pixel ratio is capped at 1.5. The
canvas is `pointer-events: none` and `aria-hidden`.

## Stack

react 19.3.0 · gsap 3.15.0 · lenis 1.3.26 · vite 7.3.6 · typescript 5.9

Build output is about 125 kB gzipped.
