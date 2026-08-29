import { useEffect } from 'react'
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
import Verify from './pages/Verify'

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const isVerify = pathname.startsWith('/verify')

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  if (isAdmin) {
    return <Admin />
  }

  if (isVerify) {
    return <Verify />
  }

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] flex flex-col">
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
