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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, invitationType, appUrl } = await req.json();
    // invitationType: 'client' | 'gym_pt' | 'gym_user'

    if (!email || !invitationType) {
      return new Response(JSON.stringify({ error: "Email e tipo invito richiesti" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user is trying to invite themselves
    if (user.email?.toLowerCase() === normalizedEmail) {
      return new Response(JSON.stringify({ error: "Non puoi invitare te stesso" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get inviter's role and limits
    const { data: limits, error: limitsError } = await supabase.rpc('get_invite_limits', { _user_id: user.id });
    if (limitsError || !limits) {
      console.error("Error getting limits:", limitsError);
      return new Response(JSON.stringify({ error: "Errore nel recupero dei limiti" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate capacity
    if (invitationType === 'client') {
      if (limits.client_limit === 0) {
        return new Response(JSON.stringify({ error: "Il tuo piano non prevede inviti clienti" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (limits.client_used >= limits.client_limit) {
        return new Response(JSON.stringify({ error: `Hai raggiunto il limite di ${limits.client_limit} inviti clienti` }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else if (invitationType === 'gym_pt') {
      if (limits.pt_used >= limits.pt_limit) {
        return new Response(JSON.stringify({ error: `Hai raggiunto il limite di ${limits.pt_limit} Personal Trainer` }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else if (invitationType === 'gym_user') {
      if (limits.user_used >= limits.user_limit) {
        return new Response(JSON.stringify({ error: `Hai raggiunto il limite di ${limits.user_limit} utenti` }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Check if already invited
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('inviter_id', user.id)
      .eq('invitee_email', normalizedEmail)
      .eq('invitation_type', invitationType)
      .maybeSingle();

    if (existingInvite) {
      return new Response(JSON.stringify({ error: "Utente già invitato" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if already registered
    const { data: existingUserId } = await supabase.rpc('get_user_id_by_email', { _email: normalizedEmail });
    
    if (existingUserId) {
      // User is already registered - for PT client flow, just add to trainer_clients directly
      if (invitationType === 'client') {
        const { error: tcError } = await supabase
          .from('trainer_clients')
          .insert({ trainer_id: user.id, client_id: existingUserId, client_email: normalizedEmail });
        
        if (tcError) {
          if (tcError.code === '23505') {
            return new Response(JSON.stringify({ error: "Cliente già aggiunto" }), {
              status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          throw tcError;
        }
      } else if (invitationType === 'gym_pt' || invitationType === 'gym_user') {
        const { error: gmError } = await supabase
          .from('gym_members')
          .insert({ gym_id: user.id, member_id: existingUserId, member_email: normalizedEmail, member_role: invitationType === 'gym_pt' ? 'personal_trainer' : 'utente' });
        
        if (gmError) {
          if (gmError.code === '23505') {
            return new Response(JSON.stringify({ error: "Membro già aggiunto" }), {
              status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          throw gmError;
        }

        // If adding a PT from gym, also update their role in allowed_emails if needed
        if (invitationType === 'gym_pt') {
          const { data: currentRole } = await supabase
            .from('allowed_emails')
            .select('role')
            .eq('email', normalizedEmail)
            .maybeSingle();
          
          if (currentRole && currentRole.role === 'Utente') {
            await supabase
              .from('allowed_emails')
              .update({ role: 'Personal Trainer Starter' })
              .eq('email', normalizedEmail);
          }
        }
      }

      // Get client name for email
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', existingUserId)
        .maybeSingle();

      // Get inviter name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      // Send confirmation email
      await sendEmail(
        normalizedEmail,
        invitationType === 'client' 
          ? "GymApp - Sei stato aggiunto come cliente!"
          : "GymApp - Sei stato aggiunto alla palestra!",
        invitationType === 'client'
          ? `<p>Ciao <strong>${clientProfile?.name || 'Atleta'}</strong>,</p><p>il Personal Trainer <strong>${inviterProfile?.name || 'Il tuo PT'}</strong> ti ha aggiunto come cliente su GymApp! 🎯</p>`
          : `<p>Ciao <strong>${clientProfile?.name || 'Membro'}</strong>,</p><p>la palestra <strong>${inviterProfile?.name || 'La tua palestra'}</strong> ti ha aggiunto su GymApp! 🏋️</p>`
      );

      return new Response(JSON.stringify({ 
        success: true, 
        registered: true,
        clientName: clientProfile?.name || normalizedEmail
      }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // User NOT registered - add to allowed_emails and create invitation
    // Determine the role based on invitation type
    const newRole = invitationType === 'gym_pt' ? 'Personal Trainer Starter' : 'Utente';

    // Check if email is already in allowed_emails
    const { data: alreadyAllowed } = await supabase.rpc('is_email_allowed', { check_email: normalizedEmail });
    
    if (!alreadyAllowed) {
      const { error: insertError } = await supabase
        .from('allowed_emails')
        .insert({ email: normalizedEmail, role: newRole });
      
      if (insertError) {
        console.error("Error adding to allowed_emails:", insertError);
        throw insertError;
      }
    }

    // Create invitation record
    const { error: invError } = await supabase
      .from('invitations')
      .insert({ inviter_id: user.id, invitee_email: normalizedEmail, invitation_type: invitationType });
    
    if (invError) {
      console.error("Error creating invitation:", invError);
      throw invError;
    }

    // Get inviter name for email
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    const inviterName = inviterProfile?.name || 'Il tuo professionista';
    const link = appUrl || "https://gymapp.app";

    let emailSubject = "";
    let emailBody = "";

    if (invitationType === 'client') {
      emailSubject = "GymApp - Il tuo PT ti ha invitato!";
      emailBody = `<p>Ciao!</p><p>Il tuo Personal Trainer <strong>${inviterName}</strong> ti ha invitato a usare <strong>GymApp</strong>. Cosa aspetti? Registrati ora! 💪</p>`;
    } else if (invitationType === 'gym_pt') {
      emailSubject = "GymApp - Sei stato invitato come Personal Trainer!";
      emailBody = `<p>Ciao!</p><p>La palestra <strong>${inviterName}</strong> ti ha invitato come Personal Trainer su <strong>GymApp</strong>. Registrati per iniziare! 🏋️</p>`;
    } else {
      emailSubject = "GymApp - La tua palestra ti ha invitato!";
      emailBody = `<p>Ciao!</p><p>La palestra <strong>${inviterName}</strong> ti ha invitato a usare <strong>GymApp</strong>. Cosa aspetti? Registrati ora! 🏋️</p>`;
    }

    await sendEmail(
      normalizedEmail,
      emailSubject,
      `${emailBody}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}/auth" style="background-color: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Registrati su GymApp</a>
      </div>`
    );

    return new Response(JSON.stringify({ 
      success: true, 
      registered: false,
      message: "Invito inviato! L'utente riceverà un'email con il link per registrarsi."
    }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Errore nell'invio dell'invito" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

async function sendEmail(to: string, subject: string, bodyHtml: string) {
  const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!gmailAppPassword) {
    console.error("GMAIL_APP_PASSWORD not configured");
    return;
  }

  const cleanPassword = gmailAppPassword.replace(/\s+/g, "");

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

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8b5cf6;">GymApp</h1>
        </div>
        ${bodyHtml}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">Il team GymApp</p>
      </body>
    </html>
  `;

  await client.send({
    from: "GymApp <my.gymapp26@gmail.com>",
    to,
    subject,
    html,
  });

  await client.close();
  console.log(`Email sent to: ${to}`);
}
