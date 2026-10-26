/**
 * Genera las capturas y el PDF de evidencias de cumplimiento.
 *
 * Requisitos: Node.js 22+ y Microsoft Edge instalado.
 * Uso: node docs/evidencias/generar.mjs
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(__dirname, '../..')
const CAPTURAS = join(__dirname, 'capturas')
const CODIGO_TMP = join(__dirname, 'codigo')
const HTML_EVIDENCIAS = join(__dirname, 'evidencias.html')
const PDF = resolve(RAIZ, 'docs/Evidencias-Cumplimiento.pdf')

const SITIO = 'https://gomezsanchezpaolakasumy-star.github.io/vue-api-restcountries/'
const REPOSITORIO = 'https://github.com/gomezsanchezpaolakasumy-star/vue-api-restcountries'
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)

const PUERTO_CDP = 9333
const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

if (!EDGE) {
  throw new Error('No se encontró Microsoft Edge para generar las capturas.')
}

await mkdir(CAPTURAS, { recursive: true })
await mkdir(CODIGO_TMP, { recursive: true })

/* ------------------------------------------------------------------ */
/* Cliente mínimo del protocolo DevTools (CDP)                         */
/* ------------------------------------------------------------------ */
function conectarCDP(wsUrl) {
  return new Promise((resolver, rechazar) => {
    const ws = new WebSocket(wsUrl)
    const pendientes = new Map()
    const eventos = new Map()
    let siguienteId = 0

    ws.onerror = () => rechazar(new Error('No se pudo conectar con Edge por CDP'))

    ws.onopen = () => {
      resolver({
        send(metodo, params = {}) {
          return new Promise((res, rej) => {
            const id = ++siguienteId
            pendientes.set(id, { res, rej })
            ws.send(JSON.stringify({ id, method: metodo, params }))
          })
        },
        on(evento, callback) {
          const lista = eventos.get(evento) || []
          lista.push(callback)
          eventos.set(evento, lista)
        },
        cerrar() {
          ws.close()
        },
      })
    }

    ws.onmessage = (mensaje) => {
      const datos = JSON.parse(mensaje.data)
      if (datos.id) {
        const pendiente = pendientes.get(datos.id)
        if (!pendiente) return
        pendientes.delete(datos.id)
        if (datos.error) {
          pendiente.rej(new Error(datos.error.message))
        } else {
          pendiente.res(datos.result)
        }
        return
      }

      for (const callback of eventos.get(datos.method) || []) {
        callback(datos.params)
      }
    }
  })
}

async function esperar(cdp, expresion, timeout = 25000, intervalo = 180) {
  const limite = Date.now() + timeout
  while (Date.now() < limite) {
    try {
      const resultado = await cdp.send('Runtime.evaluate', {
        expression: expresion,
        returnByValue: true,
        awaitPromise: true,
      })
      if (resultado.result?.value) return resultado.result.value
    } catch {
      /* La página aún se está cargando */
    }
    await dormir(intervalo)
  }
  throw new Error(`Tiempo de espera agotado: ${expresion}`)
}

async function navegar(cdp, url) {
  await cdp.send('Page.navigate', { url })
  await dormir(400)
  await esperar(cdp, "document.readyState === 'complete'", 30000)
}

async function capturarPantalla(cdp, destino) {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  })
  await writeFile(destino, Buffer.from(data, 'base64'))
  console.log(`  ✓ ${destino.replace(RAIZ + '\\', '')}`)
}

/* ------------------------------------------------------------------ */
/* Capturas de la interfaz publicada                                   */
/* ------------------------------------------------------------------ */
async function capturarInterfaz(cdp, nombre, url, estado = 'lista', alto = 1100) {
  console.log(`→ Capturando interfaz: ${nombre}`)

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: alto,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Network.setBlockedURLs', { urls: [] })
  await cdp.send('Fetch.disable').catch(() => {})

  if (estado === 'cargando') {
    cdp.on('Fetch.requestPaused', () => {
      /* Se dejan las peticiones pausadas para fotografiar el estado de carga */
    })
    await cdp.send('Fetch.enable', {
      patterns: [
        { urlPattern: '*data/paises.json*', requestStage: 'Request' },
        { urlPattern: '*api.restcountries.com*', requestStage: 'Request' },
      ],
    })
  }

  if (estado === 'error') {
    await cdp.send('Network.setBlockedURLs', {
      urls: ['*data/paises.json*', '*api.restcountries.com*'],
    })
  }

  await navegar(cdp, url)

  if (estado === 'cargando') {
    await esperar(cdp, "!!document.querySelector('.estado--cargando')")
    await dormir(800)
  } else if (estado === 'error') {
    await esperar(cdp, "!!document.querySelector('.estado--error')")
    await dormir(500)
  } else if (estado === 'vacio') {
    await esperar(cdp, "!!document.querySelector('.estado--vacio')")
    await dormir(500)
  } else {
    await esperar(cdp, "document.querySelectorAll('.tarjeta').length > 0")
    await dormir(1800)
  }

  await capturarPantalla(cdp, join(CAPTURAS, `${nombre}.png`))

  await cdp.send('Fetch.disable').catch(() => {})
  await cdp.send('Network.setBlockedURLs', { urls: [] })
}

