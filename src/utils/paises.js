const REGIONES = {
  Africa: 'África',
  Americas: 'América',
  Antarctic: 'Antártida',
  Asia: 'Asia',
  Europe: 'Europa',
  Oceania: 'Oceanía',
}

const REGIONES_ORDEN = ['Todas', 'América', 'Europa', 'Asia', 'África', 'Oceanía', 'Antártida']

export { REGIONES_ORDEN }

/** Convierte un texto a minúsculas y sin tildes para comparar búsquedas. */
export function normalizarTexto(texto = '') {
  return String(texto)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function traducirRegion(region = '') {
  return REGIONES[region] || region || 'Sin región'
}

/**
 * Normaliza un país recibido de la API REST Countries v5 al formato
 * que utilizan las tarjetas de la aplicación.
 */
export function normalizarPaisAPI(pais = {}) {
  const nombre =
    pais.names?.translations?.spa?.common ||
    pais.names?.common ||
    'País sin nombre'

  return {
    codigo: pais.codes?.alpha_3 || pais.codes?.alpha_2 || nombre,
    codigo2: pais.codes?.alpha_2 || '',
    nombre,
    nombreOficial:
      pais.names?.translations?.spa?.official || pais.names?.official || nombre,
    nombreIngles: pais.names?.common || '',
    capital: (pais.capitals || []).map((capital) => capital?.name).filter(Boolean).join(' / '),
    region: traducirRegion(pais.region),
    poblacion: Number.isFinite(pais.population) ? pais.population : null,
    bandera: pais.flag?.url_png || pais.flag?.url_svg || '',
    banderaAlt: pais.flag?.description || `Bandera de ${nombre}`,
    origen: 'api',
  }
}

/**
 * Une el país o los países obtenidos de la API con el catálogo local.
 * Si un país existe en ambos, se conservan los datos de la API.
 */
export function combinarPaises(paisesAPI = [], catalogo = []) {
  const mapa = new Map()

  for (const pais of catalogo) {
    mapa.set(pais.codigo, { ...pais, origen: 'catalogo' })
  }

  for (const pais of paisesAPI) {
    const anterior = mapa.get(pais.codigo) || {}
    mapa.set(pais.codigo, { ...anterior, ...pais })
  }

  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function formatearPoblacion(poblacion) {
  if (!Number.isFinite(poblacion)) return 'No disponible'
  return new Intl.NumberFormat('es-ES').format(poblacion)
}
