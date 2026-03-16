import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import './HomepagePhotoManager.css';

const HomepagePhotoManager = () => {
  const { currentUser, getToken } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [editingPhoto, setEditingPhoto] = useState(null);

  useEffect(() => {
    loadPhotos();
  }, []);

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

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await api.get('/admin/homepage-photos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPhotos(response.data);
    } catch (error) {
      console.error('Error loading homepage photos:', error);
      toast.error('Failed to load homepage photos');
    } finally {
      setLoading(false);
    }
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

    setUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('title', `Homepage Photo ${new Date().toLocaleString()}`);
      formData.append('description', 'Homepage slideshow photo');

      try {
        const token = await getToken();
        await api.post('/admin/homepage-photos', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} homepage photo${successCount > 1 ? 's' : ''}`);
    }
    
    setSelectedFiles([]);
    setPreviews([]);
    setUploading(false);
    setUploadProgress(0);
    loadPhotos();
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    
    try {
      const token = await getToken();
      await api.delete(`/admin/homepage-photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Photo deleted successfully');
      loadPhotos();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleToggleActive = async (photo) => {
    try {
      const token = await getToken();
      await api.put(`/admin/homepage-photos/${photo.id}`, {
        active: !photo.active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Photo ${!photo.active ? 'activated' : 'deactivated'}`);
      loadPhotos();
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleUpdatePhoto = async (e) => {
    e.preventDefault();
    
    try {
      const token = await getToken();
      await api.put(`/admin/homepage-photos/${editingPhoto.id}`, {
        title: editingPhoto.title,
        description: editingPhoto.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Photo updated successfully');
      setEditingPhoto(null);
      loadPhotos();
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div className="homepage-photo-manager">
      <div className="manager-header">
        <h2>Homepage Slideshow Manager</h2>
        <p className="description">
          These photos will automatically rotate on the homepage every 4 seconds.
          Current count: <strong>{photos.length} photo{photos.length !== 1 ? 's' : ''}</strong>
        </p>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <h3>Upload New Slideshow Photos</h3>
        <div className="upload-area">
          <input
            type="file"
            id="homepagePhotoInput"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <button 
            className="btn-select"
            onClick={() => document.getElementById('homepagePhotoInput').click()}
            disabled={uploading}
          >
            Select Photos
          </button>
          
          {selectedFiles.length > 0 && (
            <div className="selected-count">
              {selectedFiles.length} file(s) selected
            </div>
          )}
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div className="preview-grid">
            {previews.map((preview, index) => (
              <div key={index} className="preview-item">
                <img src={preview} alt={`Preview ${index}`} />
                <button 
                  className="remove-preview"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  ×
                </button>
                <div className="preview-filename">
                  {selectedFiles[index]?.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <div className="upload-actions">
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
                className="btn-cancel"
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviews([]);
                }}
                disabled={uploading}
              >
                Clear All
              </button>
              <button 
                className="btn-upload"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Photos List */}
      <div className="photos-list">
        <h3>Current Slideshow Photos ({photos.length})</h3>
        
        {photos.length === 0 ? (
          <div className="no-photos">
            <div className="empty-icon">🏠</div>
            <p>No homepage photos yet. Upload some to get started!</p>
          </div>
        ) : (
          <div className="photo-grid">
            {photos.map(photo => (
              <div key={photo.id} className={`photo-card ${!photo.active ? 'inactive' : ''}`}>
                <img src={photo.url} alt={photo.title} />
                
                <div className="photo-overlay">
                  <button 
                    className={`action-btn toggle ${photo.active ? 'active' : ''}`}
                    onClick={() => handleToggleActive(photo)}
                    title={photo.active ? 'Deactivate' : 'Activate'}
                  >
                    {photo.active ? '✓' : '○'}
                  </button>
                  <button 
                    className="action-btn edit"
                    onClick={() => setEditingPhoto(photo)}
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDelete(photo.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
                
                <div className="photo-info">
                  <span className="photo-title">{photo.title || 'Untitled'}</span>
                  <span className="photo-date">{formatDate(photo.uploadedAt)}</span>
                  <span className={`photo-status ${photo.active ? 'active' : 'inactive'}`}>
                    {photo.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPhoto && (
        <div className="edit-modal" onClick={() => setEditingPhoto(null)}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Photo Details</h3>
            <form onSubmit={handleUpdatePhoto}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingPhoto.title || ''}
                  onChange={(e) => setEditingPhoto({
                    ...editingPhoto,
                    title: e.target.value
                  })}
                  placeholder="Enter photo title"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingPhoto.description || ''}
                  onChange={(e) => setEditingPhoto({
                    ...editingPhoto,
                    description: e.target.value
                  })}
                  placeholder="Enter photo description"
                  rows="3"
                />
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="btn-save">Save Changes</button>
                <button type="button" className="btn-cancel" onClick={() => setEditingPhoto(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepagePhotoManager;