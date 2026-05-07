// Generic helpers: date math, formatting, escaping, localStorage.

export function daysBetween(a, b) { return Math.floor((b - a) / 86400000); }

export function ageInYears(now, dob) {
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return years;
}

export function ageOnDate(dob, atDate) {
  let years = atDate.getFullYear() - dob.getFullYear();
  const m = atDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && atDate.getDate() < dob.getDate())) years--;
  return years;
}

export function parseDOB(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  if (isNaN(d.getTime())) return null;
  if (d > new Date()) return null;
  if (d.getFullYear() < 1900) return null;
  return d;
}

export function formatDOB(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function prettyDOB(d) {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatNum(n) { return Math.round(n).toLocaleString(); }

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function readLS(key) { try { return localStorage.getItem(key); } catch(e) { return null; } }
export function writeLS(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }
