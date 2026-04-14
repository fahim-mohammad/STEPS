import { NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"

export async function POST() {
  const timestamp = Math.floor(Date.now() / 1000)
  const secret = process.env.CLOUDINARY_API_SECRET || ""

  // Cloudinary signature is sha1 of the string "timestamp=TIMESTAMP" + API_SECRET
  const paramsToSign = `timestamp=${timestamp}`
  const signature = crypto.createHash("sha1").update(paramsToSign + secret).digest("hex")

  return NextResponse.json({
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  })
}