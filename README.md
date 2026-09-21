# Yuvraj's Anatomy Explorer

HOSA practice site: a 3D anatomy viewer with layer toggles, system highlights, hover cards, and a searchable parts list.

## Deploy on Vercel

1. Open [vercel.com/new](https://vercel.com/new) and import this GitHub repository.
2. Leave **Framework Preset** as Other (no build command).
3. Set **Output Directory** to `.` or leave it blank.
4. Deploy.

The site is static HTML, CSS, and JavaScript. Three.js is loaded from a CDN.

## Local preview

Serve the project folder over HTTP (opening `index.html` as a file will not load the 3D model):

```bash
npx --yes serve .
```

Then open the URL it prints, usually `http://localhost:3000`.

Anatomy models are from [Z-Anatomy](https://github.com/LluisV/Z-Anatomy) / BodyParts3D, CC BY-SA 4.0.
