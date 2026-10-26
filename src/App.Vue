<script setup>
// @ts-nocheck
import { ref, computed, onMounted } from 'vue'

const paises = ref([])
const cargando = ref(true)
const error = ref(null)
const busqueda = ref('')

onMounted(async () => {
  try {
    // Usamos la ruta general limpia sin filtros de campos para máxima compatibilidad
    const res = await fetch('https://restcountries.com/v3.1/all')
    
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`)
    }
    
    const data = await res.json()
    paises.value = data
  } catch (err) {
    console.error('Detalle del error:', err)
    error.value = 'No fue posible obtener los datos de la API'
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

    <div v-if="cargando" class="estado">
      <p>Cargando países...</p>
    </div>

    <div v-else-if="error" class="estado error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="paisesFiltrados.length === 0" class="estado">
      <p>No se encontraron resultados para "{{ busqueda }}".</p>
    </div>

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