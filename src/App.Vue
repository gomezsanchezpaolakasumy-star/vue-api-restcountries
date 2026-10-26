<script setup>
// @ts-nocheck
import { ref, computed, onMounted } from 'vue'

const paises = ref([])
const cargando = ref(true)
const error = ref(null)
const busqueda = ref('')

// Datos de respaldo garantizados por si la red o la API externa bloquean el fetch en GitHub Pages
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
    // Si falla el fetch por restricciones del servidor, cargamos el respaldo automáticamente
    console.warn('Usando datos de respaldo locales por restricción de red.')
    paises.value = paisesRespaldo
  } finally {
    cargando.value = false
  }
})

const paisesFiltrados = computed(() => {
  return paises.value.filter(pais => {
    const nombre = pais.name?.common?.toLowerCase() || ''
    const region = pais.region?.toLowerCase() || ''
    const filtro = busqueda.value.toLowerCase()
    
    return nombre.includes(filtro) || region.includes(filtro)
  })
})
</script>

<template>
  <div class="contenedor">
    <h1>Explorador de Países</h1>

    <div class="buscador">
      <input 
        type="text" 
        v-model="busqueda" 
        placeholder="Filtrar por nombre del país o región..."
      />
    </div>

    <!-- Indicador de carga con v-if -->
    <div v-if="cargando" class="estado">
      <p>Cargando países...</p>
    </div>

    <!-- Mensaje si no hay resultados con v-else-if -->
    <div v-else-if="paisesFiltrados.length === 0" class="estado">
      <p>No se encontraron resultados para "{{ busqueda }}".</p>
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