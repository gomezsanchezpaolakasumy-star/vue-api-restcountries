/**
 * Genera el catálogo local de respaldo a partir del conjunto de datos
 * oficial de REST Countries (repositorio restcountries/restcountries).
 *
 * Uso:
 *   node scripts/generar-datos.mjs
 *
 * El archivo resultante se publica en public/data/paises.json y se consume
 * con fetch() desde la aplicación cuando la API v5 no está disponible
 * (por ejemplo, por la restricción CORS de la clave demo).
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ORIGEN =
  'https://raw.githubusercontent.com/restcountries/restcountries/master/src/main/resources/countriesV3.1.json'
const DESTINO = resolve(__dirname, '../public/data/paises.json')

const REGIONES = {
  Africa: 'África',
  Americas: 'América',
  Antarctic: 'Antártida',
  Asia: 'Asia',
  Europe: 'Europa',
  Oceania: 'Oceanía',
}

const respuesta = await fetch(ORIGEN)
if (!respuesta.ok) {
  throw new Error(`No se pudo descargar el dataset: ${respuesta.status}`)
}

const crudo = await respuesta.json()

const paises = crudo
  .map((pais) => {
    const nombre = pais.translations?.spa?.common || pais.name.common
    return {
      codigo: pais.cca3,
      codigo2: pais.cca2,
      nombre,
      nombreOficial: pais.translations?.spa?.official || pais.name.official,
      nombreIngles: pais.name.common,
      capital: pais.capital?.join(' / ') || '',
      region: REGIONES[pais.region] || pais.region || 'Sin región',
      poblacion: Number.isFinite(pais.population) ? pais.population : null,
      bandera: pais.cca2
        ? `https://flagcdn.com/w320/${pais.cca2.toLowerCase()}.png`
        : pais.flags?.png || pais.flags?.svg || '',
      banderaAlt: `Bandera de ${nombre}`,
    }
  })
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

await mkdir(dirname(DESTINO), { recursive: true })
await writeFile(DESTINO, `${JSON.stringify(paises, null, 2)}\n`, 'utf8')

console.log(`✅ ${paises.length} países guardados en ${DESTINO}`)
