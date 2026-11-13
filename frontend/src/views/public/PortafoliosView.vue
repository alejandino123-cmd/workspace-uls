<script setup lang="ts">
import TecnologiaChip from '@/components/tecnologias/TecnologiaChip.vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Message from 'primevue/message'
import Paginator from 'primevue/paginator'
import Select from 'primevue/select'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import PortafolioCard from '@/components/portafolios/PortafolioCard.vue'
import { etiquetaDisponibilidad } from '@/service/perfil'
import type { Disponibilidad } from '@/service/perfil'
import type { FiltrosPerfiles } from '@/service/perfiles'
import { useDestacados, useFiltrosPublicos, usePortafolios } from '@/queries/perfiles'

const POR_PAGINA = 9

// Filtros y paginación. El texto se espera 400 ms antes de consultar.
const buscar = ref('')
const textoConsulta = ref('')
const habilidad = ref<string | null>(null)
const tecnologia = ref<string | null>(null)
const disponibilidad = ref<Disponibilidad | null>(null)
const pagina = ref(1)

let temporizador: ReturnType<typeof setTimeout> | undefined

function alEscribir() {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    textoConsulta.value = buscar.value.trim()
    pagina.value = 1
  }, 400)
}

watch([habilidad, tecnologia, disponibilidad], () => {
  pagina.value = 1
})

const filtros = computed<FiltrosPerfiles>(() => ({
  buscar: textoConsulta.value || undefined,
  habilidad: habilidad.value ?? undefined,
  tecnologia: tecnologia.value ?? undefined,
  disponibilidad: disponibilidad.value ?? undefined,
  page: pagina.value,
  limit: POR_PAGINA,
}))

const { data, isPending, isError, error, refetch } = usePortafolios(filtros)
const estudiantes = computed(() => data.value?.estudiantes ?? [])
const total = computed(() => data.value?.total ?? 0)

const { data: destacados } = useDestacados()
const { data: opciones } = useFiltrosPublicos()

const opcionesHabilidad = computed(() => (opciones.value?.habilidades ?? []).map((v) => ({ label: v, value: v })))
const opcionesTecnologia = computed(() => (opciones.value?.tecnologias ?? []).map((v) => ({ label: v, value: v })))
const opcionesDisponibilidad = computed(() =>
  (opciones.value?.disponibilidades ?? []).map((v) => ({ label: etiquetaDisponibilidad(v), value: v })),
)

const hayFiltros = computed(
  () => !!(textoConsulta.value || habilidad.value || tecnologia.value || disponibilidad.value),
)

function limpiarFiltros() {
  clearTimeout(temporizador)
  buscar.value = ''
  textoConsulta.value = ''
  habilidad.value = null
  tecnologia.value = null
  disponibilidad.value = null
  pagina.value = 1
}

function alCambiarPagina(evento: { page: number }) {
  pagina.value = evento.page + 1 // el paginador cuenta desde 0; la API desde 1
  window.scrollTo({ top: 0 })
}

onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <div class="pagina">
    <header class="encabezado">
      <div>
        <h1 class="titulo">Portafolios</h1>
        <p class="lead">Estudiantes con proyectos validados por la coordinación académica.</p>
      </div>
    </header>

    <section v-if="destacados?.length" class="destacados" aria-labelledby="destacados-titulo">
      <h2 id="destacados-titulo" class="subtitulo">Proyectos destacados</h2>
      <div class="grid-destacados">
        <article v-for="p in destacados" :key="p.id" class="destacado">
          <h3 class="destacado-titulo">{{ p.titulo }}</h3>
          <p class="destacado-texto">{{ p.descripcion }}</p>
          <div class="chips">
            <TecnologiaChip v-for="t in p.tecnologias.slice(0, 3)" :key="t" :nombre="t" tamano="pequeno" />
          </div>
          <RouterLink :to="{ name: 'portafolio', params: { userId: p.estudiante.id } }" class="autor">
            <AvatarEstudiante :nombre="p.estudiante.nombre" :foto-url="p.estudiante.fotoUrl" tamano="32px" />
            <span>{{ p.estudiante.nombre }}</span>
          </RouterLink>
        </article>
      </div>
    </section>

    <div class="filtros">
      <IconField class="buscador">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="buscar"
          maxlength="100"
          placeholder="Nombre o habilidad"
          aria-label="Buscar portafolios por nombre o habilidad"
          fluid
          @input="alEscribir"
        />
      </IconField>
      <Select
        v-model="habilidad"
        :options="opcionesHabilidad"
        option-label="label"
        option-value="value"
        placeholder="Habilidad"
        show-clear
        filter
        aria-label="Filtrar por habilidad"
        class="filtro"
      />
      <Select
        v-model="tecnologia"
        :options="opcionesTecnologia"
        option-label="label"
        option-value="value"
        placeholder="Tecnología"
        show-clear
        filter
        aria-label="Filtrar por tecnología"
        class="filtro"
      />
      <Select
        v-model="disponibilidad"
        :options="opcionesDisponibilidad"
        option-label="label"
        option-value="value"
        placeholder="Disponibilidad"
        show-clear
        aria-label="Filtrar por disponibilidad"
        class="filtro"
      />
      <Button v-if="hayFiltros" label="Limpiar" icon="pi pi-times" text @click="limpiarFiltros" />
    </div>

    <Message v-if="isError" severity="error" :closable="false" class="aviso">
      {{ error?.message ?? 'No se pudieron cargar los portafolios' }}
      <Button label="Reintentar" text size="small" class="reintentar" @click="refetch()" />
    </Message>

    <p v-if="isPending && !data" class="estado" role="status">Cargando portafolios…</p>

    <div v-else-if="estudiantes.length" class="grid" :aria-busy="isPending">
      <PortafolioCard v-for="e in estudiantes" :key="e.id" :estudiante="e" />
    </div>

    <div v-else-if="!isError" class="vacio">
      <span class="vacio-icono"><i class="pi pi-search"></i></span>
      <p class="vacio-titulo">
        {{ hayFiltros ? 'No encontramos portafolios con esos filtros' : 'Todavía no hay portafolios publicados' }}
      </p>
      <p class="vacio-texto">
        {{
          hayFiltros
            ? 'Prueba con otro nombre, habilidad o tecnología.'
            : 'Cuando un estudiante publique un proyecto validado, aparecerá aquí.'
        }}
      </p>
    </div>

    <Paginator
      v-if="total > POR_PAGINA"
      :rows="POR_PAGINA"
      :total-records="total"
      :first="(pagina - 1) * POR_PAGINA"
      template="PrevPageLink PageLinks NextPageLink"
      class="paginador"
      @page="alCambiarPagina"
    />
  </div>
</template>

<style scoped>
.pagina {
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
}

.encabezado {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.75rem;
}

.titulo {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.25rem 0;
}

.lead {
  color: var(--ws-texto-suave);
  margin: 0;
}

.buscador {
  width: 100%;
  max-width: 320px;
}

.aviso {
  margin-bottom: 1rem;
}

.estado {
  color: var(--ws-texto-suave);
  text-align: center;
  padding: 3rem 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 1.75rem;
  margin-top: 0.5rem;
}

.paginador {
  margin-top: 1.5rem;
  background: transparent;
  justify-content: center;
}

.vacio {
  text-align: center;
  padding: 3rem 1rem;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(31, 28, 75, 0.16);
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
</style>

/* Destacados y filtros */
.destacados {
  margin-bottom: 2rem;
}

.subtitulo {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.75rem 0;
}

.grid-destacados {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 1rem;
}

.destacado {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-top: 3px solid var(--ws-primario);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.destacado-titulo {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0;
}

.destacado-texto {
  font-size: 0.875rem;
  color: var(--ws-texto-suave);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  background: var(--ws-fondo);
  border: 1px solid var(--ws-borde);
  color: var(--ws-texto);
}

.autor {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  color: var(--ws-texto);
  text-decoration: none;
  font-weight: 600;
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.filtros .buscador {
  flex: 1 1 260px;
}

.filtro {
  min-width: 11rem;
}

.reintentar {
  margin-left: 0.5rem;
}
