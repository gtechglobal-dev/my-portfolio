import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Portfolio from './pages/Portfolio'
import Pricing from './pages/Pricing'
import Booking from './pages/Booking'
import Contact from './pages/Contact'
import Blog from './pages/Blog'
import Admin from './pages/Admin'
import Resume from './pages/Resume'

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  if (isAdmin) {
    return <Admin />
  }

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-[#f5f0eb] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/resume" element={<Resume />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
