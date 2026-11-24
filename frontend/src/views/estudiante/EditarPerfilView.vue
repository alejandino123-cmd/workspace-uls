<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { useAuthStore } from '@/stores/auth'
import {
  actualizarPerfil,
  DISPONIBILIDADES,
  obtenerPerfilCompleto,
  quitarFotoPerfil,
  subirFotoPerfil,
  type Disponibilidad,
  type PerfilInput,
  mensajeDeError,
} from '@/service'
const router = useRouter()
const authStore = useAuthStore()
const queryClient = useQueryClient()

// Campos del formulario. Se llenan al cargar el perfil.
const form = reactive({
  nombre: '',
  telefono: '',
  ubicacion: '',
  carnet: '',
  disponibilidad: null as Disponibilidad | null,
  porcentajeAvance: 0 as number | null,
  historialAcademico: '',
  especialidad: '',
  biografia: '',
  habilidades: [] as string[],
  github: '',
  linkedin: '',
  sitioWeb: '',
})
const correo = ref('')

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const exito = ref('')

// Foto de perfil
const fotoUrl = ref<string | null>(null)
const subiendoFoto = ref(false)
const errorFoto = ref('')
const inputFoto = ref<HTMLInputElement | null>(null)
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FOTO_BYTES = 2 * 1024 * 1024

const carnetValido = /^[A-Z0-9-]{4,20}$/i
const enlaceValido = (u: string) => /^https?:\/\/\S+$/i.test(u)

const opcionesDisponibilidad = DISPONIBILIDADES
const inicialesNombre = computed(() => form.nombre || authStore.user?.nombre || '')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { perfil, cuenta } = await obtenerPerfilCompleto()
    form.nombre = cuenta.nombre
    correo.value = cuenta.email
    form.telefono = perfil.telefono ?? ''
    form.ubicacion = perfil.ubicacion ?? ''
    form.carnet = perfil.carnet ?? ''
    form.disponibilidad = perfil.disponibilidad
    form.porcentajeAvance = perfil.porcentajeAvance
    form.historialAcademico = perfil.historialAcademico ?? ''
    form.especialidad = perfil.especialidad ?? ''
    form.biografia = perfil.biografia ?? ''
    form.habilidades = [...perfil.habilidades]
    form.github = perfil.github ?? ''
    form.linkedin = perfil.linkedin ?? ''
    form.sitioWeb = perfil.sitioWeb ?? ''
    fotoUrl.value = perfil.fotoUrl
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo cargar tu perfil')
  } finally {
    cargando.value = false
  }
}

// Valida en el navegador antes de enviar; el backend vuelve a validar todo
function validar(): string | null {
  if (form.nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres'
  const carnet = form.carnet.trim()
  if (carnet && !carnetValido.test(carnet)) return 'Carnet inválido (4 a 20 caracteres: letras, números o guion)'
  if (form.biografia.length > 1000) return 'La biografía admite máximo 1000 caracteres'
  if (form.historialAcademico.length > 2000) return 'El historial académico admite máximo 2000 caracteres'
  if (form.habilidades.some((h) => h.trim().length > 40)) return 'Cada habilidad puede tener máximo 40 caracteres'
  for (const [campo, valor] of [
    ['GitHub', form.github],
    ['LinkedIn', form.linkedin],
    ['Sitio web', form.sitioWeb],
  ] as const) {
    if (valor.trim() && !enlaceValido(valor.trim())) return `${campo}: el enlace debe empezar con http:// o https://`
  }
  return null
}

// Los campos vacíos se envían como null para que el backend los limpie
const nulo = (texto: string) => texto.trim() || null

async function guardar() {
  error.value = ''
  exito.value = ''
  const problema = validar()
  if (problema) {
    error.value = problema
    return
  }

  const carnet = form.carnet.trim()
  const datos: PerfilInput = {
    nombre: form.nombre.trim(),
    telefono: nulo(form.telefono),
    ubicacion: nulo(form.ubicacion),
    disponibilidad: form.disponibilidad,
    porcentajeAvance: form.porcentajeAvance ?? 0,
    historialAcademico: nulo(form.historialAcademico),
    especialidad: nulo(form.especialidad),
    biografia: nulo(form.biografia),
    habilidades: form.habilidades.map((h) => h.trim()).filter(Boolean),
    github: nulo(form.github),
    linkedin: nulo(form.linkedin),
    sitioWeb: nulo(form.sitioWeb),
    // El backend rechaza un carnet vacío, así que solo se envía si hay uno
    ...(carnet ? { carnet } : {}),
  }

  guardando.value = true
  try {
    await actualizarPerfil(datos)
    authStore.actualizarNombre(form.nombre.trim())
    // Mi perfil vuelve a pedir los datos al abrirse
    await queryClient.invalidateQueries({ queryKey: ['mi-perfil'] })
    exito.value = 'Tus cambios se guardaron'
    setTimeout(() => (exito.value = ''), 4000)
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo guardar tu perfil')
  } finally {
    guardando.value = false
  }
}

function elegirFoto() {
  inputFoto.value?.click()
}

async function alElegirArchivo(evento: Event) {
  const input = evento.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo) return

  errorFoto.value = ''
  if (!TIPOS_FOTO.includes(archivo.type)) {
    errorFoto.value = 'La foto debe ser JPG, PNG o WebP'
    return
  }
  if (archivo.size > MAX_FOTO_BYTES) {
    errorFoto.value = 'La foto pesa más de 2 MB'
    return
  }

  subiendoFoto.value = true
  try {
    const perfil = await subirFotoPerfil(archivo)
    fotoUrl.value = perfil.fotoUrl
    authStore.fotoUrl = perfil.fotoUrl
  } catch (e) {
    errorFoto.value = mensajeDeError(e, 'No se pudo subir la foto')
  } finally {
    subiendoFoto.value = false
  }
}

