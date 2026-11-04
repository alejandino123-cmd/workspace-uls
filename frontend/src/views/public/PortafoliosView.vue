<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Paginator from 'primevue/paginator'
import Message from 'primevue/message'
import PortafolioCard from '@/components/portafolios/PortafolioCard.vue'
import { listarPerfiles, type PerfilPublicoResumen } from '@/service/perfiles'
import { mensajeDeError } from '@/service/errores'

const POR_PAGINA = 9

const estudiantes = ref<PerfilPublicoResumen[]>([])
const total = ref(0)
const pagina = ref(1)
const buscar = ref('')
const cargando = ref(true)
const error = ref('')

let temporizador: ReturnType<typeof setTimeout> | undefined
let ultimaPeticion = 0

async function cargar() {
  const numero = ++ultimaPeticion
  cargando.value = true
  error.value = ''
  try {
    const datos = await listarPerfiles({
      buscar: buscar.value.trim() || undefined,
      page: pagina.value,
      limit: POR_PAGINA,
    })
    if (numero !== ultimaPeticion) return // llegó una respuesta más nueva
    estudiantes.value = datos.estudiantes
    total.value = datos.total
  } catch (e) {
    if (numero !== ultimaPeticion) return
    error.value = mensajeDeError(e, 'No se pudieron cargar los portafolios')
  } finally {
    if (numero === ultimaPeticion) cargando.value = false
  }
}

// Espera a que termine de escribir antes de consultar
function alBuscar() {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    pagina.value = 1
    cargar()
  }, 400)
}

function alCambiarPagina(evento: { page: number }) {
  pagina.value = evento.page + 1 // el paginador cuenta desde 0; la API desde 1
  cargar()
  window.scrollTo({ top: 0 })
}

onMounted(cargar)
onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <div class="pagina">
    <header class="encabezado">
      <div>
        <h1 class="titulo">Portafolios</h1>
        <p class="lead">Estudiantes con proyectos validados por la coordinación académica.</p>
      </div>

      <IconField class="buscador">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="buscar"
          maxlength="100"
          placeholder="Buscar por nombre"
          aria-label="Buscar portafolios por nombre"
          fluid
          @input="alBuscar"
        />
      </IconField>
    </header>

    <Message v-if="error" severity="error" :closable="false" class="aviso">{{ error }}</Message>

    <p v-if="cargando && !estudiantes.length" class="estado" role="status">Cargando portafolios…</p>

    <div v-else-if="estudiantes.length" class="grid" :aria-busy="cargando">
      <PortafolioCard v-for="e in estudiantes" :key="e.id" :estudiante="e" />
    </div>

    <div v-else-if="!error" class="vacio">
      <span class="vacio-icono"><i class="pi pi-search"></i></span>
      <p class="vacio-titulo">
        {{ buscar.trim() ? 'No encontramos portafolios con ese nombre' : 'Todavía no hay portafolios publicados' }}
      </p>
      <p class="vacio-texto">
        {{
          buscar.trim()
            ? 'Prueba con otra parte del nombre.'
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
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.lead {
  color: #64748b;
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
  color: #64748b;
  text-align: center;
  padding: 3rem 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.paginador {
  margin-top: 1.5rem;
  background: transparent;
  justify-content: center;
}

.vacio {
  text-align: center;
  padding: 3rem 1rem;
  background: #fff;
  border: 1px solid #e7e5ec;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(58, 53, 65, 0.1);
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