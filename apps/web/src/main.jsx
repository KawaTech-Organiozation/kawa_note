import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { appEnv } from '@/lib/env.js'

// Validar variáveis de ambiente antes de inicializar a aplicação
console.log('🔧 Inicializando aplicação:', appEnv.VITE_APP_NAME);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
