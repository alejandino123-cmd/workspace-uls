import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  headers: { Accept: 'application/json' },
})

// Manda el token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token venció o es inválido, vuelve al login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const esAuth = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !esAuth) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)