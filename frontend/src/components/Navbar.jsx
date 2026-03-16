import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  
  // Check if current path is admin dashboard
  const isAdminDashboard = location.pathname === '/rheababe/dashboard';

  // Don't show navbar on admin login page
  if (location.pathname === '/rheababe') {
    return null;
  }

  const toggleSidebar = () => {
    if (setSidebarOpen) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <nav className={`navbar navbar-solid`}>
      <div className="navbar-container">
        <div className="navbar-left">
          {isAdminDashboard && (
            <button className="hamburger-btn" onClick={toggleSidebar}>
              <span className="hamburger-icon">☰</span>
            </button>
          )}
          <Link to="/" className="navbar-logo">
            ❤️ Puku's Gallery
          </Link>
        </div>
        
        {isAdminDashboard && (
          <div className="navbar-right">
            <span className="admin-email">Admin</span>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;