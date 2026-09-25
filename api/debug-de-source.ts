export default async function handler(_req: any, res: any) {
  try {
    const response = await fetch("https://spritpreisverlauf.at/de/tankstellen", {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; HarkasIT-Debug/1.0)",
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await response.text();
    const needles = ["sort", "fuel", "Diesel", "Super E5", "__NEXT_DATA__", "application/ld+json", "Mehr anzeigen", "/api/"];
    const excerpts: Record<string, string[]> = {};
    for (const needle of needles) {
      const chunks: string[] = [];
      let pos = 0;
      while (chunks.length < 8) {
        const idx = html.toLowerCase().indexOf(needle.toLowerCase(), pos);
        if (idx < 0) break;
        chunks.push(html.slice(Math.max(0, idx - 600), Math.min(html.length, idx + 1800)));
        pos = idx + needle.length;
      }
      excerpts[needle] = chunks;
    }
    return res.status(200).json({ status: response.status, length: html.length, excerpts });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
