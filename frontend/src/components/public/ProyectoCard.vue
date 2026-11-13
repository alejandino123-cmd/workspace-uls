<script setup lang="ts">
import TecnologiaChip from '@/components/tecnologias/TecnologiaChip.vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { fechaCorta } from '@/lib/formato'
import type { ProyectoResumen } from '@/service/catalogo'

const props = defineProps<{
  proyecto: ProyectoResumen
  // Marca visual de "destacado por coordinación"
  destacado?: boolean
}>()

const MAX_TECNOLOGIAS = 4
const tecnologias = computed(() => props.proyecto.tecnologias.slice(0, MAX_TECNOLOGIAS))
const restantes = computed(() => Math.max(props.proyecto.tecnologias.length - MAX_TECNOLOGIAS, 0))

// Sin imagen de portada en los datos: se usa un fondo con degradado y el icono de la primera tecnología
const iconos: Record<string, string> = {
  vue: 'pi-code',
  javascript: 'pi-code',
  python: 'pi-code',
  java: 'pi-code',
  kotlin: 'pi-mobile',
  flutter: 'pi-mobile',
  mysql: 'pi-database',
  mongodb: 'pi-database',
  postgresql: 'pi-database',
  laravel: 'pi-server',
  php: 'pi-server',
  node: 'pi-server',
}
const icono = computed(() => {
  const primera = props.proyecto.tecnologias[0]?.toLowerCase() ?? ''
  return iconos[primera] ?? 'pi-desktop'
})
</script>

<template>
  <article class="tarjeta sombra-tarjeta">
    <div class="portada" :class="{ 'con-imagen': proyecto.imagenUrl }" aria-hidden="true">
      <img v-if="proyecto.imagenUrl" :src="proyecto.imagenUrl" alt="" loading="lazy" class="imagen" />
      <span v-else class="portada-icono"><i :class="['pi', icono]"></i></span>
      <span v-if="destacado" class="etiqueta etiqueta-destacada">
        <i class="pi pi-star-fill"></i> Destacado
      </span>
    </div>

    <div class="cuerpo">
      <h3 class="titulo">{{ proyecto.titulo }}</h3>
      <p class="descripcion">{{ proyecto.descripcion }}</p>

      <ul v-if="tecnologias.length" class="tecnologias" aria-label="Tecnologías">
        <li v-for="t in tecnologias" :key="t"><TecnologiaChip :nombre="t" tamano="pequeno" /></li>
        <li v-if="restantes" class="tec tec-mas">+{{ restantes }}</li>
      </ul>

      <div class="autor">
        <AvatarEstudiante :nombre="proyecto.estudiante.nombre" :foto-url="proyecto.estudiante.fotoUrl" tamano="32px" />
        <div class="autor-texto">
          <span class="autor-nombre">{{ proyecto.estudiante.nombre }}</span>
          <span class="fecha">Actualizado {{ fechaCorta(proyecto.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <div class="pie">
      <RouterLink :to="{ name: 'proyecto', params: { id: proyecto.id } }" class="ver">
        Ver proyecto <i class="pi pi-arrow-right" aria-hidden="true"></i>
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.tarjeta {
  display: flex;
  flex-direction: column;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.tarjeta:hover {
  transform: translateY(-3px);
  border-color: var(--ws-azul-claro);
  box-shadow: 0 18px 40px -18px rgba(25, 81, 252, 0.55);
}

.portada {
  position: relative;
  overflow: hidden;
  height: 180px;
  display: grid;
  place-items: center;
  background: var(--ws-degradado);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    var(--ws-degradado);
  background-size: 24px 24px, 24px 24px, auto;
}

.imagen {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.tarjeta:hover .imagen {
  transform: scale(1.03);
}

.portada-icono {
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  font-size: 1.35rem;
}

.etiqueta {
  z-index: 1;
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.etiqueta-destacada {
  background: var(--ws-azul-hielo);
  color: var(--ws-azul-oscuro);
}

.cuerpo {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.1rem 1.2rem 0.5rem;
}

.titulo {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--ws-texto);
}

.descripcion {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--ws-texto-suave);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tecnologias {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-width: 0;
  max-width: 100%;
}

.tecnologias li {
  min-width: 0;
  max-width: 100%;
}

.tec {
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
  color: var(--ws-primario);
}

.tec-mas {
  color: var(--ws-texto-suave);
}

.autor {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ws-borde);
}

.autor-texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.autor-nombre {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ws-texto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fecha {
  font-size: 0.78rem;
  color: var(--ws-texto-suave);
}

.pie {
  padding: 0.9rem 1.2rem 1.1rem;
}

.ver {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  justify-content: center;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  background: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
  color: var(--ws-primario);
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.ver:hover {
  background: var(--ws-primario);
  border-color: var(--ws-primario);
  color: #fff;
}
</style>
