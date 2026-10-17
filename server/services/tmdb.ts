/**
 * TMDB (The Movie Database) 連携サービス
 * 映画タイトル(表記ゆれ可)からポスター付きの候補を検索する。
 * 環境変数 TMDB_API_KEY には「API Read Access Token」(Bearer) を設定する。
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

export interface MovieCandidate {
  tmdbId: number;
  officialTitle: string;
  originalTitle: string;
  releaseYear: string | null;
  posterUrl: string | null;
  popularity: number;
}

export function isTmdbConfigured(): boolean {
  return !!process.env.TMDB_API_KEY;
}

async function searchOnce(query: string, language: string): Promise<MovieCandidate[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const url = `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&language=${language}&include_adult=false&page=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  const json = (await res.json()) as { results?: any[] };
  return (json.results ?? []).map((r) => ({
    tmdbId: r.id as number,
    officialTitle: (r.title as string) ?? "",
    originalTitle: (r.original_title as string) ?? "",
    releaseYear: r.release_date ? String(r.release_date).slice(0, 4) : null,
    posterUrl: r.poster_path ? `${POSTER_BASE}${r.poster_path}` : null,
    popularity: (r.popularity as number) ?? 0,
  }));
}

/** タイトルから年(1900〜2099)を取り出す。例: 「バイオハザード 2026」→ "2026" */
function extractYear(title: string): string | null {
  const m = title.match(/(?:^|[^\d])((?:19|20)\d{2})(?!\d)/);
  return m ? m[1] : null;
}

/** 括弧の補足(「（韓国）」「(2020)」「【実写】」等)と年を取り除く */
function cleanTitle(title: string): string {
  return title
    .replace(/[（(【\[『「][^）)】\]』」]*[）)】\]』」]/g, " ")
    .replace(/(?:^|[^\d])((?:19|20)\d{2})(?!\d)/g, " ")
    .replace(/[\s\u3000]+/g, " ")
    .trim();
}

/** 表記ゆれ対策: 補足除去 → 空白除去 → 原文 → 英語 の順に試し、候補をまとめる */
export async function searchMovieCandidates(title: string, limit = 5): Promise<MovieCandidate[]> {
  if (!isTmdbConfigured()) return [];
  const q = title.trim();
  if (!q) return [];

  const cleaned = cleanTitle(q) || q;
  const attempts: Array<[string, string]> = [];
  const add = (query: string, lang: string) => {
    if (query && !attempts.some(([a, b]) => a === query && b === lang)) attempts.push([query, lang]);
  };
  add(cleaned, "ja-JP");
  add(cleaned.replace(/[\s\u3000]+/g, ""), "ja-JP");
  add(q, "ja-JP");
  add(cleaned, "en-US");

  const seen = new Set<number>();
  const merged: MovieCandidate[] = [];
  for (const [query, lang] of attempts) {
    try {
      const found = await searchOnce(query, lang);
      for (const c of found) {
        if (!seen.has(c.tmdbId)) {
          seen.add(c.tmdbId);
          merged.push(c);
        }
      }
    } catch (e) {
      console.warn("[tmdb] search failed:", e);
    }
    // ポスター付きの候補が十分に集まったら打ち切り
    if (merged.filter((c) => c.posterUrl).length >= limit) break;
  }
  // 年指定があれば年が近いものを優先 → ポスターあり → 人気順
  const year = extractYear(q);
  const yearScore = (c: MovieCandidate) =>
    year && c.releaseYear ? (Math.abs(Number(c.releaseYear) - Number(year)) <= 1 ? 1 : 0) : 0;
  return merged
    .sort(
      (a, b) =>
        yearScore(b) - yearScore(a) ||
        Number(!!b.posterUrl) - Number(!!a.posterUrl) ||
        b.popularity - a.popularity,
    )
    .slice(0, limit);
}

/** 自動採用してよいか: ポスター付きの先頭候補が、入力(補足除去後)と(ほぼ)一致する場合のみ */
export function pickConfident(title: string, candidates: MovieCandidate[]): MovieCandidate | null {
  const norm = (s: string) => s.toLowerCase().replace(/[\s\u3000:：・!！?？。、,.\-ー]/g, "");
  const t = norm(cleanTitle(title) || title);
  const withPoster = candidates.filter((c) => c.posterUrl);
  if (withPoster.length === 0) return null;
  const exact = withPoster.filter((c) => norm(c.officialTitle) === t || norm(c.originalTitle) === t);
  if (exact.length >= 1) return exact[0];
  return null;
}
