import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './styles/App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Homepage route - NO NAVBAR */}
            <Route path="/" element={<HomePage />} />
            
            {/* Admin routes - WITH NAVBAR */}
            <Route path="/rheababe" element={<AdminLogin />} />
            <Route 
              path="/rheababe/dashboard" 
              element={
                <>
                  <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                  <AdminDashboard sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                </>
              } 
            />
            
            {/* Redirect any other routes to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

