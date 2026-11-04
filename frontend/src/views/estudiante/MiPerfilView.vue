<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import AutoComplete from 'primevue/autocomplete'
import Message from 'primevue/message'
import Button from 'primevue/button'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { useAuthStore } from '@/stores/auth'
import {
  actualizarPerfil,
  DISPONIBILIDADES,
  obtenerPerfil,
  quitarFotoPerfil,
  subirFotoPerfil,
  type Disponibilidad,
  type PerfilInput,
} from '@/service/perfil'
import { mensajeDeError } from '@/service/errores'

const authStore = useAuthStore()

const rolLegible = computed(() => {
  const rol = authStore.rol
  return rol ? rol.charAt(0) + rol.slice(1).toLowerCase() : '' // ESTUDIANTE -> Estudiante
})

const form = reactive({
  carnet: '',
  porcentajeAvance: 0 as number | null,
  disponibilidad: null as Disponibilidad | null,
  habilidades: [] as string[],
  historialAcademico: '',
})

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const guardado = ref(false)

// Foto de perfil
const fotoUrl = ref<string | null>(null)
const subiendoFoto = ref(false)
const errorFoto = ref('')
const inputFoto = ref<HTMLInputElement | null>(null)

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FOTO_BYTES = 2 * 1024 * 1024 // 2 MB, igual que el backend

const carnetValido = /^[A-Z0-9-]{4,20}$/i

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const perfil = await obtenerPerfil()
    form.carnet = perfil.carnet ?? ''
    form.porcentajeAvance = perfil.porcentajeAvance
    form.disponibilidad = perfil.disponibilidad
    form.habilidades = [...perfil.habilidades]
    form.historialAcademico = perfil.historialAcademico ?? ''
    fotoUrl.value = perfil.fotoUrl
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo cargar tu perfil')
  } finally {
    cargando.value = false
  }
}

async function guardar() {
  error.value = ''
  guardado.value = false

  const carnet = form.carnet.trim()
  if (carnet && !carnetValido.test(carnet)) {
    error.value = 'Carnet inválido (4 a 20 caracteres: letras, números o guion)'
    return
  }
  if (form.habilidades.some((h) => h.trim().length > 40)) {
    error.value = 'Cada habilidad puede tener máximo 40 caracteres'
    return
  }
  if (form.historialAcademico.length > 2000) {
    error.value = 'El historial académico admite máximo 2000 caracteres'
    return
  }

  const datos: PerfilInput = {
    porcentajeAvance: form.porcentajeAvance ?? 0,
    disponibilidad: form.disponibilidad,
    habilidades: form.habilidades.map((h) => h.trim()).filter(Boolean),
    historialAcademico: form.historialAcademico.trim() || null,
    // El backend rechaza un carnet vacío, así que solo se envía si hay uno
    ...(carnet ? { carnet } : {}),
  }

  guardando.value = true
  try {
    await actualizarPerfil(datos)
    guardado.value = true
    setTimeout(() => (guardado.value = false), 4000)
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
  input.value = '' // permite elegir el mismo archivo otra vez
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
    authStore.fotoUrl = perfil.fotoUrl // la barra de arriba se actualiza sola
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
    authStore.fotoUrl = perfil.fotoUrl // la barra de arriba se actualiza sola
  } catch (e) {
    errorFoto.value = mensajeDeError(e, 'No se pudo quitar la foto')
  } finally {
    subiendoFoto.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section>
    <header class="page-header">
      <h1 class="page-title">Mi perfil</h1>
      <p class="page-lead">Tus datos de cuenta y lo que verán las empresas en tu portafolio.</p>
    </header>

    <div class="card">
      <h2 class="card-title">Mi cuenta</h2>
      <dl class="datos">
        <div class="dato">
          <dt>Nombre</dt>
          <dd>{{ authStore.user?.nombre }}</dd>
        </div>
        <div class="dato">
          <dt>Correo</dt>
          <dd>{{ authStore.user?.email }}</dd>
        </div>
        <div class="dato">
          <dt>Rol</dt>
          <dd>{{ rolLegible }}</dd>
        </div>
      </dl>
    </div>

    <div class="card">
      <h2 class="card-title">Foto de perfil</h2>
      <div class="foto">
        <AvatarEstudiante :nombre="authStore.user?.nombre ?? ''" :foto-url="fotoUrl" tamano="96px" />

        <div class="foto-info">
          <div class="foto-botones">
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
          <small>JPG, PNG o WebP, máximo 2 MB. Se recorta en cuadrado y se muestra en tu portafolio público.</small>
          <Message v-if="errorFoto" severity="error" size="small" :closable="false">{{ errorFoto }}</Message>
        </div>

        <input
          ref="inputFoto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          @change="alElegirArchivo"
        />
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Datos de estudiante</h2>

      <div class="form" :aria-busy="cargando">
        <div class="fila">
          <div class="campo">
            <label for="carnet">Carnet</label>
            <InputText id="carnet" v-model="form.carnet" :disabled="cargando" placeholder="Ej: AB2453" fluid />
            <small>No se muestra en tu portafolio público.</small>
          </div>

          <div class="campo">
            <label for="avance">Avance de la carrera</label>
            <InputNumber
              input-id="avance"
              v-model="form.porcentajeAvance"
              :min="0"
              :max="100"
              :max-fraction-digits="0"
              suffix=" %"
              :disabled="cargando"
              fluid
            />
          </div>

          <div class="campo">
            <label for="disponibilidad">Disponibilidad</label>
            <Select
              input-id="disponibilidad"
              v-model="form.disponibilidad"
              :options="DISPONIBILIDADES"
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

        <div class="campo">
          <label for="historial">Historial académico</label>
          <Textarea
            id="historial"
            v-model="form.historialAcademico"
            rows="4"
            auto-resize
            maxlength="2000"
            :disabled="cargando"
            fluid
          />
          <small>Solo lo ve la coordinación. No aparece en tu portafolio público.</small>
        </div>

        <Message v-if="error" severity="error" size="small" :closable="false">{{ error }}</Message>
        <Message v-if="guardado" severity="success" size="small" :closable="false">Cambios guardados.</Message>

        <div class="acciones">
          <Button label="Guardar cambios" icon="pi pi-check" :loading="guardando" :disabled="cargando" @click="guardar" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.page-lead {
  color: #64748b;
  margin: 0;
}

.card {
  background: #fff;
  border: 1px solid #e7e5ec;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(58, 53, 65, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.datos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin: 0;
}

.dato dt {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}

.dato dd {
  margin: 0;
  font-weight: 600;
  color: #1e293b;
  overflow-wrap: anywhere;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.fila {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.1rem;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.campo label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
}

.campo small {
  color: #64748b;
}

.acciones {
  display: flex;
  justify-content: flex-end;
}

/* Foto de perfil */
.foto {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.foto-info {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
  flex: 1;
}

.foto-info small {
  color: #64748b;
}

.foto-botones {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>