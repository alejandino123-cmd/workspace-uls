<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Message from 'primevue/message'
import Paginator from 'primevue/paginator'
import PortafolioCard from '@/components/portafolios/PortafolioCard.vue'
import type { FiltrosPerfiles } from '@/service'
import { usePortafolios } from '@/queries/perfiles'

const POR_PAGINA = 9

// Filtros y paginación. El texto se espera 400 ms antes de consultar.
const buscar = ref('')
const textoConsulta = ref('')
const pagina = ref(1)

let temporizador: ReturnType<typeof setTimeout> | undefined

function alEscribir() {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    textoConsulta.value = buscar.value.trim()
    pagina.value = 1
  }, 400)
}

const filtros = computed<FiltrosPerfiles>(() => ({
  buscar: textoConsulta.value || undefined,
  page: pagina.value,
  limit: POR_PAGINA,
}))

const { data, isPending, isError, error, refetch } = usePortafolios(filtros)
const estudiantes = computed(() => data.value?.estudiantes ?? [])
const total = computed(() => data.value?.total ?? 0)


const hayFiltros = computed(() => !!textoConsulta.value)

function limpiarFiltros() {
  clearTimeout(temporizador)
  buscar.value = ''
  textoConsulta.value = ''
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
        <Button v-if="hayFiltros" label="Limpiar" icon="pi pi-times" text @click="limpiarFiltros" />
      </div>
    </header>

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
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.36);
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

/* Buscador en la cabecera, a la derecha del título */
.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.filtros .buscador {
  flex: 1 1 260px;
  min-width: 240px;
}

.reintentar {
  margin-left: 0.5rem;
}
</style>
