// GET /api/stats — يرجّع الإحصائيات المجمَّعة فقط، من غير أي إجابة فردية

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const EMPTY = { n: 0, sum: 0, levels: [0, 0, 0, 0], q: Array.from({ length: 15 }, () => [0, 0, 0, 0]) };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!URL || !KEY) {
    return res.status(500).json({ error: "missing_env" });
  }

  try {
    const r = await fetch(
      `${URL}/rest/v1/doubt_responses?select=answers,total,level&limit=20000`,
      {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
        },
      }
    );

    if (!r.ok) {
      console.error("supabase read failed", r.status, await r.text());
      return res.status(502).json({ error: "read_failed" });
    }

    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json(EMPTY);
    }

    const levels = [0, 0, 0, 0];
    const q = Array.from({ length: 15 }, () => [0, 0, 0, 0]);
    let sum = 0;
    let n = 0;

    for (const row of rows) {
      if (!Array.isArray(row.answers) || row.answers.length !== 15) continue;
      n++;
      sum += Number(row.total) || 0;
      const lv = Number(row.level);
      if (lv >= 0 && lv <= 3) levels[lv]++;
      for (let i = 0; i < 15; i++) {
        const a = Number(row.answers[i]);
        if (a >= 0 && a <= 3) q[i][a]++;
      }
    }

    return res.status(200).json({ n, sum, levels, q });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "read_failed" });
  }
}
