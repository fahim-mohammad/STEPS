import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Password reset email with OTP

interface PasswordResetRequest {
  to: string
  username: string
  otp: string
  resetLink?: string
}

export async function POST(request: NextRequest) {
  try {
    const { to, username, otp, resetLink }: PasswordResetRequest = await request.json()

    if (!to || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    const htmlContent = generateResetHTML({ to, username, otp, resetLink })

    const emailApiKey = process.env.RESEND_API_KEY

    if (!emailApiKey) {
      // Test mode
      console.log('[PASSWORD RESET EMAIL TEST MODE]', {
        to,
        otp,
        timestamp: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: 'OTP email (test mode)',
        otp,
      })
    }

    // Production: call Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emailApiKey}`,
      },
      body: JSON.stringify({
        from: 'noreply@steps-fund.com',
        to,
        subject: 'STEPS Fund - Password Reset Request',
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Email service error' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, emailId: data.id })
  } catch (error) {
    console.error('Password reset email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateResetHTML(data: PasswordResetRequest): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
      .otp-box { background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #ffc107; }
      .otp-code { font-size: 32px; font-weight: bold; font-family: monospace; color: #d39e00; letter-spacing: 5px; }
      .section { margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 4px; }
      .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
      .warning { background: #f8d7da; padding: 12px; border-radius: 4px; color: #721c24; margin: 15px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>STEPS Fund</h1>
        <p>Password Reset Request</p>
      </div>

      <div class="section">
        <p>Hello ${data.username},</p>
        <p>We received a request to reset your password. Use the OTP below within 10 minutes:</p>
      </div>

      <div class="otp-box">
        <p style="margin: 0 0 10px 0; color: #666;">Your OTP Code</p>
        <div class="otp-code">${data.otp}</div>
      </div>

      <div class="section">
        <p>This OTP is valid for 10 minutes only. Never share it with anyone.</p>
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> If you did not request this email, please ignore it. Your account remains secure.
      </div>

      <div class="footer">
        <p>STEPS - Student Fund Management System<br>© ${new Date().getFullYear()}</p>
      </div>
    </div>
  </body>
</html>
  `
}
