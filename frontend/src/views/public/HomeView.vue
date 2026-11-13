<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Chatbot from '@/components/Chatbot.vue'
import heroWorkspace from '@/assets/hero-tecnologia.png'
import ProyectoCard from '@/components/public/ProyectoCard.vue'
import PortafolioCard from '@/components/portafolios/PortafolioCard.vue'
import { useDestacados, usePortafolios } from '@/queries/perfiles'
import { useProyectosPublicos, useTecnologiasPublicas } from '@/queries/catalogo'

// Cifras reales: se piden con límite 1 solo para leer el total
const { data: portafolios } = usePortafolios({ limit: 1 })
const { data: catalogoTotal } = useProyectosPublicos({ limit: 1 })
const totalEstudiantes = computed(() => portafolios.value?.total ?? 0)
const totalProyectos = computed(() => catalogoTotal.value?.total ?? 0)

// Proyectos destacados por Coordinación (ya filtrados: validados, publicados y destacados)
const { data: destacadosDatos, isPending: cargandoDestacados } = useDestacados()
const destacados = computed(() => destacadosDatos.value ?? [])

// Últimos proyectos publicados (ya filtrados: validados y publicados)
const { data: recientesDatos, isPending: cargandoRecientes, isError: errorRecientes } = useProyectosPublicos({ limit: 6 })
const recientes = computed(() => recientesDatos.value?.proyectos ?? [])

// Tecnologías con al menos un proyecto publicado
const { data: tecnologiasDatos } = useTecnologiasPublicas(12)
const tecnologias = computed(() => tecnologiasDatos.value ?? [])

