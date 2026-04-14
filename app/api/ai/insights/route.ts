import { NextResponse } from 'next/server';


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fundBalance = 0,
      approvedCount = 0,
      pendingCount = 0,
      totals = 0,
      month = '',
      year = '',
    } = body || {};

    const fb = Number(fundBalance) || 0;
    const ap = Number(approvedCount) || 0;
    const pd = Number(pendingCount) || 0;
    const tot = Number(totals) || 0;

    const insights = [
      `The fund balance is healthy at ৳${fb.toLocaleString()}.`,
      `${ap} members are approved, while ${pd} are still pending approval.`,
      `The total contributions for ${month}/${year} amount to ৳${tot.toLocaleString()}.`,
    ];

    return NextResponse.json({ insights });
  } catch (err) {
    // Ensure we return JSON on error so the client can parse it
    // also log server-side for debugging
    // @ts-ignore
    console.error('Error in /api/ai/insights:', err);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}