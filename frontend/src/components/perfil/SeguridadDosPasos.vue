<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import {
  activarDosPasos,
  configurarDosPasos,
  desactivarDosPasos,
  estadoDosPasos,
  type ConfiguracionDosPasos,
} from '@/service/dosPasos'
import { mensajeDeError } from '@/service/errores'

// Estado: 'cargando' | 'inactivo' | 'configurando' | 'activo' | 'desactivando'
const estado = ref<'cargando' | 'inactivo' | 'configurando' | 'activo' | 'desactivando'>('cargando')
const configuracion = ref<ConfiguracionDosPasos | null>(null)
const codigosRespaldo = ref<string[]>([])
const codigo = ref('')
const error = ref('')
const enviando = ref(false)

async function cargarEstado() {
  try {
    estado.value = (await estadoDosPasos()) ? 'activo' : 'inactivo'
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo consultar la seguridad de tu cuenta')
    estado.value = 'inactivo'
  }
}

onMounted(cargarEstado)

async function iniciarConfiguracion() {
  error.value = ''
  enviando.value = true
  try {
    configuracion.value = await configurarDosPasos()
    codigo.value = ''
    estado.value = 'configurando'
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo iniciar la configuración')
  } finally {
    enviando.value = false
  }
}

async function confirmarActivacion() {
  error.value = ''
  if (!codigo.value.trim()) {
    error.value = 'Escribí el código que muestra tu aplicación'
    return
  }
  enviando.value = true
  try {
    const { codigosRespaldo: respaldo } = await activarDosPasos(codigo.value.trim())
    codigosRespaldo.value = respaldo
    configuracion.value = null
    codigo.value = ''
    estado.value = 'activo'
  } catch (e) {
    error.value = mensajeDeError(e, 'El código no es correcto')
  } finally {
    enviando.value = false
  }
}

async function confirmarDesactivacion() {
  error.value = ''
  if (!codigo.value.trim()) {
    error.value = 'Escribí un código de tu aplicación o un código de respaldo'
    return
  }
  enviando.value = true
  try {
    await desactivarDosPasos(codigo.value.trim())
    codigosRespaldo.value = []
    codigo.value = ''
    estado.value = 'inactivo'
  } catch (e) {
    error.value = mensajeDeError(e, 'El código no es correcto')
  } finally {
    enviando.value = false
  }
}

function cancelar() {
  configuracion.value = null
  codigo.value = ''
  error.value = ''
  estado.value = estado.value === 'configurando' ? 'inactivo' : 'activo'
}
</script>

<template>
  <section class="seguridad" aria-labelledby="seguridad-titulo">
    <header class="cabecera">
      <div>
        <h2 id="seguridad-titulo" class="titulo">Autenticación en dos pasos</h2>
        <p class="texto-suave">
          Pide un código de tu aplicación de autenticación (Google Authenticator u otra compatible) al iniciar sesión.
        </p>
      </div>
      <Tag
        v-if="estado !== 'cargando'"
        :value="estado === 'activo' ? 'Activa' : 'Inactiva'"
        :severity="estado === 'activo' ? 'success' : 'secondary'"
      />
    </header>

    <Message v-if="error" severity="error" size="small" :closable="false">{{ error }}</Message>

    <!-- Activar: mostrar QR y pedir el primer código -->
    <div v-if="estado === 'configurando' && configuracion" class="paso">
      <p class="texto">1. Escanea este código QR con tu aplicación de autenticación.</p>
      <img :src="configuracion.qr" alt="Código QR para configurar la autenticación en dos pasos" class="qr" />
      <p class="texto-suave">
        ¿No puedes escanearlo? Ingresa esta clave manualmente:
        <code class="clave">{{ configuracion.secreto }}</code>
      </p>
      <p class="texto">2. Escribe el código de 6 dígitos que aparece en la aplicación.</p>
      <div class="fila">
        <InputText v-model="codigo" inputmode="numeric" maxlength="6" placeholder="000000" aria-label="Código de 6 dígitos" />
        <Button label="Activar" icon="pi pi-shield" :loading="enviando" @click="confirmarActivacion" />
        <Button label="Cancelar" text severity="secondary" :disabled="enviando" @click="cancelar" />
      </div>
    </div>

    <!-- Activación completada: códigos de respaldo (solo se muestran una vez) -->
    <div v-if="codigosRespaldo.length" class="respaldo">
      <p class="texto">
        Guarda estos códigos de respaldo en un lugar seguro. Cada uno sirve una sola vez y no volverán a mostrarse.
      </p>
      <ul class="codigos">
        <li v-for="c in codigosRespaldo" :key="c"><code>{{ c }}</code></li>
      </ul>
    </div>

    <!-- Estado activo: desactivar con un código -->
    <div v-if="estado === 'activo'" class="paso">
      <p class="texto-suave">Para desactivarla, escribe un código de tu aplicación o un código de respaldo.</p>
      <div class="fila">
        <InputText v-model="codigo" autocomplete="one-time-code" maxlength="16" placeholder="Código" aria-label="Código para desactivar" />
        <Button label="Desactivar" severity="danger" outlined :loading="enviando" @click="confirmarDesactivacion" />
      </div>
    </div>

    <div v-if="estado === 'inactivo' && !configuracion" class="fila">
      <Button label="Activar autenticación en dos pasos" icon="pi pi-lock" :loading="enviando" @click="iniciarConfiguracion" />
    </div>
  </section>
</template>

<style scoped>
.seguridad {
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.titulo {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ws-texto);
}

.texto {
  margin: 0;
  color: var(--ws-texto);
}

.texto-suave {
  margin: 0;
  color: var(--ws-texto-suave);
}

.paso {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fila {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.qr {
  width: 180px;
  height: 180px;
  background: #fff;
  padding: 0.5rem;
  border-radius: 8px;
}

.clave {
  font-family: ui-monospace, monospace;
  color: var(--ws-indigo-rico);
  word-break: break-all;
}

.respaldo {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.codigos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(160px, 100%), 1fr));
  gap: 0.5rem;
}

.codigos code {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
  font-family: ui-monospace, monospace;
  color: var(--ws-texto);
}
</style>
