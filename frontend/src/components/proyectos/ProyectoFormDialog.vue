<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import AutoComplete from 'primevue/autocomplete'
import Message from 'primevue/message'
import Button from 'primevue/button'
import {
  actualizarProyecto,
  crearProyecto,
  quitarImagenProyecto,
  subirImagenProyecto,
  TAMANO_MAX_IMAGEN,
  TIPOS_IMAGEN,
  type Proyecto,
  type ProyectoInput,
} from '@/service/proyectos'
import { mensajeDeError } from '@/service/errores'

const props = defineProps<{
  visible: boolean
  proyecto: Proyecto | null // null = crear uno nuevo
}>()

const emit = defineEmits<{
  (e: 'update:visible', valor: boolean): void
  (e: 'guardado'): void
}>()

const form = reactive({
  titulo: '',
  descripcion: '',
  urlRepositorio: '',
  urlDemo: '',
  urlDocumentacion: '',
  tecnologias: [] as string[],
})
const error = ref('')
const guardando = ref(false)

// Vista previa: se guarda aparte del formulario (con su propio endpoint)
const imagenUrl = ref<string | null>(null)
const subiendoImagen = ref(false)
const errorImagen = ref('')
const entradaImagen = ref<HTMLInputElement | null>(null)

const editando = computed(() => props.proyecto !== null)
const titulo = computed(() => (editando.value ? 'Editar proyecto' : 'Nuevo proyecto'))

// Cada vez que se abre, se carga el proyecto (o se limpia el formulario)
watch(
  () => props.visible,
  (abierto) => {
    if (!abierto) return
    error.value = ''
    const p = props.proyecto
    form.titulo = p?.titulo ?? ''
    form.descripcion = p?.descripcion ?? ''
    form.urlRepositorio = p?.urlRepositorio ?? ''
    form.urlDemo = p?.urlDemo ?? ''
    form.urlDocumentacion = p?.urlDocumentacion ?? ''
    form.tecnologias = [...(p?.tecnologias ?? [])]
    imagenUrl.value = p?.imagenUrl ?? null
    errorImagen.value = ''
  },
)

// Sube o cambia la vista previa al elegir un archivo. Solo disponible para proyectos ya creados.
async function alElegirImagen(evento: Event) {
  const input = evento.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo || !props.proyecto) return

  errorImagen.value = ''
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    errorImagen.value = 'La imagen debe ser JPG, PNG o WebP'
    return
  }
  if (archivo.size > TAMANO_MAX_IMAGEN) {
    errorImagen.value = 'La imagen pesa más de 2 MB'
    return
  }

  subiendoImagen.value = true
  try {
    const actualizado = await subirImagenProyecto(props.proyecto.id, archivo)
    imagenUrl.value = actualizado.imagenUrl
    emit('guardado')
  } catch (e) {
    errorImagen.value = mensajeDeError(e, 'No se pudo subir la imagen')
  } finally {
    subiendoImagen.value = false
  }
}

async function quitarImagen() {
  if (!props.proyecto) return
  errorImagen.value = ''
  subiendoImagen.value = true
  try {
    await quitarImagenProyecto(props.proyecto.id)
    imagenUrl.value = null
    emit('guardado')
  } catch (e) {
    errorImagen.value = mensajeDeError(e, 'No se pudo quitar la imagen')
  } finally {
    subiendoImagen.value = false
  }
}

const esUrl = (v: string) => /^https?:\/\/\S+$/i.test(v)

// Mismas reglas que el backend, para avisar antes de enviar
function validar(): string {
  const t = form.titulo.trim()
  if (t.length < 3 || t.length > 120) return 'El título debe tener entre 3 y 120 caracteres'

  const d = form.descripcion.trim()
  if (d.length < 10 || d.length > 2000) return 'La descripción debe tener entre 10 y 2000 caracteres'

  const urls: [string, string][] = [
    ['repositorio', form.urlRepositorio],
    ['demo', form.urlDemo],
    ['documentación', form.urlDocumentacion],
  ]
  for (const [nombre, valor] of urls) {
    const v = valor.trim()
    if (v && !esUrl(v)) return `La URL de ${nombre} debe empezar con http:// o https://`
  }

  if (form.tecnologias.length > 30) return 'Máximo 30 tecnologías'
  if (form.tecnologias.some((t) => t.trim().length > 40)) {
    return 'Cada tecnología puede tener máximo 40 caracteres'
  }
  return ''
}

