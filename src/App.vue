<script setup>
// @ts-nocheck
import { ref, computed, onMounted, watch } from 'vue'
import PaisCard from './components/PaisCard.vue'
import EstadoMensaje from './components/EstadoMensaje.vue'
import {
  REGIONES_ORDEN,
  normalizarPaisAPI,
  combinarPaises,
  normalizarTexto,
} from './utils/paises'

/* Endpoint solicitado en la consigna. La primera petición se hace con fetch()
   dentro de onMounted(). */
const API_URL =
  'https://api.restcountries.com/countries/v5?q=Canada&api-key=rc_live_demo&pretty=1'

/* Catálogo oficial de respaldo. Se genera desde el dataset de REST Countries
   con `npm run datos` y se sirve como archivo estático. */
const CATALOGO_URL = `${import.meta.env.BASE_URL}data/paises.json`

// Variables reactivas con ref()
const parametrosURL = new URLSearchParams(window.location.search)
const paises = ref([])
const cargando = ref(true)
const error = ref('')
const aviso = ref('')
const avisoCerrado = ref(false)
const busqueda = ref(parametrosURL.get('q') || '')
const regionActiva = ref(parametrosURL.get('region') || 'Todas')
const ordenSeleccionado = ref(parametrosURL.get('orden') || 'nombre')

