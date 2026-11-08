<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { etiquetaDisponibilidad } from '@/service/perfil'
import Chatbot from '@/components/Chatbot.vue'
import {
  listarPerfiles,
  obtenerPortafolio,
  type PerfilPublicoResumen,
  type ProyectoPublico,
} from '@/service/perfiles'

// Portafolios destacados: GET /perfiles es público (no requiere sesión).
// Solo aparecen estudiantes con al menos un proyecto VALIDADO y publicado.
interface Destacado {
  estudiante: PerfilPublicoResumen
  principal: ProyectoPublico | null // primer proyecto del portafolio
}

const esqueletos = [1, 2, 3]
const destacados = ref<Destacado[]>([])
const cargando = ref(true)
const fallo = ref(false)

const leyenda = computed(() => {
  if (cargando.value) return 'Cargando portafolios…'
  if (fallo.value) return 'No pudimos cargar los portafolios en este momento.'
  if (destacados.value.length === 0) return 'Próximamente: proyectos validados y publicados por estudiantes.'
  return 'Estudiantes con proyectos validados por la coordinación.'
})

function iniciales(nombre: string): string {
  return (
    nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'WU'
  )
}

// Tecnologías del proyecto principal; si no tiene, se usan las habilidades del perfil.
function etiquetas(d: Destacado): string[] {
  const lista = d.principal?.tecnologias?.length ? d.principal.tecnologias : d.estudiante.habilidades
  return lista.slice(0, 6)
}

