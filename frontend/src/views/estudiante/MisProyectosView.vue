<script setup lang="ts">
import TecnologiaChip from '@/components/tecnologias/TecnologiaChip.vue'
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import ProyectoFormDialog from '@/components/proyectos/ProyectoFormDialog.vue'
import { useActualizarProyecto, useEliminarProyecto, useMisProyectos } from '@/queries/proyectos'
import type { EstadoValidacion, Proyecto } from '@/service/proyectos'
import { mensajeDeError } from '@/service/errores'

// Datos con TanStack Query: caché, estado de carga y error, y reintento automático
const { data, isPending, isError, error, refetch } = useMisProyectos()
const proyectos = computed<Proyecto[]>(() => data.value ?? [])

const actualizar = useActualizarProyecto()
const eliminar = useEliminarProyecto()

const errorAccion = ref('')

// Formulario (crear / editar)
const formVisible = ref(false)
const editando = ref<Proyecto | null>(null)

// Detalle de solo lectura
const detalleVisible = ref(false)
const detalle = ref<Proyecto | null>(null)

// Confirmación para eliminar
const confirmarVisible = ref(false)
const aBorrar = ref<Proyecto | null>(null)

const ESTADOS: Record<EstadoValidacion, { label: string; severity: 'warn' | 'success' | 'danger' }> = {
  PENDIENTE: { label: 'Pendiente', severity: 'warn' },
  VALIDADO: { label: 'Validado', severity: 'success' },
  RECHAZADO: { label: 'Rechazado', severity: 'danger' },
}

const MAX_CHIPS = 3

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

function abrirNuevo() {
  editando.value = null
  formVisible.value = true
}

function abrirEditar(p: Proyecto) {
  editando.value = p
  formVisible.value = true
}

function abrirDetalle(p: Proyecto) {
  detalle.value = p
  detalleVisible.value = true
}

function pedirBorrado(p: Proyecto) {
  aBorrar.value = p
  confirmarVisible.value = true
}

async function borrar() {
  if (!aBorrar.value) return
  errorAccion.value = ''
  try {
    await eliminar.mutateAsync(aBorrar.value.id)
    confirmarVisible.value = false
  } catch (e) {
    confirmarVisible.value = false
    errorAccion.value = mensajeDeError(e, 'No se pudo eliminar el proyecto')
  }
}

// Solo se puede publicar un proyecto ya validado
async function cambiarPublicado(p: Proyecto, valor: boolean) {
  errorAccion.value = ''
  try {
    await actualizar.mutateAsync({ id: p.id, datos: { publicado: valor } })
  } catch (e) {
    errorAccion.value = mensajeDeError(e, 'No se pudo cambiar la publicación')
  }
}

