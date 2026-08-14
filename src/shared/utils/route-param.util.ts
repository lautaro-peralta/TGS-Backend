// ============================================================================
// ROUTE PARAM - Normalización de los parámetros de ruta
// ============================================================================

/**
 * Devuelve un parámetro de ruta como string.
 *
 * Desde `@types/express-serve-static-core` v5 el diccionario de parámetros está
 * tipado como `{ [key: string]: string | string[] }`: el array contempla las
 * rutas comodín (`/user/*id`), que son las únicas que pueden producir varios
 * segmentos. Este proyecto no declara ninguna, así que en la práctica siempre
 * llega un string; sin estrechar el tipo, `req.params.dni.trim()` y compañía no
 * compilan.
 *
 * El estrechamiento vive aquí y no repetido en cada controlador para que, si
 * algún día se añade una ruta comodín, haya un solo sitio que revisar.
 *
 * @param value - Valor tal como lo entrega `req.params`
 * @returns El primer segmento si llega un array; el valor tal cual si no
 */
export function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
