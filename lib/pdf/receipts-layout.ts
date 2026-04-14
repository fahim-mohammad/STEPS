// ============================================================
// RECEIPT LAYOUT
// Edit the numbers here to move elements on the PDF receipt.
//
// The receipt template image is 1276 x 626 pixels (landscape).
// All X/Y values are in those template pixel units.
//   X: 0 = left edge, 1276 = right edge
//   Y: 0 = top edge,  626  = bottom edge
//
// The PDF engine scales these to A4 landscape automatically.
// ============================================================

export type ReceiptLayout = {
  // Receipt number (top-right box)
  receiptNo: { x: number; y: number; fontSize: number }

  // "Received From" name
  memberName: { x: number; y: number; fontSize: number }

  // Date field
  date: { x: number; y: number; fontSize: number }

  // Total amount (bold)
  amount: { x: number; y: number; fontSize: number }

  // Payment method radio circles
  // Each bank option: cx = circle center-x, cy = circle center-y
  bankCircles: Array<{ key: string; cx: number; cy: number }>
  bkashCircles: Array<{ num: string; cx: number; cy: number }>
  cashCircle: { cx: number; cy: number }

  // Month radio circles
  monthCircles: Array<{ m: string; cx: number; cy: number }>

  // QR code box
  qr: { x: number; y: number; w: number; h: number }

  // Verification code text (below QR)
  verifyCode: { x: number; y: number; fontSize: number }
}

export const RECEIPT_LAYOUT: ReceiptLayout = {
  // ── Top header ────────────────────────────────
  receiptNo: { x: 1045, y: 80, fontSize: 14 },

  // ── Received From line ────────────────────────
  memberName: { x: 300, y: 200, fontSize: 14 },
  date:       { x: 900, y: 200, fontSize: 14 },

  // ── Amount line ───────────────────────────────
  amount: { x: 320, y: 250, fontSize: 16 },

  // ── Payment method circles ────────────────────
  // Bank options (left column). key must match normalize(bank_name)
  bankCircles: [
    { key: 'islami', cx: 100, cy: 405 },
    { key: 'prime',  cx: 100, cy: 410 },
    { key: 'ific',   cx: 100, cy: 420 },
    { key: 'nrbc',   cx: 100, cy: 430 },
    { key: 'asia',   cx: 100, cy: 440 },
  ],

  // BKash options (right column). num = bkash number to match
  bkashCircles: [
    { num: '01947458916', cx: 265, cy: 410 },
    { num: '01888616923', cx: 265, cy: 420 },
    { num: '01690098083', cx: 265, cy: 430 },
  ],

  // Cash circle
  cashCircle: { cx: 265, cy: 550 },

  // ── Month circles ─────────────────────────────
  // m = 3-letter month abbreviation (Jan, Feb, etc.)
  monthCircles: [
    { m: 'Jan', cx: 510, cy: 400 },
    { m: 'Feb', cx: 510, cy: 410 },
    { m: 'Mar', cx: 510, cy: 420 },
    { m: 'Apr', cx: 510, cy: 430 },
    { m: 'May', cx: 510, cy: 440 },
    { m: 'Jun', cx: 510, cy: 450 },
    { m: 'Jul', cx: 620, cy: 400 },
    { m: 'Aug', cx: 620, cy: 410 },
    { m: 'Sep', cx: 620, cy: 420 },
    { m: 'Oct', cx: 620, cy: 430 },
    { m: 'Nov', cx: 620, cy: 440 },
    { m: 'Dec', cx: 620, cy: 450 },
  ],

  // ── QR code ───────────────────────────────────
  qr: { x: 750, y: 430, w: 160, h: 100 },

  // ── Verification code text ────────────────────
  verifyCode: { x: 740, y: 610, fontSize: 9 },
}