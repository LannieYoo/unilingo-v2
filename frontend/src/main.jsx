import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { setupGlobalErrorHandler } from './common/errorHandler'
import { useAuthStore } from './modules/auth'

// Initialize global error handler
setupGlobalErrorHandler({
  authStore: useAuthStore,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

