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

export interface WatchProviderItem {
  id: number;
  name: string;
  logoUrl: string | null;
  type: "flatrate" | "rent" | "buy";
}

export interface MovieProvidersResult {
  tmdbId: number;
  hasFlatrate: boolean;
  isNetflix: boolean;
  isPrimeVideo: boolean;
  isUnext: boolean;
  isHulu: boolean;
  isDisneyPlus: boolean;
  providers: WatchProviderItem[];
  link?: string;
}

const providerCache = new Map<number, { data: MovieProvidersResult; timestamp: number }>();
const PROVIDER_CACHE_TTL = 6 * 60 * 60 * 1000; // 6時間

/**
 * TMDBの watch/providers から日本の配信サービス一覧を取得
 * （アマプラ、U-NEXT、ネトフリ等）
 */
export async function getWatchProviders(tmdbId: number): Promise<MovieProvidersResult | null> {
  if (!isTmdbConfigured() || !tmdbId) return null;

  const now = Date.now();
  const cached = providerCache.get(tmdbId);
  if (cached && (now - cached.timestamp < PROVIDER_CACHE_TTL)) {
    return cached.data;
  }

  try {
    const key = process.env.TMDB_API_KEY;
    const url = `${TMDB_BASE}/movie/${tmdbId}/watch/providers`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { results?: { JP?: any } };
    const jp = json.results?.JP;
    if (!jp) {
      const emptyResult: MovieProvidersResult = {
        tmdbId,
        hasFlatrate: false,
        isNetflix: false,
        isPrimeVideo: false,
        isUnext: false,
        isHulu: false,
        isDisneyPlus: false,
        providers: [],
      };
      providerCache.set(tmdbId, { data: emptyResult, timestamp: now });
      return emptyResult;
    }

    const providers: WatchProviderItem[] = [];
    const collect = (list: any[] | undefined, type: "flatrate" | "rent" | "buy") => {
      if (!list) return;
      for (const p of list) {
        if (!providers.some((item) => item.id === p.provider_id)) {
          providers.push({
            id: p.provider_id,
            name: p.provider_name,
            logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
            type,
          });
        }
      }
    };

    collect(jp.flatrate, "flatrate");
    collect(jp.rent, "rent");
    collect(jp.buy, "buy");

    const flatrateList = (jp.flatrate || []) as Array<{ provider_id: number; provider_name: string }>;
    const allProviders = providers.map((p) => p.name.toLowerCase());
    const flatrateNames = flatrateList.map((p) => p.provider_name.toLowerCase());

    // 主要配信サービス判定
    const isNetflix = flatrateNames.some((n) => n.includes("netflix"));
    const isPrimeVideo = flatrateNames.some((n) => n.includes("amazon prime") || n.includes("prime video")) ||
      allProviders.some((n) => n.includes("amazon prime") || n.includes("prime video"));
    const isUnext = flatrateNames.some((n) => n.includes("u-next") || n.includes("unext"));
    const isHulu = flatrateNames.some((n) => n.includes("hulu"));
    const isDisneyPlus = flatrateNames.some((n) => n.includes("disney"));

    const result: MovieProvidersResult = {
      tmdbId,
      hasFlatrate: (jp.flatrate && jp.flatrate.length > 0) || false,
      isNetflix,
      isPrimeVideo,
      isUnext,
      isHulu,
      isDisneyPlus,
      providers,
      link: jp.link,
    };

    providerCache.set(tmdbId, { data: result, timestamp: now });
    return result;
  } catch (err) {
    console.warn(`[tmdb] getWatchProviders failed for ${tmdbId}:`, err);
    return null;
  }
}
