<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Chatbot from '@/components/Chatbot.vue'
import heroEscritorio from '@/assets/escritorio-hero.jpg'
import ProyectoCard from '@/components/public/ProyectoCard.vue'
import PortafolioCard from '@/components/portafolios/PortafolioCard.vue'
import { useDestacados, usePortafolios } from '@/queries/perfiles'
import { useProyectosPublicos } from '@/queries/catalogo'

// Proyectos destacados por Coordinación (ya filtrados: validados, publicados y destacados)
const { data: destacadosDatos, isPending: cargandoDestacados } = useDestacados()
const destacados = computed(() => destacadosDatos.value ?? [])

// Últimos proyectos publicados (ya filtrados: validados y publicados)
const { data: proyectosDatos, isPending: cargandoProyectos, isError: errorProyectos } = useProyectosPublicos({ limit: 6 })
const proyectos = computed(() => proyectosDatos.value?.proyectos ?? [])

// Estudiantes con portafolio público
const { data: estudiantesDatos, isPending: cargandoEstudiantes, isError: errorEstudiantes } = usePortafolios({ limit: 6 })
const estudiantes = computed(() => estudiantesDatos.value?.estudiantes ?? [])
</script>

<template>
  <div class="home">
    <!-- Bloque principal -->
    <section class="hero">
      <div class="hero-texto">
        <h1 class="titulo">Talento Tech <span class="resalte">ULS</span>: Proyectos Estudiantiles de Computación</h1>
        <p class="lead">
          Conoce los proyectos que construyen los estudiantes de Ciencias de la Computación de la ULS,
          revisados y validados por la coordinación académica.
        </p>
        <div class="acciones">
          <Button as="router-link" to="/proyectos" label="Explorar proyectos" size="large" />
          <Button as="router-link" to="/portafolios" label="Ver estudiantes" severity="secondary" outlined size="large" />
        </div>
      </div>

      <img
        :src="heroEscritorio"
        alt="Laptop sobre un escritorio oscuro, con una lámpara y una taza de café"
        class="hero-imagen"
        width="1599"
        height="1066"
      />
    </section>

    <!-- Proyectos destacados -->
    <section class="bloque" aria-labelledby="destacados-titulo">
      <div class="cabecera">
        <h2 id="destacados-titulo" class="subtitulo">Proyectos destacados</h2>
      </div>

      <div v-if="destacados.length" class="grid">
        <ProyectoCard v-for="p in destacados" :key="p.id" :proyecto="p" destacado />
      </div>
      <p v-else-if="cargandoDestacados" class="estado" role="status">Cargando proyectos…</p>
      <p v-else class="estado">La coordinación aún no ha destacado proyectos. Aparecerán aquí en cuanto los seleccione.</p>
    </section>

    <!-- Proyectos publicados -->
    <section class="bloque" aria-labelledby="proyectos-titulo">
      <div class="cabecera">
        <h2 id="proyectos-titulo" class="subtitulo">Proyectos publicados</h2>
        <RouterLink to="/proyectos" class="ver-todos">
          Ver todos <i class="pi pi-arrow-right" aria-hidden="true"></i>
        </RouterLink>
      </div>

      <Message v-if="errorProyectos" severity="error" :closable="false">No se pudieron cargar los proyectos.</Message>
      <div v-else-if="proyectos.length" class="grid">
        <ProyectoCard v-for="p in proyectos" :key="p.id" :proyecto="p" compacta />
      </div>
      <p v-else-if="cargandoProyectos" class="estado" role="status">Cargando proyectos…</p>
      <p v-else class="estado">Aún no hay proyectos publicados. Aparecerán aquí cuando la coordinación los valide.</p>
    </section>

    <!-- Estudiantes con portafolio -->
    <section class="bloque" aria-labelledby="estudiantes-titulo">
      <div class="cabecera">
        <h2 id="estudiantes-titulo" class="subtitulo">Estudiantes con portafolio</h2>
        <RouterLink to="/portafolios" class="ver-todos">
          Ver todos <i class="pi pi-arrow-right" aria-hidden="true"></i>
        </RouterLink>
      </div>

      <Message v-if="errorEstudiantes" severity="error" :closable="false">No se pudieron cargar los estudiantes.</Message>
      <div v-else-if="estudiantes.length" class="grid">
        <PortafolioCard v-for="e in estudiantes" :key="e.id" :estudiante="e" />
      </div>
      <p v-else-if="cargandoEstudiantes" class="estado" role="status">Cargando estudiantes…</p>
      <p v-else class="estado">Aún no hay estudiantes con portafolio público.</p>
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

/* Bloque principal: texto a la izquierda, imagen a la derecha */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 3rem;
  padding: 4rem 0 2rem;
}

.titulo {
  margin: 0 0 1rem;
  font-family: var(--ws-fuente-titulo);
  font-size: clamp(1.9rem, 3.6vw, 2.7rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--ws-texto);
}

.resalte {
  color: var(--ws-azul-claro);
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

.hero-imagen {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--ws-borde);
}

/* Secciones */
.bloque {
  margin-top: 3.5rem;
}

.cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.subtitulo {
  margin: 0;
  font-family: var(--ws-fuente-titulo);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ws-texto);
}

.ver-todos {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--ws-azul-claro);
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
  margin: 0;
  padding: 1.5rem;
  border: 1px solid var(--ws-borde);
  border-radius: 8px;
  background: var(--ws-superficie);
  color: var(--ws-texto-suave);
}

/* Pantallas pequeñas: la imagen baja debajo de los botones */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    padding: 2.5rem 0 1rem;
  }
}

@media (max-width: 600px) {
  .home {
    padding: 0 1rem 2.5rem;
  }
}
</style>