async function quitarFoto() {
  errorFoto.value = ''
  subiendoFoto.value = true
  try {
    const perfil = await quitarFotoPerfil()
    fotoUrl.value = perfil.fotoUrl
    authStore.fotoUrl = perfil.fotoUrl
  } catch (e) {
    errorFoto.value = mensajeDeError(e, 'No se pudo quitar la foto')
  } finally {
    subiendoFoto.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section class="pagina">
    <header class="encabezado">
      <div>
        <h1 class="titulo">Editar perfil</h1>
        <p class="lead">Completa tu información. Lo que marques como público aparece en tu portafolio.</p>
      </div>
      <Button label="Volver a mi perfil" icon="pi pi-arrow-left" text @click="router.push('/perfil')" />
    </header>

    <Message v-if="error" severity="error" :closable="false" class="aviso">{{ error }}</Message>
    <Message v-if="exito" severity="success" :closable="false" class="aviso">{{ exito }}</Message>

    <!-- Foto -->
    <div class="tarjeta">
      <h2 class="titulo-seccion">Foto de perfil</h2>
      <div class="foto">
        <AvatarEstudiante :nombre="inicialesNombre" :foto-url="fotoUrl" tamano="96px" />
        <div class="foto-info">
          <div class="botones">
            <Button
              :label="fotoUrl ? 'Cambiar foto' : 'Subir foto'"
              icon="pi pi-camera"
              size="small"
              :loading="subiendoFoto"
              :disabled="cargando"
              @click="elegirFoto"
            />
            <Button
              v-if="fotoUrl"
              label="Quitar"
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              :disabled="subiendoFoto"
              @click="quitarFoto"
            />
          </div>
          <small>JPG, PNG o WebP, máximo 2 MB.</small>
          <Message v-if="errorFoto" severity="error" size="small" :closable="false">{{ errorFoto }}</Message>
        </div>
        <input ref="inputFoto" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="alElegirArchivo" />
      </div>
    </div>

    <form class="tarjeta" @submit.prevent="guardar">
      <h2 class="titulo-seccion">Datos personales</h2>
      <div class="rejilla">
        <div class="campo">
          <label for="nombre">Nombre completo</label>
          <InputText id="nombre" v-model="form.nombre" maxlength="100" :disabled="cargando" fluid />
        </div>
        <div class="campo">
          <label for="correo">Correo institucional</label>
          <InputText id="correo" :model-value="correo" disabled fluid />
          <small>El correo no se puede cambiar.</small>
        </div>
        <div class="campo">
          <label for="telefono">Teléfono</label>
          <InputText id="telefono" v-model="form.telefono" maxlength="20" :disabled="cargando" placeholder="Ej: 7777-7777" fluid />
          <small>Solo tú lo ves; no aparece en tu portafolio público.</small>
        </div>
        <div class="campo">
          <label for="ubicacion">Ubicación</label>
          <InputText id="ubicacion" v-model="form.ubicacion" maxlength="100" :disabled="cargando" placeholder="Ej: San Salvador" fluid />
        </div>
      </div>

      <h2 class="titulo-seccion">Información académica</h2>
      <div class="rejilla">
        <div class="campo">
          <label for="carnet">Carnet</label>
          <InputText id="carnet" v-model="form.carnet" :disabled="cargando" placeholder="Ej: AB2453" fluid />
        </div>
        <div class="campo">
          <label for="avance">Avance de la carrera (%)</label>
          <InputNumber id="avance" v-model="form.porcentajeAvance" :min="0" :max="100" suffix="%" :disabled="cargando" fluid />
        </div>
        <div class="campo">
          <label for="disponibilidad">Disponibilidad</label>
          <Select
            id="disponibilidad"
            v-model="form.disponibilidad"
            :options="opcionesDisponibilidad"
            option-label="label"
            option-value="value"
            placeholder="Selecciona una opción"
            show-clear
            :disabled="cargando"
            fluid
          />
        </div>
      </div>
      <div class="campo">
        <label for="historial">Historial académico</label>
        <Textarea id="historial" v-model="form.historialAcademico" rows="4" auto-resize maxlength="2000" :disabled="cargando" fluid />
      </div>

      <h2 class="titulo-seccion">Perfil profesional</h2>
      <div class="campo">
        <label for="especialidad">Especialidad</label>
        <InputText id="especialidad" v-model="form.especialidad" maxlength="100" :disabled="cargando" placeholder="Ej: Desarrollo web frontend" fluid />
      </div>
      <div class="campo">
        <label for="biografia">Biografía</label>
        <Textarea id="biografia" v-model="form.biografia" rows="4" auto-resize maxlength="1000" :disabled="cargando" placeholder="Cuéntale a las empresas quién eres y qué te interesa." fluid />
        <small>{{ form.biografia.length }}/1000</small>
      </div>
      <div class="campo">
        <label for="habilidades">Habilidades</label>
        <AutoComplete
          input-id="habilidades"
          v-model="form.habilidades"
          multiple
          :typeahead="false"
          placeholder="Escribe una y presiona Enter"
          :disabled="cargando"
          fluid
        />
      </div>

      <h2 class="titulo-seccion">Enlaces</h2>
      <div class="rejilla">
        <div class="campo">
          <label for="github">GitHub</label>
          <InputText id="github" v-model="form.github" maxlength="200" placeholder="https://github.com/usuario" :disabled="cargando" fluid />
        </div>
        <div class="campo">
          <label for="linkedin">LinkedIn</label>
          <InputText id="linkedin" v-model="form.linkedin" maxlength="200" placeholder="https://linkedin.com/in/usuario" :disabled="cargando" fluid />
        </div>
        <div class="campo">
          <label for="sitio">Sitio web</label>
          <InputText id="sitio" v-model="form.sitioWeb" maxlength="200" placeholder="https://tu-sitio.com" :disabled="cargando" fluid />
        </div>
      </div>

      <div class="acciones">
        <Button type="submit" label="Guardar cambios" icon="pi pi-check" :loading="guardando" :disabled="cargando" />
      </div>
    </form>
  </section>
</template>

<style scoped>
.pagina {
  max-width: 880px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.titulo {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0 0 0.25rem 0;
}

.lead {
  color: var(--ws-texto-suave);
  margin: 0;
}

.aviso {
  margin-bottom: 1rem;
}

.tarjeta {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  padding: 1.25rem 1.4rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.titulo-seccion {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ws-texto);
  margin: 0.25rem 0 0 0;
}

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: 1rem;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.campo label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ws-texto);
}

.campo small {
  color: var(--ws-texto-suave);
}

.foto {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.foto-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.foto-info small {
  color: var(--ws-texto-suave);
}

.botones {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.acciones {
  display: flex;
  justify-content: flex-end;
}
</style>
