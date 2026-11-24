<script setup lang="ts">
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'
import PanelAuth from '@/components/auth/PanelAuth.vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorDeAuth, textoIntentos, type ErrorAuth } from '@/service'

import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import FloatLabel from 'primevue/floatlabel'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const recordarme = ref(false)
const loading = ref(false)
const error = ref('')

// Segundo paso: si la cuenta tiene autenticación en dos pasos, aquí se pide el código de la app
const tokenTemporal = ref<string | null>(null)
const codigo = ref('')
// Error específico del código 2FA (se muestra debajo del campo)
const errorCodigo = ref('')

// Intentos: 3 fallidos permitidos; después, bloqueo temporal con cuenta regresiva
const avisoIntentos = ref<string | null>(null)
const segundosBloqueo = ref(0)
let temporizador: ReturnType<typeof setInterval> | undefined

const bloqueado = computed(() => segundosBloqueo.value > 0)
const textoBloqueo = computed(() => {
  const m = Math.floor(segundosBloqueo.value / 60)
  const s = String(segundosBloqueo.value % 60).padStart(2, '0')
  return `Demasiados intentos fallidos. Podrás intentarlo de nuevo en ${m}:${s}.`
})

function iniciarBloqueo(segundos: number) {
  clearInterval(temporizador)
  segundosBloqueo.value = segundos
  temporizador = setInterval(() => {
    segundosBloqueo.value = Math.max(0, segundosBloqueo.value - 1)
    if (segundosBloqueo.value === 0) clearInterval(temporizador)
  }, 1000)
}

onBeforeUnmount(() => clearInterval(temporizador))

function limpiarErrores() {
  error.value = ''
  errorCodigo.value = ''
  avisoIntentos.value = null
}

// Muestra el error, los intentos restantes y, si toca, inicia la cuenta regresiva
function mostrarErrorAuth(info: ErrorAuth, destino: 'general' | 'codigo') {
  if (info.bloqueadoSegundos) {
    iniciarBloqueo(info.bloqueadoSegundos)
    return
  }
  if (destino === 'codigo') errorCodigo.value = info.mensaje
  else error.value = info.mensaje
  avisoIntentos.value = textoIntentos(info.intentosRestantes)
}

async function handleLogin() {
  limpiarErrores()

  if (!email.value || !password.value) {
    error.value = 'Completa todos los campos'
    return
  }

  loading.value = true
  try {
    const temporal = await authStore.login(email.value, password.value)
    if (temporal) {
      tokenTemporal.value = temporal
      password.value = ''
      return
    }
    router.push('/perfil')
  } catch (e) {
    mostrarErrorAuth(errorDeAuth(e), 'general')
  } finally {
    loading.value = false
  }
}

async function handleCodigo() {
  limpiarErrores()
  const valor = codigo.value.replace(/\s/g, '')
  if (!valor || !tokenTemporal.value) {
    errorCodigo.value = 'Escribe el código de tu aplicación'
    return
  }
  if (!/^\d{6}$/.test(valor)) {
    errorCodigo.value = 'El código debe tener 6 dígitos'
    return
  }

  loading.value = true
  try {
    await authStore.verificarDosPasos(tokenTemporal.value, valor)
    router.push('/perfil')
  } catch (e) {
    const info = errorDeAuth(e, 'No se pudo verificar el código')
    if (info.verificacionVencida) {
      // El token temporal venció: se vuelve al primer paso con el aviso
      volverAlLogin()
      error.value = info.mensaje
      return
    }
    codigo.value = ''
    mostrarErrorAuth(info, 'codigo')
  } finally {
    loading.value = false
  }
}

function volverAlLogin() {
  tokenTemporal.value = null
  codigo.value = ''
  limpiarErrores()
}
</script>

