<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import PortafolioCard from '@/components/portafolios/PortafolioCard.vue'
import {
  listarPerfiles,
  obtenerPortafolio,
  type PerfilPublicoResumen,
  type ProyectoPublico,
} from '@/service/perfiles'

// Portafolios destacados: GET /perfiles es público (no requiere sesión).
// Solo aparecen estudiantes con al menos un proyecto VALIDADO y publicado.
// Por cada uno se pide su portafolio para mostrar una vista previa de sus proyectos.
// Mientras carga, o si todavía no hay ninguno, se muestran tarjetas esqueleto.
interface Destacado {
  estudiante: PerfilPublicoResumen
  proyectos: ProyectoPublico[]
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

onMounted(async () => {
  try {
    const { estudiantes } = await listarPerfiles({ limit: 3 })

    // Por cada estudiante se pide su portafolio para la vista previa de proyectos.
    // Si alguno falla, esa tarjeta se muestra igual, solo que sin proyectos.
    destacados.value = await Promise.all(
      estudiantes.map(async (estudiante): Promise<Destacado> => {
        try {
          const portafolio = await obtenerPortafolio(estudiante.id)
          return { estudiante, proyectos: portafolio.proyectos }
        } catch {
          return { estudiante, proyectos: [] }
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
        <PortafolioCard
          v-for="d in destacados"
          :key="d.estudiante.id"
          :estudiante="d.estudiante"
          :proyectos="d.proyectos"
        />
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
    </section>

    <!-- Para estudiantes -->
    <section class="section section-cta">
      <Card class="cta-card">
        <template #header>
          <span class="cta-icon"><i class="pi pi-graduation-cap"></i></span>
        </template>
        <template #title>¿Sos estudiante?</template>
        <template #content>
          <p class="section-text">
            Iniciá sesión para crear tu portafolio y enviar tus proyectos a validación.
          </p>
        </template>
        <template #footer>
          <Button as="router-link" to="/login" label="Iniciar sesión" icon="pi pi-sign-in" />
        </template>
      </Card>
    </section>
  </div>
</template>

<style scoped>
/* ── Tokens locales ── El violeta primario y el modo claro vienen del tema global (main.ts) */
.home {
  --ws-accent: #9155fd;
  --ws-accent-hover: #804bdf;
  --ws-accent-soft: rgba(145, 85, 253, 0.12);
  --ws-text: #1e293b; /* slate-800 */
  --ws-muted: #64748b; /* slate-500 */
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
  padding: 2rem 1.5rem;
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

.section-text {
  color: var(--ws-muted);
  line-height: 1.6;
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
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

/* ── CTA para estudiantes ── */
.section-cta {
  padding-bottom: 4rem;
}

.cta-card {
  max-width: 560px;
  margin: 0 auto;
  text-align: center;
  border: 1px solid var(--ws-border);
}

.cta-card :deep(.p-card-title) {
  color: var(--ws-text);
  font-weight: 700;
}

.cta-card :deep(.p-card-footer) {
  display: flex;
  justify-content: center;
}

.cta-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-top: 1.5rem;
  border-radius: 50%;
  background: var(--ws-accent-soft);
  color: var(--ws-accent);
  font-size: 1.4rem;
}

@media (max-width: 480px) {
  .hero {
    padding: 3rem 1.25rem 2rem;
  }
}
</style>