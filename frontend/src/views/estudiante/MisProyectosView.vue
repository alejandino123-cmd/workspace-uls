<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import ProyectoFormDialog from '@/components/proyectos/ProyectoFormDialog.vue'
import {
  actualizarProyecto,
  eliminarProyecto,
  listarMisProyectos,
  type EstadoValidacion,
  type Proyecto,
} from '@/service/proyectos'
import { mensajeDeError } from '@/service/errores'

const proyectos = ref<Proyecto[]>([])
const cargando = ref(true)
const error = ref('')

// Formulario (crear / editar)
const formVisible = ref(false)
const editando = ref<Proyecto | null>(null)

// Confirmación para eliminar
const confirmarVisible = ref(false)
const aBorrar = ref<Proyecto | null>(null)
const borrando = ref(false)

// Id del proyecto cuyo interruptor de publicación está en proceso
const cambiandoId = ref<number | null>(null)

const ESTADOS: Record<EstadoValidacion, { label: string; severity: 'warn' | 'success' | 'danger' }> = {
  PENDIENTE: { label: 'Pendiente', severity: 'warn' },
  VALIDADO: { label: 'Validado', severity: 'success' },
  RECHAZADO: { label: 'Rechazado', severity: 'danger' },
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    proyectos.value = await listarMisProyectos()
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudieron cargar tus proyectos')
  } finally {
    cargando.value = false
  }
}

function abrirNuevo() {
  editando.value = null
  formVisible.value = true
}

function abrirEditar(p: Proyecto) {
  editando.value = p
  formVisible.value = true
}

function pedirBorrado(p: Proyecto) {
  aBorrar.value = p
  confirmarVisible.value = true
}

async function borrar() {
  if (!aBorrar.value) return
  borrando.value = true
  try {
    await eliminarProyecto(aBorrar.value.id)
    confirmarVisible.value = false
    await cargar()
  } catch (e) {
    confirmarVisible.value = false
    error.value = mensajeDeError(e, 'No se pudo eliminar el proyecto')
  } finally {
    borrando.value = false
  }
}

// Solo se puede publicar un proyecto ya validado
async function cambiarPublicado(p: Proyecto, valor: boolean) {
  cambiandoId.value = p.id
  error.value = ''
  try {
    const actualizado = await actualizarProyecto(p.id, { publicado: valor })
    proyectos.value = proyectos.value.map((x) => (x.id === p.id ? actualizado : x))
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo cambiar la publicación')
  } finally {
    cambiandoId.value = null
  }
}

onMounted(cargar)
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1 class="page-title">Mis proyectos</h1>
        <p class="page-lead">Crea tus proyectos, sigue su revisión y publica los que ya fueron validados.</p>
      </div>
      <Button label="Nuevo proyecto" icon="pi pi-plus" @click="abrirNuevo" />
    </header>

    <Message v-if="error" severity="error" :closable="false" class="aviso">{{ error }}</Message>

    <div class="tabla-card">
      <DataTable :value="proyectos" :loading="cargando" data-key="id">
        <template #empty>
          <div class="vacio">
            <span class="vacio-icono"><i class="pi pi-folder-open"></i></span>
            <p class="vacio-titulo">Todavía no tienes proyectos</p>
            <p class="vacio-texto">Crea el primero con el botón “Nuevo proyecto”.</p>
          </div>
        </template>

        <Column header="Proyecto">
          <template #body="{ data }">
            <div class="proy-titulo">{{ data.titulo }}</div>
            <div class="proy-meta">Actualizado {{ fecha(data.updatedAt) }}</div>
          </template>
        </Column>

        <Column header="Estado">
          <template #body="{ data }">
            <Tag
              :value="ESTADOS[data.estadoValidacion as EstadoValidacion].label"
              :severity="ESTADOS[data.estadoValidacion as EstadoValidacion].severity"
            />
            <p v-if="data.validacion?.comentario" class="proy-comentario">
              {{ data.validacion.comentario }}
            </p>
          </template>
        </Column>

        <Column header="Publicado">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="data.publicado"
              :disabled="data.estadoValidacion !== 'VALIDADO' || cambiandoId === data.id"
              :aria-label="`Publicar ${data.titulo}`"
              @update:model-value="(v: boolean) => cambiarPublicado(data, v)"
            />
          </template>
        </Column>

        <Column header="" style="width: 7rem">
          <template #body="{ data }">
            <div class="acciones">
              <Button
                icon="pi pi-pencil"
                text
                rounded
                severity="secondary"
                :aria-label="`Editar ${data.titulo}`"
                @click="abrirEditar(data)"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                :aria-label="`Eliminar ${data.titulo}`"
                @click="pedirBorrado(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <p class="nota">Solo los proyectos validados por la coordinación pueden publicarse en tu portafolio.</p>

    <ProyectoFormDialog v-model:visible="formVisible" :proyecto="editando" @guardado="cargar" />

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
        <Button label="Cancelar" text severity="secondary" :disabled="borrando" @click="confirmarVisible = false" />
        <Button label="Eliminar" severity="danger" :loading="borrando" @click="borrar" />
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
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.page-lead {
  color: #64748b;
  margin: 0;
}

.aviso {
  margin-bottom: 1rem;
}

.tabla-card {
  background: #fff;
  border: 1px solid #e7e5ec;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(58, 53, 65, 0.1);
  overflow-x: auto;
}

.proy-titulo {
  font-weight: 600;
  color: #1e293b;
}

.proy-meta {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.proy-comentario {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0.4rem 0 0 0;
  max-width: 28ch;
}

.acciones {
  display: flex;
  justify-content: flex-end;
}

.nota {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0.75rem 0 0 0;
}

.confirmar-texto {
  margin: 0;
  color: #1e293b;
  line-height: 1.5;
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
  background: rgba(145, 85, 253, 0.12);
  color: #9155fd;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.vacio-titulo {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.3rem 0;
}

.vacio-texto {
  color: #64748b;
  margin: 0;
}
</style>