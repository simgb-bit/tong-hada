import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from '@/store/DataContext'
import { CurrentUserProvider } from '@/store/CurrentUserContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
