import crypto from "crypto"

export async function sendWhatsAppText(phone: string, text: string) {
  const normalize = (input: string) => {
    let p = input.replace(/[\s+\-]/g, "")
    if (p.startsWith("+")) p = p.slice(1)
    if (p.startsWith("0")) p = `880${p.slice(1)}`
    return p
  }

  const PHONE_ID = process.env.WHATSAPP_PHONE_ID
  const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
  if (!PHONE_ID || !TOKEN) throw new Error("Missing WhatsApp env vars")

  const to = normalize(phone)
  const url = `https://graph.facebook.com/v23.0/${PHONE_ID}/messages`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: any = new Error("Meta error")
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

export async function sendReceiptEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
  if (!apiKey) throw new Error("Missing RESEND_API_KEY")

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: any = new Error("Resend error")
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

export function generateCloudinarySignature() {
  const timestamp = Math.floor(Date.now() / 1000)
  const secret = process.env.CLOUDINARY_API_SECRET || ""
  const paramsToSign = `timestamp=${timestamp}`
  const signature = crypto.createHash("sha1").update(paramsToSign + secret).digest("hex")
  return {
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  }
}

export async function callOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("Missing OPENAI_API_KEY")

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini", input: prompt }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: any = new Error("OpenAI error")
    err.payload = data
    throw err
  }

  if (typeof data.output === "string") return data.output
  if (Array.isArray(data.output)) return data.output.map((o: any) => (o?.content || []).map((c: any) => c.text || "").join("")).join("\n")
  if (data.output_text) return data.output_text
  return ""
}

export async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("Missing GEMINI_API_KEY")

  const url = `https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: { text: prompt } }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: any = new Error("Gemini error")
    err.payload = data
    throw err
  }
  if (data?.candidates && Array.isArray(data.candidates)) return data.candidates.map((c: any) => c.output || c.content || "").join("\n")
  if (data?.output) return data.output
  return ""
}
