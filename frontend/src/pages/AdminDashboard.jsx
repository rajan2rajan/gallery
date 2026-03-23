import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../utils/api';
import FolderManager from '../components/FolderManager';
import '../styles/AdminDashboard.css';
import HomepagePhotoManager from '../components/HomepagePhotoManager';
import AlbumView from '../components/AlbumView';

const AdminDashboard = ({ sidebarOpen, setSidebarOpen }) => {
  const { currentUser, logout, getToken } = useAuth();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showAlbumView, setShowAlbumView] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [adminPhotos, setAdminPhotos] = useState([]);  // ← ADD THIS
  const [homepagePhotos, setHomepagePhotos] = useState([]);  // ← ADD THIS
  const [stats, setStats] = useState({
    totalPhotos: 0,
    totalFolders: 0,
    storageUsed: '0 MB',
    homepagePhotos: 0
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/rheababe');
      return;
    }
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      const newPreviews = [];
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result);
          if (newPreviews.length === selectedFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setPreviews([]);
    }
  }, [selectedFiles]);

  useEffect(() => {
    loadFolders();
  }, []);

  // Function to load folders
  const loadFolders = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await api.get('/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(response.data);
      console.log('Folders loaded:', response.data); // Debug log
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Failed to load folders');
    }
  };

  // Add handler for album click
  const handleAlbumClick = (album) => {
    setSelectedAlbum(album);
    setShowAlbumView(true);
  };

  // ========== LOAD ALL DATA FUNCTION ==========
  const loadAllData = async () => {
    try {
      setLoading(true);
      const token = await getToken();  // getToken comes from useAuth

      if (!token) {
        console.log('No token, redirecting to login');
        navigate('/rheababe');
        return;
      }

      console.log('Loading dashboard data...');

      // Load folders
      const foldersRes = await api.get('/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(foldersRes.data);

      // Load all photos
      const photosRes = await api.get('/admin/photos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminPhotos(photosRes.data);
      setPhotos(photosRes.data);

      // Load homepage photos
      const homepageRes = await api.get('/admin/homepage-photos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHomepagePhotos(homepageRes.data);

      // Calculate stats
      const totalSize = photosRes.data.reduce((acc, p) => acc + (p.size || 0), 0);
      const formatBytes = (bytes) => {
        if (bytes === 0) return '0 MB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      };

      setStats({
        totalPhotos: photosRes.data.length,
        totalFolders: foldersRes.data.length,
        lastUpload: photosRes.data[0]?.uploadedAt || null,
        storageUsed: formatBytes(totalSize),
        homepagePhotos: homepageRes.data.length
      });

      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');

      if (error.response?.status === 401) {
        logout();
        navigate('/rheababe');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleAlbumDelete = () => {
    loadAllData(); // Refresh folder counts
  };



  // Make sure this is called after folder creation
  const handleCreateFolder = async (folderData) => {
    try {
      // Your folder creation code...

      // IMPORTANT: Reload folders after creation
      await loadFolders();

    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };


  const loadData = async () => {
    try {
      setLoading(true);
      const token = await currentUser.getIdToken();

      // Load photos
      const photosResponse = await api.get('/admin/photos', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Load folders
      const foldersResponse = await api.get('/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Load homepage photos count
      const homepageResponse = await api.get('/admin/homepage-photos', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPhotos(photosResponse.data);
      setFolders(foldersResponse.data);
      calculateStats(photosResponse.data, foldersResponse.data, homepageResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (photosData, foldersData, homepageData) => {
    const totalSize = photosData.reduce((acc, photo) => acc + (photo.size || 0), 0);
    const lastUpload = photosData.length > 0 ? photosData[0].uploadedAt : null;

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 MB';
      const mb = bytes / (1024 * 1024);
      return mb.toFixed(2) + ' MB';
    };

    setStats({
      totalPhotos: photosData.length,
      totalFolders: foldersData.length,
      totalSize: totalSize,
      storageUsed: formatBytes(totalSize),
      homepagePhotos: homepageData.length
    });
  };

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const removeFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Please select photos to upload');
      return;
    }

    if (!selectedFolder) {
      toast.warning('Please select a folder');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('photos', file);
    });
    formData.append('folderId', selectedFolder);

    try {
      const token = await currentUser.getIdToken();

      const response = await api.post('/admin/photos/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      toast.success(`✨ Successfully uploaded ${response.data.uploaded} photos!`);
      setSelectedFiles([]);
      setPreviews([]);
      setSelectedFolder(null);
      loadData();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      const token = await currentUser.getIdToken();
      await api.delete(`/admin/photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Photo deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.length === 0) return;

    if (!window.confirm(`Delete ${selectedPhotos.length} photos?`)) return;

    try {
      const token = await currentUser.getIdToken();

      // Delete each photo individually
      for (const photoId of selectedPhotos) {
        await api.delete(`/admin/photos/${photoId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      toast.success(`Deleted ${selectedPhotos.length} photos`);
      setSelectedPhotos([]);
      loadData();
    } catch (error) {
      toast.error('Bulk delete failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/rheababe');
  };

  const filteredPhotos = photos.filter(photo =>
    (photo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.folderName?.toLowerCase().includes(searchTerm.toLowerCase())) ?? true
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your dashboard...</p>
      </div>
    );
  }
  return (
    <div className="admin-dashboard">
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">📸</span>
            <span className="logo-text">Puku's Admin</span>
          </div>
          <button className="close-sidebar" onClick={closeSidebar}>×</button>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">Admin</span>
            <span className="user-email">{currentUser?.email}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); closeSidebar(); }}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'folders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('folders'); closeSidebar(); }}
          >
            <span className="nav-icon">📁</span>
            <span>Albums</span>
            {folders.length > 0 && <span className="nav-badge">{folders.length}</span>}
          </button>
          <button
            className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => { setActiveTab('upload'); closeSidebar(); }}
          >
            <span className="nav-icon">📤</span>
            <span>Upload</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'homepage' ? 'active' : ''}`}
            onClick={() => { setActiveTab('homepage'); closeSidebar(); }}
          >
            <span className="nav-icon">🏠</span>
            <span>Homepage</span>
            {stats.homepagePhotos > 0 && <span className="nav-badge">{stats.homepagePhotos}</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="main-header">
          <h1>
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'folders' && 'Album Management'}
            {activeTab === 'upload' && 'Upload Photos'}
            {activeTab === 'gallery' && 'All Photos Gallery'}
            {activeTab === 'homepage' && 'Homepage Slideshow Manager'}
          </h1>
        </header>

        {/* Content */}
        <div className="main-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📸</div>
                  <div className="stat-details">
                    <span className="stat-value">{stats.totalPhotos}</span>
                    <span className="stat-label">Total Photos</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📁</div>
                  <div className="stat-details">
                    <span className="stat-value">{stats.totalFolders}</span>
                    <span className="stat-label">Albums</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🏠</div>
                  <div className="stat-details">
                    <span className="stat-value">{stats.homepagePhotos}</span>
                    <span className="stat-label">Homepage Photos</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">💾</div>
                  <div className="stat-details">
                    <span className="stat-value">{stats.storageUsed}</span>
                    <span className="stat-label">Storage Used</span>
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Folders Tab */}
          {activeTab === 'folders' && (
            <div className="folders-tab">
              <FolderManager
                onSelectFolder={setSelectedFolder}
                selectedFolderId={selectedFolder}
                onAlbumClick={handleAlbumClick}  // Add this line
              />
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="upload-content">
              <div className="upload-header">
                <h2>Upload New Photos</h2>
                <p>Select a folder and choose photos to upload</p>
              </div>

              {/* Folder Selection */}
              <div className="folder-selection">
                <label>Select Album:</label>
                <select
                  value={selectedFolder || ''}
                  onChange={(e) => setSelectedFolder(e.target.value || null)}
                  className="folder-select"
                >
                  <option value="">-- Choose an album --</option>
                  {folders.length === 0 ? (
                    <option value="" disabled>No albums found. Create one first.</option>
                  ) : (
                    folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name} ({folder.photoCount || 0} photos)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* File Input - Hidden but triggered by button */}
              <input
                type="file"
                id="fileInput"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={!selectedFolder}
              />

              {/* Upload Area - Click to select files */}
              <div className="upload-area">
                {selectedFiles.length === 0 ? (
                  <div
                    className={`upload-placeholder ${!selectedFolder ? 'disabled' : ''}`}
                    onClick={() => selectedFolder && document.getElementById('fileInput').click()}
                  >
                    <span className="upload-icon">📤</span>
                    <h3>Click to select photos</h3>
                    <p>or drag and drop them here</p>
                    {!selectedFolder && (
                      <p className="upload-hint">Please select an album first</p>
                    )}
                  </div>
                ) : (
                  <div className="upload-preview-grid">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="upload-preview-item">
                        <img src={previews[index]} alt={`Preview ${index}`} />
                        <button
                          className="remove-file"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </button>
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Actions - Shows when files are selected */}
              {selectedFiles.length > 0 && (
                <div className="upload-actions">
                  <div className="upload-stats">
                    <span>{selectedFiles.length} files selected</span>
                    <span>Total: {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB</span>
                  </div>

                  {uploading && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{uploadProgress}% uploaded</span>
                    </div>
                  )}

                  <div className="upload-buttons">
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        setPreviews([]);
                      }}
                      className="btn-secondary"
                      disabled={uploading}
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleUpload}
                      className="btn-primary"
                      disabled={uploading || !selectedFolder || selectedFiles.length === 0}
                    >
                      {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Homepage Tab */}
          {activeTab === 'homepage' && (
            <div className="homepage-tab">
              <HomepagePhotoManager />
            </div>
          )}

        </div>
      </div>

      {/* Album View Modal - Place this here */}
      {showAlbumView && selectedAlbum && (
        <AlbumView
          album={selectedAlbum}
          onClose={() => {
            setShowAlbumView(false);
            setSelectedAlbum(null);
          }}
          onDelete={handleAlbumDelete}
        />
      )}
    </div>
  );
};

export default AdminDashboard;