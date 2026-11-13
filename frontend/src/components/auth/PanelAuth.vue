<script setup lang="ts">
import heroWorkspace from '@/assets/hero-tecnologia.png'
</script>

<template>
  <aside class="panel">
    <img :src="heroWorkspace" alt="" aria-hidden="true" class="imagen" />
    <div class="velo"></div>
    <div class="texto">
      <span class="etiqueta">Portafolio académico</span>
      <h2 class="titulo">El talento se construye creando.</h2>
      <p class="lead">Workspace ULS reúne los proyectos de los estudiantes de Ciencias de la Computación de la ULS.</p>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  position: relative;
  display: none;
  overflow: hidden;
  background: var(--ws-indigo-profundo);
  color: #fff;
}

.imagen {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Velo azul para que el texto se lea sobre la ilustración */
.velo {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(31, 28, 75, 0.15) 0%, rgba(31, 28, 75, 0.85) 100%);
}

.texto {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 3rem;
}

.etiqueta {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.titulo {
  margin: 1rem 0 0.5rem;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-weight: 800;
  line-height: 1.15;
}

.lead {
  margin: 0;
  max-width: 28rem;
  line-height: 1.6;
  color: var(--ws-indigo-palido);
}

@media (min-width: 1024px) {
  .panel {
    display: block;
  }
}
</style>
