// POST /api/submit  — يسجّل إجابة واحدة مجهولة
// body: { respondent, answers: [15 أرقام 0..3], total, level }

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!URL || !KEY) {
    return res.status(500).json({ error: "missing_env" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body) return res.status(400).json({ error: "bad_body" });

  const { respondent, answers, total, level } = body;

  // تحقق صارم من الشكل قبل أي كتابة
  const okId = typeof respondent === "string" && respondent.length >= 8 && respondent.length <= 64;
  const okAnswers = Array.isArray(answers)
    && answers.length === 15
    && answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3);
  const sum = okAnswers ? answers.reduce((a, b) => a + b, 0) : -1;
  const okTotal = Number.isInteger(total) && total === sum;
  const okLevel = Number.isInteger(level) && level >= 0 && level <= 3;

  if (!okId || !okAnswers || !okTotal || !okLevel) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  try {
    const r = await fetch(`${URL}/rest/v1/doubt_responses?on_conflict=respondent`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        respondent,
        answers,
        total,
        level,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("supabase insert failed", r.status, text);
      return res.status(502).json({ error: "store_failed" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "store_failed" });
  }
}
