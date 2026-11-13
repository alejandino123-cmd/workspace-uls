<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Message from 'primevue/message'
import Paginator from 'primevue/paginator'
import Select from 'primevue/select'
import ProyectoCard from '@/components/public/ProyectoCard.vue'
import type { FiltrosProyectos } from '@/service/catalogo'
import { useAniosPublicos, useProyectosPublicos, useTecnologiasPublicas } from '@/queries/catalogo'

const POR_PAGINA = 12

const route = useRoute()
const router = useRouter()

// Estado de filtros. La tecnología puede llegar desde la portada: /proyectos?tecnologia=Vue.js
const buscar = ref('')
const textoConsulta = ref('')
const tecnologia = ref<string | null>(
  typeof route.query.tecnologia === 'string' && route.query.tecnologia ? route.query.tecnologia : null,
)
const anio = ref<number | null>(null)
const pagina = ref(1)

let temporizador: ReturnType<typeof setTimeout> | undefined

// El texto se espera 400 ms antes de consultar, para no pedir datos en cada tecla
function alEscribir() {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    textoConsulta.value = buscar.value.trim()
    pagina.value = 1
  }, 400)
}

watch([tecnologia, anio], () => {
  pagina.value = 1
})

// Mantiene la tecnología en la URL para poder compartir el filtro
watch(tecnologia, (valor) => {
  router.replace({ query: { ...route.query, tecnologia: valor ?? undefined } })
})

const filtros = computed<FiltrosProyectos>(() => ({
  buscar: textoConsulta.value || undefined,
  tecnologia: tecnologia.value ?? undefined,
  anio: anio.value ?? undefined,
  page: pagina.value,
  limit: POR_PAGINA,
}))

const { data, isPending, isError, error, refetch } = useProyectosPublicos(filtros)
const proyectos = computed(() => data.value?.proyectos ?? [])
const total = computed(() => data.value?.total ?? 0)

const { data: tecnologiasDatos } = useTecnologiasPublicas(100)
const { data: aniosDatos } = useAniosPublicos()

const opcionesTecnologia = computed(() =>
  (tecnologiasDatos.value ?? []).map((t) => ({ label: `${t.nombre} (${t.total})`, value: t.nombre })),
)
const opcionesAnio = computed(() => (aniosDatos.value ?? []).map((a) => ({ label: String(a), value: a })))

const hayFiltros = computed(() => !!(textoConsulta.value || tecnologia.value || anio.value))

function limpiarFiltros() {
  clearTimeout(temporizador)
  buscar.value = ''
  textoConsulta.value = ''
  tecnologia.value = null
  anio.value = null
  pagina.value = 1
}

function alCambiarPagina(evento: { page: number }) {
  pagina.value = evento.page + 1 // el paginador cuenta desde 0; la API desde 1
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <div class="pagina">
    <header class="encabezado">
      <span class="etiqueta"><i class="pi pi-folder-open" aria-hidden="true"></i> Catálogo</span>
      <h1 class="titulo">Proyectos publicados</h1>
      <p class="lead">
        Trabajos aprobados por la coordinación académica. Busca por nombre, descripción o tecnología.
      </p>
    </header>

    <div class="barra-filtros" role="search">
      <IconField class="buscador">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="buscar"
          maxlength="100"
          placeholder="Buscar por nombre, descripción o tecnología"
          aria-label="Buscar proyectos"
          fluid
          @input="alEscribir"
        />
      </IconField>

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
        v-model="anio"
        :options="opcionesAnio"
        option-label="label"
        option-value="value"
        placeholder="Año"
        show-clear
        aria-label="Filtrar por año de publicación"
        class="filtro filtro-corto"
      />
      <Button v-if="hayFiltros" label="Limpiar" icon="pi pi-times" text severity="secondary" @click="limpiarFiltros" />
    </div>

    <Message v-if="isError" severity="error" :closable="false" class="aviso">
      {{ error?.message ?? 'No se pudieron cargar los proyectos' }}
      <Button label="Reintentar" text size="small" @click="refetch()" />
    </Message>

    <p v-else-if="!isPending || data" class="contador" aria-live="polite">
      {{ total }} {{ total === 1 ? 'proyecto' : 'proyectos' }}
      <template v-if="hayFiltros">con los filtros aplicados</template>
    </p>

    <p v-if="isPending && !data" class="estado" role="status">Cargando proyectos…</p>

    <div v-else-if="proyectos.length" class="grid" :aria-busy="isPending">
      <ProyectoCard v-for="p in proyectos" :key="p.id" :proyecto="p" />
    </div>

    <div v-else-if="!isError" class="vacio">
      <span class="vacio-icono"><i class="pi pi-search" aria-hidden="true"></i></span>
      <h2 class="vacio-titulo">
        {{ hayFiltros ? 'No encontramos proyectos con esos filtros' : 'Todavía no hay proyectos publicados' }}
      </h2>
      <p class="vacio-texto">
        {{
          hayFiltros
            ? 'Prueba con otra palabra o quita algún filtro.'
            : 'Cuando la coordinación apruebe un proyecto y su estudiante lo publique, aparecerá aquí.'
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3.5rem;
}

.encabezado {
  margin-bottom: 1.75rem;
}

.etiqueta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--ws-primario);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.titulo {
  margin: 0.5rem 0 0.4rem;
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ws-texto);
}

.lead {
  margin: 0;
  color: var(--ws-texto-suave);
  max-width: 40rem;
  line-height: 1.6;
}

.barra-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 16px;
  box-shadow: var(--ws-sombra);
}

.buscador {
  flex: 1 1 320px;
}

.filtro {
  flex: 0 1 220px;
}

.filtro-corto {
  flex-basis: 150px;
}

.contador {
  margin: 0 0 1.25rem;
  font-size: 0.92rem;
  color: var(--ws-texto-suave);
}

.estado {
  padding: 2.5rem 0;
  text-align: center;
  color: var(--ws-texto-suave);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 1.25rem;
}

.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1.5rem;
  border-radius: 18px;
  background: var(--ws-degradado-suave);
  border: 1px dashed var(--ws-indigo-suave);
}

.vacio-icono {
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 14px;
  background: var(--ws-degradado);
  color: #fff;
  font-size: 1.3rem;
  margin-bottom: 1rem;
}

.vacio-titulo {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ws-texto);
}

.vacio-texto {
  margin: 0.4rem 0 0;
  max-width: 28rem;
  color: var(--ws-texto-suave);
  line-height: 1.6;
}

.paginador {
  margin-top: 2rem;
  background: transparent;
}

@media (max-width: 600px) {
  .pagina {
    padding: 1.5rem 1rem 2.5rem;
  }

  .filtro,
  .filtro-corto {
    flex: 1 1 100%;
  }
}
</style>
