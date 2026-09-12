import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initDemo } from './demo/store'
import { RouterProvider } from './router'

initDemo()

const mount = () => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <RouterProvider>
        <App />
      </RouterProvider>
    </StrictMode>,
  )
}

// Start the reveal after fonts settle so the first paint is crisp, but never
// hold the page hostage to a slow font.
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 150))]).then(mount)
