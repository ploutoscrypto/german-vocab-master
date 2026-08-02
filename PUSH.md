# Push & deploy in under a minute

This folder is already a **git repository with a commit ready to go**. You only
need to point it at a GitHub repo and push — the included GitHub Actions
workflow does the rest (install → typecheck → test → build → publish).

## 1. Create an empty repo on GitHub

Go to <https://github.com/new>:

- **Name:** `german-vocab-master`
- **Visibility:** Private ✅
- **Do NOT** tick "Add a README", ".gitignore" or "license" — the repo must be
  empty or the first push will be rejected.

## 2. Push

In this folder, run (replace `YOUR-USERNAME`):

```bash
git remote add origin https://github.com/YOUR-USERNAME/german-vocab-master.git
git push -u origin main
```

If you use SSH instead:

```bash
git remote add origin git@github.com:YOUR-USERNAME/german-vocab-master.git
git push -u origin main
```

## 3. Turn on Pages

In the repo: **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.

That's the only click required. (Leave "Branch" alone — the workflow publishes
the build artifact directly.)

## 4. Get your URL

Open the **Actions** tab and watch the "Deploy PWA to GitHub Pages" run. When it
finishes, the live URL is printed in the deploy step and shown under
**Settings → Pages**:

```
https://YOUR-USERNAME.github.io/german-vocab-master/
```

## 5. Install it on your phone

Open that URL on your phone:

- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ menu → *Install app* / *Add to Home screen*

It then launches fullscreen with its own icon and works with **no internet** —
your vocabulary lives in IndexedDB on the device.

---

## Notes

- **Private repos support Pages** on current GitHub plans. If your account
  cannot publish Pages from a private repo, either flip the repo to public
  (the app stores no secrets) or deploy the `dist/` folder to Cloudflare Pages
  or Netlify instead — see the Deployment section of `README.md`.
- Every later `git push` to `main` redeploys automatically.
- To build locally instead: `npm install && npm run build`, then serve `dist/`
  over HTTPS (installability requires HTTPS).