const urlONull = (v: string) => v.trim() || null

async function guardar() {
  error.value = validar()
  if (error.value) return

  const datos: ProyectoInput = {
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim(),
    urlRepositorio: urlONull(form.urlRepositorio),
    urlDemo: urlONull(form.urlDemo),
    urlDocumentacion: urlONull(form.urlDocumentacion),
    tecnologias: form.tecnologias.map((t) => t.trim()).filter(Boolean),
  }

  guardando.value = true
  try {
    if (props.proyecto) await actualizarProyecto(props.proyecto.id, datos)
    else await crearProyecto(datos)
    emit('guardado')
    emit('update:visible', false)
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo guardar el proyecto')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="titulo"
    :style="{ width: '38rem' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="(v: boolean) => emit('update:visible', v)"
  >
    <div class="form">
      <Message v-if="editando" severity="info" size="small" :closable="false">
        Si cambias el contenido o la vista previa, el proyecto vuelve a estado pendiente y la coordinación
        deberá validarlo otra vez.
      </Message>

      <div class="campo">
        <span class="etiqueta">Vista previa</span>
        <div class="previa" :class="{ vacia: !imagenUrl }">
          <img v-if="imagenUrl" :src="imagenUrl" alt="Vista previa del proyecto" />
          <div v-else class="previa-vacia">
            <i class="pi pi-image" aria-hidden="true"></i>
            <span>{{ editando ? 'Sin vista previa' : 'Podrás agregarla al guardar el proyecto' }}</span>
          </div>
        </div>

        <div v-if="editando" class="previa-acciones">
          <input
            ref="entradaImagen"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="oculto"
            aria-label="Elegir vista previa"
            @change="alElegirImagen"
          />
          <Button
            :label="imagenUrl ? 'Cambiar imagen' : 'Subir imagen'"
            icon="pi pi-upload"
            size="small"
            outlined
            :loading="subiendoImagen"
            @click="entradaImagen?.click()"
          />
          <Button
            v-if="imagenUrl"
            label="Quitar"
            icon="pi pi-trash"
            size="small"
            text
            severity="danger"
            :disabled="subiendoImagen"
            @click="quitarImagen"
          />
          <small class="ayuda">JPG, PNG o WebP, máximo 2 MB. Se recorta a 16:9.</small>
        </div>

        <Message v-if="errorImagen" severity="error" size="small" :closable="false">{{ errorImagen }}</Message>
      </div>

      <div class="campo">
        <label for="p-titulo">Título</label>
        <InputText id="p-titulo" v-model="form.titulo" maxlength="120" fluid />
      </div>

      <div class="campo">
        <label for="p-descripcion">Descripción</label>
        <Textarea id="p-descripcion" v-model="form.descripcion" rows="5" auto-resize maxlength="2000" fluid />
      </div>

      <div class="campo">
        <label for="p-tecnologias">Tecnologías</label>
        <AutoComplete
          input-id="p-tecnologias"
          v-model="form.tecnologias"
          multiple
          :typeahead="false"
          placeholder="Escribe una y presiona Enter"
          fluid
        />
      </div>

      <div class="campo">
        <label for="p-repo">Repositorio
        </label>
        <InputText id="p-repo" v-model="form.urlRepositorio" placeholder="https://github.com/usuario/proyecto" fluid />
      </div>

      <div class="campo">
        <label for="p-demo">Demo (opcional)</label>
        <InputText id="p-demo" v-model="form.urlDemo" placeholder="https://" fluid />
      </div>

      <div class="campo">
        <label for="p-docs">Documentación (opcional)</label>
        <InputText id="p-docs" v-model="form.urlDocumentacion" placeholder="https://" fluid />
      </div>

      <Message v-if="error" severity="error" size="small" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="guardando" @click="emit('update:visible', false)" />
      <Button :label="editando ? 'Guardar cambios' : 'Crear proyecto'" :loading="guardando" @click="guardar" />
    </template>
  </Dialog>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.campo label,
.etiqueta {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ws-texto);
}

.previa {
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--ws-borde);
  background: var(--ws-superficie-2);
}

.previa img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.previa-vacia {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: var(--ws-texto-suave);
  background: var(--ws-degradado-suave);
}

.previa-vacia i {
  font-size: 1.6rem;
  color: var(--ws-primario);
}

.previa-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.ayuda {
  color: var(--ws-texto-suave);
  width: 100%;
}

.oculto {
  display: none;
}
</style>