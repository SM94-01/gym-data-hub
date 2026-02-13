import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, trainerName, clientName, clientEmail, trainerEmail } = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Tipo mancante" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!gmailAppPassword) {
      console.error("GMAIL_APP_PASSWORD not configured");
      return new Response(
        JSON.stringify({ error: "Configurazione email mancante" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const cleanPassword = gmailAppPassword.replace(/\s+/g, "");

    let toEmail = "";
    let subject = "";
    let htmlContent = "";

    if (type === "workout_created") {
      toEmail = clientEmail;
      subject = "GymApp - Nuova scheda di allenamento!";
      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6;">GymApp</h1>
            </div>
            <p>Ciao <strong>${clientName}</strong>,</p>
            <p>il tuo Personal Trainer <strong>${trainerName}</strong> ha creato una nuova scheda per te! Vai a dare un'occhiata 💪</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">Il team GymApp</p>
          </body>
        </html>
      `;
    } else if (type === "workout_completed") {
      toEmail = trainerEmail;
      subject = `GymApp - ${clientName} ha completato un allenamento!`;
      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6;">GymApp</h1>
            </div>
            <p>Ciao <strong>${trainerName}</strong>,</p>
            <p>il tuo cliente <strong>${clientName}</strong> ha aggiunto un nuovo allenamento nel suo storico. Vai a dare un'occhiata ai progressi 📊</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">Il team GymApp</p>
          </body>
        </html>
      `;
    } else {
      return new Response(
        JSON.stringify({ error: "Tipo notifica non valido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!toEmail) {
      console.error("No recipient email for type:", type);
      return new Response(
        JSON.stringify({ error: "Email destinatario mancante" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: "my.gymapp26@gmail.com",
          password: cleanPassword,
        },
      },
    });

    await client.send({
      from: "GymApp <my.gymapp26@gmail.com>",
      to: toEmail,
      subject,
      html: htmlContent,
    });

    await client.close();

    console.log(`Notification email (${type}) sent to: ${toEmail}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-workout function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Errore invio notifica" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
