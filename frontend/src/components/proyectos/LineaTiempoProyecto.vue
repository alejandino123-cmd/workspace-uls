<script setup lang="ts">
// Línea de tiempo de un proyecto (solo Coordinación): envíos, rechazos con su plazo, correcciones y publicación
import { ref, watch } from 'vue'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { obtenerHistorial, type EventoHistorial, mensajeDeError } from '@/service'
import { EVENTOS } from '@/lib/proyectos'
import { fechaCorta } from '@/lib/formato'

const props = defineProps<{ proyectoId: number }>()

const eventos = ref<EventoHistorial[]>([])
const cargando = ref(false)
const error = ref('')

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

async function cargar(id: number) {
  cargando.value = true
  error.value = ''
  try {
    eventos.value = await obtenerHistorial(id)
  } catch (e) {
    eventos.value = []
    error.value = mensajeDeError(e, 'No se pudo cargar la línea de tiempo')
  } finally {
    cargando.value = false
  }
}

watch(() => props.proyectoId, cargar, { immediate: true })
</script>

<template>
  <div class="linea">
    <p v-if="cargando" class="linea-estado"><i class="pi pi-spin pi-spinner"></i> Cargando historial…</p>
    <Message v-else-if="error" severity="error" size="small" :closable="false">{{ error }}</Message>
    <p v-else-if="!eventos.length" class="linea-estado">Sin eventos registrados.</p>

    <ol v-else class="linea-lista" aria-label="Línea de tiempo del proyecto">
      <li v-for="e in eventos" :key="e.id" class="linea-item" :data-evento="e.evento">
        <span class="linea-punto" :style="{ background: EVENTOS[e.evento].color }">
          <i :class="EVENTOS[e.evento].icon"></i>
        </span>
        <div class="linea-cuerpo">
          <div class="linea-cabecera">
            <strong>{{ EVENTOS[e.evento].label }}</strong>
            <Tag v-if="e.fueraDePlazo" value="Fuera de plazo" severity="danger" />
          </div>
          <div class="linea-meta">
            {{ fechaCorta(e.createdAt) }}, {{ hora(e.createdAt) }}
            <template v-if="e.actor"> · {{ e.actor.nombre }}</template>
          </div>
          <p v-if="e.comentario" class="linea-comentario">“{{ e.comentario }}”</p>
          <p v-if="e.fechaLimite" class="linea-plazo">
            <i class="pi pi-calendar"></i> Plazo para corregir: {{ fechaCorta(e.fechaLimite) }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.linea-estado {
  color: var(--ws-texto-suave);
  font-size: 0.9rem;
  margin: 0;
}

.linea-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.linea-item {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding-bottom: 1rem;
}

/* Línea vertical que une los eventos */
.linea-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 0.875rem;
  top: 1.75rem;
  bottom: 0;
  width: 2px;
  background: var(--ws-borde);
}

.linea-punto {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
}

.linea-cabecera {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ws-texto);
}

.linea-meta {
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
  margin-top: 0.1rem;
}

.linea-comentario {
  margin: 0.35rem 0 0 0;
  color: var(--ws-texto);
  font-size: 0.9rem;
  white-space: pre-wrap;
}

.linea-plazo {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
}
</style>
