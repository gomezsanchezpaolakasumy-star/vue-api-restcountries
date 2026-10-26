<script setup>
// @ts-nocheck
import { ref, computed, onMounted } from 'vue'

// Variables reactivas con ref()
const paises = ref([])
const cargando = ref(true)
const error = ref(null)
const busqueda = ref('')
const regionSeleccionada = ref('')
const ordenSeleccionado = ref('nombre')

const regiones = ['Todas', 'Americas', 'Europe', 'Asia', 'Africa', 'Oceania']

// Datos de respaldo en caso de que la API falle
const paisesRespaldo = [
  { nombre: "México", capital: "Ciudad de México", region: "Americas", poblacion: 128455567, bandera: "https://flagcdn.com/w320/mx.png", codigo: "MEX" },
  { nombre: "Canadá", capital: "Ottawa", region: "Americas", poblacion: 38246108, bandera: "https://flagcdn.com/w320/ca.png", codigo: "CAN" },
  { nombre: "España", capital: "Madrid", region: "Europe", poblacion: 47351567, bandera: "https://flagcdn.com/w320/es.png", codigo: "ESP" },
  { nombre: "Japón", capital: "Tokio", region: "Asia", poblacion: 125584838, bandera: "https://flagcdn.com/w320/jp.png", codigo: "JPN" },
  { nombre: "Argentina", capital: "Buenos Aires", region: "Americas", poblacion: 45376763, bandera: "https://flagcdn.com/w320/ar.png", codigo: "ARG" },
  { nombre: "Francia", capital: "París", region: "Europe", poblacion: 67391582, bandera: "https://flagcdn.com/w320/fr.png", codigo: "FRA" },
  { nombre: "Brasil", capital: "Brasilia", region: "Americas", poblacion: 212559409, bandera: "https://flagcdn.com/w320/br.png", codigo: "BRA" },
  { nombre: "Alemania", capital: "Berlín", region: "Europe", poblacion: 83240525, bandera: "https://flagcdn.com/w320/de.png", codigo: "DEU" },
  { nombre: "Australia", capital: "Canberra", region: "Oceania", poblacion: 25688079, bandera: "https://flagcdn.com/w320/au.png", codigo: "AUS" },
  { nombre: "Colombia", capital: "Bogotá", region: "Americas", poblacion: 50882884, bandera: "https://flagcdn.com/w320/co.png", codigo: "COL" },
  { nombre: "Italia", capital: "Roma", region: "Europe", poblacion: 59554023, bandera: "https://flagcdn.com/w320/it.png", codigo: "ITA" },
  { nombre: "Corea del Sur", capital: "Seúl", region: "Asia", poblacion: 51780579, bandera: "https://flagcdn.com/w320/kr.png", codigo: "KOR" },
  { nombre: "Perú", capital: "Lima", region: "Americas", poblacion: 33359418, bandera: "https://flagcdn.com/w320/pe.png", codigo: "PER" },
  { nombre: "Chile", capital: "Santiago", region: "Americas", poblacion: 19458310, bandera: "https://flagcdn.com/w320/cl.png", codigo: "CHL" },
  { nombre: "Estados Unidos", capital: "Washington D.C.", region: "Americas", poblacion: 331893745, bandera: "https://flagcdn.com/w320/us.png", codigo: "USA" },
  { nombre: "Reino Unido", capital: "Londres", region: "Europe", poblacion: 67886011, bandera: "https://flagcdn.com/w320/gb.png", codigo: "GBR" },
  { nombre: "China", capital: "Pekín", region: "Asia", poblacion: 1402112000, bandera: "https://flagcdn.com/w320/cn.png", codigo: "CHN" },
  { nombre: "India", capital: "Nueva Delhi", region: "Asia", poblacion: 1380004385, bandera: "https://flagcdn.com/w320/in.png", codigo: "IND" },
  { nombre: "Egipto", capital: "El Cairo", region: "Africa", poblacion: 102334404, bandera: "https://flagcdn.com/w320/eg.png", codigo: "EGY" },
  { nombre: "Nigeria", capital: "Abuya", region: "Africa", poblacion: 206139589, bandera: "https://flagcdn.com/w320/ng.png", codigo: "NGA" },
  { nombre: "Sudáfrica", capital: "Pretoria", region: "Africa", poblacion: 59308690, bandera: "https://flagcdn.com/w320/za.png", codigo: "ZAF" },
  { nombre: "Nueva Zelanda", capital: "Wellington", region: "Oceania", poblacion: 5084300, bandera: "https://flagcdn.com/w320/nz.png", codigo: "NZL" },
  { nombre: "Rusia", capital: "Moscú", region: "Europe", poblacion: 145912025, bandera: "https://flagcdn.com/w320/ru.png", codigo: "RUS" },
  { nombre: "Portugal", capital: "Lisboa", region: "Europe", poblacion: 10196709, bandera: "https://flagcdn.com/w320/pt.png", codigo: "PRT" }
]

/**
 * Función para normalizar los datos de la API v5 al formato interno.
 * La API v5 usa una estructura diferente a la v3.1:
 *   - names.common  → nombre
 *   - capitals[0].name → capital
 *   - region → region
 *   - population → poblacion
 *   - flag.url_png / flag.url_svg → bandera
 *   - codes.alpha_3 → codigo
 */
function normalizarPais(pais) {
  return {
    nombre: pais.names?.common || pais.nombre || 'Desconocido',
    capital: pais.capitals?.[0]?.name || pais.capital || 'N/A',
    region: pais.region || 'Desconocida',
    poblacion: pais.population || pais.poblacion || 0,
    bandera: pais.flag?.url_png || pais.flag?.url_svg || pais.bandera || '',
    codigo: pais.codes?.alpha_3 || pais.codigo || pais.nombres?.common || ''
  }
}

