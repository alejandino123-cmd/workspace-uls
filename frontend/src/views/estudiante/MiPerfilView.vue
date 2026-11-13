<script setup lang="ts">
import TecnologiaChip from '@/components/tecnologias/TecnologiaChip.vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import FileUpload from 'primevue/fileupload'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import SeguridadDosPasos from '@/components/perfil/SeguridadDosPasos.vue'
import { useMisProyectos } from '@/queries/proyectos'
import { obtenerPerfilCompleto, quitarCv, subirCv } from '@/service/perfil'
import type { EstadoValidacion, Proyecto } from '@/service/proyectos'
import { mensajeDeError } from '@/service/errores'

const router = useRouter()
const queryClient = useQueryClient()

// CV en PDF: subir, reemplazar o quitar
const subiendoCv = ref(false)
const errorCv = ref('')

async function alSubirCv(evento: { files: File | File[] }) {
  const archivo = Array.isArray(evento.files) ? evento.files[0] : evento.files
  if (!archivo) return
  errorCv.value = ''
  subiendoCv.value = true
  try {
    await subirCv(archivo)
    await queryClient.invalidateQueries({ queryKey: ['mi-perfil'] })
  } catch (e) {
    errorCv.value = mensajeDeError(e, 'No se pudo subir el CV')
  } finally {
    subiendoCv.value = false
  }
}

async function eliminarCv() {
  errorCv.value = ''
  subiendoCv.value = true
  try {
    await quitarCv()
    await queryClient.invalidateQueries({ queryKey: ['mi-perfil'] })
  } catch (e) {
    errorCv.value = mensajeDeError(e, 'No se pudo quitar el CV')
  } finally {
    subiendoCv.value = false
  }
}

const { data: datos, isPending: cargandoPerfil, isError: falloPerfil, error: errorPerfil } = useQuery({
  queryKey: ['mi-perfil'],
  queryFn: obtenerPerfilCompleto,
})
const { data: proyectosDatos, isPending: cargandoProyectos } = useMisProyectos()

const perfil = computed(() => datos.value?.perfil ?? null)
const cuenta = computed(() => datos.value?.cuenta ?? null)
const proyectos = computed<Proyecto[]>(() => proyectosDatos.value ?? [])

// Biografía: cada línea en blanco separa un párrafo
const parrafos = computed(() =>
  (perfil.value?.biografia ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean),
)

