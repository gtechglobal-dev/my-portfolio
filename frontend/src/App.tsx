import { useEffect } from 'react'
import { Routes, Route, useLocation, useSearchParams } from 'react-router-dom'
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
import MarketplaceHome from './pages/marketplace/MarketplaceHome'
import ProductDetail from './pages/marketplace/ProductDetail'
import Checkout from './pages/marketplace/Checkout'
import OrderPage from './pages/marketplace/OrderPage'
import OrdersPage from './pages/marketplace/OrdersPage'
import MarketplaceAdmin from './pages/marketplace/MarketplaceAdmin'
import SchoolManagementLanding from './pages/school-management/SchoolManagementLanding'
import ApplicationForm from './pages/school-management/ApplicationForm'
import SchoolClientsAdmin from './pages/school-management/SchoolClientsAdmin'
import ClientPortal from './pages/school-management/ClientPortal'
import OnboardingPortal from './pages/school-management/OnboardingPortal'
import ProposalPage from './pages/school-management/ProposalPage'
import AgreementPage from './pages/school-management/AgreementPage'
import InvitePage from './pages/school-management/InvitePage'

export default function App() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || undefined
  const isAdmin = pathname.startsWith('/admin')
  const isVerify = pathname.startsWith('/verify')
  const isMarketplaceAdmin = pathname.startsWith('/admin/marketplace')
  const isSchoolClientsAdmin = pathname.startsWith('/admin/school-clients')
  const isMarketplace = pathname.startsWith('/marketplace')
  const isSchoolManagement = pathname.startsWith('/school-management')
  const isClientPortal = pathname.startsWith('/client-portal')
  const isProposal = pathname.startsWith('/proposal/')
  const isAgreement = pathname.startsWith('/agreement/')
  const isInvite = pathname.startsWith('/invite/')

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  if (isMarketplaceAdmin) {
    return <MarketplaceAdmin />
  }

  if (isSchoolClientsAdmin) {
    return <SchoolClientsAdmin />
  }

  if (isAdmin) {
    return <Admin />
  }

  if (isClientPortal) {
    if (pathname === '/client-portal/onboarding') return <OnboardingPortal />
    return <ClientPortal />
  }

  if (isProposal) {
    return <ProposalPage token={pathname.split('/proposal/')[1] || ''} />
  }

  if (isAgreement) {
    return <AgreementPage token={pathname.split('/agreement/')[1] || ''} />
  }

  if (isInvite) {
    return <InvitePage token={pathname.split('/invite/')[1] || ''} />
  }

  if (isVerify) {
    const code = pathname.split('/verify/')[1] || ''
    return <Verify code={code} />
  }

  if (isMarketplace) {
    return (
      <Routes>
        <Route path="/marketplace" element={<MarketplaceHome token={token} />} />
        <Route path="/marketplace/product/:slug" element={<ProductDetail token={token} />} />
        <Route path="/marketplace/checkout/:slug" element={<Checkout token={token} />} />
        <Route path="/marketplace/order" element={<OrderPage token={token} />} />
        <Route path="/marketplace/orders" element={<OrdersPage token={token} />} />
      </Routes>
    )
  }

  if (isSchoolManagement) {
    return (
      <div className="min-h-screen bg-ink text-[#f5f5f5] flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/school-management" element={<SchoolManagementLanding />} />
            <Route path="/school-management/apply" element={<ApplicationForm />} />
          </Routes>
        </main>
        <Footer />
      </div>
    )
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
