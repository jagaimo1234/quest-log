/**
 * cinemaSchedule.ts
 * イオンシネマ板橋のリアルタイム上映スケジュール取得サービス
 * （完全無料・外部APIキー不要・定期自動更新＆インメモリキャッシュ）
 */

export interface TheaterSlot {
  startTime: string; // 例: "20:55"
  endTime: string;   // 例: "22:41"
  bookingUrl: string; // ワタシアター直接予約URL
  status: "available" | "few" | "soldout"; // ◎ 空席あり / △ 残りわずか / ✕ 満席
  screenFormat: string; // "字幕" | "吹替" | "2D" など
  theaterName: string; // "イオンシネマ板橋"
}

export interface TheaterDateSchedule {
  dateText: string; // 例: "10/17土"
  slots: TheaterSlot[];
}

export interface TheaterMovie {
  rawTitle: string;
  normalizedTitle: string;
  durationMinutes: number | null;
  posterUrl: string | null;
  dates: TheaterDateSchedule[];
  todaySlots: TheaterSlot[];
  bookingUrl: string | null;
  theaterName: string;
}

interface ScheduleCache {
  fetchedAt: number;
  movies: TheaterMovie[];
}

let memoryCache: ScheduleCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1時間キャッシュ

/**
 * タイトル比較用の正規化関数
 * 記号、空白、全角半角の揺れを吸収
 */
export function normalizeTitle(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[\s\t\r\n　・:：!！?？\-ー〜~_（）\(\)「」『』【】]/g, "")
    .trim();
}

/**
 * イオンシネマ板橋のスケジュール全件を取得（キャッシュ付き）
 */
export async function getItabashiSchedule(): Promise<TheaterMovie[]> {
  const now = Date.now();
  if (memoryCache && (now - memoryCache.fetchedAt < CACHE_TTL_MS)) {
    return memoryCache.movies;
  }

  try {
    const url = "https://press.moviewalker.jp/th126/schedule/";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`[cinemaSchedule] fetch failed with status ${res.status}`);
      if (memoryCache) return memoryCache.movies;
      return [];
    }

    const html = await res.text();
    const articles = html.split(/<article[^>]*>/i).slice(1);
    const movies: TheaterMovie[] = [];

    for (const article of articles) {
      const titleMatch = article.match(/<h2>([\s\S]*?)<\/h2>/i);
      if (!titleMatch) continue;
      const rawTitle = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      if (!rawTitle) continue;

      const durationMatch = article.match(/、(\d+)分/);
      const durationMinutes = durationMatch ? parseInt(durationMatch[1], 10) : null;

      const posterMatch = article.match(/<img[^>]+src="([^"]+)"[^>]+alt="[^"]*"/i);
      const posterUrl = posterMatch ? posterMatch[1] : null;

      // 上映フォーマット（字幕 / 吹替 / 2D等）
      const formatMatch = article.match(/<div class="bl_screen_format">([\s\S]*?)<\/div>/i);
      const screenFormat = formatMatch ? formatMatch[1].replace(/<[^>]+>/g, "").trim() : "2D";

      // 日付ごとのスケジュール
      const dates: TheaterDateSchedule[] = [];
      const liRegex = /<li>\s*<dl>[\s\S]*?<div class="date[^"]*">([\s\S]*?)<\/div>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>\s*<\/dl>\s*<\/li>/gi;
      let lm: RegExpExecArray | null;

      while ((lm = liRegex.exec(article)) !== null) {
        const dateText = lm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
        const slotHtml = lm[2];

        const linkRegex = /<a[^>]+data-href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let sm: RegExpExecArray | null;
        const slots: TheaterSlot[] = [];

        while ((sm = linkRegex.exec(slotHtml)) !== null) {
          const startTime = sm[2].replace(/<[^>]+>/g, "").trim();
          const bookingUrl = sm[1];

          let endTime = "";
          if (durationMinutes && startTime.includes(":")) {
            const [sh, sm_] = startTime.split(":").map(Number);
            const totalMin = sh * 60 + sm_ + durationMinutes;
            const endH = Math.floor(totalMin / 60) % 24;
            const endM = totalMin % 60;
            endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
          }

          slots.push({
            startTime,
            endTime,
            bookingUrl,
            status: "available",
            screenFormat,
            theaterName: "イオンシネマ板橋",
          });
        }

        if (slots.length > 0) {
          dates.push({
            dateText,
            slots,
          });
        }
      }

      // 今日（配列の1番目）のスロット
      const todaySlots = dates.length > 0 ? dates[0].slots : [];
      const defaultBookingUrl = todaySlots.length > 0 ? todaySlots[0].bookingUrl : (dates[0]?.slots[0]?.bookingUrl ?? null);

      movies.push({
        rawTitle,
        normalizedTitle: normalizeTitle(rawTitle),
        durationMinutes,
        posterUrl,
        dates,
        todaySlots,
        bookingUrl: defaultBookingUrl,
        theaterName: "イオンシネマ板橋",
      });
    }

    memoryCache = {
      fetchedAt: now,
      movies,
    };

    console.log(`[cinemaSchedule] Successfully synced ${movies.length} movies for Aeon Cinema Itabashi.`);
    return movies;
  } catch (err) {
    console.error("[cinemaSchedule] Error syncing itabashi schedule:", err);
    if (memoryCache) return memoryCache.movies;
    return [];
  }
}

/**
 * 映画タイトルからイオンシネマ板橋の上映スケジュールを検索
 */
export async function findMovieInItabashi(searchQuery: string): Promise<TheaterMovie | null> {
  if (!searchQuery) return null;
  const movies = await getItabashiSchedule();
  const queryNorm = normalizeTitle(searchQuery);

  if (!queryNorm) return null;

  // 1. 完全一致（正規化後）
  let match = movies.find(m => m.normalizedTitle === queryNorm);
  if (match) return match;

  // 2. 部分一致（どちらかがどちらかを含む）
  match = movies.find(m => 
    m.normalizedTitle.includes(queryNorm) || queryNorm.includes(m.normalizedTitle)
  );
  if (match) return match;

  // 3. 2文字以上の共通プレフィックスまたは主要単語一致
  if (queryNorm.length >= 3) {
    match = movies.find(m => {
      const minLen = Math.min(queryNorm.length, m.normalizedTitle.length);
      if (minLen < 3) return false;
      return m.normalizedTitle.slice(0, 3) === queryNorm.slice(0, 3);
    });
    if (match) return match;
  }

  return null;
}