// Talento: estudiantes con portafolio público
const { data: talentoDatos } = usePortafolios({ limit: 6 })
const talento = computed(() => talentoDatos.value?.estudiantes ?? [])
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-texto">
        <span class="etiqueta">
          <i class="pi pi-code" aria-hidden="true"></i>
          Portafolio académico
        </span>
        <h1 class="titulo">
            Mentes creativas, <span class="texto-degradado">soluciones reales.</span>
        </h1>
        <p class="lead">
          Un espacio donde el código cobra vida. 
          Conoce los proyectos, herramientas y propuestas tecnológicas que reflejan la creatividad, 
          el esfuerzo y la formación de los estudiantes de Ciencias de la Computación de la ULS.
        </p>
        <div class="acciones">
          <Button as="router-link" to="/proyectos" label="Explorar proyectos" icon="pi pi-arrow-right" icon-pos="right" size="large" />
          <Button as="router-link" to="/portafolios" label="Ver estudiantes" severity="secondary" outlined size="large" />
        </div>
        <p class="nota">"Explora repositorios, tecnologías utilizadas y perfiles listos para el mundo laboral."</p>

        <dl class="cifras" aria-label="Cifras de la plataforma">
          <div>
            <dt>Proyectos publicados</dt>
            <dd>{{ totalProyectos }}</dd>
          </div>
          <div>
            <dt>Estudiantes con portafolio</dt>
            <dd>{{ totalEstudiantes }}</dd>
          </div>
        </dl>
      </div>

      <div class="hero-visual">
        <img :src="heroWorkspace" alt="Estudiantes de Ciencias de la Computación creando proyectos con Workspace ULS" class="hero-imagen" />
      </div>
    </section>

    <!-- Proyectos destacados -->
    <section class="bloque" aria-labelledby="destacados-titulo">
      <div class="cabecera">
        <div>
          <h2 id="destacados-titulo" class="subtitulo">Proyectos destacados</h2>
          <p class="sub">Seleccionados por la coordinación académica.</p>
        </div>
      </div>

      <div v-if="destacados.length" class="grid">
        <ProyectoCard v-for="p in destacados" :key="p.id" :proyecto="p" destacado />
      </div>

      <div v-else-if="cargandoDestacados" class="estado" role="status">Cargando proyectos…</div>

      <div v-else class="vacio">
        <span class="vacio-icono"><i class="pi pi-star" aria-hidden="true"></i></span>
        <h3 class="vacio-titulo">Próximamente</h3>
        <p class="vacio-texto">
          La coordinación seleccionará proyectos destacados. Aparecerán aquí en cuanto estén publicados.
        </p>
      </div>
    </section>

    <!-- Últimos proyectos -->
    <section class="bloque" aria-labelledby="recientes-titulo">
      <div class="cabecera">
        <div>
          <h2 id="recientes-titulo" class="subtitulo">Últimos proyectos publicados</h2>
          <p class="sub">Trabajos aprobados y visibles para todo el público.</p>
        </div>
        <RouterLink to="/proyectos" class="ver-todos">
          Ver todos los proyectos <i class="pi pi-arrow-right" aria-hidden="true"></i>
        </RouterLink>
      </div>

      <Message v-if="errorRecientes" severity="error" :closable="false">No se pudieron cargar los proyectos.</Message>
      <div v-else-if="recientes.length" class="grid">
        <ProyectoCard v-for="p in recientes" :key="p.id" :proyecto="p" />
      </div>
      <div v-else-if="cargandoRecientes" class="estado" role="status">Cargando proyectos…</div>
      <div v-else class="vacio">
        <span class="vacio-icono"><i class="pi pi-folder-open" aria-hidden="true"></i></span>
        <h3 class="vacio-titulo">Aún no hay proyectos publicados</h3>
        <p class="vacio-texto">Cuando la coordinación apruebe y se publique un proyecto, aparecerá aquí.</p>
      </div>
    </section>

    <!-- Tecnologías -->
    <section v-if="tecnologias.length" class="bloque" aria-labelledby="tecnologias-titulo">
      <div class="cabecera">
        <div>
          <h2 id="tecnologias-titulo" class="subtitulo">Explora por tecnologías</h2>
          <p class="sub">Herramientas usadas en los proyectos publicados.</p>
        </div>
      </div>
      <ul class="tecnologias">
        <li v-for="t in tecnologias" :key="t.nombre">
          <RouterLink :to="{ name: 'proyectos', query: { tecnologia: t.nombre } }" class="tecnologia">
            <span>{{ t.nombre }}</span>
            <span class="conteo">{{ t.total }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <!-- Talento -->
    <section v-if="talento.length" class="bloque" aria-labelledby="talento-titulo">
      <div class="cabecera">
        <div>
          <h2 id="talento-titulo" class="subtitulo">Talento estudiantil</h2>
          <p class="sub">Estudiantes con perfil público y proyectos validados.</p>
        </div>
        <RouterLink to="/portafolios" class="ver-todos">
          Ver todos los estudiantes <i class="pi pi-arrow-right" aria-hidden="true"></i>
        </RouterLink>
      </div>
      <div class="grid">
        <PortafolioCard v-for="e in talento" :key="e.id" :estudiante="e" />
      </div>
    </section>

    <Chatbot />
  </div>
</template>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem 3.5rem;
}

/* Hero: dos columnas (texto + composición gráfica) con un halo azul de fondo */
.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  align-items: center;
  gap: 3rem;
  padding: 4rem 0 3rem;
  isolation: isolate;
}

