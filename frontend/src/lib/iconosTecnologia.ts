// Iconos de marca para las tecnologías (paquete simple-icons, local, sin peticiones externas).
// La clave es el nombre en minúsculas sin símbolos ni números: "Vue.js" → "vuejs", "Astro 3" → "astro".
import {
  siAngular,
  siAstro,
  siCss,
  siDart,
  siDjango,
  siDocker,
  siExpress,
  siFirebase,
  siFlutter,
  siGit,
  siGithub,
  siGo,
  siHtml5,
  siJavascript,
  siKotlin,
  siLaravel,
  siMongodb,
  siMysql,
  siNestjs,
  siNextdotjs,
  siNodedotjs,
  siOpenjdk,
  siPhp,
  siPostgresql,
  siPrisma,
  siPython,
  siReact,
  siRust,
  siSass,
  siSpring,
  siSupabase,
  siSwift,
  siTailwindcss,
  siTypescript,
  siVuedotjs,
  type SimpleIcon,
} from 'simple-icons'

const iconos: Record<string, SimpleIcon> = {
  angular: siAngular,
  astro: siAstro,
  css: siCss,
  dart: siDart,
  django: siDjango,
  docker: siDocker,
  express: siExpress,
  firebase: siFirebase,
  flutter: siFlutter,
  git: siGit,
  github: siGithub,
  go: siGo,
  html: siHtml5,
  java: siOpenjdk,
  javascript: siJavascript,
  kotlin: siKotlin,
  laravel: siLaravel,
  mongodb: siMongodb,
  mysql: siMysql,
  nestjs: siNestjs,
  nextjs: siNextdotjs,
  nodejs: siNodedotjs,
  php: siPhp,
  postgresql: siPostgresql,
  prisma: siPrisma,
  python: siPython,
  react: siReact,
  rust: siRust,
  sass: siSass,
  spring: siSpring,
  supabase: siSupabase,
  swift: siSwift,
  tailwindcss: siTailwindcss,
  typescript: siTypescript,
  vuejs: siVuedotjs,
  vue: siVuedotjs,
}

export function claveTecnologia(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-záéíóúñ]/g, '').replace(/[áéíóú]/g, (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' })[c] ?? c)
}

export function iconoDataUrl(nombre: string): string | null {
  const icono = iconos[claveTecnologia(nombre)]
  if (!icono) return null
  // Los logos casi negros se pintan con el azul oscuro de la marca para que se vean bien
  const oscuros = ['000000', '0A0A0A', '0F0F11', '181717']
  const color = oscuros.includes(icono.hex) ? '#1f1c4b' : `#${icono.hex}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${icono.path}"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}
