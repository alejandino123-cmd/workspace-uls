<script setup lang="ts">
import TecnologiaChip from '@/components/tecnologias/TecnologiaChip.vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { fechaCorta } from '@/lib/formato'
import { useProyectoPublico } from '@/queries/catalogo'
import { mensajeDeError } from '@/service/errores'

const props = defineProps<{ id: number }>()

const { data: proyecto, isPending, isError, error } = useProyectoPublico(() => props.id)

const noEncontrado = computed(() => {
  const estado = (error.value as { response?: { status?: number } } | null)?.response?.status
  return isError.value && estado === 404
})

// Enlaces externos: solo se muestran los que el estudiante registró
const enlaces = computed(() => {
  const p = proyecto.value
  if (!p) return []
  return [
    p.urlDemo && { href: p.urlDemo, texto: 'Ver demostración', icono: 'pi pi-external-link', principal: true },
    p.urlRepositorio && { href: p.urlRepositorio, texto: 'Repositorio', icono: 'pi pi-github', principal: false },
    p.urlDocumentacion && { href: p.urlDocumentacion, texto: 'Documentación', icono: 'pi pi-book', principal: false },
  ].filter(Boolean) as { href: string; texto: string; icono: string; principal: boolean }[]
})

// Redes del estudiante: solo se muestran si existen
const contactos = computed(() => {
  const e = proyecto.value?.estudiante
  if (!e) return []
  return [
    e.github && { href: e.github, texto: 'GitHub', icono: 'pi pi-github' },
    e.linkedin && { href: e.linkedin, texto: 'LinkedIn', icono: 'pi pi-linkedin' },
    e.sitioWeb && { href: e.sitioWeb, texto: 'Sitio web', icono: 'pi pi-globe' },
  ].filter(Boolean) as { href: string; texto: string; icono: string }[]
})
</script>

<template>
  <div class="pagina">
    <nav class="migas" aria-label="Ruta de navegación">
      <RouterLink to="/proyectos"><i class="pi pi-arrow-left" aria-hidden="true"></i> Proyectos publicados</RouterLink>
    </nav>

    <div v-if="isPending" class="carga" role="status" aria-label="Cargando proyecto">
      <Skeleton height="2.5rem" width="60%" />
      <Skeleton height="1.25rem" class="mt" />
      <Skeleton height="1.25rem" width="85%" />
      <Skeleton height="12rem" class="mt" />
    </div>

    <div v-else-if="noEncontrado" class="vacio">
      <span class="vacio-icono"><i class="pi pi-folder-open" aria-hidden="true"></i></span>
      <h1 class="vacio-titulo">Este proyecto no está disponible</h1>
      <p class="vacio-texto">Puede que no exista o que todavía no haya sido publicado.</p>
      <Button as="router-link" to="/proyectos" label="Ver proyectos publicados" icon="pi pi-arrow-left" />
    </div>

    <Message v-else-if="isError" severity="error" :closable="false">
      {{ mensajeDeError(error, 'No se pudo cargar el proyecto') }}
    </Message>

    <template v-else-if="proyecto">
      <img
        v-if="proyecto.imagenUrl"
        :src="proyecto.imagenUrl"
        :alt="`Vista previa de ${proyecto.titulo}`"
        class="imagen-principal"
      />

      <header class="encabezado">
        <h1 class="titulo">{{ proyecto.titulo }}</h1>
        <div class="meta">
          <RouterLink :to="{ name: 'portafolio', params: { userId: proyecto.estudiante.id } }" class="autor">
            <AvatarEstudiante :nombre="proyecto.estudiante.nombre" :foto-url="proyecto.estudiante.fotoUrl" tamano="40px" />
            <span>
              <strong>{{ proyecto.estudiante.nombre }}</strong>
              <small v-if="proyecto.estudiante.especialidad">{{ proyecto.estudiante.especialidad }}</small>
            </span>
          </RouterLink>
          <span class="fecha"><i class="pi pi-calendar" aria-hidden="true"></i> Actualizado {{ fechaCorta(proyecto.updatedAt) }}</span>
        </div>
      </header>

      <div class="columnas">
        <div class="principal">
          <section class="tarjeta sombra-tarjeta">
            <h2 class="seccion-titulo">Descripción</h2>
            <p class="texto">{{ proyecto.descripcion }}</p>
          </section>

          <section v-if="proyecto.tecnologias.length" class="tarjeta sombra-tarjeta">
            <h2 class="seccion-titulo">Tecnologías utilizadas</h2>
            <ul class="tecnologias">
              <li v-for="t in proyecto.tecnologias" :key="t">
                <RouterLink :to="{ name: 'proyectos', query: { tecnologia: t } }" class="tec-enlace"><TecnologiaChip :nombre="t" /></RouterLink>
              </li>
            </ul>
          </section>
        </div>

        <aside class="lateral">
          <section class="tarjeta sombra-tarjeta">
            <h2 class="seccion-titulo">Enlaces del proyecto</h2>
            <div v-if="enlaces.length" class="botones">
              <a
                v-for="e in enlaces"
                :key="e.href"
                :href="e.href"
                target="_blank"
                rel="noopener noreferrer"
                :class="['boton', e.principal ? 'boton-principal' : 'boton-secundario']"
              >
                <i :class="e.icono" aria-hidden="true"></i>
                {{ e.texto }}
              </a>
            </div>
            <p v-else class="texto-suave">Este proyecto no incluye enlaces externos.</p>
          </section>

          <section class="tarjeta sombra-tarjeta">
            <h2 class="seccion-titulo">Estudiante</h2>
            <div class="perfil">
              <AvatarEstudiante :nombre="proyecto.estudiante.nombre" :foto-url="proyecto.estudiante.fotoUrl" tamano="56px" />
              <div>
                <strong>{{ proyecto.estudiante.nombre }}</strong>
                <small v-if="proyecto.estudiante.especialidad">{{ proyecto.estudiante.especialidad }}</small>
              </div>
            </div>
            <p v-if="proyecto.estudiante.biografia" class="texto-suave bio">{{ proyecto.estudiante.biografia }}</p>
            <ul v-if="contactos.length" class="contactos">
              <li v-for="c in contactos" :key="c.href">
                <a :href="c.href" target="_blank" rel="noopener noreferrer"><i :class="c.icono" aria-hidden="true"></i> {{ c.texto }}</a>
              </li>
            </ul>
            <Button
              as="router-link"
              :to="{ name: 'portafolio', params: { userId: proyecto.estudiante.id } }"
              label="Ver portafolio completo"
              icon="pi pi-user"
              severity="secondary"
              outlined
              class="ancho"
            />
          </section>
        </aside>
      </div>

    </template>
  </div>