/* Cuadrícula decorativa solo en la portada, desvanecida hacia los bordes */
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--ws-cuadricula) 1px, transparent 1px),
    linear-gradient(90deg, var(--ws-cuadricula) 1px, transparent 1px);
  background-size: 40px 40px;
  -webkit-mask-image: radial-gradient(ellipse at 60% 40%, #000 0%, transparent 70%);
  mask-image: radial-gradient(ellipse at 60% 40%, #000 0%, transparent 70%);
  z-index: -1;
  pointer-events: none;
}

.hero::before {
  content: '';
  position: absolute;
  inset: -6rem -10% auto auto;
  width: min(42rem, 90vw);
  height: 32rem;
  background:
    radial-gradient(closest-side, rgba(25, 81, 252, 0.35), transparent 70%),
    radial-gradient(closest-side at 70% 40%, rgba(55, 129, 252, 0.2), transparent 70%);
  filter: blur(30px);
  z-index: -1;
  pointer-events: none;
}

.etiqueta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: rgba(55, 129, 252, 0.12);
  border: 1px solid rgba(55, 129, 252, 0.35);
  color: var(--ws-azul-hielo);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.titulo {
  margin: 1.25rem 0 1rem;
  font-size: clamp(2.2rem, 4.8vw, 3.5rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--ws-texto);
}

.lead {
  margin: 0 0 1.75rem;
  max-width: 34rem;
  font-size: 1.08rem;
  line-height: 1.65;
  color: var(--ws-texto-suave);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.nota {
  margin: 1.25rem 0 0;
  font-size: 0.92rem;
  color: var(--ws-texto-suave);
}

/* Cifras como barra de cristal, estilo panel técnico */
.cifras {
  display: flex;
  gap: 2.5rem;
  margin: 2rem 0 0;
  padding: 1.1rem 1.5rem;
  border-radius: 16px;
  border: 1px solid rgba(55, 129, 252, 0.2);
  background: rgba(18, 26, 49, 0.6);
  backdrop-filter: blur(8px);
}

/* Botón principal con degradado azul y brillo */
.acciones :deep(.p-button:not(.p-button-outlined)) {
  background: linear-gradient(135deg, #0b2cb1 0%, #1951fc 60%, #3781fc 100%);
  border-color: transparent;
  box-shadow: 0 10px 30px -8px rgba(25, 81, 252, 0.7);
}

.acciones :deep(.p-button.p-button-outlined) {
  border-color: rgba(203, 233, 253, 0.45);
  color: var(--ws-texto);
}

/* Título con brillo sobre la segunda línea */
.titulo .texto-degradado {
  background: linear-gradient(90deg, #3781fc 0%, #cbe9fd 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 0 18px rgba(55, 129, 252, 0.45));
}

.cifras dt {
  font-size: 0.82rem;
  color: var(--ws-texto-suave);
}

.cifras dd {
  margin: 0.15rem 0 0;
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--ws-texto);
}

/* Secciones */
.bloque {
  margin-top: 3.5rem;
}

.cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.subtitulo {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ws-texto);
}

.sub {
  margin: 0.3rem 0 0;
  color: var(--ws-texto-suave);
}

.ver-todos {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--ws-primario);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.ver-todos:hover {
  text-decoration: underline;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 1.25rem;
}

.estado {
  color: var(--ws-texto-suave);
  padding: 2rem 0;
  text-align: center;
}

/* Tecnologías */
.tecnologias {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tecnologia {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.9rem;
  border-radius: 12px;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  color: var(--ws-texto);
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}

.tecnologia:hover {
  border-color: var(--ws-azul-claro);
  transform: translateY(-2px);
  box-shadow: var(--ws-sombra);
}

.conteo {
  min-width: 1.6rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--ws-superficie-2);
  color: var(--ws-primario);
  font-size: 0.78rem;
  text-align: center;
}

/* Estado vacío */
.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2.5rem 1.5rem;
  border-radius: 18px;
  background: var(--ws-degradado-suave);
  border: 1px dashed var(--ws-azul-claro);
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

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding: 2.5rem 0 1.5rem;
  }

  .hero-imagen {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 24px;
  border: 1px solid rgba(55, 129, 252, 0.25);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.71), 0 0 60px -10px rgba(25, 81, 252, 0.45);
}

.hero-visual :deep(.escena) {
    max-width: 320px;
  }
}

@media (max-width: 600px) {
  .home {
    padding: 0 1rem 2.5rem;
  }

  .cifras {
    gap: 1.5rem;
  }

  .cifras dd {
    font-size: 1.5rem;
  }

  .subtitulo {
    font-size: 1.35rem;
  }
}
</style>
