<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { etiquetaDisponibilidad } from '@/service/perfil'
import type { PerfilPublicoResumen, ProyectoPublico } from '@/service/perfiles'

defineProps<{
  estudiante: PerfilPublicoResumen
  // Vista previa opcional: se muestran los 2 primeros proyectos
  proyectos?: ProyectoPublico[]
}>()
</script>

<template>
  <RouterLink :to="{ name: 'portafolio', params: { userId: estudiante.id } }" class="card">
    <div class="head">
      <AvatarEstudiante :nombre="estudiante.nombre" :foto-url="estudiante.fotoUrl" tamano="48px" />
      <div class="quien">
        <span class="nombre">{{ estudiante.nombre }}</span>
        <span v-if="estudiante.disponibilidad" class="sub">
          {{ etiquetaDisponibilidad(estudiante.disponibilidad) }}
        </span>
      </div>
    </div>

    <ul v-if="proyectos?.length" class="proyectos">
      <li v-for="p in proyectos.slice(0, 2)" :key="p.id">
        <i class="pi pi-folder"></i>
        <span>{{ p.titulo }}</span>
      </li>
    </ul>

    <div v-if="estudiante.habilidades.length" class="chips">
      <span v-for="h in estudiante.habilidades.slice(0, 4)" :key="h" class="tag">{{ h }}</span>
      <span v-if="estudiante.habilidades.length > 4" class="tag tag-mas">
        +{{ estudiante.habilidades.length - 4 }}
      </span>
    </div>

    <div class="foot">
      <span class="pill">
        <i class="pi pi-check-circle"></i>
        {{ estudiante.totalProyectos }}
        {{ estudiante.totalProyectos === 1 ? 'proyecto validado' : 'proyectos validados' }}
      </span>
      <span class="avance">Avance {{ estudiante.porcentajeAvance }} %</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: #fff;
  border: 1px solid #e7e5ec;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(58, 53, 65, 0.1);
  color: #1e293b;
  text-decoration: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.card:hover {
  border-color: #c4a6ff;
  box-shadow: 0 4px 16px rgba(145, 85, 253, 0.18);
}

.card:focus-visible {
  outline: 2px solid #9155fd;
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
  font-weight: 700;
  color: #1e293b;
}

.sub {
  font-size: 0.85rem;
  color: #64748b;
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
  color: #334155;
}

.proyectos i {
  color: #9155fd;
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
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 500;
}

.tag-mas {
  background: transparent;
  color: #64748b;
}

.foot {
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid #e7e5ec;
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
  border-radius: 999px;
  background: rgba(145, 85, 253, 0.12);
  color: #804bdf;
  font-size: 0.8rem;
  font-weight: 600;
}

.avance {
  font-size: 0.8rem;
  color: #64748b;
}
</style>