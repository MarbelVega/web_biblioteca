/**
 * Biblioteca Web - SPA en JavaScript puro (sin dependencias ni build).
 * Rutas (hash): #/dashboard, #/r/<key>, #/settings, #/logs, #/help
 *
 * Seguridad: todo dato del backend se inserta con textContent (nunca innerHTML)
 * para evitar XSS almacenado proveniente de la base de datos.
 */
(function () {
  "use strict";
  const STORAGE_KEY = "biblioteca-web.config.v1";
  const $ = (s) => document.querySelector(s);
  const view = $("#view");

  // ---------- Utilidades DOM ----------
  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return n;
  }
  function toast(msg, isError = false) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.className = "toast"), 3500);
  }

  // ---------- Configuración ----------
  function loadConfig() {
    const base = structuredClone(window.DEFAULT_CONFIG);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") return { ...base, ...saved };
    } catch (_) {}
    return base;
  }
  let cfg = loadConfig();
  function saveConfig(newCfg) {
    cfg = newCfg;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCfg));
  }
  const resourceByKey = (k) => cfg.resources.find((r) => r.key === k);

  // ---------- Inferencia de campos ----------
  const DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
  function inferType(v) {
    if (typeof v === "number") return "number";
    if (typeof v === "boolean") return "boolean";
    if (v && typeof v === "object") return "json";
    if (typeof v === "string" && DATE_RE.test(v)) return "date";
    if (typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "email";
    return "text";
  }
  function fieldsFor(resource, rows) {
    if (resource.fields && resource.fields.length) return resource.fields;
    const sample = rows && rows.find((r) => r && typeof r === "object");
    if (!sample) return resource._inferred || [];
    const f = Object.keys(sample).map((name) => ({ name, type: inferType(sample[name]) }));
    resource._inferred = f; // cache en memoria (no se persiste)
    return f;
  }
  function display(v) {
    if (v == null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  // ---------- Estado del backend ----------
  async function checkStatus() {
    const dot = $("#statusDot"), txt = $("#statusText");
    txt.textContent = "Verificando…"; dot.className = "dot";
    try {
      await Api.ping(cfg);
      dot.className = "dot ok"; txt.textContent = "Conectado · " + cfg.apiBaseUrl;
    } catch (e) {
      // "/" puede devolver 404 en algunos backends; probamos el primer recurso
      try {
        await Api.list(cfg, cfg.resources[0]);
        dot.className = "dot ok"; txt.textContent = "Conectado · " + cfg.apiBaseUrl;
      } catch (e2) {
        dot.className = "dot fail"; txt.textContent = "Sin conexión";
        $("#apiStatus").title = e2.message;
      }
    }
  }

  // ---------- Navegación ----------
  function renderNav() {
    const box = $("#resourceLinks");
    box.replaceChildren(...cfg.resources.map((r) =>
      el("a", { href: `#/r/${r.key}`, "data-route": `r/${r.key}` }, `${r.icon || "📄"} ${r.label || r.key}`)
    ));
  }
  function setActive(route) {
    document.querySelectorAll(".sidebar a").forEach((a) =>
      a.classList.toggle("active", a.dataset.route === route));
  }
  function router() {
    const route = (location.hash.replace(/^#\/?/, "") || "dashboard");
    setActive(route);
    if (route === "dashboard") return renderDashboard();
    if (route === "settings") return renderSettings();
    if (route === "logs") return renderLogs();
    if (route === "help") return renderHelp();
    if (route.startsWith("r/")) {
      const r = resourceByKey(route.slice(2));
      if (r) return renderResource(r);
    }
    view.replaceChildren(el("div", { class: "empty" }, "Ruta no encontrada."));
  }

  // ---------- Dashboard ----------
  async function renderDashboard() {
    const cards = el("div", { class: "cards" });
    view.replaceChildren(
      el("h1", {}, "Dashboard"),
      el("p", {}, "Backend: ", el("code", {}, cfg.apiBaseUrl)),
      cards
    );
    await Promise.all(cfg.resources.map(async (r) => {
      const card = el("a", { class: "card card-link", href: `#/r/${r.key}` },
        el("div", { class: "num" }, "…"), el("div", { class: "lbl" }, `${r.icon || ""} ${r.label}`));
      cards.append(card);
      try {
        const rows = await Api.list(cfg, r);
        card.querySelector(".num").textContent = rows.length;
      } catch (e) {
        card.classList.add("err");
        card.querySelector(".num").textContent = e.message;
      }
    }));
  }

  // ---------- CRUD genérico ----------
  async function renderResource(r) {
    let rows = [], sortKey = null, sortAsc = true, filter = "";
    const tableBox = el("div", {}, el("div", { class: "empty" }, "Cargando…"));
    const search = el("input", { type: "search", placeholder: "Filtrar…", "aria-label": "Filtrar registros" });
    search.addEventListener("input", () => { filter = search.value.toLowerCase(); draw(); });

    view.replaceChildren(
      el("h1", {}, `${r.icon || ""} ${r.label}`),
      el("div", { class: "toolbar" },
        el("button", { class: "btn", type: "button", onclick: () => openForm(r, null, fieldsFor(r, rows), load) }, "➕ Nuevo"),
        el("button", { class: "btn secondary", type: "button", onclick: () => load() }, "↻ Refrescar"),
        search,
        el("span", { class: "lbl" }, "GET ", el("code", {}, Api.joinUrl(cfg.apiBaseUrl, r.path)))
      ),
      tableBox
    );

    async function load() {
      try {
        rows = await Api.list(cfg, r);
        draw();
      } catch (e) {
        tableBox.replaceChildren(el("div", { class: "empty" },
          el("p", { class: "error" }, e.message),
          el("p", {}, "Revisa la URL del backend, la ruta del recurso y CORS en ⚙️ Configuración / docs/TROUBLESHOOTING.md")));
      }
    }

    function draw() {
      const fields = fieldsFor(r, rows);
      let data = rows.filter((row) => !filter || JSON.stringify(row).toLowerCase().includes(filter));
      if (sortKey) {
        data = [...data].sort((a, b) => {
          const x = a[sortKey], y = b[sortKey];
          const c = (typeof x === "number" && typeof y === "number") ? x - y : display(x).localeCompare(display(y), "es", { numeric: true });
          return sortAsc ? c : -c;
        });
      }
      if (!data.length) {
        tableBox.replaceChildren(el("div", { class: "empty" }, rows.length ? "Sin coincidencias." : "No hay registros. Usa ➕ Nuevo para crear el primero."));
        return;
      }
      const head = el("tr", {}, fields.map((f) =>
        el("th", { scope: "col", onclick: () => { sortAsc = sortKey === f.name ? !sortAsc : true; sortKey = f.name; draw(); } },
          f.name + (sortKey === f.name ? (sortAsc ? " ▲" : " ▼") : ""))), el("th", {}, "Acciones"));
      const body = data.map((row) => el("tr", {},
        fields.map((f) => el("td", { class: f.type === "json" ? "json" : "" }, display(row[f.name]))),
        el("td", { class: "actions" },
          el("button", { class: "btn sm secondary", type: "button", onclick: () => openForm(r, row, fields, load) }, "✏️"),
          " ",
          el("button", { class: "btn sm danger", type: "button", onclick: () => removeRow(r, row, load) }, "🗑️"))
      ));
      tableBox.replaceChildren(el("table", {}, el("thead", {}, head), el("tbody", {}, body)),
        el("p", { class: "lbl" }, `${data.length} de ${rows.length} registros`));
    }
    load();
  }

  async function removeRow(r, row, after) {
    const id = row[r.idField];
    if (id == null) return toast(`El registro no tiene el campo id "${r.idField}". Ajusta idField en Configuración.`, true);
    if (!confirm(`¿Eliminar ${r.label} con ${r.idField}=${id}?`)) return;
    try { await Api.remove(cfg, r, id); toast("Registro eliminado"); after(); }
    catch (e) { toast(e.message, true); }
  }

  // ---------- Formulario (crear / editar) ----------
  const dlg = $("#formDialog"), form = $("#recordForm"), fieldsBox = $("#formFields");
  const jsonMode = $("#jsonMode"), jsonEditor = $("#jsonEditor"), formError = $("#formError");
  let formCtx = null;

  function openForm(r, row, fields, after) {
    formCtx = { r, row, fields, after };
    formError.textContent = "";
    $("#formTitle").textContent = (row ? "Editar " : "Nuevo ") + r.label;
    const editable = fields.filter((f) => !(f.name === r.idField && !row) && f.name !== "createdAt" && f.name !== "updatedAt");
    fieldsBox.replaceChildren(...editable.map((f) => {
      const v = row ? row[f.name] : undefined;
      let input;
      if (f.type === "boolean") input = el("input", { type: "checkbox", name: f.name, checked: !!v });
      else if (f.type === "json") input = el("textarea", { name: f.name, rows: 3 }, v == null ? "" : JSON.stringify(v, null, 2));
      else {
        input = el("input", { type: f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text",
          name: f.name, step: f.type === "number" ? "any" : null, required: f.required || null });
        input.value = v == null ? "" : (f.type === "date" ? String(v).slice(0, 10) : String(v));
      }
      if (row && f.name === r.idField) input.disabled = true;
      return el("label", {}, f.name + (f.required ? " *" : ""), input);
    }));
    if (!editable.length) jsonMode.checked = true;
    jsonEditor.value = JSON.stringify(row ? strip(row, r) : templateFrom(fields, r), null, 2);
    syncMode();
    dlg.showModal();
  }
  function strip(row, r) { const c = { ...row }; delete c[r.idField]; delete c.createdAt; delete c.updatedAt; return c; }
  function templateFrom(fields, r) {
    const o = {};
    fields.forEach((f) => { if (f.name !== r.idField) o[f.name] = f.type === "number" ? 0 : f.type === "boolean" ? false : f.type === "json" ? null : ""; });
    return o;
  }
  function syncMode() {
    fieldsBox.classList.toggle("hidden", jsonMode.checked);
    jsonEditor.classList.toggle("hidden", !jsonMode.checked);
  }
  jsonMode.addEventListener("change", syncMode);
  $("#cancelBtn").addEventListener("click", () => dlg.close());

  function collect() {
    if (jsonMode.checked) {
      try { return JSON.parse(jsonEditor.value || "{}"); }
      catch (e) { throw new Error("JSON inválido: " + e.message); }
    }
    const out = {};
    for (const f of formCtx.fields) {
      const inp = form.elements[f.name];
      if (!inp || inp.disabled) continue;
      if (f.type === "boolean") out[f.name] = inp.checked;
      else if (f.type === "number") { if (inp.value !== "") out[f.name] = Number(inp.value); }
      else if (f.type === "json") {
        if (inp.value.trim() === "") continue;
        try { out[f.name] = JSON.parse(inp.value); } catch (_) { throw new Error(`Campo ${f.name}: JSON inválido`); }
      }
      else if (inp.value !== "") out[f.name] = inp.value;
    }
    return out;
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    formError.textContent = "";
    const { r, row, after } = formCtx;
    let data;
    try { data = collect(); } catch (e) { formError.textContent = e.message; return; }
    const btn = $("#saveBtn"); btn.disabled = true;
    try {
      if (row) await Api.update(cfg, r, row[r.idField], data);
      else await Api.create(cfg, r, data);
      dlg.close(); toast(row ? "Registro actualizado" : "Registro creado"); after();
    } catch (e) { formError.textContent = e.message; }
    finally { btn.disabled = false; }
  });

  // ---------- Configuración ----------
  function renderSettings() {
    const base = el("input", { type: "url", value: cfg.apiBaseUrl, required: true });
    const auth = el("input", { type: "text", value: cfg.authorization || "", placeholder: "Bearer <token> (opcional)" });
    const method = el("select", {}, ["PATCH", "PUT"].map((m) => el("option", { value: m, selected: cfg.updateMethod === m }, m)));
    const timeout = el("input", { type: "number", min: 1000, step: 500, value: cfg.timeoutMs });
    const res = el("textarea", { rows: 18, spellcheck: "false" }, JSON.stringify(cfg.resources.map(({ _inferred, ...x }) => x), null, 2));
    const err = el("p", { class: "error", role: "alert" });

    const save = () => {
      err.textContent = "";
      let resources;
      try {
        resources = JSON.parse(res.value);
        if (!Array.isArray(resources) || !resources.every((x) => x.key && x.path))
          throw new Error("Cada recurso requiere al menos 'key' y 'path'.");
        resources.forEach((x) => { x.idField = x.idField || "id"; x.label = x.label || x.key; x.fields = x.fields || []; });
      } catch (e) { err.textContent = "Recursos: " + e.message; return; }
      try { new URL(base.value); } catch (_) { err.textContent = "URL del backend inválida."; return; }
      saveConfig({ ...cfg, apiBaseUrl: base.value.trim(), authorization: auth.value.trim(),
        updateMethod: method.value, timeoutMs: Math.max(1000, Number(timeout.value) || 10000), resources });
      renderNav(); checkStatus(); toast("Configuración guardada");
    };

    view.replaceChildren(
      el("h1", {}, "⚙️ Configuración"),
      el("div", { class: "settings" },
        el("div", { class: "grid2" },
          el("label", {}, "URL base del backend", base),
          el("label", {}, "Cabecera Authorization", auth),
          el("label", {}, "Método de actualización", method),
          el("label", {}, "Timeout (ms)", timeout)),
        el("label", {}, "Recursos (JSON) — ajusta path / idField / fields a tu api_biblioteca", res),
        err,
        el("div", { class: "toolbar" },
          el("button", { class: "btn", type: "button", onclick: save }, "💾 Guardar"),
          el("button", { class: "btn secondary", type: "button", onclick: () => checkStatus() }, "🔌 Probar conexión"),
          el("button", { class: "btn secondary", type: "button", onclick: () => {
            const blob = new Blob([JSON.stringify(cfg, (k, v) => k === "_inferred" ? undefined : v, 2)], { type: "application/json" });
            const a = el("a", { href: URL.createObjectURL(blob), download: "biblioteca-web-config.json" }); a.click();
          } }, "⬇️ Exportar"),
          el("button", { class: "btn danger", type: "button", onclick: () => {
            if (!confirm("¿Restaurar configuración por defecto?")) return;
            localStorage.removeItem(STORAGE_KEY); cfg = loadConfig(); renderNav(); renderSettings(); checkStatus();
          } }, "↺ Restaurar"))
      )
    );
  }

  // ---------- Bitácora ----------
  function renderLogs() {
    const rows = Api.log.map((l) => el("tr", { class: "log" },
      el("td", {}, l.time.slice(11, 19)),
      el("td", {}, l.method),
      el("td", {}, l.url),
      el("td", {}, el("span", { class: "badge " + (l.error ? "fail" : l.status ? "ok" : "m") }, l.status ?? "—")),
      el("td", {}, l.ms + " ms"),
      el("td", {}, l.error || "")));
    view.replaceChildren(
      el("h1", {}, "🧾 Bitácora HTTP"),
      el("p", { class: "lbl" }, "Últimas 200 llamadas de esta sesión (solo en memoria)."),
      el("button", { class: "btn secondary", type: "button", onclick: renderLogs }, "↻ Actualizar"), el("br"), el("br"),
      rows.length ? el("table", {}, el("thead", {}, el("tr", {}, ["Hora", "Método", "URL", "Estado", "Tiempo", "Error"].map((h) => el("th", {}, h)))), el("tbody", {}, rows))
                  : el("div", { class: "empty" }, "Aún no hay llamadas.")
    );
  }

  function renderHelp() {
    view.replaceChildren(
      el("h1", {}, "❓ Ayuda rápida"),
      el("ol", {},
        el("li", {}, "Levanta api_biblioteca y su base de datos (ver README / docker-compose.yml)."),
        el("li", {}, "Habilita CORS en el backend (NestJS: app.enableCors({ origin: [...] }))."),
        el("li", {}, "En ⚙️ Configuración define la URL base y las rutas reales de los controladores."),
        el("li", {}, "Usa el Dashboard para validar que cada recurso responde."),
        el("li", {}, "Opera el CRUD desde cada recurso; revisa 🧾 Bitácora HTTP ante errores.")),
      el("p", {}, "Documentación completa en la carpeta docs/ del repositorio."));
  }

  // ---------- Arranque ----------
  window.addEventListener("hashchange", router);
  renderNav();
  router();
  checkStatus();
})();
