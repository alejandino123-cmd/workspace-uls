<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import {
  listarProyectosDeEstudiante,
  obtenerEstudianteCompleto,
  type EstudianteCompleto,
  type ProyectoDelEstudiante,
  mensajeDeError,
} from '@/service'
const route = useRoute()
const router = useRouter()

const detalle = ref<EstudianteCompleto | null>(null)
const proyectos = ref<ProyectoDelEstudiante[]>([])
const cargando = ref(true)
const error = ref('')

const ESTADOS = ['PENDIENTE', 'VALIDADO', 'RECHAZADO'] as const
const ESTADO_TEXTO: Record<string, string> = { PENDIENTE: 'Pendiente', VALIDADO: 'Validado', RECHAZADO: 'Rechazado' }
const ESTADO_SEVERIDAD: Record<string, 'warn' | 'success' | 'danger'> = {
  PENDIENTE: 'warn',
  VALIDADO: 'success',
  RECHAZADO: 'danger',
}
const DISPONIBILIDAD_TEXTO: Record<string, string> = {
  TIEMPO_COMPLETO: 'Tiempo completo',
  TIEMPO_PARCIAL: 'Tiempo parcial',
  SOLO_PROYECTOS: 'Solo proyectos',
}

const userId = computed(() => Number(route.params.id))
const disponibilidad = computed(() =>
  detalle.value?.perfil.disponibilidad ? DISPONIBILIDAD_TEXTO[detalle.value.perfil.disponibilidad] : 'Sin definir',
)

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const [perfil, lista] = await Promise.all([
      obtenerEstudianteCompleto(userId.value),
      listarProyectosDeEstudiante(userId.value),
    ])
    detalle.value = perfil
    proyectos.value = lista.proyectos
  } catch (e) {
    detalle.value = null
    error.value = mensajeDeError(e, 'No se pudo cargar el perfil del estudiante')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
// Si se cambia de estudiante sin salir de la vista, se vuelve a cargar
watch(() => route.params.id, cargar)
</script>

<template>
  <section>
    <Button label="Volver a estudiantes" icon="pi pi-arrow-left" text class="volver" @click="router.push('/admin/estudiantes')" />

    <Message v-if="error" severity="error" :closable="false" class="aviso">{{ error }}</Message>

    <template v-if="detalle">
      <header class="cabecera">
        <img v-if="detalle.perfil.fotoUrl" :src="detalle.perfil.fotoUrl" alt="" class="foto" />
        <div v-else class="foto foto-vacia"><i class="pi pi-user"></i></div>
        <div>
          <h1 class="nombre">{{ detalle.estudiante.nombre }}</h1>
          <p class="meta">{{ detalle.estudiante.email }}</p>
          <p class="meta">Carnet: {{ detalle.perfil.carnet ?? 'Sin registrar' }} · Registrado el {{ fecha(detalle.estudiante.createdAt) }}</p>
        </div>
      </header>

      <div class="grid">
        <section class="tarjeta">
          <h2 class="titulo-seccion">Perfil</h2>

          <div class="avance">
            <span>Avance</span>
            <strong>{{ detalle.perfil.porcentajeAvance }}%</strong>
          </div>
          <ProgressBar :value="detalle.perfil.porcentajeAvance" :show-value="false" />

          <dl class="datos">
            <div>
              <dt>Disponibilidad</dt>
              <dd>{{ disponibilidad }}</dd>
            </div>
          </dl>

          <h3 class="subtitulo">Habilidades</h3>
          <div v-if="detalle.perfil.habilidades.length" class="etiquetas">
            <Tag v-for="h in detalle.perfil.habilidades" :key="h" :value="h" severity="secondary" />
          </div>
          <p v-else class="vacio-texto">Sin habilidades registradas.</p>

          <h3 class="subtitulo">Historial académico</h3>
          <p class="texto">{{ detalle.perfil.historialAcademico || 'Sin historial registrado.' }}</p>
        </section>

        <section class="tarjeta">
          <h2 class="titulo-seccion">Proyectos</h2>
          <div class="conteo">
            <div v-for="estado in ESTADOS" :key="estado" class="cifra">
              <span class="cifra-numero">{{ detalle.proyectos[estado] }}</span>
              <span class="cifra-texto">{{ ESTADO_TEXTO[estado] }}</span>
            </div>
          </div>
        </section>
      </div>

      <section class="tarjeta">
        <h2 class="titulo-seccion">Portafolio completo</h2>
        <DataTable :value="proyectos" :loading="cargando" data-key="id">
          <template #empty>
            <p class="vacio-texto">Este estudiante aún no ha registrado proyectos.</p>
          </template>

          <Column header="Proyecto">
            <template #body="{ data }">
              <div class="proy-titulo">{{ data.titulo }}</div>
              <div class="proy-meta">Enviado {{ fecha(data.createdAt) }}</div>
            </template>
          </Column>

          <Column header="Estado">
            <template #body="{ data }">
              <Tag :value="ESTADO_TEXTO[data.estadoValidacion]" :severity="ESTADO_SEVERIDAD[data.estadoValidacion]" />
            </template>
          </Column>

          <Column header="Enlaces">
            <template #body="{ data }">
              <div class="enlaces">
                <a v-if="data.urlRepositorio" :href="data.urlRepositorio" target="_blank" rel="noopener noreferrer">Repositorio</a>
                <a v-if="data.urlDemo" :href="data.urlDemo" target="_blank" rel="noopener noreferrer">Demo</a>
                <a v-if="data.urlDocumentacion" :href="data.urlDocumentacion" target="_blank" rel="noopener noreferrer">Documentación</a>
                <span v-if="!data.urlRepositorio && !data.urlDemo && !data.urlDocumentacion" class="vacio-texto">Sin enlaces</span>
              </div>
            </template>
          </Column>

          <Column header="Comentario de validación">
            <template #body="{ data }">
              <span class="texto">{{ data.validacion?.comentario || '—' }}</span>
            </template>
          </Column>
        </DataTable>
      </section>
    </template>
  </section>
</template>

<style scoped>
.volver {
  margin-bottom: 0.5rem;
  padding-left: 0;
}

.aviso {
  margin-bottom: 1rem;
}

.cabecera {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.foto {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.foto-vacia {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(55, 129, 252, 0.12);
  color: var(--ws-primario);
  font-size: 2rem;
}

.nombre {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.25rem 0;
}

.meta {
  color: var(--ws-texto-suave);
  margin: 0.1rem 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.tarjeta {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.36);
  padding: 1.1rem 1.2rem;
  margin-bottom: 1rem;
}

.titulo-seccion {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.75rem 0;
}

.subtitulo {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 1rem 0 0.4rem 0;
}

.avance {
  display: flex;
  justify-content: space-between;
  color: var(--ws-texto-suave);
  margin-bottom: 0.35rem;
}

.datos {
  margin: 0.75rem 0 0 0;
}

.datos dt {
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
}

.datos dd {
  margin: 0.1rem 0 0 0;
  font-weight: 600;
  color: var(--ws-texto);
}

.etiquetas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.conteo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(110px, 100%), 1fr));
  gap: 0.5rem;
}

.cifra {
  text-align: center;
  padding: 0.75rem 0.25rem;
  background: var(--ws-fondo);
  border-radius: 8px;
}

.cifra-numero {
  display: block;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ws-texto);
}

.cifra-texto {
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
}

.texto {
  color: var(--ws-texto);
  line-height: 1.5;
  white-space: pre-wrap;
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

.enlaces {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.enlaces a {
  color: var(--ws-primario);
}

.vacio-texto {
  color: var(--ws-texto-suave);
  margin: 0;
}
</style>
