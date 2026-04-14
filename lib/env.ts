export const env = {
  // WhatsApp (Meta Cloud API)
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID!,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN!,

  // AI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,

  // Email (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY!,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL!,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
}