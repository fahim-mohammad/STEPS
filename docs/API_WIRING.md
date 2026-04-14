
# How your APIs will plug in

1) Put your API base in .env.local:
   NEXT_PUBLIC_API_URL=https://your-backend.com

2) All pages call it like:
   apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/path`, { method: "POST", body: JSON.stringify(data) })

3) Gemini key -> NEXT_PUBLIC_GEMINI_KEY
   OpenAI key -> NEXT_PUBLIC_OPENAI_KEY

Once you share your endpoints, I will map every page to them.
