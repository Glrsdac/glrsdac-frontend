#!/usr/bin/env node

const supabaseUrl = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzkyMzI2MiwiZXhwIjoxODc1NjAwMjYyfQ.WOxxN22x89TvKzP6-IrX1oOI3Vc0yxXfmH7aPwD-_Ig";

const testEmail = "yeboahstanley754@gmail.com";

const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .button-container { text-align: center; margin: 30px 0; }
      .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
      .footer { color: #666; font-size: 12px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎉 Test Email from GLRSDAC</h1>
      </div>
      <div class="content">
        <h2>Hello!</h2>
        <p>This is a test email from your GLRSDAC Member Management System.</p>
        <p>If you're seeing this, it means:</p>
        <ul>
          <li>✅ SendGrid integration is working</li>
          <li>✅ Email delivery is functional</li>
          <li>✅ HTML templates are rendering correctly</li>
        </ul>
        <div class="button-container">
          <a href="http://localhost:5173" class="button">Visit GLRSDAC</a>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This is an automated test message sent at ${new Date().toLocaleString()}.
        </p>
      </div>
      <div class="footer">
        <p>&copy; 2026 GLRSDAC. All rights reserved.</p>
        <p>This is a test email from your member management system.</p>
      </div>
    </div>
  </body>
</html>
`;

async function testSendEmail() {
  console.log("=== Testing SendGrid Email Integration ===\n");
  console.log(`Sending test email to: ${testEmail}\n`);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: testEmail,
        subject: "Test Email from GLRSDAC - SendGrid Integration",
        html: htmlContent,
        text: "This is a test email from GLRSDAC. If you're seeing this, SendGrid integration is working!",
      }),
    });

    const result = await response.json();

    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body:`, JSON.stringify(result, null, 2));

    if (response.ok || response.status === 202) {
      console.log("\n✅ Email sent successfully!");
      console.log("Check the inbox at yeboahstanley754@gmail.com");
      console.log("Note: It may take a few seconds to arrive, check spam folder if needed.");
    } else {
      console.log("\n❌ Email sending failed");
      console.log("Check:");
      console.log("1. SENDGRID_API_KEY is set correctly in Supabase secrets");
      console.log("2. SENDGRID_FROM_EMAIL is verified in SendGrid");
      console.log("3. SendGrid account is active and not suspended");
    }
  } catch (error) {
    console.error("\n❌ Error sending email:", error.message);
  }
}

testSendEmail();
