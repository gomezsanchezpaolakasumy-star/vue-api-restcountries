<script setup>
// @ts-nocheck
import { ref, computed, onMounted } from 'vue'

const paises = ref([])
const cargando = ref(true)
const error = ref(null)
const busqueda = ref('')
const regionSeleccionada = ref('')
const ordenSeleccionado = ref('nombre')

const regiones = ['Todas', 'Americas', 'Europe', 'Asia', 'Africa', 'Oceania']

const paisesRespaldo = [
  { name: { common: "México" }, capital: ["Ciudad de México"], region: "Americas", population: 128455567, flags: { svg: "https://flagcdn.com/mx.svg", png: "https://flagcdn.com/w320/mx.png" }, cca3: "MEX" },
  { name: { common: "Canadá" }, capital: ["Ottawa"], region: "Americas", population: 38246108, flags: { svg: "https://flagcdn.com/ca.svg", png: "https://flagcdn.com/w320/ca.png" }, cca3: "CAN" },
  { name: { common: "España" }, capital: ["Madrid"], region: "Europe", population: 47351567, flags: { svg: "https://flagcdn.com/es.svg", png: "https://flagcdn.com/w320/es.png" }, cca3: "ESP" },
  { name: { common: "Japón" }, capital: ["Tokio"], region: "Asia", population: 125584838, flags: { svg: "https://flagcdn.com/jp.svg", png: "https://flagcdn.com/w320/jp.png" }, cca3: "JPN" },
  { name: { common: "Argentina" }, capital: ["Buenos Aires"], region: "Americas", population: 45376763, flags: { svg: "https://flagcdn.com/ar.svg", png: "https://flagcdn.com/w320/ar.png" }, cca3: "ARG" },
  { name: { common: "Francia" }, capital: ["París"], region: "Europe", population: 67391582, flags: { svg: "https://flagcdn.com/fr.svg", png: "https://flagcdn.com/w320/fr.png" }, cca3: "FRA" },
  { name: { common: "Brasil" }, capital: ["Brasilia"], region: "Americas", population: 212559409, flags: { svg: "https://flagcdn.com/br.svg", png: "https://flagcdn.com/w320/br.png" }, cca3: "BRA" },
  { name: { common: "Alemania" }, capital: ["Berlín"], region: "Europe", population: 83240525, flags: { svg: "https://flagcdn.com/de.svg", png: "https://flagcdn.com/w320/de.png" }, cca3: "DEU" },
  { name: { common: "Australia" }, capital: ["Canberra"], region: "Oceania", population: 25688079, flags: { svg: "https://flagcdn.com/au.svg", png: "https://flagcdn.com/w320/au.png" }, cca3: "AUS" },
  { name: { common: "Colombia" }, capital: ["Bogotá"], region: "Americas", population: 50882884, flags: { svg: "https://flagcdn.com/co.svg", png: "https://flagcdn.com/w320/co.png" }, cca3: "COL" },
  { name: { common: "Italia" }, capital: ["Roma"], region: "Europe", population: 59554023, flags: { svg: "https://flagcdn.com/it.svg", png: "https://flagcdn.com/w320/it.png" }, cca3: "ITA" },
  { name: { common: "Corea del Sur" }, capital: ["Seúl"], region: "Asia", population: 51780579, flags: { svg: "https://flagcdn.com/kr.svg", png: "https://flagcdn.com/w320/kr.png" }, cca3: "KOR" }
]

onMounted(async () => {
  try {
    const res = await fetch('https://restcountries.com/v3.1/all')
    if (!res.ok) throw new Error('Error en la red')
    const data = await res.json()
    paises.value = data
  } catch (err) {
    paises.value = paisesRespaldo
  } finally {
    cargando.value = false
  }
})

// Filtrado avanzado combinado (v-model y botones de región)
const paisesFiltrados = computed(() => {
  let resultado = paises.value.filter(pais => {
    const nombre = pais.name?.common?.toLowerCase() || ''
    const region = pais.region?.toLowerCase() || ''
    const filtro = busqueda.value.toLowerCase()

    const coincideBusqueda = nombre.includes(filtro) || region.includes(filtro)
    const coincideRegion = !regionSeleccionada.value || 
      regionSeleccionada.value === 'Todas' || 
      pais.region?.toLowerCase() === regionSeleccionada.value.toLowerCase()

    return coincideBusqueda && coincideRegion
  })

  // Ordenamiento dinámico
  return resultado.sort((a, b) => {
    if (ordenSeleccionado.value === 'nombre') {
      return (a.name?.common || '').localeCompare(b.name?.common || '')
    } else if (ordenSeleccionado.value === 'poblacion-desc') {
      return (b.population || 0) - (a.population || 0)
    } else if (ordenSeleccionado.value === 'poblacion-asc') {
      return (a.population || 0) - (b.population || 0)
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
    <h1>Explorador de Países</h1>

    <!-- Controles avanzados: Búsqueda, Filtros de Región y Ordenamiento -->
    <div class="controles">
      <div class="buscador-y-orden">
        <input 
          type="text" 
          v-model="busqueda" 
          placeholder="🔎 Buscar por nombre de país o región..."
        />
        
        <select v-model="ordenSeleccionado" class="select-orden">
          <option value="nombre">Ordenar por Nombre (A-Z)</option>
          <option value="poblacion-desc">Mayor Población</option>
          <option value="poblacion-asc">Menor Población</option>
        </select>
      </div>

      <!-- Botones de filtro rápido por región -->
      <div class="filtros-region">
        <button 
          v-for="reg in ['Todas', ...regiones.filter(r => r !== 'Todas')]" 
          :key="reg" 
          :class="['btn-region', { activo: (regionSeleccionada === reg) || (!regionSeleccionada && reg === 'Todas') }]"
          @click="seleccionarRegion(reg)"
        >
          {{ reg }}
        </button>
      </div>

      <!-- 📊 Contador dinámico de resultados -->
      <p class="contador-resultados" v-if="!cargando">
        Mostrando <strong>{{ paisesFiltrados.length }}</strong> países
      </p>
    </div>

    <!-- Indicador de carga con v-if -->
    <div v-if="cargando" class="estado">
      <p>⏳ Cargando países...</p>
    </div>

    <!-- Mensaje si no hay resultados -->
    <div v-else-if="paisesFiltrados.length === 0" class="estado">
      <p>🔍 No se encontraron resultados para "{{ busqueda }}".</p>
    </div>

    <!-- Lista de países con v-for -->
    <div v-else class="tarjetas-grid">
      <div 
        v-for="pais in paisesFiltrados" 
        :key="pais.cca3 || pais.name?.common" 
        class="tarjeta"
      >
        <div class="bandera-container">
          <img :src="pais.flags?.svg || pais.flags?.png" :alt="`Bandera de ${pais.name?.common}`" />
        </div>
        <div class="tarjeta-info">
          <h2>{{ pais.name?.common }}</h2>
          <p><strong>Capital:</strong> {{ pais.capital ? pais.capital[0] : 'N/A' }}</p>
          <p><strong>Región:</strong> {{ pais.region }}</p>
          <p><strong>Población:</strong> {{ pais.population?.toLocaleString() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import './assets/style.css';
</style>