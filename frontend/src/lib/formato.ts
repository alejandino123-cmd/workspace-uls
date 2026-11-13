// Fechas en español, por ejemplo "3 nov 2026"
export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}
