import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // Agar App.tsx nahi hai to ye line hata dein ya App component bana lein
import './index.css' // Agar index.css nahi hai to ye line hata dein

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