</template>

<style scoped>
.pagina {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 3.5rem;
}

.migas a {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--ws-primario);
  font-weight: 600;
  text-decoration: none;
}

.migas a:hover {
  text-decoration: underline;
}

.carga {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 2rem;
}

.mt {
  margin-top: 0.75rem;
}

.imagen-principal {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--ws-borde);
  margin-top: 1.25rem;
  box-shadow: var(--ws-sombra);
}

.encabezado {
  margin: 1.5rem 0 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--ws-borde);
}

.titulo {
  margin: 0;
  font-size: clamp(1.9rem, 4vw, 2.75rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--ws-texto);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  margin-top: 1.25rem;
}

.autor {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  color: var(--ws-texto);
  text-decoration: none;
}

.autor span {
  display: flex;
  flex-direction: column;
}

.autor small,
.perfil small {
  color: var(--ws-texto-suave);
  font-size: 0.85rem;
}

.fecha {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--ws-texto-suave);
  font-size: 0.9rem;
}

.columnas {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  align-items: start;
}

.principal,
.lateral {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tarjeta {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  padding: 1.5rem;
}

.seccion-titulo {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ws-azul-claro);
}

.texto {
  margin: 0;
  white-space: pre-line;
  line-height: 1.75;
  color: var(--ws-texto);
}

.texto-suave {
  color: var(--ws-texto-suave);
}

.tecnologias {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tec {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  background: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
  color: var(--ws-primario);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}

.tec-enlace {
  text-decoration: none;
}

.tec:hover {
  border-color: var(--ws-azul-claro);
}

.botones {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.boton-principal {
  background: var(--ws-primario);
  color: #fff;
}

.boton-principal:hover {
  background: #0b2cb1;
}

.boton-secundario {
  border: 1px solid var(--ws-borde);
  color: var(--ws-texto);
  background: var(--ws-superficie-2);
}

.boton-secundario:hover {
  border-color: var(--ws-azul-claro);
  color: var(--ws-primario);
}

.perfil {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.75rem;
}

.perfil div {
  display: flex;
  flex-direction: column;
}

.bio {
  margin: 0 0 0.9rem;
  font-size: 0.92rem;
  line-height: 1.6;
}

.contactos {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.contactos a {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ws-primario);
  text-decoration: none;
  font-weight: 500;
}

.ancho {
  width: 100%;
  justify-content: center;
}

.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.6rem;
  margin-top: 2.5rem;
  padding: 3rem 1.5rem;
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
}

.vacio-titulo {
  margin: 0;
  font-size: 1.3rem;
  color: var(--ws-texto);
}

.vacio-texto {
  margin: 0 0 0.5rem;
  color: var(--ws-texto-suave);
}

@media (max-width: 900px) {
  .columnas {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .pagina {
    padding: 1rem 1rem 2.5rem;
  }

  .tarjeta {
    padding: 1.1rem;
  }
}
</style>
