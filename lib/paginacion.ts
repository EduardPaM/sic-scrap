// Cada página respeta el límite habitual de PostgREST. El llamador ordena por una clave estable.
export async function leerPaginas<T>(consultar: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const filas: T[] = [];
  const tamano = 500;
  for (let desde = 0; ; desde += tamano) {
    const { data, error } = await consultar(desde, desde + tamano - 1);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < tamano) return filas;
    if (filas.length >= 100000) throw new Error('El rango supera 100,000 filas. Reduce las fechas para obtener un reporte completo.');
  }
}
