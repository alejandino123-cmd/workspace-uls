<script setup lang="ts">
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'
import PanelAuth from '@/components/auth/PanelAuth.vue'
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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

async function handleLogin() {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Completá todos los campos'
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
  } catch (e: any) {
    if (e.response) {
      error.value =
        e.response.data?.detalles?.[0]?.mensaje ??
        e.response.data?.error ??
        'No se pudo iniciar sesión'
    } else {
      error.value = 'No se pudo conectar con el servidor'
    }
  } finally {
    loading.value = false
  }
}

async function handleCodigo() {
  error.value = ''
  if (!codigo.value.trim() || !tokenTemporal.value) {
    error.value = 'Escribí el código de tu aplicación'
    return
  }

  loading.value = true
  try {
    await authStore.verificarDosPasos(tokenTemporal.value, codigo.value.trim())
    router.push('/perfil')
  } catch (e: any) {
    if (e.response) {
      error.value =
        e.response.data?.detalles?.[0]?.mensaje ??
        e.response.data?.error ??
        'No se pudo iniciar sesión'
    } else {
      error.value = 'No se pudo conectar con el servidor'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
<div class="grid min-h-screen w-full bg-fondo lg:grid-cols-2">
  <PanelAuth />
  <main class="flex items-center justify-center overflow-y-auto p-6">
    <div class="w-full max-w-[420px]">
      <div class="w-full rounded-2xl bg-superficie p-10 sombra-tarjeta ring-1 ring-borde">

        <!-- Encabezado con Logo SVG -->
        <div class="mb-8 text-center">
          <div class="mx-auto mb-6 flex justify-center"><LogoWorkspace size="3.5rem" /></div>
          <h1 class="m-0 mb-2 text-2xl font-bold text-texto">¡Bienvenidos a Workspace ULS!</h1>
          <p class="m-0 text-sm text-texto-suave">Iniciá sesión para crear tu portafolio</p>
        </div>

        <!-- Formulario de Login -->
        <form v-if="!tokenTemporal" @submit.prevent="handleLogin" class="flex flex-col gap-6">
          <Message v-if="error" severity="error" size="small">{{ error }}</Message>

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
            fluid
            class=""
          />

          <p class="mt-2 text-center text-sm text-texto-suave">
            ¿No tenés cuenta?
            <RouterLink to="/register" class="font-semibold text-primario hover:underline">Registrate</RouterLink>
          </p>
        </form>

        <!-- Segundo paso: código de la aplicación de autenticación -->
        <form v-else @submit.prevent="handleCodigo" class="flex flex-col gap-6">
          <Message v-if="error" severity="error" size="small">{{ error }}</Message>

          <p class="m-0 text-sm text-texto-suave">
            Abrí tu aplicación de autenticación (por ejemplo, Google Authenticator) y escribí el código de 6 dígitos.
          </p>

          <FloatLabel variant="on">
            <InputText
              id="codigo"
              v-model="codigo"
              autocomplete="one-time-code"
              inputmode="text"
              maxlength="16"
              :invalid="!!error"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde"
            />
            <label for="codigo" class="text-texto-suave">Código de verificación</label>
          </FloatLabel>

          <Button type="submit" label="Verificar" icon="pi pi-shield" :loading="loading" fluid />

          <p class="m-0 text-center text-sm text-texto-suave">
            <a href="#" class="font-semibold text-primario hover:underline" @click.prevent="tokenTemporal = null; error = ''">
              Volver al inicio de sesión
            </a>
          </p>
        </form>

      </div>
    </div>
  </main>
</div>
</template>