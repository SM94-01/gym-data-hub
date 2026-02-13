import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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
    const { type, trainerName, clientName, clientEmail, trainerEmail, workoutName, exercises } = await req.json();

    if (!type || (!clientEmail && !trainerEmail)) {
      return new Response(
        JSON.stringify({ error: "Parametri mancanti" }),
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
      // PT created a workout for client
      toEmail = clientEmail;
      subject = "GymApp - Nuova scheda di allenamento!";
      
      const exerciseList = exercises && exercises.length > 0
        ? exercises.map((ex: string) => `<li style="padding: 4px 0;">${ex}</li>`).join("")
        : "";

      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6;">GymApp</h1>
            </div>
            <p>Ciao <strong>${clientName}</strong>,</p>
            <p>Il tuo Personal Trainer <strong>${trainerName}</strong> ti ha creato una nuova scheda di allenamento!</p>
            <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="color: white; font-size: 20px; font-weight: bold; margin: 0 0 10px 0;">📋 ${workoutName}</p>
              ${exerciseList ? `<ul style="color: white; margin: 0; padding-left: 20px;">${exerciseList}</ul>` : ""}
            </div>
            <p>Apri l'app per visualizzare la scheda e iniziare ad allenarti! 💪</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">A presto,<br>Il team GymApp</p>
          </body>
        </html>
      `;
    } else if (type === "workout_completed") {
      // Client completed a workout, notify PT
      toEmail = trainerEmail;
      subject = `GymApp - ${clientName} ha completato l'allenamento!`;
      
      const exerciseSummary = exercises && exercises.length > 0
        ? exercises.map((ex: string) => `<li style="padding: 4px 0;">${ex}</li>`).join("")
        : "";

      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6;">GymApp</h1>
            </div>
            <p>Ciao <strong>${trainerName}</strong>,</p>
            <p>Il tuo cliente <strong>${clientName}</strong> ha appena completato un allenamento!</p>
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="color: white; font-size: 20px; font-weight: bold; margin: 0 0 10px 0;">✅ ${workoutName}</p>
              ${exerciseSummary ? `<ul style="color: white; margin: 0; padding-left: 20px;">${exerciseSummary}</ul>` : ""}
            </div>
            <p>Accedi alla dashboard per vedere i dettagli della sessione.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">A presto,<br>Il team GymApp</p>
          </body>
        </html>
      `;
    } else {
      return new Response(
        JSON.stringify({ error: "Tipo notifica non valido" }),
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