// Primera llamada a la API dentro de onMounted()
onMounted(async () => {
  let paisesAPI = []
  let apiRespondio = false

  try {
    // Petición asíncrona con fetch() a la API REST Countries v5
    const respuesta = await fetch(API_URL)
    if (!respuesta.ok) {
      throw new Error(`La API respondió con estado ${respuesta.status}`)
    }

    const json = await respuesta.json()
    const lista = (json.data?.objects || []).map(normalizarPaisAPI)

    if (lista.length === 0) {
      throw new Error('La API no devolvió países')
    }

    paisesAPI = lista
    apiRespondio = true
  } catch (err) {
    console.warn('No se pudo consultar la API REST Countries v5:', err)
  }

  try {
    // Catálogo de respaldo: también se obtiene con fetch()
    const respuesta = await fetch(CATALOGO_URL)
    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar el catálogo (${respuesta.status})`)
    }

    const catalogo = await respuesta.json()
    paises.value = combinarPaises(paisesAPI, catalogo)

    if (!apiRespondio) {
      aviso.value =
        'La API v5 en modo demo restringe las peticiones desde el navegador. Se muestra el catálogo oficial de respaldo de REST Countries.'
    } else if (paisesAPI.length <= 1) {
      aviso.value =
        'La clave demo de la API v5 devuelve un país de muestra. El catálogo completo proviene del respaldo oficial de REST Countries.'
    }
  } catch (err) {
    console.error('No se pudo cargar el catálogo de respaldo:', err)

    if (paisesAPI.length > 0) {
      paises.value = paisesAPI
      aviso.value =
        'Solo se pudieron mostrar los datos de la API. El catálogo local no está disponible.'
    } else {
      error.value =
        'No fue posible obtener los datos de la API ni del catálogo de respaldo. Revisa tu conexión e inténtalo de nuevo.'
    }
  } finally {
    cargando.value = false
  }
})

// Mantiene los filtros en la URL para poder compartir una búsqueda
watch([busqueda, regionActiva, ordenSeleccionado], ([texto, region, orden]) => {
  const params = new URLSearchParams()
  if (texto) params.set('q', texto)
  if (region !== 'Todas') params.set('region', region)
  if (orden !== 'nombre') params.set('orden', orden)

  const query = params.toString()
  window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
})

// Regiones disponibles con su cantidad de países (v-for)
const regiones = computed(() => {
  const conteos = new Map()

  for (const pais of paises.value) {
    conteos.set(pais.region, (conteos.get(pais.region) || 0) + 1)
  }

  return REGIONES_ORDEN.filter(
    (region) => region === 'Todas' || conteos.has(region),
  ).map((region) => ({
    nombre: region,
    total: region === 'Todas' ? paises.value.length : conteos.get(region),
  }))
})

// Filtro por nombre, capital o región + ordenamiento
const paisesFiltrados = computed(() => {
  const termino = normalizarTexto(busqueda.value)
  const region = regionActiva.value

  return paises.value
    .filter((pais) => {
      const coincideRegion = region === 'Todas' || pais.region === region
      if (!coincideRegion) return false
      if (!termino) return true

      return [
        pais.nombre,
        pais.nombreIngles,
        pais.nombreOficial,
        pais.capital,
        pais.region,
      ].some((valor) => normalizarTexto(valor).includes(termino))
    })
    .sort((a, b) => {
      if (ordenSeleccionado.value === 'poblacion-desc') {
        return (b.poblacion ?? -1) - (a.poblacion ?? -1)
      }
      if (ordenSeleccionado.value === 'poblacion-asc') {
        return (a.poblacion ?? Number.MAX_SAFE_INTEGER) -
          (b.poblacion ?? Number.MAX_SAFE_INTEGER)
      }
      return a.nombre.localeCompare(b.nombre, 'es')
    })
})

const mensajeVacio = computed(() => {
  if (busqueda.value && regionActiva.value !== 'Todas') {
    return `No hay países que coincidan con “${busqueda.value}” en ${regionActiva.value}.`
  }
  if (busqueda.value) {
    return `No se encontraron países para “${busqueda.value}”. Prueba con otro nombre.`
  }
  return `No hay países registrados en ${regionActiva.value}.`
})

function seleccionarRegion(region) {
  regionActiva.value = region
}

function limpiarBusqueda() {
  busqueda.value = ''
}

function limpiarFiltros() {
  busqueda.value = ''
  regionActiva.value = 'Todas'
}

function recargar() {
  window.location.reload()
}
</script>

<template>
  <header class="cabecera">
    <div class="cabecera__contenido">
      <p class="eyebrow">Vue 3 · Consumo de API REST</p>
      <h1>🌍 Explorador de Países</h1>
      <p class="subtitulo">
        Consulta banderas, capitales, regiones y población de países de todo el
        mundo.
      </p>

      <ul class="estadisticas" aria-label="Resumen del catálogo">
        <li><strong>{{ paises.length || '—' }}</strong> países</li>
        <li><strong>6</strong> regiones</li>
        <li><strong>Vue 3</strong> + fetch()</li>
      </ul>
    </div>
  </header>

  <main class="contenedor" :aria-busy="cargando">
    <section class="panel-controles" aria-label="Buscador y filtros">
      <div class="fila-controles">
        <div class="buscador">
          <label for="busqueda" class="sr-only">Buscar país</label>
          <span class="buscador__icono" aria-hidden="true">🔎</span>

          <!-- v-model: enlace bidireccional del campo de búsqueda -->
          <input
            id="busqueda"
            v-model="busqueda"
            type="search"
            placeholder="Buscar por nombre, capital o región..."
            autocomplete="off"
          />

          <button
            v-if="busqueda"
            type="button"
            class="buscador__limpiar"
            aria-label="Limpiar búsqueda"
            @click="limpiarBusqueda"
          >
            ✕
          </button>
        </div>

        <div class="selector-orden">
          <label for="orden">Ordenar por</label>
          <!-- v-model en un select -->
          <select id="orden" v-model="ordenSeleccionado">
            <option value="nombre">Nombre (A-Z)</option>
            <option value="poblacion-desc">Mayor población</option>
            <option value="poblacion-asc">Menor población</option>
          </select>
        </div>
      </div>

      <!-- v-for: botones de filtro por región -->
      <div class="filtros-region" role="group" aria-label="Filtrar por región">
        <button
          v-for="region in regiones"
          :key="region.nombre"
          type="button"
          class="btn-region"
          :class="{ activo: regionActiva === region.nombre }"
          :aria-pressed="regionActiva === region.nombre"
          @click="seleccionarRegion(region.nombre)"
        >
          {{ region.nombre }}
          <span class="btn-region__total">{{ region.total }}</span>
        </button>
      </div>
    </section>

    <!-- v-if: aviso no bloqueante sobre la fuente de los datos -->
    <div v-if="aviso && !avisoCerrado" class="aviso" role="status">
      <span>ℹ️ {{ aviso }}</span>
      <button
        type="button"
        class="aviso__cerrar"
        aria-label="Cerrar aviso"
        @click="avisoCerrado = true"
      >
        ✕
      </button>
    </div>

    <!-- v-if: indicador de carga -->
    <EstadoMensaje
      v-if="cargando"
      tipo="cargando"
      titulo="Cargando países..."
      mensaje="Consultando la API REST Countries..."
    />

    <template v-else>
      <!-- v-if: error con opción de reintentar (try/catch) -->
      <EstadoMensaje
        v-if="error"
        tipo="error"
        titulo="No fue posible obtener los datos de la API"
        :mensaje="error"
      >
        <button type="button" class="btn-primario" @click="recargar">
          Reintentar
        </button>
      </EstadoMensaje>

      <template v-else>
        <div class="barra-resultados">
          <p class="contador-resultados" aria-live="polite">
            Mostrando <strong>{{ paisesFiltrados.length }}</strong> de
            {{ paises.length }} países
            <span v-if="busqueda">para “{{ busqueda }}”</span>
            <span v-if="regionActiva !== 'Todas'">en {{ regionActiva }}</span>
          </p>

          <button
            v-if="busqueda || regionActiva !== 'Todas'"
            type="button"
            class="btn-limpiar-filtros"
            @click="limpiarFiltros"
          >
            Limpiar filtros
          </button>
        </div>

        <!-- v-if: mensaje cuando no hay resultados -->
        <EstadoMensaje
          v-if="paisesFiltrados.length === 0"
          tipo="vacio"
          titulo="Sin resultados"
          :mensaje="mensajeVacio"
        >
          <button type="button" class="btn-primario" @click="limpiarFiltros">
            Ver todos los países
          </button>
        </EstadoMensaje>

        <!-- v-for: tarjetas de países -->
        <div v-else class="tarjetas-grid">
          <PaisCard
            v-for="pais in paisesFiltrados"
            :key="pais.codigo"
            :pais="pais"
          />
        </div>
      </template>
    </template>
  </main>

  <footer class="pie">
    <p>
      Proyecto académico de
      <strong>Vue 3</strong> que consume la
      <a
        href="https://restcountries.com/"
        target="_blank"
        rel="noopener noreferrer"
      >API REST Countries</a>.
    </p>
    <p class="pie__enlaces">
      <a
        href="https://github.com/gomezsanchezpaolakasumy-star/vue-api-restcountries"
        target="_blank"
        rel="noopener noreferrer"
      >Repositorio en GitHub</a>
      <span aria-hidden="true">·</span>
      <a
        href="https://gomezsanchezpaolakasumy-star.github.io/vue-api-restcountries/"
        target="_blank"
        rel="noopener noreferrer"
      >Sitio en GitHub Pages</a>
    </p>
  </footer>
</template>
