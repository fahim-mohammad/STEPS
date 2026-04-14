import { NextResponse } from "next/server";


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { prompt, model } = await req.json();
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const useModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: useModel,
        input: prompt,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errText = typeof data === 'string' ? data : JSON.stringify(data)
      return NextResponse.json({ error: errText }, { status: res.status })
    }

    // Try to extract text safely across response shapes
    let text = "";
    try {
      if (typeof data?.output_text === "string") text = data.output_text;
      else if (Array.isArray(data?.output)) {
        const parts: string[] = [];
        for (const item of data.output) {
          if (Array.isArray(item?.content)) {
            for (const c of item.content) if (c?.type === "output_text") parts.push(c.text || "");
          }
        }
        text = parts.join("\n").trim();
      }
    } catch {}
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
