import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/app/AppShell'
import Home from '@/pages/Home'
import Simulation from '@/pages/Simulation'
import Products from '@/pages/Products'
import Uploads from '@/pages/Uploads'
import Parameters from '@/pages/Parameters'

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={200}>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/s/:id" element={<Simulation />} />
            <Route path="/products" element={<Products />} />
            <Route path="/uploads" element={<Uploads />} />
            <Route path="/parameters" element={<Parameters />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </TooltipProvider>
    </BrowserRouter>
  )
}
