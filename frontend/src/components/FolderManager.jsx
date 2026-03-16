import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import './FolderManager.css';

const FolderManager = ({ onSelectFolder, selectedFolderId }) => {
  const { currentUser, getToken } = useAuth();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await api.get('/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(response.data);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    
    if (!newFolderName.trim()) {
      toast.warning('Please enter a folder name');
      return;
    }
    
    try {
      const token = await getToken();
      const response = await api.post('/admin/folders', {
        name: newFolderName.trim(),
        description: newFolderDesc.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Folder "${newFolderName}" created successfully`);
      setNewFolderName('');
      setNewFolderDesc('');
      setShowCreateForm(false);
      loadFolders();
      
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(error.response?.data?.error || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Are you sure you want to delete folder "${folderName}" and all its photos?`)) {
      return;
    }
    
    try {
      const token = await getToken();
      await api.delete(`/admin/folders/${folderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Folder "${folderName}" deleted`);
      loadFolders();
      
      if (selectedFolderId === folderId && onSelectFolder) {
        onSelectFolder(null);
      }
      
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const handleUpdateFolder = async (e) => {
    e.preventDefault();
    
    if (!editingFolder.name.trim()) {
      toast.warning('Please enter a folder name');
      return;
    }
    
    try {
      const token = await getToken();
      await api.put(`/admin/folders/${editingFolder.id}`, {
        name: editingFolder.name.trim(),
        description: editingFolder.description?.trim() || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Folder updated successfully');
      setEditingFolder(null);
      loadFolders();
      
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div className="folder-manager">
      <div className="folder-header">
        <h2>📁 Photo Albums</h2>
        <button 
          className="btn-create"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '− Cancel' : '+ New Folder'}
        </button>
      </div>

      {/* Create Folder Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div 
            className="create-folder-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label>Folder Name *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Birthday, Vacation, init"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="What's this folder about?"
                  rows="2"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save">Create Folder</button>
                <button type="button" className="btn-cancel" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Folder Modal */}
      <AnimatePresence>
        {editingFolder && (
          <motion.div 
            className="edit-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingFolder(null)}
          >
            <motion.div 
              className="edit-modal-content"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Edit Folder</h3>
              <form onSubmit={handleUpdateFolder}>
                <div className="form-group">
                  <label>Folder Name</label>
                  <input
                    type="text"
                    value={editingFolder.name}
                    onChange={(e) => setEditingFolder({
                      ...editingFolder,
                      name: e.target.value
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editingFolder.description || ''}
                    onChange={(e) => setEditingFolder({
                      ...editingFolder,
                      description: e.target.value
                    })}
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-save">Save Changes</button>
                  <button type="button" className="btn-cancel" onClick={() => setEditingFolder(null)}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folders Grid */}
      <div className="folders-grid">
        {folders.length === 0 ? (
          <div className="no-folders">
            <p>No folders yet. Create your first album!</p>
          </div>
        ) : (
          folders.map(folder => (
            <motion.div
              key={folder.id}
              className={`folder-card ${selectedFolderId === folder.id ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              onClick={() => onSelectFolder && onSelectFolder(folder.id)}
            >
              <div className="folder-cover">
                {folder.coverPhoto ? (
                  <img src={folder.coverPhoto} alt={folder.name} />
                ) : (
                  <div className="folder-cover-placeholder">
                    <span>📁</span>
                  </div>
                )}
                <div className="folder-photo-count">{folder.photoCount || 0}</div>
              </div>
              
              <div className="folder-info">
                <h3 className="folder-name">{folder.name}</h3>
                {folder.description && (
                  <p className="folder-description">{folder.description}</p>
                )}
                <div className="folder-meta">
                  <span className="folder-date">{formatDate(folder.createdAt)}</span>
                  <div className="folder-actions">
                    <button 
                      className="folder-action edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolder(folder);
                      }}
                      title="Edit folder"
                    >
                      ✏️
                    </button>
                    <button 
                      className="folder-action delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id, folder.name);
                      }}
                      title="Delete folder"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
              
              {selectedFolderId === folder.id && (
                <div className="selected-indicator">✓</div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default FolderManager;