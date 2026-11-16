const desktop = window.resoDesktop;

export async function api(path, options = {}) {
  const method = options.method || "GET";
  // Desktop app: talk to the Electron main process over IPC.
  if (desktop?.invoke) {
    let result;
    try {
      result = await desktop.invoke(path, { method, body: options.body });
    } catch {
      throw new Error("Life konnte die Anfrage nicht verarbeiten. Bitte starte die App neu.");
    }
    if (!result || result.status >= 400) throw new Error(result?.body?.error || `Anfrage fehlgeschlagen (${result?.status}).`);
    return result.body;
  }
  // Browser preview (development harness only).
  if (!desktop?.apiUrl) throw new Error("Die Desktop-Verbindung ist nicht verfügbar.");
  let response;
  try {
    response = await fetch(`${desktop.apiUrl}${path}`, {
      method,
      headers: { "X-Reso-Token": desktop.apiToken, ...(options.body ? { "Content-Type": "application/json" } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Keine Verbindung zum lokalen Life-Dienst. Bitte starte die App neu.");
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Ungültige Antwort (${response.status}).`);
  }
  if (!response.ok) throw new Error(payload.error || `Anfrage fehlgeschlagen (${response.status}).`);
  return payload;
}

export const onDesktopEvent = (callback) => desktop?.onEvent?.(callback);

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
