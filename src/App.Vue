<script setup lang="js">
import { ref, computed, onMounted } from 'vue'

const paises = ref([])
const cargando = ref(true)
const error = ref(null)
const busqueda = ref('')

onMounted(async () => {
  try {
    const res = await fetch('https://api.restcountries.com/countries/v5?q=Canada&api-key=rc_live_demo&pretty=1')
    
    if (!res.ok) {
      throw new Error('No fue posible obtener los datos de la API')
    }
    
    const data = await res.json()
    paises.value = data
  } catch (err) {
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
        :key="pais.cca3 || pais.name.common" 
        class="tarjeta"
      >
        <img :src="pais.flags?.svg || pais.flags?.png" :alt="`Bandera de ${pais.name?.common}`" />
        <h2>{{ pais.name?.common }}</h2>
        <p><strong>Capital:</strong> {{ pais.capital ? pais.capital[0] : 'N/A' }}</p>
        <p><strong>Región:</strong> {{ pais.region }}</p>
        <p><strong>Población:</strong> {{ pais.population?.toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<style>
@import './assets/style.css';
</style>
