import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get all allowed_emails where notes is NOT 'omaggio'
    const { data: emails, error: emailsError } = await adminClient
      .from("allowed_emails")
      .select("*");

    if (emailsError || !emails) {
      return new Response(JSON.stringify({ error: "Errore nel recupero utenti" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for names
    const { data: profiles } = await adminClient.from("profiles").select("id, name");
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!gmailAppPassword) {
      return new Response(JSON.stringify({ error: "Configurazione email mancante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPassword = gmailAppPassword.replace(/\s+/g, "");
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    let sentCount = 0;

    for (const entry of emails) {
      // Skip omaggio accounts
      if (entry.notes?.includes("omaggio")) continue;

      // Calculate expiry (created_at + 1 year)
      const expiry = new Date(entry.created_at);
      expiry.setFullYear(expiry.getFullYear() + 1);

      // Check if expiry is within 1 month from now but not yet expired
      if (expiry > now && expiry <= oneMonthFromNow) {
        // Find user name
        const authUser = authUsers?.users?.find(
          (u) => u.email?.toLowerCase() === entry.email.toLowerCase()
        );
        let userName = "Utente";
        if (authUser) {
          const profile = profiles?.find((p) => p.id === authUser.id);
          userName = profile?.name || authUser.user_metadata?.name || "Utente";
        }

        const expiryFormatted = expiry.toLocaleDateString("it-IT");

        const htmlContent = `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #8b5cf6;">GymApp</h1>
              </div>
              <p>Ciao <strong>${userName}</strong>,</p>
              <p>il tuo abbonamento scadrà tra un mese esatto, in data <strong>${expiryFormatted}</strong>.</p>
              <p>Ricordati di rinnovare per continuare a utilizzare tutte le funzionalità di GymApp!</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #888; font-size: 12px; text-align: center;">A presto,<br>Il team GymApp</p>
            </body>
          </html>
        `;

        try {
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
            to: entry.email,
            subject: "GymApp - Il tuo abbonamento scade tra un mese",
            html: htmlContent,
          });

          await client.close();
          sentCount++;
          console.log(`Reminder sent to ${entry.email}`);
        } catch (sendErr) {
          console.error(`Failed to send to ${entry.email}:`, sendErr.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Subscription reminder error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