/* ------------------------------------------------------------------ */
/* Extracción de fragmentos de código y capturas tipo editor           */
/* ------------------------------------------------------------------ */
function leerLineas(archivo) {
  return readFile(join(RAIZ, archivo), 'utf8')
    .then((contenido) => contenido.split(/\r?\n/))
}

async function extraerRango(archivo, { inicio, fin, despues = 0, lenguaje }) {
  const lineas = await leerLineas(archivo)
  const desde = lineas.findIndex((linea) => linea.includes(inicio))
  if (desde < 0) throw new Error(`No se encontró «${inicio}» en ${archivo}`)

  const hasta = lineas.findIndex(
    (linea, indice) => indice >= desde && linea.includes(fin),
  )
  if (hasta < 0) throw new Error(`No se encontró «${fin}» en ${archivo}`)

  return lineas.slice(desde, hasta + 1 + despues).map((texto, indice) => ({
    numero: desde + indice + 1,
    texto,
    archivo,
    lenguaje,
  }))
}

async function extraerRangos(rangos) {
  const resultado = []

  for (const rango of rangos) {
    if (resultado.length > 0) {
      resultado.push({
        separador: true,
        archivo: rango.archivo,
        texto:
          resultado[resultado.length - 1].archivo === rango.archivo
            ? '⋯'
            : `— ${rango.archivo} —`,
      })
    }

    resultado.push(...(await extraerRango(rango.archivo, rango)))
  }

  return resultado
}

