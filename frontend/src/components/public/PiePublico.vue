<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'

const anioActual = new Date().getFullYear()
</script>

<template>
  <footer class="pie">
    <div class="interior">
      <div class="identidad">
        <div class="marca">
          <LogoWorkspace size="1.5rem" />
          <span>Workspace <strong>ULS</strong></span>
        </div>
        <p class="institucion">
          Universidad Luterana Salvadoreña<br />
          (Facultad De Ciencias Del Hombre Y La Naturaleza)<br />
          Licenciatura en Ciencias de la Computación
        </p>
      </div>

      <nav class="col" aria-label="Navegación del pie">
        <h2 class="titulo">Explorar</h2>
        <RouterLink to="/">Inicio</RouterLink>
        <RouterLink to="/proyectos">Proyectos publicados</RouterLink>
        <RouterLink to="/portafolios">Estudiantes</RouterLink>
      </nav>

      <div class="col">
        <h2 class="titulo">Acerca de</h2>
        <p class="info">
           Espacio académico diseñado para que los estudiantes exhiban los proyectos y competencias adquiridos durante su carrera.
        </p>
        <RouterLink to="/login">Acceso exclusivo para estudiantes y coordinación académica.</RouterLink>
      </div>
    </div>

    <div class="legal">
      <span>&copy; {{ anioActual }} Workspace ULS · Universidad Luterana Salvadoreña</span>
    </div>
  </footer>
</template>

<style scoped>
.pie {
  margin-top: auto;
  background: var(--ws-azul-oscuro);
  color: #cbe9fd;
}

.interior {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 1.5rem 2rem;
  display: grid;
  grid-template-columns: 1.4fr 1fr 1.2fr;
  gap: 2.5rem;
}

.marca {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: #fff;
  font-size: 1.05rem;
}

.marca strong {
  color: var(--ws-azul-claro);
}

.institucion,
.info {
  margin: 0.9rem 0 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #cbe9fd;
}

.titulo {
  margin: 0 0 0.9rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.col a {
  color: #cbe9fd;
  text-decoration: none;
  font-size: 0.95rem;
  width: fit-content;
}

.col a:hover {
  color: var(--ws-azul-claro);
  text-decoration: underline;
}

.legal {
  border-top: 1px solid rgba(203, 233, 253, 0.18);
  padding: 1.1rem 1.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: #cbe9fd;
}

@media (max-width: 800px) {
  .interior {
    grid-template-columns: 1fr;
    gap: 1.75rem;
    padding: 2.25rem 1.25rem 1.5rem;
  }
}
</style>
