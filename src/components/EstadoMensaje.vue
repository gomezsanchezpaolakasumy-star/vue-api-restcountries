<script setup>
import { computed } from 'vue'

const props = defineProps({
  tipo: {
    type: String,
    default: 'info',
    validator: (valor) => ['cargando', 'error', 'vacio', 'info'].includes(valor),
  },
  titulo: {
    type: String,
    default: '',
  },
  mensaje: {
    type: String,
    default: '',
  },
})

const icono = computed(() => {
  if (props.tipo === 'error') return '⚠️'
  if (props.tipo === 'vacio') return '🔍'
  return 'ℹ️'
})
</script>

<template>
  <section
    class="estado"
    :class="`estado--${tipo}`"
    role="status"
    aria-live="polite"
  >
    <div v-if="tipo === 'cargando'" class="spinner" aria-hidden="true"></div>
    <div v-else class="estado__icono" aria-hidden="true">{{ icono }}</div>

    <h2 v-if="titulo" class="estado__titulo">{{ titulo }}</h2>
    <p v-if="mensaje" class="estado__mensaje">{{ mensaje }}</p>

    <slot />
  </section>
</template>