function construirHtmlCodigo(archivoLabel, lineas, resaltar = []) {
  const datos = lineas.map((linea) => ({
    numero: linea.numero || '',
    texto: linea.texto || '',
    lenguaje: linea.lenguaje || 'plaintext',
    archivo: linea.archivo || '',
    separador: Boolean(linea.separador),
    destacada:
      !linea.separador &&
      resaltar.some((marca) => (linea.texto || '').includes(marca)),
  }))

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${archivoLabel}</title>
<link rel="stylesheet" href="../vendor/github-dark.min.css" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: #0d1117; }
  body { font-family: 'Cascadia Code', Consolas, 'Courier New', monospace; }
  .editor { min-height: 100vh; background: #0d1117; }
  .barra {
    display: flex; align-items: center; gap: 14px; height: 50px;
    padding: 0 20px; background: #161b22; border-bottom: 1px solid #30363d;
  }
  .puntos { display: flex; gap: 7px; }
  .punto { width: 13px; height: 13px; border-radius: 50%; }
  .rojo { background: #ff5f57; } .amarillo { background: #febc2e; } .verde { background: #28c840; }
  .archivo { margin-left: 8px; color: #e6edf3; font-size: 16px; font-weight: 700; }
  .derecha { margin-left: auto; color: #8b949e; font-size: 15px; }
  .codigo { padding: 18px 0 24px; font-size: 19px; line-height: 29px; }
  .linea { display: grid; grid-template-columns: 66px 1fr; min-height: 29px; }
  .ln { padding-right: 16px; color: #6e7681; font-size: 13px; text-align: right; user-select: none; }
  .texto { padding-right: 28px; color: #e6edf3; white-space: pre-wrap; overflow-wrap: anywhere; }
  .linea.destacada { border-left: 3px solid #38bdf8; background: linear-gradient(90deg, rgba(56,189,248,.2), transparent 75%); }
  .linea.destacada .ln { color: #7dd3fc; }
  .separador { display: flex; align-items: center; gap: 18px; height: 34px; padding: 0 22px 0 66px; color: #8b949e; font-size: 13px; letter-spacing: .08em; }
  .separador::before, .separador::after { content: ''; flex: 1; border-top: 1px dashed #30363d; }
  .hljs { background: transparent; padding: 0; }
</style>
</head>
<body>
  <div class="editor">
    <div class="barra">
      <span class="puntos"><span class="punto rojo"></span><span class="punto amarillo"></span><span class="punto verde"></span></span>
      <span class="archivo">${archivoLabel}</span>
      <span class="derecha">Vue 3 · código fuente</span>
    </div>
    <div class="codigo" id="codigo"></div>
  </div>
<script src="../vendor/highlight.min.js"></script>
<script>
  const lineas = ${JSON.stringify(datos)};
  const contenedor = document.getElementById('codigo');
  for (const linea of lineas) {
    if (linea.separador) {
      const fila = document.createElement('div');
      fila.className = 'separador';
      fila.textContent = linea.texto;
      contenedor.appendChild(fila);
      continue;
    }
    const fila = document.createElement('div');
    fila.className = 'linea' + (linea.destacada ? ' destacada' : '');
    const numero = document.createElement('span');
    numero.className = 'ln';
    numero.textContent = linea.numero;
    const codigo = document.createElement('span');
    codigo.className = 'texto';
    codigo.innerHTML = hljs.highlight(linea.texto || ' ', {
      language: linea.lenguaje,
      ignoreIllegals: true,
    }).value;
    fila.append(numero, codigo);
    contenedor.appendChild(fila);
  }
  window.__listo = true;
</script>
</body>
</html>`

  return { html }
}

async function capturarCodigo(cdp, nombre, definicion) {
  console.log(`→ Capturando código: ${nombre}`)

  const lineas = await extraerRangos(definicion.rangos)
  const archivos = [...new Set(definicion.rangos.map((r) => r.archivo))]
  const archivoLabel = archivos.join('  ·  ')
  const { html } = construirHtmlCodigo(archivoLabel, lineas, definicion.resaltar)

  const rutaHtml = join(CODIGO_TMP, `${nombre}.html`)
  await writeFile(rutaHtml, html, 'utf8')

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1240,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await navegar(cdp, pathToFileURL(rutaHtml).href)
  await esperar(cdp, 'window.__listo === true')
  await dormir(300)

  const alto = await esperar(
    cdp,
    'Math.ceil(document.documentElement.scrollHeight)',
  )
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1240,
    height: alto,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await dormir(250)
  await capturarPantalla(cdp, join(CAPTURAS, `codigo-${nombre}.png`))
  await rm(rutaHtml, { force: true })
}

/* ------------------------------------------------------------------ */
/* Contenido del PDF                                                   */
/* ------------------------------------------------------------------ */
const secciones = [
  {
    titulo: 'Publicación en GitHub Pages',
    interfaz: 'sitio-publicado',
    url: SITIO,
    explicacionInterfaz:
      'El sitio se publica desde la rama gh-pages del repositorio y es accesible en la URL pública que se muestra en la barra del navegador. La captura evidencia la aplicación compilada funcionando con su catálogo y sus filtros.',
    codigo: 'pages',
    archivo: '.github/workflows/deploy.yml',
    explicacionCodigo:
      'El workflow de GitHub Actions se ejecuta en cada push a main: instala dependencias con npm ci, compila con Vite y publica la carpeta dist en gh-pages. La opción base de vite.config.js ajusta las rutas de los recursos a /vue-api-restcountries/.',
  },
  {
    titulo: 'Consumo de la API con fetch() dentro de onMounted()',
    interfaz: 'principal',
    url: SITIO,
    explicacionInterfaz:
      'Al abrir la aplicación se ejecuta la primera petición y se muestra el catálogo de países con bandera, nombre, capital, región y población. La interfaz cambia automáticamente según el estado de la petición.',
    codigo: 'fetch-onmounted',
    archivo: 'src/App.vue',
    resaltar: ['onMounted(async', 'const respuesta = await fetch(API_URL)', 'await respuesta.json()'],
    explicacionCodigo:
      'onMounted() contiene la primera llamada fetch() a la URL de la API REST Countries v5 indicada en la consigna. La respuesta se convierte a JSON y se normaliza antes de guardarse en la variable reactiva paises. Como la clave demo devuelve un único país y restringe CORS, se complementa con un catálogo oficial de respaldo.',
  },
  {
    titulo: 'Datos reactivos con ref()',
    interfaz: 'europa',
    url: `${SITIO}?region=Europa`,
    explicacionInterfaz:
      'El contador de resultados, las tarjetas y el filtro activo se actualizan sin recargar la página. Al seleccionar Europa, la interfaz muestra únicamente los países de esa región.',
    codigo: 'refs',
    archivo: 'src/App.vue',
    resaltar: ['const paises = ref', 'const cargando = ref', 'const busqueda = ref', 'paises.value = combinarPaises', 'cargando.value = false'],
    explicacionCodigo:
      'paises, cargando, error, busqueda, regionActiva y ordenSeleccionado se crean con ref(). Cuando la petición termina, se asigna paises.value y se cambia cargando.value; Vue detecta esos cambios y vuelve a renderizar la interfaz.',
  },
  {
    titulo: 'Listado dinámico de países con v-for',
    interfaz: 'asia',
    url: `${SITIO}?region=Asia`,
    explicacionInterfaz:
      'La cuadrícula muestra una tarjeta por cada país del arreglo filtrado. Cada tarjeta presenta la bandera, el nombre, la capital, la región y la población, tal como exige la consigna.',
    codigo: 'v-for',
    archivo: 'src/App.vue',
    resaltar: ['v-for="region in regiones"', 'v-for="pais in paisesFiltrados"'],
    explicacionCodigo:
      'v-for recorre paisesFiltrados para crear una tarjeta PaisCard por país y también recorre regiones para generar los botones de filtro. La directiva :key utiliza el código ISO del país para optimizar el renderizado.',
  },
  {
    titulo: 'Estados de la interfaz con v-if e indicador de carga',
    interfaz: 'cargando',
    url: SITIO,
    estado: 'cargando',
    explicacionInterfaz:
      'Mientras se obtienen los datos, v-if muestra un spinner animado y el mensaje «Cargando países...». La captura se realizó al iniciar la aplicación, antes de que finalizaran las peticiones.',
    codigo: 'v-if-carga',
    archivo: 'src/App.vue',
    resaltar: ['v-if="cargando"', 'titulo="Cargando países..."', 'v-if="paisesFiltrados.length === 0"'],
    explicacionCodigo:
      'v-if decide si se muestra el indicador de carga, el error, el mensaje de sin resultados o la lista de tarjetas. v-else completa la lógica para que nunca se muestren dos estados a la vez; el componente EstadoMensaje reutiliza el spinner y los mensajes.',
  },
  {
    titulo: 'Mensaje cuando no hay resultados',
    interfaz: 'vacio',
    url: `${SITIO}?q=zzzz`,
    estado: 'vacio',
    explicacionInterfaz:
      'Al buscar un texto que no coincide con ningún país se muestra el estado «Sin resultados» con un mensaje explicativo y un botón para restablecer los filtros.',
    codigo: 'sin-resultados',
    archivo: 'src/App.vue',
    resaltar: ['v-if="paisesFiltrados.length === 0"', 'const mensajeVacio = computed'],
    explicacionCodigo:
      'El mensaje se construye con la propiedad computada mensajeVacio y se renderiza cuando paisesFiltrados.length === 0. El botón «Ver todos los países» ejecuta limpiarFiltros() y devuelve la búsqueda y la región a su estado inicial.',
  },
  {
    titulo: 'Filtro de búsqueda con v-model',
    interfaz: 'filtrado',
    url: `${SITIO}?q=canada`,
    explicacionInterfaz:
      'El campo de búsqueda filtra los países en tiempo real: al escribir «canada» se muestra Canadá y el contador indica 1 de 250 resultados. El selector de ordenamiento también está enlazado con v-model.',
    codigo: 'v-model',
    archivo: 'src/App.vue',
    resaltar: ['v-model="busqueda"', 'v-model="ordenSeleccionado"'],
    explicacionCodigo:
      'v-model crea un enlace bidireccional entre el input y la variable busqueda, y entre el select y ordenSeleccionado. El arreglo paisesFiltrados se recalcula con computed(), compara sin distinguir tildes ni mayúsculas y actualiza la URL para compartir la búsqueda.',
  },
  {
    titulo: 'Atributos dinámicos con v-bind',
    interfaz: 'america',
    url: `${SITIO}?region=Am%C3%A9rica`,
    explicacionInterfaz:
      'Cada tarjeta carga su bandera desde la URL correspondiente al país y muestra la información enlazada dinámicamente. La región activa también se resalta con una clase calculada.',
    codigo: 'v-bind',
    archivo: 'src/components/PaisCard.vue · src/App.vue',
    resaltar: [':src="pais.bandera"', ':alt=', ':title=', ':class="{ activo:', ':aria-pressed='],
    explicacionCodigo:
      'v-bind, abreviado con dos puntos (:), enlaza atributos HTML con datos de la aplicación. PaisCard usa :src, :alt y :title para la bandera; los botones de región usan :class y :aria-pressed para reflejar el filtro activo.',
  },
  {
    titulo: 'Manejo de errores con try / catch',
    interfaz: 'error',
    url: SITIO,
    estado: 'error',
    explicacionInterfaz:
      'Si la API y el catálogo de respaldo no están disponibles, la aplicación muestra un mensaje claro y un botón «Reintentar» en lugar de una pantalla vacía.',
    codigo: 'errores',
    archivo: 'src/App.vue',
    resaltar: ['} catch (err) {', 'error.value =', 'cargando.value = false'],
    explicacionCodigo:
      'Las dos peticiones fetch() están protegidas con try/catch. Si la API falla se intenta el catálogo local; si ambas fallan, se asigna error.value y se muestra el estado de error. El bloque finally desactiva el indicador de carga en todos los casos.',
  },
]

const definicionesCodigo = {
  pages: {
    rangos: [
      {
        archivo: '.github/workflows/deploy.yml',
        inicio: 'name: Publicar en GitHub Pages',
        fin: 'commit_message:',
        lenguaje: 'yaml',
      },
    ],
    resaltar: ['npm run build', 'publish_branch: gh-pages'],
  },
  'fetch-onmounted': {
    rangos: [
      {
        archivo: 'src/App.vue',
        inicio: 'onMounted(async () => {',
        fin: "console.warn('No se pudo consultar la API REST Countries v5:', err)",
        despues: 1,
        lenguaje: 'javascript',
      },
    ],
  },
  refs: {
    rangos: [
      {
        archivo: 'src/App.vue',
        inicio: '// Variables reactivas con ref()',
        fin: 'const ordenSeleccionado = ref(',
        lenguaje: 'javascript',
      },
      {
        archivo: 'src/App.vue',
        inicio: 'paises.value = combinarPaises',
        fin: 'paises.value = combinarPaises',
        lenguaje: 'javascript',
      },
      {
        archivo: 'src/App.vue',
        inicio: 'cargando.value = false',
        fin: 'cargando.value = false',
        lenguaje: 'javascript',
      },
    ],
  },
  'v-for': {
    rangos: [
      {
        archivo: 'src/App.vue',
        inicio: '<!-- v-for: botones de filtro por región -->',
        fin: '</div>',
        lenguaje: 'xml',
      },
      {
        archivo: 'src/App.vue',
        inicio: '<!-- v-for: tarjetas de países -->',
        fin: '</div>',
        lenguaje: 'xml',
      },
    ],
  },
  'v-if-carga': {
    rangos: [
      {
        archivo: 'src/App.vue',
        inicio: '<!-- v-if: indicador de carga -->',
        fin: '</EstadoMensaje>',
        lenguaje: 'xml',
      },
      {
        archivo: 'src/App.vue',
        inicio: '<!-- v-if: mensaje cuando no hay resultados -->',
        fin: '</EstadoMensaje>',
        lenguaje: 'xml',
      },
    ],
  },
  'sin-resultados': {
    rangos: [
      {
        archivo: 'src/App.vue',
        inicio: 'const mensajeVacio = computed',
        fin: '})',
        lenguaje: 'javascript',
      },
      {
        archivo: 'src/App.vue',
        inicio: '<!-- v-if: mensaje cuando no hay resultados -->',
        fin: '</EstadoMensaje>',
        lenguaje: 'xml',
      },
    ],
  },
  'v-model': {
    rangos: [
      {
        archivo: 'src/App.vue',
        inicio: '<!-- v-model: enlace bidireccional del campo de búsqueda -->',
        fin: '</select>',
        lenguaje: 'xml',
      },
    ],
  },
  'v-bind': {
    rangos: [
      {
        archivo: 'src/components/PaisCard.vue',
        inicio: '<!-- v-bind: enlace dinámico de atributos HTML -->',
        fin: '/>',
        lenguaje: 'xml',
      },
      {
        archivo: 'src/App.vue',
        inicio: 'v-for="region in regiones"',
        fin: '</button>',
        lenguaje: 'xml',
      },
    ],
  },
  errores: {
    rangos: [
      {
        archivo: 'src/App.vue',
        inicio: '  try {',
        fin: "console.warn('No se pudo consultar la API REST Countries v5:', err)",
        despues: 1,
        lenguaje: 'javascript',
      },
      {
        archivo: 'src/App.vue',
        inicio: "console.error('No se pudo cargar el catálogo de respaldo:', err)",
        fin: 'cargando.value = false',
        lenguaje: 'javascript',
      },
    ],
  },
}

const capturasInterfaz = [
  { nombre: 'sitio-publicado', estado: 'lista' },
  { nombre: 'principal', params: {}, estado: 'lista' },
  { nombre: 'europa', params: { region: 'Europa' }, estado: 'lista' },
  { nombre: 'asia', params: { region: 'Asia' }, estado: 'lista' },
  { nombre: 'cargando', params: {}, estado: 'cargando' },
  { nombre: 'vacio', params: { q: 'zzzz' }, estado: 'vacio' },
  { nombre: 'filtrado', params: { q: 'canada' }, estado: 'lista' },
  { nombre: 'america', params: { region: 'América' }, estado: 'lista' },
  { nombre: 'error', params: {}, estado: 'error' },
]

/* ------------------------------------------------------------------ */
/* Construcción del documento HTML de evidencias                       */
/* ------------------------------------------------------------------ */
const escapar = (texto) =>
  String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function urlCaptura(seccion) {
  return seccion.url || SITIO
}

function paginaInterfaz(seccion, numero, total, evidencia) {
  return `
  <section class="pagina pagina--evidencia">
    <div class="franja"></div>
    <header class="encabezado">
      <span class="numero">Evidencia ${evidencia}</span>
      <span class="materia">Vue 3 · API REST Countries</span>
    </header>
    <h2 class="titulo-evidencia">${escapar(seccion.titulo)}</h2>
    <p class="subtitulo-evidencia">Captura de la interfaz</p>
    <figure class="marco-navegador">
      <div class="barra-navegador">
        <span class="puntos"><i></i><i></i><i></i></span>
        <span class="url">${escapar(urlCaptura(seccion))}</span>
      </div>
      <img src="capturas/${seccion.interfaz}.png" alt="Captura de la interfaz: ${escapar(seccion.titulo)}" />
    </figure>
    <div class="explicacion">
      <h3>Explicación</h3>
      <p>${escapar(seccion.explicacionInterfaz)}</p>
    </div>
    <footer class="pie-pagina">
      <span>Explorador de Países · Evidencias de cumplimiento</span>
      <span>Página ${numero} de ${total}</span>
    </footer>
  </section>`
}

function paginaCodigo(seccion, numero, total, evidencia) {
  return `
  <section class="pagina pagina--evidencia">
    <div class="franja"></div>
    <header class="encabezado">
      <span class="numero">Evidencia ${evidencia}</span>
      <span class="materia">Vue 3 · API REST Countries</span>
    </header>
    <h2 class="titulo-evidencia">${escapar(seccion.titulo)}</h2>
    <p class="subtitulo-evidencia">Captura del código fuente</p>
    <figure class="marco-codigo">
      <img src="capturas/codigo-${seccion.codigo}.png" alt="Código fuente de ${escapar(seccion.archivo)}" />
    </figure>
    <div class="explicacion">
      <h3>Explicación</h3>
      <p>${escapar(seccion.explicacionCodigo)}</p>
      <p class="ruta-archivo">Archivo: <code>${escapar(seccion.archivo)}</code></p>
    </div>
    <footer class="pie-pagina">
      <span>Explorador de Países · Evidencias de cumplimiento</span>
      <span>Página ${numero} de ${total}</span>
    </footer>
  </section>`
}

function paginaPortada(total) {
  return `
  <section class="pagina pagina--portada">
    <div class="portada-decoracion portada-decoracion--uno"></div>
    <div class="portada-decoracion portada-decoracion--dos"></div>
    <div class="portada-contenido">
      <p class="portada-etiqueta">Evidencias de cumplimiento</p>
      <h1>Explorador<br />de Países</h1>
      <p class="portada-bajada">Aplicación web con Vue 3 que consume la API REST Countries mediante fetch(), estructuras de control y enlace de datos.</p>

      <div class="portada-datos">
        <p><span>Estudiante</span><strong>Paola Kasumy Gómez Sánchez</strong></p>
        <p><span>Proyecto</span><strong>Consumo de API con Vue 3</strong></p>
        <p><span>Fecha</span><strong>Octubre de 2026</strong></p>
      </div>

      <div class="portada-caracteristicas">
        <span>fetch() + onMounted()</span>
        <span>v-for · v-if · v-model</span>
        <span>ref() + computed()</span>
        <span>GitHub Pages</span>
      </div>

      <div class="portada-enlaces">
        <a href="${REPOSITORIO}">Repositorio en GitHub</a>
        <a href="${SITIO}">Sitio en GitHub Pages</a>
      </div>

      <p class="portada-pie">Documento generado a partir de capturas reales de la aplicación publicada.</p>
    </div>
    <span class="numero-portada">Página 1 de ${total}</span>
  </section>`
}

function paginaChecklist(total) {
  const requisitos = [
    'Dirección del repositorio en GitHub con el código fuente Vue.',
    'Dirección del sitio publicado en GitHub Pages.',
    'Uso de fetch() para consumir la API REST Countries.',
    'Uso de onMounted() para ejecutar la primera petición.',
    'Datos guardados en variables reactivas con ref().',
    'Uso de v-for para mostrar la lista de países.',
    'Uso de v-if para mostrar los estados de la aplicación.',
    'Uso de v-model para filtrar la información.',
    'Uso de v-bind para atributos dinámicos.',
    'Indicador de carga mientras se obtienen los datos.',
    'Manejo de errores con try / catch.',
    'Documento PDF de evidencias de cumplimiento.',
  ]

  return `
  <section class="pagina pagina--checklist">
    <div class="franja"></div>
    <header class="encabezado">
      <span class="numero">Cierre</span>
      <span class="materia">Vue 3 · API REST Countries</span>
    </header>
    <h2 class="titulo-evidencia">Lista de verificación y enlaces de entrega</h2>
    <p class="subtitulo-evidencia">Resumen de cumplimiento</p>

    <ul class="checklist">
      ${requisitos.map((requisito) => `<li><span class="check">✓</span>${escapar(requisito)}</li>`).join('')}
    </ul>

    <div class="entrega">
      <h3>Enlaces de entrega</h3>
      <p><span>Repositorio</span><a href="${REPOSITORIO}">${REPOSITORIO}</a></p>
      <p><span>Sitio publicado</span><a href="${SITIO}">${SITIO}</a></p>
      <p><span>PDF</span><strong>docs/Evidencias-Cumplimiento.pdf</strong></p>
    </div>

    <div class="nota">
      <h3>Nota sobre la API</h3>
      <p>La clave pública <code>rc_live_demo</code> devuelve un único país de muestra y rechaza peticiones desde orígenes no autorizados. Por eso la aplicación intenta primero la API oficial y, si no está disponible, muestra un catálogo de respaldo generado desde el dataset oficial de REST Countries. El código de la petición con fetch() y onMounted() se conserva y se documenta en este PDF.</p>
    </div>

    <footer class="pie-pagina">
      <span>Explorador de Países · Evidencias de cumplimiento</span>
      <span>Página ${total} de ${total}</span>
    </footer>
  </section>`
}

function construirHtmlEvidencias(total) {
  let numero = 2
  const paginas = []

  secciones.forEach((seccion, indice) => {
    paginas.push(paginaInterfaz(seccion, numero++, total, indice + 1))
    paginas.push(paginaCodigo(seccion, numero++, total, indice + 1))
  })

  paginas.push(paginaChecklist(total))

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Evidencias de cumplimiento · Explorador de Países</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #172033;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pagina {
    position: relative;
    width: 210mm;
    height: 297mm;
    padding: 14mm 15mm 11mm;
    overflow: hidden;
    page-break-after: always;
    background: #fff;
  }
  .pagina:last-child { page-break-after: auto; }
  .franja {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3.2mm;
    background: linear-gradient(90deg, #0f2a5c, #1d4ed8 55%, #f97316);
  }
  .encabezado {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6mm;
    color: #64748b;
    font-size: 8.5pt;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .numero {
    padding: 1.2mm 3mm;
    border-radius: 999px;
    background: #e8efff;
    color: #1d4ed8;
    font-weight: 800;
  }
  .materia { font-weight: 600; }
  .titulo-evidencia {
    max-width: 175mm;
    margin: 0;
    color: #0f2a5c;
    font-size: 19pt;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }
  .subtitulo-evidencia {
    margin: 1.5mm 0 4mm;
    color: #64748b;
    font-size: 10.5pt;
    font-weight: 600;
  }
  .marco-navegador {
    margin: 0;
    overflow: hidden;
    border: 1px solid #cbd5e1;
    border-radius: 3mm;
    box-shadow: 0 3mm 8mm rgba(15, 42, 92, 0.13);
  }
  .barra-navegador {
    display: flex;
    align-items: center;
    gap: 4mm;
    height: 9mm;
    padding: 0 4mm;
    background: #f1f5f9;
    border-bottom: 1px solid #dbe3ee;
  }
  .barra-navegador .puntos { display: flex; gap: 1.4mm; }
  .barra-navegador .puntos i { width: 2.6mm; height: 2.6mm; border-radius: 50%; background: #cbd5e1; }
  .barra-navegador .puntos i:nth-child(1) { background: #fca5a5; }
  .barra-navegador .puntos i:nth-child(2) { background: #fcd34d; }
  .barra-navegador .puntos i:nth-child(3) { background: #86efac; }
  .barra-navegador .url {
    flex: 1;
    overflow: hidden;
    padding: 1.2mm 3mm;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: #fff;
    color: #475569;
    font-size: 8pt;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .marco-navegador img {
    display: block;
    width: 100%;
    height: auto;
  }
  .marco-codigo {
    margin: 0;
    overflow: hidden;
    border: 1px solid #30363d;
    border-radius: 3mm;
    background: #0d1117;
    box-shadow: 0 3mm 8mm rgba(15, 23, 42, 0.18);
  }
  .marco-codigo img { display: block; width: 100%; height: auto; }
  .explicacion {
    margin-top: 6mm;
    padding: 4mm 5mm;
    border-left: 1.5mm solid #1d4ed8;
    border-radius: 0 2mm 2mm 0;
    background: #f8fafc;
  }
  .explicacion h3 {
    margin: 0 0 1.5mm;
    color: #0f2a5c;
    font-size: 10pt;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .explicacion p {
    margin: 0;
    color: #334155;
    font-size: 10pt;
    line-height: 1.5;
    text-align: justify;
  }
  .ruta-archivo { margin-top: 2.5mm !important; color: #64748b !important; font-size: 8.5pt !important; }
  code {
    padding: 0.2mm 1.2mm;
    border-radius: 1mm;
    background: #e8efff;
    color: #1e40af;
    font-family: Consolas, monospace;
    font-size: 0.95em;
  }
  .pie-pagina {
    position: absolute;
    bottom: 7mm;
    left: 15mm;
    right: 15mm;
    display: flex;
    justify-content: space-between;
    padding-top: 2.5mm;
    border-top: 1px solid #e2e8f0;
    color: #94a3b8;
    font-size: 8pt;
  }

  /* Portada */
  .pagina--portada {
    padding: 0;
    background: linear-gradient(145deg, #081a3a 0%, #0f2a5c 46%, #1d4ed8 100%);
    color: #fff;
  }
  .portada-contenido {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 28mm 22mm 18mm;
  }
  .portada-decoracion {
    position: absolute;
    border-radius: 50%;
    filter: blur(2px);
    opacity: 0.45;
  }
  .portada-decoracion--uno {
    top: -55mm; right: -45mm;
    width: 150mm; height: 150mm;
    background: radial-gradient(circle, rgba(249,115,22,.65), transparent 65%);
  }
  .portada-decoracion--dos {
    bottom: -60mm; left: -35mm;
    width: 140mm; height: 140mm;
    background: radial-gradient(circle, rgba(56,189,248,.55), transparent 65%);
  }
  .portada-etiqueta {
    align-self: flex-start;
    margin: 0;
    padding: 2mm 4mm;
    border: 1px solid rgba(255,255,255,.28);
    border-radius: 999px;
    background: rgba(255,255,255,.1);
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .pagina--portada h1 {
    margin: 10mm 0 0;
    font-size: 48pt;
    line-height: 0.98;
    letter-spacing: -0.045em;
  }
  .portada-bajada {
    max-width: 140mm;
    margin: 7mm 0 0;
    color: rgba(255,255,255,.82);
    font-size: 12pt;
    line-height: 1.5;
  }
  .portada-datos {
    margin-top: 18mm;
    padding: 6mm;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 3mm;
    background: rgba(255,255,255,.08);
    backdrop-filter: blur(4px);
  }
  .portada-datos p {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8mm;
    margin: 0;
    padding: 2.4mm 0;
    border-bottom: 1px solid rgba(255,255,255,.12);
  }
  .portada-datos p:last-child { border-bottom: 0; }
  .portada-datos span { color: rgba(255,255,255,.66); font-size: 8.5pt; text-transform: uppercase; letter-spacing: .1em; }
  .portada-datos strong { font-size: 11pt; text-align: right; }
  .portada-caracteristicas {
    display: flex;
    flex-wrap: wrap;
    gap: 2.5mm;
    margin-top: 7mm;
  }
  .portada-caracteristicas span {
    padding: 2.2mm 4mm;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    font-size: 8.5pt;
    font-weight: 600;
  }
  .portada-enlaces {
    display: flex;
    flex-wrap: wrap;
    gap: 3mm;
    margin-top: auto;
    padding-top: 8mm;
  }
  .portada-enlaces a {
    padding: 3mm 5mm;
    border: 1px solid rgba(255,255,255,.28);
    border-radius: 999px;
    background: rgba(255,255,255,.1);
    color: #fff;
    font-size: 9pt;
    font-weight: 700;
    text-decoration: none;
  }
  .portada-pie {
    margin: 5mm 0 0;
    color: rgba(255,255,255,.5);
    font-size: 8pt;
  }
  .numero-portada {
    position: absolute;
    right: 22mm;
    bottom: 12mm;
    color: rgba(255,255,255,.55);
    font-size: 8pt;
  }

  /* Checklist */
  .checklist { margin: 2mm 0 0; padding: 0; list-style: none; }
  .checklist li {
    display: flex;
    align-items: flex-start;
    gap: 3mm;
    padding: 2.2mm 0;
    border-bottom: 1px solid #e8eef7;
    color: #334155;
    font-size: 9.8pt;
  }
  .checklist .check {
    display: inline-grid;
    flex: 0 0 auto;
    width: 5.5mm;
    height: 5.5mm;
    place-items: center;
    border-radius: 50%;
    background: #dcfce7;
    color: #15803d;
    font-size: 8pt;
    font-weight: 800;
  }
  .entrega, .nota {
    margin-top: 7mm;
    padding: 5mm;
    border: 1px solid #dbe6f7;
    border-radius: 3mm;
    background: #f8fbff;
  }
  .entrega h3, .nota h3 {
    margin: 0 0 2.5mm;
    color: #0f2a5c;
    font-size: 10.5pt;
  }
  .entrega p { margin: 0 0 1.5mm; font-size: 8.8pt; }
  .entrega p span { display: inline-block; width: 28mm; color: #64748b; font-weight: 700; }
  .entrega a { color: #1d4ed8; text-decoration: none; overflow-wrap: anywhere; }
  .nota p { margin: 0; color: #475569; font-size: 9pt; line-height: 1.5; text-align: justify; }

  /* Vista previa en pantalla */
  @media screen {
    body { display: flex; flex-direction: column; align-items: center; gap: 6mm; padding: 6mm; background: #dbe3ee; }
    .pagina { box-shadow: 0 4mm 12mm rgba(15, 23, 42, .18); }
  }
</style>
</head>
<body>
  ${paginaPortada(total)}
  ${paginas.join('\n')}
</body>
</html>`
}

/* ------------------------------------------------------------------ */
/* Ejecución                                                           */
/* ------------------------------------------------------------------ */
const perfil = join(os.tmpdir(), `opencode-evidencias-${Date.now()}`)
console.log('Iniciando Microsoft Edge en modo headless...')

const edge = spawn(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PUERTO_CDP}`,
    `--user-data-dir=${perfil}`,
    '--window-size=1440,1100',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let cdp
try {
  let version
  for (let intento = 0; intento < 60; intento++) {
    try {
      const respuesta = await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/version`)
      version = await respuesta.json()
      break
    } catch {
      await dormir(300)
    }
  }
  if (!version) throw new Error('Edge no inició el puerto de depuración')

  const destinos = await (await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`)).json()
  const destino = destinos.find((item) => item.type === 'page')
  if (!destino) throw new Error('No se encontró una pestaña de Edge')

  cdp = await conectarCDP(destino.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })

  console.log('\nCapturando la interfaz publicada...')
  for (const captura of capturasInterfaz) {
    const params = new URLSearchParams(captura.params || {})
    const url = params.toString() ? `${SITIO}?${params.toString()}` : SITIO
    await capturarInterfaz(cdp, captura.nombre, url, captura.estado || 'lista')
  }

  console.log('\nCapturando fragmentos de código...')
  for (const seccion of secciones) {
    const definicion = definicionesCodigo[seccion.codigo]
    if (!definicion) throw new Error(`Falta la definición de código: ${seccion.codigo}`)
    await capturarCodigo(cdp, seccion.codigo, definicion)
  }

  const total = 1 + secciones.length * 2 + 1
  const html = construirHtmlEvidencias(total)
  await writeFile(HTML_EVIDENCIAS, html, 'utf8')

  console.log('\nGenerando el PDF...')
  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' })
  const urlHtml = pathToFileURL(HTML_EVIDENCIAS).href
  await new Promise((resolver, rechazar) => {
    const proceso = spawn(
      EDGE,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${PDF}`,
        '--virtual-time-budget=15000',
        `--user-data-dir=${join(os.tmpdir(), `opencode-pdf-${Date.now()}`)}`,
        urlHtml,
      ],
      { stdio: 'ignore' },
    )

    const temporizador = setTimeout(() => {
      proceso.kill()
      rechazar(new Error('Edge tardó demasiado en generar el PDF'))
    }, 120000)

    proceso.on('exit', (codigo) => {
      clearTimeout(temporizador)
      if (codigo === 0) resolver()
      else rechazar(new Error(`Edge terminó con código ${codigo}`))
    })
    proceso.on('error', (error) => {
      clearTimeout(temporizador)
      rechazar(error)
    })
  })

  console.log(`\n✅ PDF generado: ${PDF}`)
  console.log(`   Páginas: ${total}`)
  console.log(`   Capturas: ${CAPTURAS}`)
} finally {
  cdp?.cerrar()
  edge.kill()
  await dormir(500)
  await rm(perfil, { recursive: true, force: true }).catch(() => {})
  await rm(CODIGO_TMP, { recursive: true, force: true }).catch(() => {})
}