// Tecnologías de los proyectos destacados, con cuántos proyectos la usan (de mayor a menor)
const tecnologiasDestacadas = computed(() => {
  const conteo = new Map<string, number>()
  for (const p of proyectos.value.filter((x) => x.destacado)) {
    for (const t of p.tecnologias) conteo.set(t, (conteo.get(t) ?? 0) + 1)
  }
  const lista = [...conteo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
  const maximo = lista[0]?.[1] ?? 1
  return lista.map(([nombre, veces]) => ({ nombre, veces, porcentaje: (veces / maximo) * 100 }))
})

const ESTADOS: Record<EstadoValidacion, { label: string; severity: 'warn' | 'success' | 'danger' }> = {
  PENDIENTE: { label: 'pendiente', severity: 'warn' },
  VALIDADO: { label: 'validado', severity: 'success' },
  RECHAZADO: { label: 'rechazado', severity: 'danger' },
}

// Trayectoria: del proyecto más reciente al más antiguo
const trayectoria = computed(() =>
  [...proyectos.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
)

const anio = (iso: string) => new Date(iso).getFullYear()
</script>

<template>
  <section class="pagina">
    <Message v-if="falloPerfil" severity="error" :closable="false" class="aviso">
      {{ mensajeDeError(errorPerfil, 'No se pudo cargar tu perfil') }}
    </Message>

    <p v-if="cargandoPerfil" class="estado" role="status">Cargando tu perfil…</p>

    <template v-else-if="perfil && cuenta">
      <!-- Cabecera -->
      <header class="cabecera">
        <div class="foto-anillo">
          <AvatarEstudiante :nombre="cuenta.nombre" :foto-url="perfil.fotoUrl" tamano="168px" />
        </div>

        <div class="presentacion">
          <h1 class="nombre">{{ cuenta.nombre }}</h1>
          <p v-if="perfil.especialidad" class="especialidad">{{ perfil.especialidad }}</p>

          <div v-if="parrafos.length" class="bio">
            <p v-for="(p, i) in parrafos" :key="i">{{ p }}</p>
          </div>
          <p v-else class="vacio">Aún no has escrito tu biografía. Puedes hacerlo en Editar perfil.</p>

          <div v-if="perfil.habilidades.length" class="chips">
            <TecnologiaChip v-for="h in perfil.habilidades" :key="h" :nombre="h" />
          </div>

          <Message v-if="errorCv" severity="error" size="small" :closable="false">{{ errorCv }}</Message>

          <div class="acciones">
            <Button label="Ver proyectos" @click="router.push('/mis-proyectos')" />
            <Button
              v-if="perfil.cvUrl"
              as="a"
              :href="perfil.cvUrl"
              target="_blank"
              rel="noopener noreferrer"
              label="Descargar CV"
              icon="pi pi-download"
              outlined
            />
            <FileUpload
              mode="basic"
              accept="application/pdf"
              :max-file-size="5242880"
              :auto="true"
              custom-upload
              :choose-label="perfil.cvUrl ? 'Cambiar CV' : 'Subir CV (PDF)'"
              :disabled="subiendoCv"
              class="subir-cv"
              @uploader="alSubirCv"
            />
            <Button
              v-if="perfil.cvUrl"
              label="Quitar CV"
              text
              severity="danger"
              :disabled="subiendoCv"
              @click="eliminarCv"
            />
            <a v-if="perfil.github" :href="perfil.github" target="_blank" rel="noopener noreferrer" class="enlace">GitHub</a>
            <a :href="`mailto:${cuenta.email}`" class="enlace">Contacto</a>
          </div>
        </div>
      </header>

      <!-- Tecnologías de proyectos destacados -->
      <section class="tarjeta">
        <h2 class="titulo-seccion">Tecnologías de proyectos destacados</h2>
        <div v-if="tecnologiasDestacadas.length" class="barras">
          <div v-for="t in tecnologiasDestacadas" :key="t.nombre" class="barra-fila">
            <div class="barra-cabecera">
              <span>{{ t.nombre }}</span>
              <span class="conteo">{{ t.veces }}</span>
            </div>
            <div class="barra">
              <div class="relleno" :style="{ width: `${t.porcentaje}%` }"></div>
            </div>
          </div>
        </div>
        <p v-else class="vacio">
          {{ cargandoProyectos ? 'Cargando…' : 'Aún no tienes proyectos destacados por la coordinación.' }}
        </p>
      </section>

      <!-- Trayectoria -->
      <section class="tarjeta">
        <h2 class="titulo-seccion">Trayectoria</h2>
        <ol v-if="trayectoria.length" class="linea">
          <li v-for="p in trayectoria" :key="p.id" class="hito">
            <div class="encabezado-hito">
              <span class="anio">{{ anio(p.createdAt) }}</span>
              <Tag :value="ESTADOS[p.estadoValidacion].label" :severity="ESTADOS[p.estadoValidacion].severity" />
            </div>
            <h3 class="hito-titulo">{{ p.titulo }}</h3>
            <p class="hito-texto">{{ p.descripcion }}</p>
            <div v-if="p.tecnologias.length" class="chips">
              <TecnologiaChip v-for="t in p.tecnologias" :key="t" :nombre="t" tamano="pequeno" />
            </div>
          </li>
        </ol>
        <p v-else class="vacio">
          {{ cargandoProyectos ? 'Cargando…' : 'Aún no tienes proyectos. Súbelos en Mis proyectos.' }}
        </p>
      </section>
    </template>

    <SeguridadDosPasos />

  </section>
</template>

<style scoped>
.pagina {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.aviso,
.estado {
  color: var(--ws-texto-suave);
}

/* Cabecera */
.cabecera {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
}

.foto-anillo {
  padding: 4px;
  border-radius: 999px;
  border: 4px solid var(--ws-primario);
  flex-shrink: 0;
}

.presentacion {
  flex: 1;
  min-width: min(280px, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.nombre {
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--ws-texto);
  margin: 0;
}

.especialidad {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ws-primario);
  margin: 0;
}

.bio {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--ws-texto);
  line-height: 1.6;
}

.bio p {
  margin: 0;
}

.vacio {
  color: var(--ws-texto-suave);
  margin: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  background: var(--ws-fondo);
  border: 1px solid var(--ws-borde);
  color: var(--ws-texto);
}

.chip-pequeno {
  font-size: 0.8rem;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.enlace {
  color: var(--ws-texto);
  font-weight: 600;
  text-decoration: none;
  padding: 0.5rem 0.4rem;
}

.enlace:hover {
  color: var(--ws-primario);
}

/* Tarjetas de sección */
.tarjeta {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.titulo-seccion {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0;
}

/* Barras de tecnologías */
.barras {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.barra-cabecera {
  display: flex;
  justify-content: space-between;
  color: var(--ws-texto);
  font-size: 0.95rem;
  margin-bottom: 0.3rem;
}

.conteo {
  color: var(--ws-texto-suave);
}

.barra {
  height: 8px;
  border-radius: 999px;
  background: var(--ws-fondo);
  overflow: hidden;
}

.relleno {
  height: 100%;
  background: var(--ws-primario);
  border-radius: 999px;
}

/* Trayectoria */
.linea {
  list-style: none;
  margin: 0;
  padding: 0 0 0 1.5rem;
  border-left: 2px solid var(--ws-borde);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hito {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hito::before {
  content: '';
  position: absolute;
  left: calc(-1.5rem - 7px);
  top: 0.3rem;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--ws-primario);
}

.encabezado-hito {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.anio {
  color: var(--ws-texto-suave);
  font-size: 0.9rem;
}

.hito-titulo {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0;
}

.hito-texto {
  color: var(--ws-texto-suave);
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 600px) {
  .cabecera {
    justify-content: center;
    text-align: center;
  }

  .presentacion {
    min-width: 0;
    align-items: center;
  }

  .acciones {
    justify-content: center;
  }
}
</style>
