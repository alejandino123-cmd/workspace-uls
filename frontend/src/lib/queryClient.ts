import { QueryClient } from '@tanstack/vue-query'

// Caché compartida de TanStack Query. Se vacía al cerrar sesión para que
// los datos de un usuario no se vean al entrar otro en el mismo navegador.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})
