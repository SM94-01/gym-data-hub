import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email richiesta" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Errore durante la verifica dell'utente" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = users.users.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "Se l'email è registrata, riceverai una password provvisoria" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Update user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Errore durante l'aggiornamento della password" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configurazione email mancante" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const userName = user.user_metadata?.name || "Utente";

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8b5cf6;">GymApp</h1>
          </div>
          <p>Ciao <strong>${userName}</strong>,</p>
          <p>Hai richiesto il recupero della password per il tuo account GymApp.</p>
          <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">La tua password provvisoria è:</p>
            <p style="color: white; font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 2px;">${tempPassword}</p>
          </div>
          <p>Usa questa password per accedere all'app e poi cambiala nelle <strong>impostazioni del profilo</strong>.</p>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">Se non hai richiesto tu questo recupero, ignora questa email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">A presto,<br>Il team GymApp</p>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "GymApp <onboarding@resend.dev>",
      to: [normalizedEmail],
      subject: "GymApp - Password Provvisoria",
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Password provvisoria inviata alla tua email" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Errore durante il recupero password" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
