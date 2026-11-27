<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import OverlayBadge from 'primevue/overlaybadge'
import Popover from 'primevue/popover'
import { useAuthStore } from '@/stores/auth'
import { useMisProyectos } from '@/queries/proyectos'
import { fechaCorta } from '@/lib/formato'
import { guardarVistas, leerVistas, notificacionesDe, sinVer, type Notificacion } from '@/lib/notificaciones'

// Campana del estudiante: avisa de los proyectos rechazados, el motivo y el plazo para corregirlos.
const router = useRouter()
const authStore = useAuthStore()
const popover = ref()

// Se vuelve a consultar al volver a la pestaña (por defecto de TanStack Query)
const { data: proyectos } = useMisProyectos()

const userId = computed(() => authStore.user?.id ?? 0)
const vistas = ref<string[]>(leerVistas(userId.value))
watch(userId, (id) => (vistas.value = leerVistas(id)))

const notificaciones = computed(() => notificacionesDe(proyectos.value ?? []))
const nuevas = computed(() => sinVer(notificaciones.value, vistas.value))

function marcarVistas() {
  const claves = [...new Set([...vistas.value, ...notificaciones.value.map((n) => n.clave)])]
  vistas.value = claves
  guardarVistas(userId.value, claves)
}

function abrir(event: Event) {
  popover.value.toggle(event)
  marcarVistas()
}

function irAlProyecto(n: Notificacion) {
  popover.value.hide()
  router.push('/mis-proyectos')
}
</script>

<template>
  <div class="campana">
    <OverlayBadge v-if="nuevas.length" :value="nuevas.length" severity="danger" size="small">
      <Button
        type="button"
        text
        rounded
        severity="secondary"
        icon="pi pi-bell"
        :aria-label="`Notificaciones: ${nuevas.length} sin leer`"
        @click="abrir"
      />
    </OverlayBadge>
    <Button
      v-else
      type="button"
      text
      rounded
      severity="secondary"
      icon="pi pi-bell"
      aria-label="Notificaciones"
      @click="abrir"
    />

    <Popover ref="popover">
      <div class="panel">
        <h2 class="panel-titulo">Notificaciones</h2>

        <p v-if="!notificaciones.length" class="vacio">No tienes notificaciones.</p>

        <ul v-else class="lista">
          <li v-for="n in notificaciones" :key="n.clave">
            <button type="button" class="item" @click="irAlProyecto(n)">
              <i class="pi pi-times-circle icono"></i>
              <span class="cuerpo">
                <strong>Tu proyecto «{{ n.titulo }}» fue rechazado</strong>
                <span v-if="n.motivo" class="motivo">Motivo: {{ n.motivo }}</span>
                <span v-if="n.fechaLimite" class="plazo" :class="{ vencido: n.plazo?.vencido }">
                  Corrígelo y envíalo antes del {{ fechaCorta(n.fechaLimite) }}
                  <template v-if="n.plazo"> · {{ n.plazo.texto }}</template>
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.campana {
  display: inline-flex;
  margin-right: 0.25rem;
}

.panel {
  width: min(22rem, 85vw);
}

.panel-titulo {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.6rem;
}

.vacio {
  color: var(--ws-texto-suave);
  margin: 0;
  font-size: 0.9rem;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 20rem;
  overflow-y: auto;
}

.item {
  display: flex;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
  padding: 0.6rem;
  border: 1px solid var(--ws-borde);
  border-radius: 8px;
  background: transparent;
  color: var(--ws-texto);
  cursor: pointer;
}

.item:hover {
  background: color-mix(in srgb, var(--ws-primario) 12%, transparent);
}

.icono {
  color: var(--p-red-400, #f87171);
  margin-top: 0.15rem;
}

.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}

.motivo {
  color: var(--ws-texto-suave);
}

.plazo {
  color: var(--p-orange-300, #fdba74);
}

.plazo.vencido {
  color: var(--p-red-400, #f87171);
}
</style>
