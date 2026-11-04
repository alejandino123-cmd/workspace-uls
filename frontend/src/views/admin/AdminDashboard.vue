<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import { evaluarProyecto, listarPendientes, type ProyectoPendiente } from '@/service/validaciones'
import { mensajeDeError } from '@/service/errores'

const pendientes = ref<ProyectoPendiente[]>([])
const cargando = ref(true)
const error = ref('')

// Diálogo de revisión
const revisionVisible = ref(false)
const seleccionado = ref<ProyectoPendiente | null>(null)
const comentario = ref('')
const errorRevision = ref('')
const enviando = ref(false)

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    pendientes.value = await listarPendientes()
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudieron cargar los proyectos pendientes')
  } finally {
    cargando.value = false
  }
}

function revisar(p: ProyectoPendiente) {
  seleccionado.value = p
  comentario.value = ''
  errorRevision.value = ''
  revisionVisible.value = true
}

async function evaluar(estado: 'VALIDADO' | 'RECHAZADO') {
  if (!seleccionado.value) return

  const texto = comentario.value.trim()
  if (estado === 'RECHAZADO' && !texto) {
    errorRevision.value = 'Al rechazar un proyecto debes explicar el motivo'
    return
  }

  enviando.value = true
  errorRevision.value = ''
  try {
    await evaluarProyecto(seleccionado.value.id, {
      estado,
      ...(texto ? { comentario: texto } : {}),
    })
    revisionVisible.value = false
    await cargar()
  } catch (e) {
    errorRevision.value = mensajeDeError(e, 'No se pudo guardar la evaluación')
    // Si otra persona ya lo evaluó (409), la lista local quedó desactualizada
    await cargar()
  } finally {
    enviando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1 class="page-title">Validaciones</h1>
        <p class="page-lead">Proyectos de estudiantes pendientes de revisión, del más antiguo al más reciente.</p>
      </div>
      <Tag v-if="!cargando" :value="`${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}`" severity="warn" />
    </header>

    <Message v-if="error" severity="error" :closable="false" class="aviso">{{ error }}</Message>

    <div class="tabla-card">
      <DataTable :value="pendientes" :loading="cargando" data-key="id">
        <template #empty>
          <div class="vacio">
            <span class="vacio-icono"><i class="pi pi-check-circle"></i></span>
            <p class="vacio-titulo">No hay proyectos pendientes</p>
            <p class="vacio-texto">Cuando un estudiante cree o edite un proyecto, aparecerá aquí.</p>
          </div>
        </template>

        <Column header="Proyecto">
          <template #body="{ data }">
            <div class="proy-titulo">{{ data.titulo }}</div>
            <div class="proy-meta">Enviado {{ fecha(data.createdAt) }}</div>
          </template>
        </Column>

        <Column header="Estudiante">
          <template #body="{ data }">
            <div class="proy-titulo">{{ data.estudiante.nombre }}</div>
            <div class="proy-meta">Carnet: {{ data.estudiante.carnet ?? 'sin registrar' }}</div>
          </template>
        </Column>

        <Column header="" style="width: 9rem">
          <template #body="{ data }">
            <Button label="Revisar" icon="pi pi-eye" size="small" outlined @click="revisar(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="revisionVisible"
      modal
      header="Revisar proyecto"
      :style="{ width: '42rem' }"
      :breakpoints="{ '720px': '95vw' }"
    >
      <div v-if="seleccionado" class="revision">
        <h2 class="rev-titulo">{{ seleccionado.titulo }}</h2>

        <dl class="rev-autor">
          <div>
            <dt>Estudiante</dt>
            <dd>{{ seleccionado.estudiante.nombre }}</dd>
          </div>
          <div>
            <dt>Carnet</dt>
            <dd>{{ seleccionado.estudiante.carnet ?? 'Sin registrar' }}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{{ seleccionado.estudiante.email }}</dd>
          </div>
        </dl>

        <h3 class="rev-sub">Descripción</h3>
        <p class="rev-texto">{{ seleccionado.descripcion }}</p>

        <template v-if="seleccionado.tecnologias.length">
          <h3 class="rev-sub">Tecnologías</h3>
          <div class="rev-tags">
            <Tag v-for="t in seleccionado.tecnologias" :key="t" :value="t" severity="secondary" />
          </div>
        </template>

        <h3 class="rev-sub">Enlaces</h3>
        <ul class="rev-enlaces">
          <li v-if="seleccionado.urlRepositorio">
            <a :href="seleccionado.urlRepositorio" target="_blank" rel="noopener noreferrer">Repositorio</a>
          </li>
          <li v-if="seleccionado.urlDemo">
            <a :href="seleccionado.urlDemo" target="_blank" rel="noopener noreferrer">Demo</a>
          </li>
          <li v-if="seleccionado.urlDocumentacion">
            <a :href="seleccionado.urlDocumentacion" target="_blank" rel="noopener noreferrer">Documentación</a>
          </li>
          <li
            v-if="!seleccionado.urlRepositorio && !seleccionado.urlDemo && !seleccionado.urlDocumentacion"
            class="rev-sin"
          >
            El estudiante no agregó enlaces.
          </li>
        </ul>

        <div class="campo">
          <label for="comentario">Comentario</label>
          <Textarea id="comentario" v-model="comentario" rows="3" auto-resize maxlength="1000" fluid />
          <small>Opcional al validar. Obligatorio al rechazar: el estudiante lo verá en su proyecto.</small>
        </div>

        <Message v-if="errorRevision" severity="error" size="small" :closable="false">{{ errorRevision }}</Message>
      </div>

      <template #footer>
        <Button label="Cancelar" text severity="secondary" :disabled="enviando" @click="revisionVisible = false" />
        <Button
          label="Rechazar"
          icon="pi pi-times"
          severity="danger"
          outlined
          :disabled="enviando"
          @click="evaluar('RECHAZADO')"
        />
        <Button label="Validar" icon="pi pi-check" severity="success" :loading="enviando" @click="evaluar('VALIDADO')" />
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

/* Diálogo de revisión */
.revision {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rev-titulo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.rev-autor {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border: 1px solid #e7e5ec;
  border-radius: 8px;
}

.rev-autor dt {
  font-size: 0.8rem;
  color: #64748b;
}

.rev-autor dd {
  margin: 0.1rem 0 0 0;
  font-weight: 600;
  color: #1e293b;
  overflow-wrap: anywhere;
}

.rev-sub {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0.5rem 0 0 0;
}

.rev-texto {
  margin: 0;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
}

.rev-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.rev-enlaces {
  margin: 0;
  padding-left: 1.1rem;
}

.rev-enlaces a {
  color: #804bdf;
}

.rev-sin {
  color: #64748b;
  list-style: none;
  margin-left: -1.1rem;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.campo label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
}

.campo small {
  color: #64748b;
}
</style>