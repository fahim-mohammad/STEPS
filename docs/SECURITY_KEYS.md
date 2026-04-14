# Security: rotate leaked keys

If you ever paste keys into chat or share them publicly, rotate them immediately:
- Supabase service_role key (high risk)
- OpenAI key
- Gemini key
- Resend key
- Cloudinary secret

Keep only NEXT_PUBLIC_* on the client. All other secrets must stay server-only.
