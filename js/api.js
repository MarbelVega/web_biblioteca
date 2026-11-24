/**
 * Cliente HTTP para api_biblioteca.
 * - Timeout con AbortController
 * - Normaliza respuestas (array plano, {data:[]}, {items:[]}, {results:[]}, {content:[]})
 * - Extrae mensajes de error estilo NestJS ({ statusCode, message, error })
 * - Registra cada llamada en una bitácora en memoria (vista 🧾 Bitácora HTTP)
 */
(function () {
  const LOG_MAX = 200;
  const log = [];

  function joinUrl(base, path) {
    return String(base || "").replace(/\/+$/, "") + "/" + String(path || "").replace(/^\/+/, "");
  }

  function normalizeList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {
      for (const k of ["data", "items", "results", "content", "rows", "records"]) {
        if (Array.isArray(payload[k])) return payload[k];
      }
    }
    return payload == null ? [] : [payload];
  }

  function extractError(status, body) {
    if (body && typeof body === "object") {
      const msg = Array.isArray(body.message) ? body.message.join(" · ") : body.message;
      return `${status} ${body.error || ""} ${msg || ""}`.trim();
    }
    return `${status} ${typeof body === "string" ? body.slice(0, 200) : ""}`.trim();
  }

  async function request(cfg, method, path, body) {
    const url = joinUrl(cfg.apiBaseUrl, path);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs || 10000);
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (cfg.authorization) headers["Authorization"] = cfg.authorization;

    const entry = { time: new Date().toISOString(), method, url, status: null, ms: 0, error: null };
    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method, headers, signal: ctrl.signal,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      entry.status = res.status;
      const text = await res.text();
      let data = text;
      try { data = text ? JSON.parse(text) : null; } catch (_) { /* respuesta no JSON */ }
      if (!res.ok) {
        entry.error = extractError(res.status, data);
        throw new Error(entry.error);
      }
      return data;
    } catch (e) {
      if (e.name === "AbortError") entry.error = `Timeout (${cfg.timeoutMs} ms)`;
      else if (!entry.error) entry.error = "Error de red / CORS: " + e.message;
      throw new Error(entry.error);
    } finally {
      clearTimeout(timer);
      entry.ms = Math.round(performance.now() - t0);
      log.unshift(entry);
      if (log.length > LOG_MAX) log.pop();
    }
  }

  window.Api = {
    log,
    joinUrl,
    normalizeList,
    list:   (cfg, r)          => request(cfg, "GET", r.path).then(normalizeList),
    get:    (cfg, r, id)      => request(cfg, "GET", `${r.path}/${encodeURIComponent(id)}`),
    create: (cfg, r, data)    => request(cfg, "POST", r.path, data),
    update: (cfg, r, id, data)=> request(cfg, cfg.updateMethod || "PATCH", `${r.path}/${encodeURIComponent(id)}`, data),
    remove: (cfg, r, id)      => request(cfg, "DELETE", `${r.path}/${encodeURIComponent(id)}`),
    ping:   (cfg)             => request(cfg, "GET", "/")
  };
})();