onMounted(async () => {
  try {
    const { estudiantes } = await listarPerfiles({ limit: 3 })

    // Si el portafolio de alguno falla, esa tarjeta se muestra igual, sin proyecto.
    destacados.value = await Promise.all(
      estudiantes.map(async (estudiante): Promise<Destacado> => {
        try {
          const portafolio = await obtenerPortafolio(estudiante.id)
          return { estudiante, principal: portafolio.proyectos[0] ?? null }
        } catch {
          return { estudiante, principal: null }
        }
      }),
    )
  } catch {
    fallo.value = true
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <h1 class="hero-title">Portafolios de estudiantes, en un solo lugar</h1>
      <p class="hero-subtitle">
        Workspace ULS conecta a estudiantes con empresas mostrando proyectos reales,
        validados por la coordinación académica.
      </p>
      <div class="hero-actions">
        <Button as="router-link" to="/portafolios" label="Ver portafolios" icon="pi pi-search" />
        <Button
          as="router-link"
          to="/login"
          label="Soy estudiante"
          icon="pi pi-user"
          severity="secondary"
          outlined
        />
      </div>
    </section>

    <!-- Portafolios destacados -->
    <section class="section" aria-labelledby="destacados-titulo">
      <h2 id="destacados-titulo" class="section-title">Portafolios destacados</h2>
      <p class="section-lead">{{ leyenda }}</p>

      <div v-if="!cargando && !fallo && destacados.length" class="grid">
        <Card v-for="d in destacados" :key="d.estudiante.id" class="welcome-card">
          <template #header>
            <div class="welcome-header">
              <div class="avatar-circle">
                <img
                  v-if="d.estudiante.fotoUrl"
                  :src="d.estudiante.fotoUrl"
                  :alt="d.estudiante.nombre"
                  class="avatar-img"
                />
                <span v-else class="avatar-initials">{{ iniciales(d.estudiante.nombre) }}</span>
              </div>
              <div class="project-title-section">
                <h3 class="project-title">{{ d.estudiante.nombre }}</h3>
                <div class="project-meta">
                  <span class="project-subtitle">
                    {{ etiquetaDisponibilidad(d.estudiante.disponibilidad) || 'Estudiante ULS' }}
                  </span>
                </div>
              </div>
            </div>
          </template>

          <template #title>
            <div class="technologies-section">
              <span v-for="t in etiquetas(d)" :key="t" class="tech-tag">{{ t }}</span>
              <span v-if="!etiquetas(d).length" class="tech-empty">Sin tecnologías registradas</span>
            </div>
          </template>

          <template #content>
            <div class="project-content">
              <template v-if="d.principal">
                <h4 class="project-name">{{ d.principal.titulo }}</h4>
                <p class="project-description">{{ d.principal.descripcion }}</p>
                <div class="project-links">
                  <a
                    v-if="d.principal.urlRepositorio"
                    :href="d.principal.urlRepositorio"
                    target="_blank"
                    rel="noopener"
                    class="project-link"
                  >
                    <i class="pi pi-github"></i> GitHub
                  </a>
                  <a
                    v-if="d.principal.urlDemo"
                    :href="d.principal.urlDemo"
                    target="_blank"
                    rel="noopener"
                    class="project-link"
                  >
                    <i class="pi pi-external-link"></i> Demo
                  </a>
                </div>
              </template>
              <p v-else class="project-description">Este estudiante aún no tiene proyectos para mostrar.</p>
            </div>
          </template>

          <template #footer>
            <div class="project-badges">
              <span class="badge approval-badge">
                <i class="pi pi-check"></i> Sello de Aprobación del Docente
              </span>
              <span class="badge validated-badge">
                <i class="pi pi-star"></i>
                {{ d.estudiante.totalProyectos }}
                {{ d.estudiante.totalProyectos === 1 ? 'Proyecto Validado' : 'Proyectos Validados' }}
              </span>
            </div>

            <div class="progress-section">
              <div class="progress-header">
                <span class="progress-text">Avance Académico</span>
                <span class="progress-percentage">{{ d.estudiante.porcentajeAvance }}%</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar" :style="{ width: `${d.estudiante.porcentajeAvance}%` }"></div>
              </div>
            </div>

            <div class="card-action">
              <Button
                as="router-link"
                :to="`/portafolios/${d.estudiante.id}`"
                label="Ver portafolio"
                icon="pi pi-arrow-right"
                icon-pos="right"
                text
              />
            </div>
          </template>
        </Card>
      </div>

      <!-- Esqueleto: mientras carga o si aún no hay portafolios públicos -->
      <div v-else class="grid" aria-hidden="true">
        <div v-for="n in esqueletos" :key="n" class="skeleton">
          <div class="sk-head">
            <span class="sk-avatar"></span>
            <div class="sk-lines">
              <span class="sk-bar sk-bar-lg"></span>
              <span class="sk-bar sk-bar-sm"></span>
            </div>
          </div>
          <div class="sk-chips">
            <span class="sk-chip"></span>
            <span class="sk-chip"></span>
            <span class="sk-chip sk-chip-short"></span>
          </div>
          <div class="sk-foot">
            <span class="sk-pill"><i class="pi pi-check-circle"></i> Validado</span>
          </div>
        </div>
      </div>

      <div v-if="!cargando && !fallo && destacados.length" class="ver-todos">
        <Button
          as="router-link"
          to="/portafolios"
          label="Ver todos los portafolios"
          icon="pi pi-arrow-right"
          icon-pos="right"
          text
        />
      </div>
       <div v-if="!cargando && !fallo && destacados.length" class="ver-todos">
        ...
      </div>
    </section>

    <Chatbot /> 
    
  </div>
</template>

<style scoped>
/* ── Tokens locales ── El violeta primario y el modo claro vienen del tema global (main.ts) */
.home {
  --ws-accent: #9155fd;
  --ws-accent-hover: #804bdf;
  --ws-accent-soft: rgba(145, 85, 253, 0.12);
  --ws-text: #1e293b;
  --ws-muted: #64748b;
  --ws-border: #e7e5ec;
  --ws-skeleton: #ece9f3;
  --ws-shadow: 0 2px 10px rgba(58, 53, 65, 0.1);

  --p-button-border-radius: 8px;
  --p-button-outlined-secondary-border-color: #cbd5e1;
  --p-button-outlined-secondary-color: #334155;
  --p-button-outlined-secondary-hover-background: #f1f5f9;
  --p-button-outlined-secondary-active-background: #e2e8f0;

  --p-card-background: #fff;
  --p-card-color: var(--ws-text);
  --p-card-border-radius: 12px;
  --p-card-shadow: var(--ws-shadow);

  display: flex;
  flex-direction: column;
  flex: 1;
}

/* ── Hero ── */
.hero {
  max-width: 720px;
  margin: 0 auto;
  padding: 5rem 1.5rem 3rem;
  text-align: center;
}

.hero-title {
  font-size: clamp(1.9rem, 1.2rem + 2.6vw, 2.75rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ws-text);
  margin: 0 0 1rem 0;
}

.hero-subtitle {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--ws-muted);
  max-width: 56ch;
  margin: 0 auto 2rem;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* ── Secciones ── */
.section {
  max-width: 1120px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem 1.5rem 4rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ws-text);
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.section-lead {
  color: var(--ws-muted);
  text-align: center;
  margin: 0 0 1.75rem 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.ver-todos {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

/* ── Esqueleto ── */
.skeleton {
  background: #fff;
  border: 1px solid var(--ws-border);
  border-radius: 12px;
  box-shadow: var(--ws-shadow);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sk-head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.sk-avatar {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 50%;
  background: var(--ws-accent-soft);
}

.sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.sk-bar {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: var(--ws-skeleton);
}
.sk-bar-lg {
  width: 70%;
}
.sk-bar-sm {
  width: 45%;
}

.sk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sk-chip {
  width: 64px;
  height: 22px;
  border-radius: 999px;
  background: var(--ws-skeleton);
}
.sk-chip-short {
  width: 44px;
}

.sk-foot {
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid var(--ws-border);
}

.sk-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-hover);
  font-size: 0.8rem;
  font-weight: 600;
}

/* ── Tarjeta de portafolio ── */
.welcome-card {
  width: 100%;
  border: 1px solid var(--ws-border);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.welcome-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--ws-border);
}

.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ws-accent), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: white;
  font-size: 1.3rem;
  font-weight: 700;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-family: system-ui, -apple-system, sans-serif;
}

.project-title-section {
  flex: 1;
  min-width: 0;
}

.project-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ws-text);
  margin: 0 0 0.35rem 0;
}

