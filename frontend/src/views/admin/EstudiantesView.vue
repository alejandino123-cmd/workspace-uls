<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { buscarEstudiantes, type EstudianteResumen } from '@/service/validaciones'
import { mensajeDeError } from '@/service/errores'

const router = useRouter()
const LIMITE = 20

const texto = ref('')
const estudiantes = ref<EstudianteResumen[]>([])
const total = ref(0)
const pagina = ref(1)
const cargando = ref(false)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const r = await buscarEstudiantes({
      buscar: texto.value.trim() || undefined,
      page: pagina.value,
      limit: LIMITE,
    })
    estudiantes.value = r.estudiantes
    total.value = r.total
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudieron buscar los estudiantes')
  } finally {
    cargando.value = false
  }
}

function buscar() {
  pagina.value = 1
  cargar()
}

function cambiarPagina(delta: number) {
  pagina.value += delta
  cargar()
}

const totalPaginas = () => Math.max(1, Math.ceil(total.value / LIMITE))

onMounted(cargar)
</script>

<template>
  <section>
    <header class="page-header">
      <div>
        <h1 class="page-title">Estudiantes</h1>
        <p class="page-lead">Busca por nombre, correo o carnet para ver el perfil completo.</p>
      </div>
    </header>

    <form class="buscador" @submit.prevent="buscar">
      <InputText v-model="texto" placeholder="Nombre, correo o carnet" class="buscador-campo" />
      <Button type="submit" label="Buscar" icon="pi pi-search" :loading="cargando" />
    </form>

    <Message v-if="error" severity="error" :closable="false" class="aviso">{{ error }}</Message>

    <div class="tabla-card">
      <DataTable :value="estudiantes" :loading="cargando" data-key="id">
        <template #empty>
          <div class="vacio">
            <p class="vacio-titulo">Sin resultados</p>
            <p class="vacio-texto">Prueba con otro nombre, correo o carnet.</p>
          </div>
        </template>

        <Column header="Estudiante">
          <template #body="{ data }">
            <div class="estudiante-fila">
              <img v-if="data.fotoUrl" :src="data.fotoUrl" alt="" class="foto" />
              <span v-else class="foto foto-vacia"><i class="pi pi-user"></i></span>
              <div>
                <div class="proy-titulo">{{ data.nombre }}</div>
                <div class="proy-meta">{{ data.email }}</div>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Carnet">
          <template #body="{ data }">{{ data.carnet ?? 'Sin registrar' }}</template>
        </Column>

        <Column header="Avance">
          <template #body="{ data }">{{ data.porcentajeAvance }}%</template>
        </Column>

        <Column header="" style="width: 9rem">
          <template #body="{ data }">
            <Button label="Ver perfil" icon="pi pi-user" size="small" outlined @click="router.push(`/admin/estudiantes/${data.id}`)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <div v-if="total > LIMITE" class="paginacion">
      <Button label="Anterior" icon="pi pi-chevron-left" text :disabled="pagina <= 1 || cargando" @click="cambiarPagina(-1)" />
      <span>Página {{ pagina }} de {{ totalPaginas() }}</span>
      <Button label="Siguiente" icon="pi pi-chevron-right" iconPos="right" text :disabled="pagina >= totalPaginas() || cargando" @click="cambiarPagina(1)" />
    </div>
  </section>
</template>

<style scoped>
.page-header {
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

.buscador {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.buscador-campo {
  flex: 1;
  min-width: 14rem;
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

.estudiante-fila {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.foto {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.foto-vacia {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(145, 85, 253, 0.12);
  color: #9155fd;
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
  padding: 2rem 1rem;
}

.vacio-titulo {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.3rem 0;
}

.vacio-texto {
  color: #64748b;
  margin: 0;
}

.paginacion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  color: #64748b;
}
</style>
