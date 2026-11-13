<script setup lang="ts">
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'
import PanelAuth from '@/components/auth/PanelAuth.vue'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const nombre = ref('')
const carnet = ref('')
const email = ref('')
const password = ref('')
const confirmar = ref('')
const loading = ref(false)
const error = ref('')

const carnetValido = /^[A-Z0-9-]{4,20}$/i

async function handleRegister() {
  error.value = ''

  if (!nombre.value || !email.value || !carnet.value || !password.value || !confirmar.value) {
    error.value = 'Completá todos los campos'
    return
  }
  if (!carnetValido.test(carnet.value.trim())) {
    error.value = 'Carnet inválido (4 a 20 caracteres: letras, números o guion)'
    return
  }
  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  if (password.value !== confirmar.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  loading.value = true
  try {
    await authStore.register(nombre.value, email.value, password.value, carnet.value.trim())
    router.push('/perfil')
  } catch (e: any) {
    if (e.response) {
      error.value =
        e.response.data?.detalles?.[0]?.mensaje ??
        e.response.data?.error ??
        'No se pudo crear la cuenta'
    } else {
      error.value = 'No se pudo conectar con el servidor'
    }
  } finally {
    loading.value = false
  }
} 
</script>

<template>
  <!-- Contenedor con scroll vertical para que la tarjeta nunca se corte -->
<div class="grid min-h-screen w-full bg-fondo lg:grid-cols-2">
  <PanelAuth />
  <main class="flex items-center justify-center overflow-y-auto p-6">
    <div class="w-full max-w-[480px] my-auto">
      <div class="w-full rounded-2xl bg-superficie p-8 md:p-10 sombra-tarjeta ring-1 ring-borde">
        
        <!-- Encabezado con Logo SVG -->
        <div class="mb-6 text-center">
          <div class="mx-auto mb-6 flex justify-center"><LogoWorkspace size="3.5rem" /></div>
          <h1 class="m-0 mb-1 text-2xl font-semibold text-texto">Crear cuenta</h1>
          <p class="m-0 text-sm text-texto-suave">Registrate para armar y mostrar tu portafolio</p>
        </div>

        <!-- Formulario de Registro -->
        <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
          <Message v-if="error" severity="error" size="small">{{ error }}</Message>

          <div class="flex flex-col gap-1.5">
            <label for="nombre" class="text-sm font-medium text-texto-suave">Nombre completo</label>
            <InputText
              id="nombre"
              v-model="nombre"
              placeholder="Tu nombre"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde focus:!border-primario"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="carnet" class="text-sm font-medium text-texto-suave">Carnet</label>
            <InputText
              id="carnet"
              v-model="carnet"
              placeholder="Carnet de estudiante"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde focus:!border-primario"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-sm font-medium text-texto-suave">Correo electrónico</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="tu@uls.edu.sv"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde focus:!border-primario"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="password" class="text-sm font-medium text-texto-suave">Contraseña</label>
            <Password
              inputId="password"
              v-model="password"
              :feedback="false"
              toggleMask
              placeholder="Mínimo 8 caracteres"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="confirmar" class="text-sm font-medium text-texto-suave">Confirmar contraseña</label>
            <Password
              inputId="confirmar"
              v-model="confirmar"
              :feedback="false"
              toggleMask
              placeholder="Repetí la contraseña"
              :invalid="!!confirmar && confirmar !== password"
              fluid
              class="!bg-superficie-2 !text-texto !border-borde"
            />
          </div>

          <Button
            type="submit"
            label="Crear cuenta"
            icon="pi pi-user-plus"
            :loading="loading"
            fluid
            class="!mt-2 "
          />

          <p class="mt-2 text-center text-sm text-texto-suave">
            ¿Ya tenés cuenta?
            <RouterLink to="/login" class="font-semibold text-primario hover:underline">Iniciá sesión</RouterLink>
          </p>
        </form>

      </div>
    </div>
  </main>
</div>
</template>