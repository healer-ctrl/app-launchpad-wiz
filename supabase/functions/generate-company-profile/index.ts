import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");

    // Return cached profile if exists
    const { data: existing } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ profile: existing, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .single();
    if (cErr || !company) throw new Error("Company not found");

    const prompt = `Generate a factual JSON profile for the publicly listed company below. Return ONLY a JSON object with this exact shape, no markdown:
{
  "description": "2-3 sentence overview of what the company does",
  "founded": "year founded e.g. 1976",
  "headquarters": "City, Country/State",
  "ceo": "current CEO full name",
  "employees": "approximate employee count e.g. 164,000",
  "industry": "primary industry e.g. Consumer Electronics",
  "founding_story": "2-3 sentences about how the company started and key turning points",
  "milestones": ["array of 5-7 short milestone strings like '1984 — Macintosh launch'"],
  "key_products": ["array of 5-7 main products/services"],
  "competitors": ["array of 3-5 main competitors"]
}

Company: ${company.name} (Ticker: ${company.ticker}, Exchange: ${company.exchange ?? "N/A"})
Use only well-known public information. If unsure of a value, give your best estimate.`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Bad JSON from Gemini:", content);
      throw new Error("Invalid JSON from Gemini");
    }

    const { data: inserted, error: insErr } = await supabase
      .from("company_profiles")
      .insert({
        company_id,
        description: parsed.description,
        founded: parsed.founded,
        headquarters: parsed.headquarters,
        ceo: parsed.ceo,
        employees: parsed.employees,
        industry: parsed.industry,
        founding_story: parsed.founding_story,
        milestones: parsed.milestones ?? [],
        key_products: parsed.key_products ?? [],
        competitors: parsed.competitors ?? [],
      })
      .select()
      .single();

    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    console.log(`✅ Profile generated for ${company.ticker}`);

    return new Response(JSON.stringify({ profile: inserted, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-company-profile error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
