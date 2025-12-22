import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  // ✅ CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { recipientEmail, senderName, senderEmail, message, invitationId } = await req.json();

    if (!recipientEmail || !senderName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    const acceptLink = `https://movee.one/app?action=accept_invitation&id=${invitationId}`;

    const { data, error } = await resend.emails.send({
      from: "MOVEE <noreply@movee.one>",
      to: recipientEmail,
      subject: `${senderName} invited you to join their MOVEE team!`,
      html: `<div style="max-width:600px;margin:0 auto;padding:40px 20px;font-family:sans-serif"><h1 style="color:#3b82f6;font-size:32px;text-align:center">MOVEE</h1><div style="background:white;border-radius:16px;padding:40px;margin-top:20px"><h2>You have been invited! 🎯</h2><p><strong>${senderName}</strong> wants you to join their MOVEE team!</p>${message ? `<p style="background:#f3f4f6;padding:16px;border-left:4px solid #3b82f6"><em>"${message}"</em></p>` : ""}<div style="text-align:center;margin:32px 0"><a href="${acceptLink}" style="background:#3b82f6;color:white;padding:16px 40px;text-decoration:none;border-radius:12px;display:inline-block;font-weight:bold">Accept Invitation</a></div><p style="color:#6b7280;font-size:12px;text-align:center">Or copy this link: ${acceptLink}</p></div></div>`,
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
      JSON.stringify({ error: "Internal error" }), 
      { status: 500, headers: corsHeaders }
    );
  }
});
