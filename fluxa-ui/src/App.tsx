import './App.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import FloatingChat from './components/FloatingChat';
import LoginForm from './components/auth/LoginForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import PortfolioPage from './pages/PortfolioPage';
import ProfilePage from './pages/ProfilePage';
import CalculadorasPage from './pages/CalculadorasPage';

function App() {
  const location = useLocation();
  const hideChat = location.pathname === '/login';

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/calculadoras" element={<CalculadorasPage />} />
        <Route path="/" element={<HomePage />} />
      </Routes>
      {!hideChat && <FloatingChat onParsed={() => {}} />}
    </>
  );
}

export default App;
