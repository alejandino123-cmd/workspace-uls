<script setup lang="ts">
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

async function handleLogin() {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Completá todos los campos'
    return
  }

  loading.value = true
  try {
    await authStore.login(email.value, password.value)
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
<div class="flex min-h-screen w-full items-center justify-center overflow-y-auto bg-slate-100 p-6">
    <div class="w-full max-w-[420px]">
      <div class="w-full rounded-xl bg-white p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] ring-1 ring-black/5">

        <!-- Encabezado con Logo SVG -->
        <div class="mb-8 text-center">
          <svg viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-6 h-auto w-14">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M17.1637 19.2467C17.1566 19.4033 17.1529 19.561 17.1529 19.7194C17.1529 25.3503 21.7203 29.915 27.3546 29.915C32.9887 29.915 37.5561 25.3503 37.5561 19.7194C37.5561 19.5572 37.5524 19.3959 37.5449 19.2355C38.5617 19.0801 39.5759 18.9013 40.5867 18.6994L40.6926 18.6782C40.7191 19.0218 40.7326 19.369 40.7326 19.7194C40.7326 27.1036 34.743 33.0896 27.3546 33.0896C19.966 33.0896 13.9765 27.1036 13.9765 19.7194C13.9765 19.374 13.9896 19.0316 14.0154 18.6927L14.0486 18.6994C15.0837 18.9062 16.1223 19.0886 17.1637 19.2467ZM33.3284 11.4538C31.6493 10.2396 29.5855 9.52381 27.3546 9.52381C25.1195 9.52381 23.0524 10.2421 21.3717 11.4603C20.0078 11.3232 18.6475 11.1387 17.2933 10.907C19.7453 8.11308 23.3438 6.34921 27.3546 6.34921C31.36 6.34921 34.9543 8.10844 37.4061 10.896C36.0521 11.1292 34.692 11.3152 33.284 11.4538ZM43.826 18.0518C43.881 18.6003 43.9091 19.1566 43.9091 19.7194C43.9091 28.8568 36.4973 36.2642 27.3546 36.2642C18.2117 36.2642 10.8 28.8568 10.8 19.7194C10.8 19.1615 10.8276 18.61 10.8816 18.0663L7.75383 17.4411C7.66775 18.1886 7.62354 18.9488 7.62354 19.7194C7.62354 30.6102 16.4574 39.4388 27.3546 39.4388C38.2517 39.4388 47.0855 30.6102 47.0855 19.7194C47.0855 18.9439 47.0407 18.1789 46.9536 17.4267L43.826 18.0518ZM44.2613 9.54743L40.9084 10.2176C37.9134 5.95821 32.9593 3.1746 27.3546 3.1746C21.7442 3.1746 16.7856 5.96385 13.7915 10.2305L10.4399 9.56057C13.892 3.83178 20.1756 0 27.3546 0C34.5281 0 40.8075 3.82591 44.2613 9.54743Z"
              fill="#9155FD"
            />
          </svg>
          <h1 class="m-0 mb-2 text-2xl font-semibold text-slate-800">¡Bienvenidos a Workspace ULS!</h1>
          <p class="m-0 text-sm text-slate-500">Iniciá sesión para crear tu portafolio</p>
        </div>

        <!-- Formulario de Login -->
        <form @submit.prevent="handleLogin" class="flex flex-col gap-6">
          <Message v-if="error" severity="error" size="small">{{ error }}</Message>

          <FloatLabel variant="on">
            <InputText
              id="email"
              v-model="email"
              type="email"
              :invalid="!!error"
              fluid
              class="!bg-slate-50 !text-slate-900 !border-slate-300"
            />
            <label for="email" class="text-slate-600">Correo electrónico</label>
          </FloatLabel>

          <FloatLabel variant="on">
            <Password
              inputId="password"
              v-model="password"
              :feedback="false"
              toggleMask
              :invalid="!!error"
              fluid
              class="!bg-slate-50 !text-slate-900 !border-slate-300"
            />
            <label for="password" class="text-slate-600">Contraseña</label>
          </FloatLabel>

          <div class="-mt-1 mb-1 flex items-center justify-between text-sm">
            <div class="flex items-center gap-2 text-slate-600">
              <Checkbox v-model="recordarme" inputId="rememberme1" binary />
              <label for="rememberme1">Recordarme</label>
            </div>
            <a href="#" class="font-medium text-[#9155FD] hover:underline">¿Olvidaste tu contraseña?</a>
          </div>

          <Button
            type="submit"
            label="Iniciar sesión"
            icon="pi pi-sign-in"
            :loading="loading"
            fluid
            class="!bg-[#9155FD] !border-[#9155FD] hover:!bg-[#7e4ae0] !text-white"
          />

          <p class="mt-2 text-center text-sm text-slate-500">
            ¿No tenés cuenta?
            <RouterLink to="/register" class="font-semibold text-[#9155FD] hover:underline">Registrate</RouterLink>
          </p>
        </form>

      </div>
    </div>
  </div>
</template>