# meowdoku.fun

Auto-generated SEO landing page for keyword: **meowdoku**

## Deploy (run from your own machine, where `gh` and `vercel` are authenticated)

```bash
git init
git add .
git commit -m "Initial site for meowdoku"
gh repo create "meowdoku.fun" --public --source=. --remote=origin --push
vercel --prod --yes
vercel domains add "meowdoku.fun"
```

## Before going live

- Replace the placeholder block in `index.html` (`id="game"`) with the real game embed/iframe.
- Point your domain's DNS to Vercel (Vercel will show the exact records after `vercel domains add`).
