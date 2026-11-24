import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import LoginView from '../LoginView.vue'
import { useAuthStore } from '@/stores/auth'

const push = vi.fn()
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

// Error de axios con la forma que devuelve el backend
const errorApi = (status: number, data: object) => Object.assign(new Error('HTTP'), { response: { status, data } })

function montar() {
  return mount(LoginView, {
    global: {
      plugins: [PrimeVue],
      stubs: { RouterLink: { template: '<a><slot /></a>' }, PanelAuth: true, LogoWorkspace: true },
    },
  })
}

async function iniciarSesion(wrapper: ReturnType<typeof montar>) {
  await wrapper.find('#email').setValue('ana@uls.edu.sv')
  await wrapper.find('#password').setValue('Clave12345')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  push.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('LoginView: intentos de sesión', () => {
  it('muestra los intentos restantes tras credenciales inválidas', async () => {
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockRejectedValue(
      errorApi(401, { error: 'Credenciales inválidas', code: 'CREDENCIALES_INVALIDAS', intentosRestantes: 2 }),
    )
    const wrapper = montar()
    await iniciarSesion(wrapper)

    expect(wrapper.find('[data-test="error"]').text()).toContain('Credenciales inválidas')
    expect(wrapper.find('[data-test="intentos"]').text()).toContain('quedan 2 intentos')
  })

  it('al agotar los 3 intentos bloquea el botón con cuenta regresiva', async () => {
    vi.useFakeTimers()
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockRejectedValue(errorApi(429, { error: 'Demasiados intentos', reintentarEnSegundos: 65 }))
    const wrapper = montar()
    await iniciarSesion(wrapper)

    expect(wrapper.find('[data-test="bloqueo"]').text()).toContain('1:05')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(65_000)
    expect(wrapper.find('[data-test="bloqueo"]').exists()).toBe(false)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('sin campos no llama al servidor', async () => {
    const auth = useAuthStore()
    const login = vi.spyOn(auth, 'login')
    const wrapper = montar()
    await wrapper.find('form').trigger('submit')
    expect(login).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="error"]').text()).toContain('Completa todos los campos')
  })
})

describe('LoginView: código de verificación en dos pasos', () => {
  async function irAlSegundoPaso() {
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockResolvedValue('token-temporal')
    const wrapper = montar()
    await iniciarSesion(wrapper)
    expect(wrapper.find('#codigo').exists()).toBe(true)
    return { wrapper, auth }
  }

  it('valida que el código tenga 6 dígitos antes de enviarlo', async () => {
    const { wrapper, auth } = await irAlSegundoPaso()
    const verificar = vi.spyOn(auth, 'verificarDosPasos')
    await wrapper.find('#codigo').setValue('12a')
    await wrapper.find('form').trigger('submit')

    expect(verificar).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="error-codigo"]').text()).toContain('6 dígitos')
  })

  it('muestra el error del código incorrecto y los intentos restantes', async () => {
    const { wrapper, auth } = await irAlSegundoPaso()
    vi.spyOn(auth, 'verificarDosPasos').mockRejectedValue(
      errorApi(401, { error: 'El código no es correcto', code: 'CODIGO_INVALIDO', intentosRestantes: 1 }),
    )
    await wrapper.find('#codigo').setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="error-codigo"]').text()).toContain('El código no es correcto')
    expect(wrapper.find('[data-test="intentos"]').text()).toContain('queda 1 intento')
    expect(wrapper.find('#codigo').attributes('aria-invalid')).toBe('true')
    expect((wrapper.find('#codigo').element as HTMLInputElement).value).toBe('')
  })

  it('si la verificación venció vuelve al primer paso con el aviso', async () => {
    const { wrapper, auth } = await irAlSegundoPaso()
    vi.spyOn(auth, 'verificarDosPasos').mockRejectedValue(
      errorApi(401, { error: 'La verificación venció. Vuelve a iniciar sesión', code: 'VERIFICACION_VENCIDA' }),
    )
    await wrapper.find('#codigo').setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('#codigo').exists()).toBe(false)
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.find('[data-test="error"]').text()).toContain('La verificación venció')
  })

  it('con el código correcto entra a la aplicación', async () => {
    const { wrapper, auth } = await irAlSegundoPaso()
    const verificar = vi.spyOn(auth, 'verificarDosPasos').mockResolvedValue(undefined)
    await wrapper.find('#codigo').setValue('123 456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(verificar).toHaveBeenCalledWith('token-temporal', '123456')
    expect(push).toHaveBeenCalledWith('/perfil')
  })
})
