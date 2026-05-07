// Geocode a free-text place query via Nominatim (OpenStreetMap).
// Polite usage: low volume, single query at a time, never bulk-load.
export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Geocoder error');
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data || data.length === 0) throw new Error('No results');
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
