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
    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*, companies(*)")
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      throw new Error(`Report not found: ${reportError?.message}`);
    }

    // 2. Update status to processing
    await supabase
      .from("reports")
      .update({ status: "processing" })
      .eq("id", report_id);

    // 3. Download PDF as base64
    let pdfBase64 = "";
    if (report.report_url) {
      try {
        const pdfResponse = await fetch(report.report_url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          },
        });
        if (!pdfResponse.ok) {
          throw new Error(`PDF download failed: ${pdfResponse.status}`);
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();
        pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        console.log(`PDF downloaded: ${pdfBase64.length} chars base64`);
      } catch (e) {
        console.error("PDF download error:", e);
        throw new Error(`Failed to download PDF: ${e}`);
      }
    }

    if (!pdfBase64) {
      await supabase.from("reports").update({ status: "failed" }).eq("id", report_id);
      throw new Error("No PDF data available");
    }

    // 4. Send to Gemini via Lovable AI Gateway
    const prompt = `You are a financial analyst. Analyze this quarterly earnings report PDF and return ONLY a raw JSON object, no markdown, no backticks:
{
  "headline": "one punchy line summarizing the biggest result",
  "summary": "3-4 plain English sentences anyone can understand",
  "revenue": "formatted revenue figure with currency symbol",
  "profit": "formatted net profit with currency symbol",
  "growth": "YoY revenue growth as percentage with + or - sign e.g. +16% or -8%",
  "eps": "earnings per share",
  "pe_ratio": "price to earnings ratio",
  "debt_equity": "debt to equity ratio",
  "ebitda": "EBITDA figure formatted",
  "current_ratio": "current ratio",
  "roe": "return on equity percentage",
  "full_report_text": "detailed 200-word analysis covering business highlights, risks, outlook, and key takeaways",
  "beat_or_miss": "Beat or Missed or In-line",
  "quarter": "e.g. Q3 FY2026",
  "sector": "company sector e.g. IT Services, Banking, Energy"
}

Company: ${report.companies?.name} (${report.companies?.ticker})
Return ONLY valid JSON.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a financial analyst AI. Always respond with valid JSON only, no markdown fences.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${pdfBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      await supabase.from("reports").update({ status: "failed" }).eq("id", report_id);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      await supabase.from("reports").update({ status: "failed" }).eq("id", report_id);
      throw new Error("AI returned invalid JSON");
    }

    // 5. Update company sector if we got one
    if (parsed.sector && report.company_id) {
      await supabase
        .from("companies")
        .update({ sector: parsed.sector })
        .eq("id", report.company_id);
    }

    // 6. Insert into report_summaries with all fields
    const { error: insertError } = await supabase.from("report_summaries").insert({
      report_id: report_id,
      company_id: report.company_id,
      headline: parsed.headline,
      summary: parsed.summary,
      revenue: parsed.revenue,
      profit: parsed.profit,
      growth: parsed.growth,
      eps: parsed.eps,
      pe_ratio: parsed.pe_ratio,
      debt_equity: parsed.debt_equity,
      ebitda: parsed.ebitda,
      current_ratio: parsed.current_ratio,
      roe: parsed.roe,
      full_report_text: parsed.full_report_text,
      beat_or_miss: parsed.beat_or_miss,
      quarter: parsed.quarter,
      sector: parsed.sector,
      processed_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(`Failed to insert summary: ${insertError.message}`);
    }

    // 7. Update report status to done
    await supabase.from("reports").update({ status: "done" }).eq("id", report_id);

    console.log(`✅ Report processed: ${report.companies?.ticker}`);

    return new Response(
      JSON.stringify({ success: true, message: "Report processed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-report error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
