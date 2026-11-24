/**
 * Mock de api_biblioteca (Node.js puro, sin dependencias).
 * Sirve para probar el frontend SIN el backend real.
 *   node mock/server.js            -> http://localhost:3000
 *   PORT=4000 node mock/server.js
 * Endpoints: GET/POST /<recurso>, GET/PATCH/PUT/DELETE /<recurso>/:id
 * Datos en memoria (se pierden al reiniciar).
 */
const http = require("http");
const PORT = Number(process.env.PORT || 3000);

const db = {
  autores:    [{ id: 1, nombre: "Gabriel García Márquez", nacionalidad: "Colombiana" },
               { id: 2, nombre: "Isabel Allende", nacionalidad: "Chilena" }],
  categorias: [{ id: 1, nombre: "Novela" }, { id: 2, nombre: "Ensayo" }],
  libros:     [{ id: 1, titulo: "Cien años de soledad", isbn: "9780307474728", anio: 1967, autorId: 1, categoriaId: 1, stock: 3 },
               { id: 2, titulo: "La casa de los espíritus", isbn: "9788401242267", anio: 1982, autorId: 2, categoriaId: 1, stock: 2 }],
  usuarios:   [{ id: 1, nombre: "Ana Quispe", email: "ana@example.com", activo: true }],
  prestamos:  [{ id: 1, libroId: 1, usuarioId: 1, fechaPrestamo: "2026-11-20", fechaDevolucion: "2026-11-27", estado: "ACTIVO" }]
};
const seq = Object.fromEntries(Object.entries(db).map(([k, v]) => [k, v.length + 1]));

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);
  const parts = new URL(req.url, "http://x").pathname.split("/").filter(Boolean);
  if (parts[0] === "api") parts.shift(); // soporta prefijo /api
  if (!parts.length) return send(res, 200, { status: "ok", service: "mock api_biblioteca", resources: Object.keys(db) });

  const [name, id] = parts;
  const table = db[name];
  if (!table) return send(res, 404, { statusCode: 404, error: "Not Found", message: `Cannot ${req.method} /${name}` });

  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on("end", () => {
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { statusCode: 400, error: "Bad Request", message: "JSON inválido" }); }
    const idx = id ? table.findIndex((r) => String(r.id) === id) : -1;

    switch (req.method) {
      case "GET":
        if (!id) return send(res, 200, table);
        return idx < 0 ? send(res, 404, { statusCode: 404, message: "No encontrado" }) : send(res, 200, table[idx]);
      case "POST": {
        if (id) return send(res, 405, { statusCode: 405, message: "Method Not Allowed" });
        const item = { ...body, id: seq[name]++ };
        table.push(item); return send(res, 201, item);
      }
      case "PATCH": case "PUT":
        if (idx < 0) return send(res, 404, { statusCode: 404, message: "No encontrado" });
        table[idx] = req.method === "PUT" ? { ...body, id: table[idx].id } : { ...table[idx], ...body, id: table[idx].id };
        return send(res, 200, table[idx]);
      case "DELETE":
        if (idx < 0) return send(res, 404, { statusCode: 404, message: "No encontrado" });
        return send(res, 200, table.splice(idx, 1)[0]);
      default:
        return send(res, 405, { statusCode: 405, message: "Method Not Allowed" });
    }
  });
}).listen(PORT, () => console.log(`Mock api_biblioteca escuchando en http://localhost:${PORT}`));
