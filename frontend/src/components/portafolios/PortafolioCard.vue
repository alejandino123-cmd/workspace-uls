<script setup lang="ts">
import TecnologiaChip from '@/components/tecnologias/TecnologiaChip.vue'
import { RouterLink } from 'vue-router'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { etiquetaDisponibilidad } from '@/service/perfil'
import type { PerfilPublicoResumen, ProyectoPublico } from '@/service/perfiles'

defineProps<{
  estudiante: PerfilPublicoResumen
  // Vista previa opcional: se muestran los 2 primeros proyectos
  proyectos?: ProyectoPublico[]
  // Versión corta (portada): solo foto, nombre y especialidad
  compacta?: boolean
}>()
</script>

<template>
  <RouterLink :to="{ name: 'portafolio', params: { userId: estudiante.id } }" class="card">
    <div class="head">
      <AvatarEstudiante :nombre="estudiante.nombre" :foto-url="estudiante.fotoUrl" tamano="48px" />
      <div class="quien">
        <span class="nombre">{{ estudiante.nombre }}</span>
        <span v-if="estudiante.especialidad" class="sub">{{ estudiante.especialidad }}</span>
        <span v-else-if="estudiante.disponibilidad" class="sub">
          {{ etiquetaDisponibilidad(estudiante.disponibilidad) }}
        </span>
      </div>
    </div>

    <ul v-if="!compacta && proyectos?.length" class="proyectos">
      <li v-for="p in proyectos.slice(0, 2)" :key="p.id">
        <i class="pi pi-folder"></i>
        <span>{{ p.titulo }}</span>
      </li>
    </ul>

    <div v-if="!compacta && estudiante.habilidades.length" class="chips">
      <TecnologiaChip v-for="h in estudiante.habilidades.slice(0, 4)" :key="h" :nombre="h" tamano="pequeno" />
      <span v-if="estudiante.habilidades.length > 4" class="tag tag-mas">
        +{{ estudiante.habilidades.length - 4 }}
      </span>
    </div>

    <div v-if="!compacta" class="foot">
      <span class="pill">
        <i class="pi pi-check-circle"></i>
        {{ estudiante.totalProyectos }}
        {{ estudiante.totalProyectos === 1 ? 'proyecto publicado' : 'proyectos publicados' }}
      </span>
      <span class="ver">Ver portafolio <i class="pi pi-arrow-right" aria-hidden="true"></i></span>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 8px;
  color: var(--ws-texto);
  text-decoration: none;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: var(--ws-azul-claro);
}

.card:focus-visible {
  outline: 2px solid var(--ws-primario);
  outline-offset: 2px;
}

.head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.quien {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nombre {
  font-weight: 600;
  color: var(--ws-texto);
}

.sub {
  font-size: 0.85rem;
  color: var(--ws-texto-suave);
}

.proyectos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.proyectos li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  color: var(--ws-texto);
}

.proyectos i {
  color: var(--ws-primario);
  font-size: 0.95rem;
}

.proyectos span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag {
  padding: 0.2rem 0.65rem;
  border-radius: 6px;
  background: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
  color: var(--ws-texto);
  font-size: 0.8rem;
  font-weight: 500;
}

.tag-mas {
  background: transparent;
  color: var(--ws-texto-suave);
}

.foot {
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid var(--ws-borde);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  background: var(--ws-superficie-2);
  color: var(--ws-azul-hielo);
  font-size: 0.8rem;
  font-weight: 600;
}

.avance {
  font-size: 0.8rem;
  color: var(--ws-texto-suave);
}

.ver {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ws-azul-claro);
}
</style>