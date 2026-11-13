<script setup lang="ts">
import TecnologiaChip from '@/components/tecnologias/TecnologiaChip.vue'
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Message from 'primevue/message'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { obtenerPortafolio, type PortafolioPublico } from '@/service/perfiles'
import { etiquetaDisponibilidad } from '@/service/perfil'
import { mensajeDeError } from '@/service/errores'

// userId llega desde la ruta (/portafolios/:userId) como texto
const props = defineProps<{ userId: string }>()

const portafolio = ref<PortafolioPublico | null>(null)
const cargando = ref(true)
const error = ref('')

// Enlaces profesionales del estudiante: solo los que registró
const enlacesProfesionales = computed(() => {
  const p = portafolio.value?.perfil
  if (!p) return []
  return [
    p.github && { href: p.github, texto: 'GitHub', icono: 'pi pi-github' },
    p.linkedin && { href: p.linkedin, texto: 'LinkedIn', icono: 'pi pi-linkedin' },
    p.sitioWeb && { href: p.sitioWeb, texto: 'Sitio web', icono: 'pi pi-globe' },
  ].filter(Boolean) as { href: string; texto: string; icono: string }[]
})

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { month: 'long', year: 'numeric' })

async function cargar() {
  cargando.value = true
  error.value = ''
  portafolio.value = null

  const id = Number(props.userId)
  if (!Number.isInteger(id) || id <= 0) {
    error.value = 'Este portafolio no existe.'
    cargando.value = false
    return
  }

  try {
    portafolio.value = await obtenerPortafolio(id)
  } catch (e) {
    const estado = (e as { response?: { status?: number } }).response?.status
    error.value = estado === 404 ? 'Este portafolio no existe.' : mensajeDeError(e, 'No se pudo cargar el portafolio')
  } finally {
    cargando.value = false
  }
}

// Se vuelve a cargar si cambia el id en la URL
watch(() => props.userId, cargar, { immediate: true })
</script>

<template>
  <div class="pagina">
    <Button
      as="router-link"
      to="/portafolios"
      label="Volver a portafolios"
      icon="pi pi-arrow-left"
      text
      severity="secondary"
      class="volver"
    />

    <p v-if="cargando" class="estado" role="status">Cargando portafolio…</p>

    <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

    <template v-else-if="portafolio">
      <!-- Datos del estudiante -->
      <section class="perfil">
        <div class="perfil-cab">
          <AvatarEstudiante
            :nombre="portafolio.estudiante.nombre"
            :foto-url="portafolio.perfil.fotoUrl"
            tamano="88px"
          />
          <div>
            <h1 class="nombre">{{ portafolio.estudiante.nombre }}</h1>
            <p v-if="portafolio.perfil.disponibilidad" class="disponibilidad">
              <i class="pi pi-clock"></i>
              {{ etiquetaDisponibilidad(portafolio.perfil.disponibilidad) }}
            </p>
            <p v-if="portafolio.perfil.especialidad" class="especialidad">
              <i class="pi pi-code" aria-hidden="true"></i> {{ portafolio.perfil.especialidad }}
            </p>
          </div>
        </div>

        <div class="avance">
          <div class="avance-texto">
            <span>Avance de la carrera</span>
            <strong>{{ portafolio.perfil.porcentajeAvance }} %</strong>
          </div>
          <ProgressBar :value="portafolio.perfil.porcentajeAvance" :show-value="false" style="height: 8px" />
        </div>

        <p v-if="portafolio.perfil.biografia" class="biografia">{{ portafolio.perfil.biografia }}</p>

        <Button
          v-if="portafolio.perfil.cvUrl"
          as="a"
          :href="portafolio.perfil.cvUrl"
          target="_blank"
          rel="noopener noreferrer"
          label="Descargar CV"
          icon="pi pi-download"
          outlined
          class="descargar-cv"
        />

        <ul v-if="enlacesProfesionales.length" class="enlaces-profesionales" aria-label="Enlaces profesionales">
          <li v-for="e in enlacesProfesionales" :key="e.href">
            <a :href="e.href" target="_blank" rel="noopener noreferrer"><i :class="e.icono" aria-hidden="true"></i> {{ e.texto }}</a>
          </li>
        </ul>

        <div v-if="portafolio.perfil.habilidades.length" class="habilidades">
          <h2 class="sub">Habilidades</h2>
          <div class="chips">
            <TecnologiaChip v-for="h in portafolio.perfil.habilidades" :key="h" :nombre="h" />
          </div>
        </div>
      </section>

      <!-- Proyectos validados y publicados -->
      <section aria-labelledby="proyectos-titulo">
        <h2 id="proyectos-titulo" class="seccion">Proyectos</h2>

        <div v-if="portafolio.proyectos.length" class="proyectos">
          <article v-for="p in portafolio.proyectos" :key="p.id" class="proyecto">
            <div class="proyecto-cab">
              <h3 class="proyecto-titulo">{{ p.titulo }}</h3>
              <span class="pill"><i class="pi pi-check-circle"></i> Validado</span>
            </div>

            <p class="proyecto-desc">{{ p.descripcion }}</p>

            <div v-if="p.tecnologias.length" class="chips">
              <TecnologiaChip v-for="t in p.tecnologias" :key="t" :nombre="t" tamano="pequeno" />
            </div>

            <div class="enlaces">
              <Button
                as="router-link"
                :to="{ name: 'proyecto', params: { id: p.id } }"
                label="Ver proyecto"
                icon="pi pi-arrow-right"
                icon-pos="right"
                size="small"
              />
              <Button
                v-if="p.urlRepositorio"
                as="a"
                :href="p.urlRepositorio"
                target="_blank"
                rel="noopener noreferrer"
                label="Repositorio"
                icon="pi pi-github"
                size="small"
                outlined
                severity="secondary"
              />
              <Button
                v-if="p.urlDemo"
                as="a"
                :href="p.urlDemo"
                target="_blank"
                rel="noopener noreferrer"
                label="Demo"
                icon="pi pi-external-link"
                size="small"
                outlined
                severity="secondary"
              />
              <Button
                v-if="p.urlDocumentacion"
                as="a"
                :href="p.urlDocumentacion"
                target="_blank"
                rel="noopener noreferrer"
                label="Documentación"
                icon="pi pi-book"
                size="small"
                outlined
                severity="secondary"
              />
            </div>

            <p class="proyecto-fecha">Actualizado en {{ fecha(p.updatedAt) }}</p>
          </article>
        </div>

        <div v-else class="vacio">
          <p class="vacio-titulo">Todavía no tiene proyectos publicados</p>
          <p class="vacio-texto">Los proyectos aparecen aquí cuando son validados y publicados.</p>
        </div>
      </section>

    </template>
  </div>
