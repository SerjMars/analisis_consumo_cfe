# Sistema de Gestión de Consumo Eléctrico

## 📋 Descripción
Aplicación web para gestionar y analizar datos de consumo eléctrico con importación de Excel, filtros avanzados y visualizaciones interactivas.

## 🚀 Instalación

### Opción 1: Ejecución Local Simple
1. Descarga todos los archivos en una carpeta
2. Abre `index.html` directamente en tu navegador

### Opción 2: Con Servidor Local (Recomendado)
```bash
# Con Python
python -m http.server 8000

# Con Node.js (npx)
npx http-server

# Con PHP
php -S localhost:8000
```

Luego abre: `http://localhost:8000`

## 📁 Estructura de Archivos
```
proyecto/
├── index.html          # Archivo principal HTML
├── app.jsx            # Lógica de la aplicación React
└── README.md          # Este archivo
```

## ✨ Características

### 📤 Importación de Datos
- Soporta archivos Excel (.xlsx, .xls)
- Limpieza automática de datos
- Detección de duplicados (RPU + Periodo)
- Historial de importaciones

### 🔍 Filtros Avanzados
- **Tabla de Datos**: Filtros por columna con checkboxes y búsqueda
- **Análisis**: Filtros con sliders de rango y desplegables
- Formato de moneda MXN

### 📊 Visualizaciones
- Gráfico de barras: Importe Total por Periodo
- Gráfico horizontal: Top 10 Estados
- Gráfico circular: Principales Ciudades
- Resumen estadístico

### ✏️ Edición de Datos
- Editar registros individuales
- Eliminar registros
- Eliminar importaciones completas

### 📥 Exportación
- Descarga de datos en formato Excel

## 🎯 Uso

1. **Importar Datos**: Carga tu archivo Excel en la pestaña "Importar Datos"
2. **Ver/Editar**: Revisa y modifica los datos en la tabla
3. **Analizar**: Explora visualizaciones y estadísticas con filtros personalizados
4. **Exportar**: Descarga los datos procesados

## 🔧 Requisitos del Archivo Excel

- Las primeras 18 filas se eliminan automáticamente
- Las columnas C, D y desde AA hasta CO (excepto CO, CP, CQ) se eliminan
- El formato del periodo debe ser YYYYMM (ej: 202401)
- La columna "Importe total" debe contener valores numéricos

## 🌐 Tecnologías Utilizadas

- **React 18**: Framework de UI
- **Tailwind CSS**: Estilos
- **Recharts**: Gráficos
- **SheetJS**: Procesamiento de Excel
- **Lucide Icons**: Iconos

## 📝 Notas

- Los datos se almacenan solo en memoria (navegador)
- No hay backend, todo es cliente
- Para producción, considera implementar un backend con base de datos real

## 🐛 Solución de Problemas

**Los iconos no se muestran:**
- Verifica tu conexión a internet (los iconos se cargan desde CDN)

**El archivo Excel no se procesa:**
- Verifica que el formato sea .xlsx o .xls
- Asegúrate de que el archivo tenga al menos 19 filas

**Los gráficos no aparecen:**
- Verifica que hayas importado datos primero
- Revisa la consola del navegador para errores

## 📧 Soporte

Para reportar problemas o sugerencias, documenta:
- Navegador y versión
- Mensaje de error (si aplica)
- Pasos para reproducir el problema