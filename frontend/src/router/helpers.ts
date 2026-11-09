// Pantalla de inicio de cada rol después de iniciar sesión.
// Se usa en el guard (guards.ts) y en LoginView.
export function rutaInicio(rol: string | null | undefined): string {
  if (rol === 'COORDINACION') return '/admin'
  if (rol === 'ESTUDIANTE') return '/mis-proyectos'
  return '/' // EMPRESA y cualquier otro: por ahora, la página principal
}