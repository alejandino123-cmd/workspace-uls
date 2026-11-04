<script setup lang="ts">
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
<div class="flex min-h-screen w-full items-center justify-center overflow-y-auto bg-slate-100 p-6">
    <div class="w-full max-w-[480px] my-auto">
      <div class="w-full rounded-xl bg-white p-8 md:p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] ring-1 ring-black/5">
        
        <!-- Encabezado con Logo SVG -->
        <div class="mb-6 text-center">
          <svg viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-4 h-auto w-14">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M17.1637 19.2467C17.1566 19.4033 17.1529 19.561 17.1529 19.7194C17.1529 25.3503 21.7203 29.915 27.3546 29.915C32.9887 29.915 37.5561 25.3503 37.5561 19.7194C37.5561 19.5572 37.5524 19.3959 37.5449 19.2355C38.5617 19.0801 39.5759 18.9013 40.5867 18.6994L40.6926 18.6782C40.7191 19.0218 40.7326 19.369 40.7326 19.7194C40.7326 27.1036 34.743 33.0896 27.3546 33.0896C19.966 33.0896 13.9765 27.1036 13.9765 19.7194C13.9765 19.374 13.9896 19.0316 14.0154 18.6927L14.0486 18.6994C15.0837 18.9062 16.1223 19.0886 17.1637 19.2467ZM33.3284 11.4538C31.6493 10.2396 29.5855 9.52381 27.3546 9.52381C25.1195 9.52381 23.0524 10.2421 21.3717 11.4603C20.0078 11.3232 18.6475 11.1387 17.2933 10.907C19.7453 8.11308 23.3438 6.34921 27.3546 6.34921C31.36 6.34921 34.9543 8.10844 37.4061 10.896C36.0521 11.1292 34.692 11.3152 33.3284 11.4538ZM43.826 18.0518C43.881 18.6003 43.9091 19.1566 43.9091 19.7194C43.9091 28.8568 36.4973 36.2642 27.3546 36.2642C18.2117 36.2642 10.8 28.8568 10.8 19.7194C10.8 19.1615 10.8276 18.61 10.8816 18.0663L7.75383 17.4411C7.66775 18.1886 7.62354 18.9488 7.62354 19.7194C7.62354 30.6102 16.4574 39.4388 27.3546 39.4388C38.2517 39.4388 47.0855 30.6102 47.0855 19.7194C47.0855 18.9439 47.0407 18.1789 46.9536 17.4267L43.826 18.0518ZM44.2613 9.54743L40.9084 10.2176C37.9134 5.95821 32.9593 3.1746 27.3546 3.1746C21.7442 3.1746 16.7856 5.96385 13.7915 10.2305L10.4399 9.56057C13.892 3.83178 20.1756 0 27.3546 0C34.5281 0 40.8075 3.82591 44.2613 9.54743Z"
              fill="#9155FD"
            />
          </svg>
          <h1 class="m-0 mb-1 text-2xl font-semibold text-slate-800">Crear cuenta</h1>
          <p class="m-0 text-sm text-slate-500">Registrate para armar y mostrar tu portafolio</p>
        </div>

        <!-- Formulario de Registro -->
        <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
          <Message v-if="error" severity="error" size="small">{{ error }}</Message>

          <div class="flex flex-col gap-1.5">
            <label for="nombre" class="text-sm font-medium text-slate-700">Nombre completo</label>
            <InputText
              id="nombre"
              v-model="nombre"
              placeholder="Tu nombre"
              fluid
              class="!bg-slate-50 !text-slate-900 !border-slate-300 focus:!border-[#9155FD]"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="carnet" class="text-sm font-medium text-slate-700">Carnet</label>
            <InputText
              id="carnet"
              v-model="carnet"
              placeholder="Carnet de estudiante"
              fluid
              class="!bg-slate-50 !text-slate-900 !border-slate-300 focus:!border-[#9155FD]"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-sm font-medium text-slate-700">Correo electrónico</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="tu@uls.edu.sv"
              fluid
              class="!bg-slate-50 !text-slate-900 !border-slate-300 focus:!border-[#9155FD]"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="password" class="text-sm font-medium text-slate-700">Contraseña</label>
            <Password
              inputId="password"
              v-model="password"
              :feedback="false"
              toggleMask
              placeholder="Mínimo 8 caracteres"
              fluid
              class="!bg-slate-50 !text-slate-900 !border-slate-300"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="confirmar" class="text-sm font-medium text-slate-700">Confirmar contraseña</label>
            <Password
              inputId="confirmar"
              v-model="confirmar"
              :feedback="false"
              toggleMask
              placeholder="Repetí la contraseña"
              :invalid="!!confirmar && confirmar !== password"
              fluid
              class="!bg-slate-50 !text-slate-900 !border-slate-300"
            />
          </div>

          <Button
            type="submit"
            label="Crear cuenta"
            icon="pi pi-user-plus"
            :loading="loading"
            fluid
            class="!mt-2 !bg-[#9155FD] !border-[#9155FD] hover:!bg-[#7e4ae0] !text-white"
          />

          <p class="mt-2 text-center text-sm text-slate-500">
            ¿Ya tenés cuenta?
            <RouterLink to="/login" class="font-semibold text-[#9155FD] hover:underline">Iniciá sesión</RouterLink>
          </p>
        </form>

      </div>
    </div>
  </div>
</template>