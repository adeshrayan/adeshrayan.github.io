# Pulling the Instagram assets

Instagram is client-rendered and login-gated, so there is no clean HTTP fetch.
The working route is the logged-in browser session.

Chrome blocks a page from issuing many automatic downloads. Before a bulk run,
allow it once:

1. Open any instagram.com post.
2. Click the icon at the right of the address bar (it appears after a blocked
   download) → **Allow** automatic downloads for instagram.com.
   Or: Settings → Privacy and security → Site settings → Additional permissions
   → Automatic downloads → Allow for `https://www.instagram.com`.

Then, for each post, run this in the page console (or via the agent):

```js
const code = location.pathname.split('/').filter(Boolean).pop();
let best = null;
document.querySelectorAll('img').forEach(i => {
  if (!best || i.naturalWidth > best.naturalWidth) best = i;
});
const blob = await fetch(best.src).then(r => r.blob());
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `ig_${code}.jpg`;
document.body.appendChild(a); a.click(); a.remove();
```

Carousels only expose the visible slide — click through to capture the rest.

Finally move them into place:

```sh
mv ~/Downloads/ig_*.jpg ~/portfolio/assets/img/
```

Filenames must match the `images` array in `src/content.js`.
