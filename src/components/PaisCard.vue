<script setup>
import { computed, ref } from 'vue'
import { formatearPoblacion } from '../utils/paises'

const props = defineProps({
  pais: {
    type: Object,
    required: true,
  },
})

const poblacion = computed(() => formatearPoblacion(props.pais.poblacion))
const errorBandera = ref(false)
</script>

<template>
  <article class="tarjeta" :aria-label="`Ficha de ${pais.nombre}`">
    <div class="bandera-container">
      <!-- v-bind: enlace dinámico de atributos HTML -->
      <img
        v-if="pais.bandera && !errorBandera"
        :src="pais.bandera"
        :alt="pais.banderaAlt || `Bandera de ${pais.nombre}`"
        :title="`Bandera de ${pais.nombre}`"
        loading="lazy"
        decoding="async"
        @error="errorBandera = true"
      />
      <div v-else class="bandera-placeholder" aria-hidden="true">🏳️</div>

      <span class="chip-region">{{ pais.region }}</span>
      <span v-if="pais.origen === 'api'" class="chip-api">Dato de la API</span>
    </div>

    <div class="tarjeta-info">
      <h2>{{ pais.nombre }}</h2>
      <p v-if="pais.nombreOficial && pais.nombreOficial !== pais.nombre" class="nombre-oficial">
        {{ pais.nombreOficial }}
      </p>

      <dl class="datos">
        <div class="dato">
          <dt>Capital</dt>
          <dd v-if="pais.capital">{{ pais.capital }}</dd>
          <dd v-else class="sin-dato">No disponible</dd>
        </div>
        <div class="dato">
          <dt>Región</dt>
          <dd>{{ pais.region }}</dd>
        </div>
        <div class="dato">
          <dt>Población</dt>
          <dd>{{ poblacion }}</dd>
        </div>
      </dl>

      <p v-if="pais.codigo2" class="codigo-pais">ISO {{ pais.codigo2 }}</p>
    </div>
  </article>
</template>
