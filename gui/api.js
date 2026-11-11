const desktop = window.resoDesktop;

export async function api(path, options = {}) {
  if (!desktop?.apiUrl || !desktop?.apiToken) {
    throw new Error("Die Desktop-Verbindung ist nicht verfügbar.");
  }
  const response = await fetch(`${desktop.apiUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "X-Reso-Token": desktop.apiToken,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Ungültige Antwort vom lokalen Backend (${response.status}).`);
  }
  if (!response.ok) throw new Error(payload.error || `Anfrage fehlgeschlagen (${response.status}).`);
  return payload;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function formatEuro(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value) || 0);
}