// Mientras se cambia la publicación de un proyecto, solo ese interruptor se bloquea
const cambiandoId = computed(() => (actualizar.isPending.value ? actualizar.variables.value?.id : undefined))
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1 class="page-title">Mis proyectos</h1>
        <p class="page-lead">Administra tus proyectos, su revisión y su publicación en el portafolio.</p>
      </div>
      <Button label="Subir proyecto" icon="pi pi-upload" @click="abrirNuevo" />
    </header>

    <Message v-if="errorAccion" severity="error" :closable="false" class="aviso">{{ errorAccion }}</Message>

    <Message v-if="isError" severity="error" :closable="false" class="aviso">
      {{ mensajeDeError(error, 'No se pudieron cargar tus proyectos') }}
      <Button label="Reintentar" text size="small" class="reintentar" @click="refetch()" />
    </Message>

    <div class="tabla-card">
      <DataTable :value="proyectos" :loading="isPending" data-key="id" striped-rows>
        <template #empty>
          <div class="vacio">
            <span class="vacio-icono"><i class="pi pi-folder-open"></i></span>
            <p class="vacio-titulo">Todavía no tienes proyectos</p>
            <p class="vacio-texto">Sube el primero con el botón “Subir proyecto”.</p>
          </div>
        </template>

        <Column header="ID" style="width: 2rem">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>

        <Column header="Proyecto">
          <template #body="{ data }">
            <div class="proy-titulo">{{ data.titulo }}</div>
            <div class="proy-descripcion">{{ data.descripcion }}</div>
          </template>
        </Column>

        <Column header="Tecnologías" style="width: 14rem">
          <template #body="{ data }">
            <div class="chips">
              <TecnologiaChip v-for="t in data.tecnologias.slice(0, MAX_CHIPS)" :key="t" :nombre="t" tamano="normal" />
              <span v-if="data.tecnologias.length > MAX_CHIPS" class="mas">+{{ data.tecnologias.length - MAX_CHIPS }}</span>
            </div>
          </template>
        </Column>

        <Column header="Validación" style="width: 13rem">
          <template #body="{ data }">
            <Tag
              :value="ESTADOS[data.estadoValidacion as EstadoValidacion].label"
              :severity="ESTADOS[data.estadoValidacion as EstadoValidacion].severity"
            />
            <p v-if="data.validacion?.comentario" class="proy-comentario">{{ data.validacion.comentario }}</p>
          </template>
        </Column>

        <Column header="Publicado" style="width: 6.5rem">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="data.publicado"
              :disabled="data.estadoValidacion !== 'VALIDADO' || cambiandoId === data.id"
              :aria-label="`Publicar ${data.titulo}`"
              @update:model-value="(v: boolean) => cambiarPublicado(data, v)"
            />
          </template>
        </Column>

        <Column header="Fecha" style="width: 7.5rem">
          <template #body="{ data }">{{ fecha(data.createdAt) }}</template>
        </Column>

        <Column header="Acciones" style="width: 13rem">
          <template #body="{ data }">
            <div class="acciones">
              <Button label="Ver" icon="pi pi-eye" text size="small" @click="abrirDetalle(data)" />
              <Button label="Editar" icon="pi pi-pencil" text size="small" severity="secondary" @click="abrirEditar(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" :aria-label="`Eliminar ${data.titulo}`" @click="pedirBorrado(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <p class="nota">Solo los proyectos validados por la coordinación pueden publicarse en tu portafolio.</p>

    <ProyectoFormDialog v-model:visible="formVisible" :proyecto="editando" @guardado="refetch()" />

    <Dialog
      v-model:visible="detalleVisible"
      modal
      :header="detalle?.titulo"
      :style="{ width: '36rem' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <div v-if="detalle" class="detalle">
        <Tag
          :value="ESTADOS[detalle.estadoValidacion as EstadoValidacion].label"
          :severity="ESTADOS[detalle.estadoValidacion as EstadoValidacion].severity"
        />
        <p class="detalle-texto">{{ detalle.descripcion }}</p>

        <template v-if="detalle.tecnologias.length">
          <h3 class="detalle-sub">Tecnologías</h3>
          <div class="chips">
            <TecnologiaChip v-for="t in detalle.tecnologias" :key="t" :nombre="t" />
          </div>
        </template>

        <h3 class="detalle-sub">Enlaces</h3>
        <ul class="enlaces">
          <li v-if="detalle.urlRepositorio"><a :href="detalle.urlRepositorio" target="_blank" rel="noopener noreferrer">Repositorio</a></li>
          <li v-if="detalle.urlDemo"><a :href="detalle.urlDemo" target="_blank" rel="noopener noreferrer">Demo</a></li>
          <li v-if="detalle.urlDocumentacion"><a :href="detalle.urlDocumentacion" target="_blank" rel="noopener noreferrer">Documentación</a></li>
          <li v-if="!detalle.urlRepositorio && !detalle.urlDemo && !detalle.urlDocumentacion" class="sin">Sin enlaces</li>
        </ul>

        <template v-if="detalle.validacion?.comentario">
          <h3 class="detalle-sub">Comentario de la coordinación</h3>
          <p class="detalle-texto">{{ detalle.validacion.comentario }}</p>
        </template>
      </div>
      <template #footer>
        <Button label="Cerrar" text severity="secondary" @click="detalleVisible = false" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="confirmarVisible"
      modal
      header="Eliminar proyecto"
      :style="{ width: '26rem' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <p class="confirmar-texto">
        ¿Seguro que quieres eliminar <strong>{{ aBorrar?.titulo }}</strong
        >? Esta acción no se puede deshacer.
      </p>
      <template #footer>
        <Button label="Cancelar" text severity="secondary" :disabled="eliminar.isPending.value" @click="confirmarVisible = false" />
        <Button label="Eliminar" severity="danger" :loading="eliminar.isPending.value" @click="borrar" />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.25rem 0;
}

.page-lead {
  color: var(--ws-texto-suave);
  margin: 0;
}

.aviso {
  margin-bottom: 1rem;
}

.reintentar {
  margin-left: 0.5rem;
}

.tabla-card {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(31, 28, 75, 0.16);
  overflow-x: auto;
}

.proy-titulo {
  font-weight: 600;
  color: var(--ws-texto);
}

.proy-descripcion {
  font-size: 0.85rem;
  color: var(--ws-texto-suave);
  margin-top: 0.15rem;
  max-width: 28rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proy-comentario {
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
  margin: 0.35rem 0 0 0;
  max-width: 16rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.chip {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  color: var(--ws-texto);
}

.mas {
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
}

.acciones {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.vacio {
  text-align: center;
  padding: 2.5rem 1rem;
}

.vacio-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(110, 94, 224, 0.12);
  color: var(--ws-primario);
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.vacio-titulo {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.3rem 0;
}

.vacio-texto {
  color: var(--ws-texto-suave);
  margin: 0;
}

.nota {
  color: var(--ws-texto-suave);
  font-size: 0.85rem;
  margin-top: 1rem;
}

.detalle {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detalle-texto {
  color: var(--ws-texto);
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
}

.detalle-sub {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0.5rem 0 0 0;
}

.enlaces {
  margin: 0;
  padding-left: 1.1rem;
}

.enlaces a {
  color: var(--ws-primario);
}

.enlaces .sin {
  color: var(--ws-texto-suave);
  list-style: none;
  margin-left: -1.1rem;
}

.confirmar-texto {
  margin: 0;
  color: var(--ws-texto);
}
</style>

<style scoped>
/* Tabla de proyectos: todas las columnas caben en el ancho de la tarjeta, sin desplazamiento horizontal */
.tabla-card :deep(.p-datatable table) {
  table-layout: fixed;
  width: 100%;
}

.tabla-card :deep(.p-datatable td) {
  overflow-wrap: anywhere;
  vertical-align: middle;
}

.tabla-card :deep(.acciones) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