</template>

<style scoped>
.pagina {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.volver {
  margin-bottom: 1rem;
}

.descargar-cv {
  align-self: flex-start;
}

.especialidad {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.35rem 0 0;
  color: var(--ws-primario);
  font-weight: 600;
}

.biografia {
  margin: 0;
  line-height: 1.7;
  color: var(--ws-texto);
  white-space: pre-line;
}

.enlaces-profesionales {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}

.enlaces-profesionales a {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--ws-primario);
  font-weight: 600;
  text-decoration: none;
}

.enlaces-profesionales a:hover {
  text-decoration: underline;
}

.estado {
  color: var(--ws-texto-suave);
  text-align: center;
  padding: 3rem 0;
}

/* ── Perfil ── */
.perfil {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  box-shadow: var(--ws-sombra);
  padding: 1.75rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.perfil-cab {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nombre {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0;
}

.disponibilidad {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--ws-texto-suave);
  margin: 0.2rem 0 0 0;
}

.avance-texto {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--ws-texto-suave);
  margin-bottom: 0.4rem;
}

.avance-texto strong {
  color: var(--ws-texto);
}

.sub {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.5rem 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: var(--ws-fondo);
  color: var(--ws-texto);
  font-size: 0.8rem;
  font-weight: 500;
}

/* ── Proyectos ── */
.seccion {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 1rem 0;
}

.proyectos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 1.25rem;
}

.proyecto {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(31, 28, 75, 0.16);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.proyecto-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.proyecto-titulo {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0;
}

.pill {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(110, 94, 224, 0.12);
  color: var(--ws-primario);
  font-size: 0.8rem;
  font-weight: 600;
}

.proyecto-desc {
  margin: 0;
  color: var(--ws-texto);
  line-height: 1.6;
  white-space: pre-line;
}

.enlaces {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.proyecto-fecha {
  margin: auto 0 0 0;
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
}

.vacio {
  text-align: center;
  padding: 2.5rem 1rem;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
}

.vacio-titulo {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.3rem 0;
}

.vacio-texto {
  color: var(--ws-texto-suave);
  margin: 0;
}
</style>