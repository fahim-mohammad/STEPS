
# STEPS — Final Setup (v9)

1) Copy .env.local.example to .env.local:
   cp .env.local.example .env.local

2) Paste your real keys ONLY into .env.local.

3) Run:
   pnpm install
   pnpm dev

Routes that are already wired:
- /api/ai            -> Gemini + OpenAI
- /api/email         -> Resend
- /api/cloudinary/sign -> Cloudinary signed uploads

Supabase clients are in:
- lib/supabase-browser.ts
- lib/supabase-admin.ts

Do NOT commit .env.local.
