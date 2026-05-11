// Open Library Search API wrapper. Free, no API key required, no auth.
// Used by BooksSection on the Goals page to auto-enrich a book entry
// when the user types a title and clicks "Look up."
//
// Endpoint docs: https://openlibrary.org/dev/docs/api/search
// We request only the fields we use to keep the response small.

export interface OpenLibraryResult {
  title: string;
  author: string;
  coverUrl?: string;        // medium-size cover, when available
  firstPublishedYear?: number;
  // Open Library "work key" — stable id we can use to dedup results
  // even when titles repeat.
  workKey: string;
}

const SEARCH_URL = 'https://openlibrary.org/search.json';
const COVER_URL = 'https://covers.openlibrary.org/b/id';

// Fetch up to `limit` matches for the given title. Returns [] on
// network failure or non-200; never throws (UI just falls back to
// manual entry).
export async function searchBooks(title: string, limit = 5): Promise<OpenLibraryResult[]> {
  const q = title.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    title: q,
    limit: String(limit),
    fields: 'title,author_name,cover_i,first_publish_year,key',
  });

  let json: unknown;
  try {
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
    if (!res.ok) return [];
    json = await res.json();
  } catch {
    return [];
  }

  const docs = (json as { docs?: unknown[] })?.docs;
  if (!Array.isArray(docs)) return [];

  const out: OpenLibraryResult[] = [];
  for (const d of docs) {
    if (!d || typeof d !== 'object') continue;
    const r = d as Record<string, unknown>;
    const t = typeof r.title === 'string' ? r.title : '';
    if (!t) continue;
    const authors = Array.isArray(r.author_name)
      ? (r.author_name as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const cover = typeof r.cover_i === 'number' ? r.cover_i : null;
    const year = typeof r.first_publish_year === 'number' ? r.first_publish_year : undefined;
    const workKey = typeof r.key === 'string' ? r.key : '';
    out.push({
      title: t,
      author: authors.join(', '),
      ...(cover ? { coverUrl: `${COVER_URL}/${cover}-M.jpg` } : {}),
      ...(year ? { firstPublishedYear: year } : {}),
      workKey,
    });
  }
  return out;
}