// Petición con fetch() dentro de onMounted()
onMounted(async () => {
  try {
    // Consumo de la API REST Countries v5 con fetch()
    const res = await fetch('https://api.restcountries.com/countries/v5?api-key=rc_live_demo&pretty=1')
    if (!res.ok) throw new Error('Error en la red')
    const json = await res.json()

    // La API v5 devuelve los datos dentro de data.objects
    const datos = json.data?.objects || []

    if (datos.length > 0) {
      // Normalizar datos de la API v5 al formato interno
      const paisesAPI = datos.map(normalizarPais)
      // Combinar con datos de respaldo para tener más países
      const codigosAPI = new Set(paisesAPI.map(p => p.codigo))
      const respaldoExtra = paisesRespaldo.filter(p => !codigosAPI.has(p.codigo))
      paises.value = [...paisesAPI, ...respaldoExtra]
    } else {
      throw new Error('La API no devolvió datos')
    }
  } catch (err) {
    // Manejo de errores con try/catch
    error.value = 'No fue posible obtener los datos de la API. Mostrando datos de respaldo.'
    paises.value = paisesRespaldo
  } finally {
    cargando.value = false
  }
})

// Filtrado avanzado combinado con computed (usa v-model y botones de región)
const paisesFiltrados = computed(() => {
  let resultado = paises.value.filter(pais => {
    const nombre = pais.nombre?.toLowerCase() || ''
    const region = pais.region?.toLowerCase() || ''
    const filtro = busqueda.value.toLowerCase()

    // El filtro busca por nombre del país o por región
    const coincideBusqueda = nombre.includes(filtro) || region.includes(filtro)
    const coincideRegion = !regionSeleccionada.value || 
      regionSeleccionada.value === 'Todas' || 
      pais.region?.toLowerCase() === regionSeleccionada.value.toLowerCase()

    return coincideBusqueda && coincideRegion
  })

  // Ordenamiento dinámico
  return resultado.sort((a, b) => {
    if (ordenSeleccionado.value === 'nombre') {
      return (a.nombre || '').localeCompare(b.nombre || '')
    } else if (ordenSeleccionado.value === 'poblacion-desc') {
      return (b.poblacion || 0) - (a.poblacion || 0)
    } else if (ordenSeleccionado.value === 'poblacion-asc') {
      return (a.poblacion || 0) - (b.poblacion || 0)
    }
    return 0
  })
})

const seleccionarRegion = (reg) => {
  regionSeleccionada.value = reg === 'Todas' ? '' : reg
}
</script>

<template>
  <div class="contenedor">
    <!-- 🟢 Título del proyecto -->
    <h1>🌍 Explorador de Países</h1>

    <!-- Controles: Búsqueda con v-model, Filtros de Región y Ordenamiento -->
    <div class="controles">
      <div class="buscador-y-orden">
        <!-- ⚙️ v-model para filtrar países por nombre o región -->
        <input 
          type="text" 
          v-model="busqueda" 
          placeholder="🔎 Buscar por nombre de país o región..."
        />
        
        <!-- v-model en select para ordenamiento -->
        <select v-model="ordenSeleccionado" class="select-orden">
          <option value="nombre">Ordenar por Nombre (A-Z)</option>
          <option value="poblacion-desc">Mayor Población</option>
          <option value="poblacion-asc">Menor Población</option>
        </select>
      </div>

      <!-- 🧩 v-for en botones de filtro rápido por región -->
      <div class="filtros-region">
        <button 
          v-for="reg in regiones" 
          :key="reg" 
          :class="['btn-region', { activo: (regionSeleccionada === reg) || (!regionSeleccionada && reg === 'Todas') }]"
          @click="seleccionarRegion(reg)"
        >
          {{ reg }}
        </button>
      </div>

      <!-- 📊 Contador dinámico de resultados con v-if -->
      <p class="contador-resultados" v-if="!cargando">
        Mostrando <strong>{{ paisesFiltrados.length }}</strong> países
      </p>
    </div>

    <!-- ⏳ Indicador de carga con v-if -->
    <div v-if="cargando" class="estado">
      <div class="spinner"></div>
      <p>⏳ Cargando países...</p>
    </div>

    <!-- Contenido principal (solo cuando ya no está cargando) -->
    <template v-else>
      <!-- 🚨 Mensaje de error con v-if (try/catch) -->
      <div v-if="error" class="estado error">
        <p>⚠️ {{ error }}</p>
      </div>

      <!-- 🔍 Mensaje si no hay resultados con v-if -->
      <div v-if="paisesFiltrados.length === 0" class="estado">
        <p>🔍 No se encontraron resultados para "{{ busqueda }}".</p>
      </div>

      <!-- 🌍 Lista/tarjetas de países con v-for -->
      <div v-else class="tarjetas-grid">
        <div 
          v-for="pais in paisesFiltrados" 
          :key="pais.codigo" 
          class="tarjeta"
        >
          <div class="bandera-container">
            <!-- v-bind (:src y :alt) para enlace dinámico de atributos -->
            <img :src="pais.bandera" :alt="'Bandera de ' + pais.nombre" />
          </div>
          <div class="tarjeta-info">
            <h2>{{ pais.nombre }}</h2>
            <p><strong>Capital:</strong> {{ pais.capital }}</p>
            <p><strong>Región:</strong> {{ pais.region }}</p>
            <p><strong>Población:</strong> {{ pais.poblacion?.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
@import './assets/style.css';
</style>
