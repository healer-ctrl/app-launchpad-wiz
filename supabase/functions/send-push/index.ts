import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---- FCM HTTP v1 helpers ----
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getFcmAccessToken(serviceAccount: any): Promise<{ token: string; projectId: string }> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const claimsB64 = base64UrlEncode(enc.encode(JSON.stringify(claims)));
  const unsigned = `${headerB64}.${claimsB64}`;

  // Import private key (PEM PKCS8)
  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned))
  );
  const jwt = `${unsigned}.${base64UrlEncode(sig)}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!tokenResp.ok) throw new Error(`OAuth failed: ${await tokenResp.text()}`);
  const { access_token } = await tokenResp.json();
  return { token: access_token, projectId: serviceAccount.project_id };
}

async function sendFcm(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ ok: boolean; status: number; body: string }> {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data,
          android: { priority: "HIGH" },
          apns: {
            payload: { aps: { sound: "default", "content-available": 1 } },
          },
        },
      }),
    }
  );
  return { ok: resp.ok, status: resp.status, body: await resp.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summary_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: summary, error } = await supabase
      .from("report_summaries")
      .select("headline, quarter, companies:company_id ( name, ticker )")
      .eq("id", summary_id)
      .maybeSingle();
    if (error || !summary) throw new Error(`Summary not found: ${error?.message}`);

    const company: any = summary.companies;
    const title = company ? `${company.ticker} — new report` : "New report ready";
    const body =
      summary.headline ??
      `${company?.name ?? "A company"} just posted ${summary.quarter ?? "results"}`;

    const { data: tokens, error: tokensErr } = await supabase
      .from("device_tokens")
      .select("id, token, platform")
      .eq("enabled", true)
      .in("platform", ["android", "ios"]);
    if (tokensErr) throw tokensErr;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: "no_tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fcmJsonRaw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!fcmJsonRaw) {
      console.warn("FCM_SERVICE_ACCOUNT_JSON not set — skipping push send");
      return new Response(
        JSON.stringify({ sent: 0, skipped: "fcm_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const serviceAccount = JSON.parse(fcmJsonRaw);
    const { token: accessToken, projectId } = await getFcmAccessToken(serviceAccount);

    let sent = 0;
    let failed = 0;
    for (const t of tokens) {
      const r = await sendFcm(accessToken, projectId, t.token, title, body, {
        summary_id: String(summary_id),
        ticker: String(company?.ticker ?? ""),
      });
      if (r.ok) {
        sent++;
      } else {
        failed++;
        console.error(`FCM send failed [${r.status}] for token ${t.id}: ${r.body}`);
        // Disable invalid tokens
        if (r.status === 404 || r.status === 400) {
          await supabase.from("device_tokens").update({ enabled: false }).eq("id", t.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent, failed, total: tokens.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
