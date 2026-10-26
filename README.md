# 🌍 Explorador de Países · Vue 3 + REST Countries

Aplicación web desarrollada con **Vue 3** y **Vite** que consume datos de la
[API REST Countries](https://restcountries.com/) y muestra un catálogo de países
con búsqueda, filtros por región, ordenamiento y manejo de estados de carga y
error.

> Proyecto académico para la unidad de **consumo de API con Vue 3**.

## 🔗 Enlaces de entrega

| Recurso | Enlace |
| --- | --- |
| 📦 Repositorio (código fuente) | [github.com/gomezsanchezpaolakasumy-star/vue-api-restcountries](https://github.com/gomezsanchezpaolakasumy-star/vue-api-restcountries) |
| 🌐 Sitio publicado en GitHub Pages | [gomezsanchezpaolakasumy-star.github.io/vue-api-restcountries](https://gomezsanchezpaolakasumy-star.github.io/vue-api-restcountries/) |
| 📄 PDF de evidencias | [`docs/Evidencias-Cumplimiento.pdf`](docs/Evidencias-Cumplimiento.pdf) |

## ✨ Características

- Consumo de la API con **`fetch()`** dentro de **`onMounted()`**.
- Variables reactivas creadas con **`ref()`** y datos derivados con **`computed()`**.
- Búsqueda en tiempo real con **`v-model`** por nombre, capital o región.
- Filtros rápidos por región y ordenamiento por nombre o población.
- Listado de países con **`v-for`** y tarjetas reutilizables.
- Estados de **carga**, **error** y **sin resultados** con **`v-if`**.
- Enlace dinámico de atributos con **`v-bind`** (`:src`, `:alt`, `:class`, etc.).
- Manejo de errores con **`try / catch`** y opción de reintentar.
- Diseño responsivo, accesible y con soporte para `prefers-reduced-motion`.
- Filtros compartibles mediante parámetros en la URL (`?q=canada&region=América`).

## 🧩 Cumplimiento de los requisitos

| Requisito | Dónde se cumple |
| --- | --- |
| Repositorio en GitHub con el código Vue | Este repositorio (`src/`, `src/components/`, `public/`) |
| Publicación en GitHub Pages | Workflow `.github/workflows/deploy.yml` + script `npm run deploy` |
| Uso de `fetch()` | `src/App.vue` → `onMounted()` |
| Primera llamada dentro de `onMounted()` | `src/App.vue` → `onMounted(async () => { ... })` |
| Datos en una variable reactiva con `ref()` | `src/App.vue` → `const paises = ref([])` |
| Uso de `v-for` | Lista de tarjetas y botones de región en `src/App.vue` |
| Uso de `v-if` | Estados de carga, error, sin resultados y avisos |
| Uso de `v-model` | Campo de búsqueda y selector de orden |
| Uso de `v-bind` | `src/components/PaisCard.vue` y clases dinámicas en `App.vue` |
| Indicador de carga | Componente `EstadoMensaje` con spinner y texto «Cargando países...» |
| Manejo de errores | `try / catch` + estado de error con botón «Reintentar» |

## 🔌 Sobre el consumo de la API

La primera petición se realiza con la URL indicada en la consigna:

```js
const respuesta = await fetch(
  'https://api.restcountries.com/countries/v5?q=Canada&api-key=rc_live_demo&pretty=1'
)
```

La API v5 utiliza una clave de demostración (`rc_live_demo`) que tiene dos
limitaciones documentadas por el propio proveedor:

1. Devuelve **un único país de muestra** (Canadá), no el listado completo.
2. Rechaza peticiones de navegador si el origen no está autorizado en la cuenta
   (error CORS), por lo que la clave demo no puede usarse desde GitHub Pages.

Para que la aplicación siga siendo funcional y muestre un catálogo completo, se
incluye un **catálogo local de respaldo** en `public/data/paises.json`. Ese
archivo se genera desde el conjunto de datos oficial del proyecto REST Countries
con el comando:

```sh
npm run datos
```

La aplicación siempre intenta primero la API oficial; si responde, sus datos
tienen prioridad y se identifican con la etiqueta **«Dato de la API»**. Si no
está disponible, se muestra el catálogo de respaldo y un aviso informativo. De
esta forma se demuestran `fetch()`, `onMounted()`, `ref()`, `try/catch` y el
resto de estructuras solicitadas sin depender de una clave privada.

> Para usar una clave real, crea una cuenta en
> [restcountries.com/sign-up](https://restcountries.com/sign-up), autoriza el
> origen `https://gomezsanchezpaolakasumy-star.github.io` y reemplaza
> `rc_live_demo` en la constante `API_URL` de `src/App.vue`.

## 🛠️ Tecnologías

- [Vue 3](https://vuejs.org/) con `<script setup>`
- [Vite](https://vite.dev/)
- JavaScript moderno (ES Modules)
- CSS Grid y Flexbox
- `fetch()` y `Intl.NumberFormat`
- GitHub Pages + GitHub Actions

## 📁 Estructura del proyecto

```text
vue-api-restcountries/
├─ .github/workflows/deploy.yml   # Despliegue automático a GitHub Pages
├─ docs/                          # Evidencias y PDF de cumplimiento
├─ public/
│  ├─ data/paises.json            # Catálogo de respaldo (250 países)
│  └─ favicon.ico
├─ scripts/
│  └─ generar-datos.mjs           # Genera el catálogo desde REST Countries
├─ src/
│  ├─ assets/style.css            # Estilos de la interfaz
│  ├─ components/
│  │  ├─ EstadoMensaje.vue        # Carga, error y sin resultados
│  │  └─ PaisCard.vue             # Tarjeta de país
│  ├─ utils/paises.js             # Normalización, filtros y formato
│  ├─ App.vue                     # Lógica y estructura principal
│  └─ main.js                     # Punto de entrada
├─ index.html
├─ package.json
├─ vite.config.js
└─ README.md
```

## 🚀 Ejecutar en local

Requiere **Node.js 22.18+** o **24.12+**.

```sh
# 1. Clonar el repositorio
git clone https://github.com/gomezsanchezpaolakasumy-star/vue-api-restcountries.git
cd vue-api-restcountries

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173/vue-api-restcountries/`.

## 📦 Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila la aplicación en `dist/` |
| `npm run preview` | Previsualiza la compilación de producción |
| `npm run datos` | Regenera `public/data/paises.json` desde REST Countries |
| `npm run deploy` | Compila y publica en la rama `gh-pages` |

## 🌐 Despliegue en GitHub Pages

El repositorio incluye el workflow **`.github/workflows/deploy.yml`**, que
compila el proyecto y publica `dist/` en la rama `gh-pages` cada vez que se hace
push a `main`.

También se puede desplegar manualmente:

```sh
npm run deploy
```

La configuración `base: '/vue-api-restcountries/'` de `vite.config.js` es la que
permite que los assets funcionen correctamente bajo la ruta del repositorio en
GitHub Pages.

## ✅ Lista de verificación

- [x] Repositorio en GitHub con el código fuente Vue.
- [x] Sitio publicado en GitHub Pages.
- [x] Uso de `fetch()` para consumir la API REST Countries.
- [x] Uso de `onMounted()` para ejecutar la primera petición.
- [x] Datos guardados en variables reactivas con `ref()`.
- [x] Uso de `v-for` para la lista de países y los filtros.
- [x] Uso de `v-if` para carga, error y ausencia de resultados.
- [x] Uso de `v-model` para el campo de búsqueda y el ordenamiento.
- [x] Uso de `v-bind` para banderas y atributos dinámicos.
- [x] Indicador de carga con spinner y mensaje.
- [x] Manejo de errores con `try / catch`.
- [x] PDF de evidencias de cumplimiento.

## 👩‍💻 Autoría

Proyecto desarrollado por **Paola Kasumy Gómez Sánchez** como práctica de
consumo de API REST con Vue 3.
