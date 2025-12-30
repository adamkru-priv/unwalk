import { Resend } from "npm:resend@4.0.0";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY environment variable" }), 
        { status: 500, headers: corsHeaders }
      );
    }
    
    const resend = new Resend(resendApiKey);

    const { recipientEmail, senderName, challengeTitle, invitationId } = await req.json();

    if (!recipientEmail || !senderName || !challengeTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    const acceptLink = `movee://accept_team_challenge?id=${invitationId}`;
    const webFallback = `https://movee.one/app?action=accept_team_challenge&id=${invitationId}`;

    const { data, error } = await resend.emails.send({
      from: "MOVEE <noreply@mail.movee.one>",
      to: recipientEmail,
      subject: `${senderName} invited you to a Team Challenge!`,
      html: `<div style="max-width:600px;margin:0 auto;padding:40px 20px;font-family:sans-serif">
        <h1 style="color:#3b82f6;font-size:32px;text-align:center">MOVEE</h1>
        <div style="background:white;border-radius:16px;padding:40px;margin-top:20px">
          <h2>👥 Team Challenge Invitation! 🎯</h2>
          <p><strong>${senderName}</strong> invited you to join their team challenge:</p>
          <div style="background:#f3f4f6;padding:20px;border-radius:12px;margin:20px 0;text-align:center">
            <h3 style="color:#3b82f6;margin:0;font-size:24px">${challengeTitle}</h3>
          </div>
          <p>Walk together with your team and complete the challenge to earn rewards!</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${acceptLink}" style="background:linear-gradient(135deg, #f97316 0%, #ec4899 100%);color:white;padding:16px 40px;text-decoration:none;border-radius:12px;display:inline-block;font-weight:bold;font-size:16px">Accept Invitation</a>
          </div>
          <p style="color:#6b7280;font-size:12px;text-align:center">Open in app: ${acceptLink}</p>
          <p style="color:#6b7280;font-size:12px;text-align:center">Or use web: ${webFallback}</p>
        </div>
      </div>`,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: error }), 
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }), 
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(error) }), 
      { status: 500, headers: corsHeaders }
    );
  }
});
