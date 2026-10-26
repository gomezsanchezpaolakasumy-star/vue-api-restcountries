# 🌍 Explorador de Países — Vue 3 + REST Countries API

Aplicación web desarrollada con **Vue 3** que consume datos desde la API [REST Countries](https://restcountries.com/) y muestra información de países de forma dinámica e interactiva.

## 🔗 Enlaces

- **Repositorio:** [GitHub](https://github.com/gomezsanchezpaolakasumy-star/vue-api-restcountries)
- **Sitio publicado:** [GitHub Pages](https://gomezsanchezpaolakasumy-star.github.io/vue-api-restcountries/)

## ✨ Características

- Consumo de API REST Countries usando `fetch()` dentro de `onMounted()`
- Variables reactivas con `ref()` y propiedades computadas con `computed()`
- Búsqueda de países por nombre o región con `v-model`
- Filtrado rápido por región con botones interactivos
- Ordenamiento por nombre o población
- Indicador de carga animado mientras se obtienen los datos
- Mensaje cuando no hay resultados
- Manejo de errores con `try/catch`
- Diseño responsivo con CSS Grid y Flexbox

## 🧩 Tecnologías de Vue 3 utilizadas

| Directiva / API | Uso en el proyecto |
|---|---|
| `fetch()` | Petición asíncrona a la API REST Countries |
| `onMounted()` | Ejecutar la llamada a la API al montar el componente |
| `ref()` | Variables reactivas (países, búsqueda, carga, error) |
| `computed()` | Filtrado y ordenamiento reactivo de países |
| `v-for` | Renderizar la lista de tarjetas de países y botones de región |
| `v-if` / `v-else-if` / `v-else` | Mostrar estados: cargando, error, sin resultados, lista |
| `v-model` | Enlace bidireccional en campo de búsqueda y selector de orden |
| `v-bind` (`:src`, `:alt`, `:class`) | Enlace dinámico de atributos HTML |

## 🚀 Instalación y ejecución local

```sh
# Clonar el repositorio
git clone https://github.com/gomezsanchezpaolakasumy-star/vue-api-restcountries.git
cd vue-api-restcountries

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

## 📦 Compilar para producción

```sh
npm run build
```

## 🌐 Desplegar en GitHub Pages

```sh
npm run deploy
```

## 📁 Estructura del Proyecto

```
vue-api-restcountries/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── style.css          # Estilos globales
│   ├── App.vue                # Componente principal
│   └── main.js                # Punto de entrada
├── index.html                 # HTML principal
├── vite.config.js             # Configuración de Vite
├── package.json
└── README.md
```