<template>
<div class="grid min-h-screen w-full bg-fondo lg:grid-cols-2">
  <PanelAuth />
  <main class="flex items-center justify-center overflow-y-auto p-6">
    <div class="w-full max-w-[420px]">
      <div class="w-full rounded-lg bg-superficie p-10 sombra-tarjeta ring-1 ring-borde">

        <!-- Encabezado con Logo SVG -->
        <div class="mb-8 text-center">
          <div class="mx-auto mb-6 flex justify-center"><LogoWorkspace size="3.5rem" /></div>
          <h1 class="m-0 mb-2 text-2xl font-bold text-texto">¡Bienvenidos a Workspace ULS!</h1>
          <p class="m-0 text-sm text-texto-suave">Inicia sesión para crear tu portafolio</p>
        </div>

        <!-- Formulario de Login -->
        <form v-if="!tokenTemporal" @submit.prevent="handleLogin" class="flex flex-col gap-6">
          <Message v-if="bloqueado" severity="error" size="small" data-test="bloqueo">{{ textoBloqueo }}</Message>
          <Message v-else-if="error" severity="error" size="small" data-test="error">
            {{ error }}
            <span v-if="avisoIntentos" class="mt-1 block font-normal" data-test="intentos">{{ avisoIntentos }}</span>
          </Message>

          <FloatLabel variant="on">
            <InputText
              id="email"
              v-model="email"
              type="email"
              :invalid="!!error"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde"
            />
            <label for="email" class="text-texto-suave">Correo electrónico</label>
          </FloatLabel>

          <FloatLabel variant="on">
            <Password
              inputId="password"
              v-model="password"
              :feedback="false"
              toggleMask
              :invalid="!!error"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde"
            />
            <label for="password" class="text-texto-suave">Contraseña</label>
          </FloatLabel>

          <div class="-mt-1 mb-1 flex items-center justify-between text-sm">
            <div class="flex items-center gap-2 text-texto-suave">
              <Checkbox v-model="recordarme" inputId="rememberme1" binary />
              <label for="rememberme1">Recordarme</label>
            </div>
            <a href="#" class="font-medium text-primario hover:underline">¿Olvidaste tu contraseña?</a>
          </div>

          <Button
            type="submit"
            label="Iniciar sesión"
            icon="pi pi-sign-in"
            :loading="loading"
            :disabled="bloqueado"
            fluid
          />

          <p class="mt-2 text-center text-sm text-texto-suave">
            ¿No tienes cuenta?
            <RouterLink to="/register" class="font-semibold text-primario hover:underline">Regístrate</RouterLink>
          </p>
        </form>

        <!-- Segundo paso: código de la aplicación de autenticación -->
        <form v-else @submit.prevent="handleCodigo" class="flex flex-col gap-6">
          <Message v-if="bloqueado" severity="error" size="small" data-test="bloqueo">{{ textoBloqueo }}</Message>
          <Message v-else-if="error" severity="error" size="small" data-test="error">{{ error }}</Message>

          <p class="m-0 text-sm text-texto-suave">
            Abre tu aplicación de autenticación (por ejemplo, Google Authenticator) y escribe el código de 6 dígitos.
          </p>

          <div class="flex flex-col gap-1">
            <FloatLabel variant="on">
              <InputText
                id="codigo"
                v-model="codigo"
                autocomplete="one-time-code"
                inputmode="numeric"
                maxlength="7"
                :invalid="!!errorCodigo"
                aria-describedby="codigo-error"
                fluid
                class="!bg-superficie-2 !text-texto !border-borde"
              />
              <label for="codigo" class="text-texto-suave">Código de verificación</label>
            </FloatLabel>
            <small v-if="errorCodigo" id="codigo-error" class="text-red-400" role="alert" data-test="error-codigo">
              <i class="pi pi-exclamation-circle"></i> {{ errorCodigo }}
            </small>
            <small v-if="avisoIntentos" class="text-texto-suave" data-test="intentos">{{ avisoIntentos }}</small>
          </div>

          <Button type="submit" label="Verificar" icon="pi pi-shield" :loading="loading" :disabled="bloqueado" fluid />

          <p class="m-0 text-center text-sm text-texto-suave">
            <a href="#" class="font-semibold text-primario hover:underline" @click.prevent="volverAlLogin">
              Volver al inicio de sesión
            </a>
          </p>
        </form>

      </div>
    </div>
  </main>
</div>
</template>