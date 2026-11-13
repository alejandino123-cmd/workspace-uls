<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// Muestra la foto del estudiante; si no tiene, o la imagen no carga, muestra la inicial.
const props = withDefaults(
  defineProps<{
    nombre: string
    fotoUrl?: string | null
    tamano?: string // cualquier medida CSS, por ejemplo "44px"
    alt?: string // vacío = decorativa (el nombre ya aparece al lado)
  }>(),
  { fotoUrl: null, tamano: '44px', alt: '' },
)

const fallo = ref(false)
watch(
  () => props.fotoUrl,
  () => (fallo.value = false),
)

const inicial = computed(() => props.nombre.trim().charAt(0).toUpperCase() || '?')
const mostrarFoto = computed(() => !!props.fotoUrl && !fallo.value)
</script>

<template>
  <span
    class="avatar"
    :style="{ width: tamano, height: tamano, fontSize: `calc(${tamano} * 0.4)` }"
  >
    <img
      v-if="mostrarFoto"
      :src="fotoUrl ?? undefined"
      :alt="alt"
      class="foto"
      loading="lazy"
      @error="fallo = true"
    />
    <template v-else>{{ inicial }}</template>
  </span>
</template>

<style scoped>
.avatar {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(110, 94, 224, 0.12);
  color: var(--ws-primario);
  font-weight: 700;
  line-height: 1;
}

.foto {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>