import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Las librerías van en archivos propios: el código de la aplicación
        // queda chico y, cuando cambia, el navegador reutiliza React y motion
        // de la caché en lugar de volver a bajarlos.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/ }
          ]
        }
      }
    }
  }
})
