/**
 * Configuración por defecto del cliente.
 *
 * Prioridad (de mayor a menor):
 *   1. Configuración guardada desde la pantalla ⚙️ Configuración (localStorage)
 *   2. window.ENV (js/env.js, generado automáticamente en Docker a partir de API_BASE_URL)
 *   3. Valores de este archivo
 *
 * AJUSTA "resources" a las rutas reales de tus controladores en api_biblioteca.
 * Si un recurso no existe en el backend, simplemente aparecerá con error en el Dashboard.
 */
window.DEFAULT_CONFIG = {
  apiBaseUrl: (window.ENV && window.ENV.API_BASE_URL) || "http://localhost:3000",

  // Cabecera opcional de autenticación (ej. "Bearer eyJ..."). Vacío = sin auth.
  authorization: "",

  // Método usado para actualizar. NestJS CLI (nest g resource) genera PATCH por defecto.
  updateMethod: "PATCH",

  timeoutMs: 10000,

  // Recursos REST expuestos por el backend.
  // - path: ruta relativa a apiBaseUrl
  // - idField: campo identificador (id, id_libro, idLibro, etc.)
  // - fields: opcional. Si se deja vacío, los campos se infieren del primer registro devuelto.
  //   Formato: [{ name: "titulo", type: "text|number|date|email|boolean|json", required: true }]
  resources: [
    { key: "libros",     label: "Libros",     icon: "📘", path: "/libros",     idField: "id", fields: [] },
    { key: "autores",    label: "Autores",    icon: "✍️", path: "/autores",    idField: "id", fields: [] },
    { key: "categorias", label: "Categorías", icon: "🏷️", path: "/categorias", idField: "id", fields: [] },
    { key: "usuarios",   label: "Usuarios",   icon: "👤", path: "/usuarios",   idField: "id", fields: [] },
    { key: "prestamos",  label: "Préstamos",  icon: "🔄", path: "/prestamos",  idField: "id", fields: [] }
  ]
};
