import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/barrio/latin-400.css' // lokal gebündelt – kein externer Request
import App from './App.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
