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
    const { type, trainerName, clientName, clientEmail, trainerId, appUrl } = await req.json();
    console.log("notify-workout called with:", { type, trainerName, clientName, clientEmail, trainerId });

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
      if (!trainerId) {
        return new Response(
          JSON.stringify({ error: "trainerId mancante" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(trainerId);
      if (userError || !userData?.user?.email) {
        console.error("Could not find trainer email:", userError);
        return new Response(
          JSON.stringify({ error: "Email trainer non trovata" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      toEmail = userData.user.email;
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
    } else if (type === "client_added") {
      // Confirmation email when a PT adds an already-registered client
      toEmail = clientEmail;
      subject = "GymApp - Sei stato aggiunto come cliente!";
      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6;">GymApp</h1>
            </div>
            <p>Ciao <strong>${clientName}</strong>,</p>
            <p>il Personal Trainer <strong>${trainerName}</strong> ti ha aggiunto come cliente su GymApp! Da ora potrà creare schede personalizzate per te e monitorare i tuoi progressi 🎯</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">Il team GymApp</p>
          </body>
        </html>
      `;
    } else if (type === "invite_client") {
      // Invite email for non-registered user
      toEmail = clientEmail;
      subject = "GymApp - Sei stato invitato!";
      const link = appUrl || "https://gymapp.app";
      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6;">GymApp</h1>
            </div>
            <p>Ciao!</p>
            <p>Il tuo Personal Trainer <strong>${trainerName}</strong> ti ha invitato a usare <strong>GymApp</strong>. Cosa aspetti? Registrati ora! 💪</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}/auth" style="background-color: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Registrati su GymApp</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">Il team GymApp</p>
          </body>
        </html>
      `;
    } else if (type === "invite_gym_member") {
      // Invite email for gym-invited PT or user
      toEmail = clientEmail;
      const roleName = clientName || "membro"; // reusing clientName for role description
      subject = "GymApp - Sei stato invitato dalla tua palestra!";
      const link = appUrl || "https://gymapp.app";
      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6;">GymApp</h1>
            </div>
            <p>Ciao!</p>
            <p>La tua palestra <strong>${trainerName}</strong> ti ha invitato a usare <strong>GymApp</strong>. Cosa aspetti? Registrati ora! 🏋️</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}/auth" style="background-color: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Registrati su GymApp</a>
            </div>
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

    console.log("Sending email to:", toEmail);

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
