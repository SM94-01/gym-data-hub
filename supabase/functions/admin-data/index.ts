import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accesso negato" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, email, role, notes } = await req.json();

    if (action === "get_all_users") {
      const { data: emails } = await adminClient
        .from("allowed_emails")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: profiles } = await adminClient.from("profiles").select("id, name");
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

      const { data: workouts } = await adminClient
        .from("workouts")
        .select("user_id");

      const { data: progress } = await adminClient
        .from("workout_progress")
        .select("user_id, date");

      const activities = (authUsers?.users || []).map((au) => {
        const profile = profiles?.find((p) => p.id === au.id);
        const allowedEmail = emails?.find(
          (e) => e.email.toLowerCase() === au.email?.toLowerCase()
        );
        const userWorkouts = workouts?.filter((w) => w.user_id === au.id) || [];
        const userProgress = progress?.filter((p) => p.user_id === au.id) || [];
        const dates = userProgress.map((p) => p.date);
        const lastActivity = dates.length > 0 ? dates.sort().reverse()[0] : null;

        return {
          email: au.email || "",
          name: profile?.name || "Utente",
          role: allowedEmail?.role || "Utente",
          workouts_count: userWorkouts.length,
          sessions_count: new Set(dates.map((d) => new Date(d).toDateString())).size,
          last_activity: lastActivity,
          created_at: au.created_at,
        };
      });

      return new Response(
        JSON.stringify({ emails: emails || [], activities }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "add_user") {
      const insertData: Record<string, unknown> = { email: email.toLowerCase(), role };
      if (notes) insertData.notes = notes;

      const { error } = await adminClient
        .from("allowed_emails")
        .insert(insertData);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { error } = await adminClient
        .from("allowed_emails")
        .update({ role })
        .eq("email", email.toLowerCase());

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Azione non valida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