.project-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.project-subtitle {
  font-size: 0.9rem;
  color: var(--ws-muted);
}

.technologies-section {
  display: flex;
  gap: 0.6rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--ws-border);
  flex-wrap: wrap;
}

.tech-tag {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  color: #0ea5e9;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.tech-empty {
  font-size: 0.85rem;
  color: var(--ws-muted);
  font-weight: 400;
}

.project-content {
  padding: 1.25rem 1.5rem;
}

.project-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ws-text);
  margin: 0 0 0.5rem 0;
}

.project-description {
  color: var(--ws-text);
  line-height: 1.6;
  margin: 0 0 1.25rem 0;
  font-size: 0.95rem;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-links {
  display: flex;
  gap: 1.5rem;
}

.project-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ws-accent);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition: color 0.2s;
}

.project-link:hover {
  color: var(--ws-accent-hover);
}

.project-badges {
  display: flex;
  gap: 0.6rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--ws-border);
  flex-wrap: wrap;
  justify-content: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.approval-badge {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
}

.validated-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.badge i {
  font-size: 0.9rem;
}

.progress-section {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--ws-border);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.progress-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ws-text);
}

.progress-percentage {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ws-accent);
}

.progress-bar-container {
  height: 8px;
  background: var(--ws-border);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--ws-accent), #8b5cf6);
  border-radius: 999px;
  transition: width 1s ease-in-out;
}

.card-action {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 1rem;
}

@media (max-width: 480px) {
  .hero {
    padding: 3rem 1.25rem 2rem;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>