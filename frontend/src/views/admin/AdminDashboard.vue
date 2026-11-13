<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import {
  evaluarProyecto,
  listarPendientes,
  listarValidados,
  marcarDestacado,
  type ProyectoPendiente,
  type ProyectoValidado,
} from '@/service/validaciones'
import { mensajeDeError } from '@/service/errores'

const pendientes = ref<ProyectoPendiente[]>([])
const cargando = ref(true)
const error = ref('')

// Pestaña activa y proyectos ya validados
const vista = ref<'pendientes' | 'validados'>('pendientes')
const validados = ref<ProyectoValidado[]>([])
const cargandoValidados = ref(false)
const errorValidados = ref('')

// Diálogo de revisión (en modo lectura para los validados)
const revisionVisible = ref(false)
const soloLectura = ref(false)
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

async function cargarValidados() {
  cargandoValidados.value = true
  errorValidados.value = ''
  try {
    validados.value = await listarValidados()
  } catch (e) {
    errorValidados.value = mensajeDeError(e, 'No se pudieron cargar los proyectos validados')
  } finally {
    cargandoValidados.value = false
  }
}

// Marca o quita un proyecto como destacado en la portada de portafolios
async function cambiarDestacado(p: ProyectoValidado, valor: boolean) {
  errorValidados.value = ''
  try {
    await marcarDestacado(p.id, valor)
    await cargarValidados()
  } catch (e) {
    errorValidados.value = mensajeDeError(e, 'No se pudo cambiar el destacado')
  }
}

function cambiarVista(nueva: 'pendientes' | 'validados') {
  vista.value = nueva
  if (nueva === 'validados') cargarValidados()
}

function revisar(p: ProyectoPendiente, lectura = false) {
  seleccionado.value = p
  soloLectura.value = lectura
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
        <p class="page-lead">
          {{ vista === 'pendientes'
            ? 'Proyectos de estudiantes pendientes de revisión, del más antiguo al más reciente.'
            : 'Proyectos que ya fueron validados, con los datos de su estudiante.' }}
        </p>
      </div>
      <Tag v-if="vista === 'pendientes' && !cargando" :value="`${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}`" severity="warn" />
      <Tag v-else-if="vista === 'validados' && !cargandoValidados" :value="`${validados.length} validado${validados.length === 1 ? '' : 's'}`" severity="success" />
    </header>

    <div class="pestanas">
      <Button label="Pendientes" icon="pi pi-clock" :outlined="vista !== 'pendientes'" @click="cambiarVista('pendientes')" />
      <Button label="Validados" icon="pi pi-check-circle" :outlined="vista !== 'validados'" @click="cambiarVista('validados')" />
    </div>

    <Message v-if="vista === 'pendientes' && error" severity="error" :closable="false" class="aviso">{{ error }}</Message>
    <Message v-if="vista === 'validados' && errorValidados" severity="error" :closable="false" class="aviso">{{ errorValidados }}</Message>

    <div v-if="vista === 'validados'" class="tabla-card">
      <DataTable :value="validados" :loading="cargandoValidados" data-key="id">
        <template #empty>
          <div class="vacio">
            <span class="vacio-icono"><i class="pi pi-inbox"></i></span>
            <p class="vacio-titulo">Aún no hay proyectos validados</p>
            <p class="vacio-texto">Los proyectos que valides aparecerán aquí.</p>
          </div>
        </template>

        <Column header="Proyecto">
          <template #body="{ data }">
            <div class="proy-titulo">{{ data.titulo }}</div>
            <div class="proy-meta">Validado el {{ fecha(data.validacion?.createdAt ?? data.updatedAt) }}</div>
          </template>
        </Column>

        <Column header="Estudiante">
          <template #body="{ data }">
            <div class="proy-titulo">
              <RouterLink :to="'/admin/estudiantes/' + data.estudiante.id">{{ data.estudiante.nombre }}</RouterLink>
            </div>
            <div class="proy-meta">Carnet: {{ data.estudiante.carnet ?? 'sin registrar' }}</div>
            <div class="proy-meta">{{ data.estudiante.email }}</div>
          </template>
        </Column>

        <Column header="Destacado">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="data.destacado"
              :aria-label="`Destacar ${data.titulo}`"
              @update:model-value="(v: boolean) => cambiarDestacado(data, v)"
            />
          </template>
        </Column>

        <Column header="" style="width: 9rem">
          <template #body="{ data }">
            <Button label="Ver" icon="pi pi-eye" size="small" outlined @click="revisar(data, true)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <div v-else class="tabla-card">
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
            <div class="proy-titulo">
              <RouterLink :to="'/admin/estudiantes/' + data.estudiante.id">{{ data.estudiante.nombre }}</RouterLink>
            </div>
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
      :header="soloLectura ? 'Proyecto validado' : 'Revisar proyecto'"
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

        <template v-if="soloLectura">
          <div v-if="seleccionado.validacion?.comentario" class="campo">
            <label>Comentario de la validación</label>
            <p class="rev-texto">{{ seleccionado.validacion.comentario }}</p>
          </div>
        </template>

        <template v-else>
          <div class="campo">
            <label for="comentario">Comentario</label>
            <Textarea id="comentario" v-model="comentario" rows="3" auto-resize maxlength="1000" fluid />
            <small>Opcional al validar. Obligatorio al rechazar: el estudiante lo verá en su proyecto.</small>
          </div>

          <Message v-if="errorRevision" severity="error" size="small" :closable="false">{{ errorRevision }}</Message>
        </template>
      </div>

      <template v-if="soloLectura" #footer>
        <Button label="Cerrar" text severity="secondary" @click="revisionVisible = false" />
      </template>
      <template v-else #footer>
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
  padding-left: 1rem;
  border-left: 4px solid var(--ws-azul);
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

.pestanas {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tabla-card {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.36);
  overflow-x: auto;
}

.proy-titulo {
  font-weight: 600;
  color: var(--ws-texto);
}

.proy-meta {
  font-size: 0.85rem;
  color: var(--ws-texto-suave);
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
  background: rgba(55, 129, 252, 0.12);
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

/* Diálogo de revisión */
.revision {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rev-titulo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0;
}

.rev-autor {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0.85rem 1rem;
  background: var(--ws-fondo);
  border: 1px solid var(--ws-borde);
  border-radius: 8px;
}

.rev-autor dt {
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
}

.rev-autor dd {
  margin: 0.1rem 0 0 0;
  font-weight: 600;
  color: var(--ws-texto);
  overflow-wrap: anywhere;
}

.rev-sub {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0.5rem 0 0 0;
}

.rev-texto {
  margin: 0;
  color: var(--ws-texto);
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
  color: var(--ws-primario);
}

.rev-sin {
  color: var(--ws-texto-suave);
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
  color: var(--ws-texto);
}

.campo small {
  color: var(--ws-texto-suave);
}
</style>