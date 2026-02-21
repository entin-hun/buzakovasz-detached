import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current Friday date (or most recent Friday)
    const now = new Date();
    const day = now.getUTCDay();
    const diff = (day >= 5) ? (day - 5) : (day + 2);
    const friday = new Date(now);
    friday.setUTCDate(friday.getUTCDate() - diff);
    const fridayStr = friday.toISOString().split("T")[0];

    // Get all active commitments
    const { data: commitments, error: fetchError } = await supabase
      .from("rescue_commitments")
      .select("*")
      .eq("aktiv", true);

    if (fetchError) throw fetchError;

    const toArchive = (commitments ?? []).filter((c: any) => {
      if (c.tipus === "allandó") return true;
      // Egyszeri: archive if datum <= fridayStr
      return c.datum && c.datum <= fridayStr;
    });

    // Insert into rescue_history
    if (toArchive.length > 0) {
      const historyEntries = toArchive.map((c: any) => ({
        user_id: c.user_id,
        store_id: c.store_id,
        het_datuma: fridayStr,
        tipus: c.tipus,
        megmentett_kg: null,
        image_url: null,
      }));

      // Check for duplicates first
      const { data: existing } = await supabase
        .from("rescue_history")
        .select("user_id, store_id, het_datuma")
        .eq("het_datuma", fridayStr);

      const existingSet = new Set(
        (existing ?? []).map((e: any) => `${e.user_id}-${e.store_id}`)
      );

      const newEntries = historyEntries.filter(
        (e: any) => !existingSet.has(`${e.user_id}-${e.store_id}`)
      );

      if (newEntries.length > 0) {
        const { error: insertError } = await supabase
          .from("rescue_history")
          .insert(newEntries);
        if (insertError) throw insertError;
      }
    }

    // Deactivate egyszeri commitments that are past
    const idsToDeactivate = toArchive
      .filter((c: any) => c.tipus === "egyszeri")
      .map((c: any) => c.id);

    if (idsToDeactivate.length > 0) {
      const { error: updateError } = await supabase
        .from("rescue_commitments")
        .update({ aktiv: false })
        .in("id", idsToDeactivate);
      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        archived: toArchive.length,
        deactivated: idsToDeactivate.length,
        friday: fridayStr,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
