import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './AlbumView.css';

const AlbumView = ({ album, onClose, onDelete }) => {
    const { getToken } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        loadAlbumPhotos();
    }, [album]);

    useEffect(() => {
        if (photos.length > 0 && selectedPhotos.length === photos.length) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedPhotos, photos]);

    const loadAlbumPhotos = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const response = await api.get(`/folders/${album.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPhotos(response.data.photos || []);
            setSelectedPhotos([]);
        } catch (error) {
            console.error('Error loading album photos:', error);
            toast.error('Failed to load photos');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectPhoto = (photoId) => {
        if (selectedPhotos.includes(photoId)) {
            setSelectedPhotos(selectedPhotos.filter(id => id !== photoId));
        } else {
            setSelectedPhotos([...selectedPhotos, photoId]);
        }
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedPhotos([]);
        } else {
            setSelectedPhotos(photos.map(p => p.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedPhotos.length === 0) {
            toast.warning('No photos selected');
            return;
        }

        if (!window.confirm(`Delete ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''}? This cannot be undone.`)) {
            return;
        }

        setDeleting(true);
        let successCount = 0;
        let failCount = 0;

        try {
            const token = await getToken();

            for (const photoId of selectedPhotos) {
                try {
                    await api.delete(`/admin/photos/${photoId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Failed to delete ${photoId}:`, err);
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Deleted ${successCount} photo${successCount > 1 ? 's' : ''}`);
                await loadAlbumPhotos();
                if (onDelete) onDelete();
            }

            if (failCount > 0) {
                toast.error(`Failed to delete ${failCount} photo${failCount > 1 ? 's' : ''}`);
            }

        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error('Failed to delete photos');
        } finally {
            setDeleting(false);
        }
    };

    const isVideo = (file) => {
        return file.contentType?.startsWith('video/') ||
            file.isVideo === true ||
            file.url?.match(/\.(mp4|mov|webm|avi|mkv)$/i);
    };

    if (loading) {
        return (
            <div className="admin-loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading photos...</p>
            </div>
        );
    }
    if (loading) {
        return (
            <div className="album-view-loading">
                <div className="loading-spinner"></div>
                <p>Loading photos...</p>
            </div>
        );
    }

    return (
        <div className="album-view">
            {/* Sticky Header - Always Visible */}
            <div className="album-sticky-header">
                <button className="back-btn-sticky" onClick={onClose}>
                    ← Back
                </button>
                <h1 className="album-name-sticky">{album.name}</h1>
                <div className="photo-count-sticky">
                    📸 {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                </div>
            </div>

            {/* Bulk Actions Bar (only shows when photos selected) */}
            {selectedPhotos.length > 0 && (
                <div className="bulk-actions-bar">
                    <div className="bulk-info">
                        <span className="selected-count">{selectedPhotos.length}</span>
                        <span className="selected-label">selected</span>
                    </div>
                    <div className="bulk-buttons">
                        <button
                            className="bulk-delete-btn"
                            onClick={handleDeleteSelected}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete Selected'}
                        </button>
                        <button
                            className="bulk-cancel-btn"
                            onClick={() => setSelectedPhotos([])}
                            disabled={deleting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Select All Toggle */}
            {photos.length > 0 && (
                <div className="select-all-row">
                    <label className="select-all-checkbox">
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={toggleSelectAll}
                            disabled={deleting}
                        />
                        <span>Select All</span>
                        {selectAll && <span className="select-all-badge">{photos.length} items</span>}
                    </label>
                </div>
            )}

            {/* Photos Grid */}
            <div className="album-photos-grid">
                {photos.map(photo => {
                    const isVideoFile = isVideo(photo);
                    const isSelected = selectedPhotos.includes(photo.id);

                    return (
                        <motion.div
                            key={photo.id}
                            className={`album-photo-card ${isSelected ? 'selected' : ''}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="photo-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectPhoto(photo.id)}
                                    disabled={deleting}
                                    id={`photo-${photo.id}`}
                                />
                            </div>
                            <div className="photo-thumbnail" onClick={() => setSelectedPhoto(photo)}>
                                {isVideoFile ? (
                                    <div className="video-thumbnail">
                                        <video
                                            src={photo.url}
                                            preload="metadata"
                                            poster={photo.thumbnailUrl || ''}
                                        />
                                        <div className="video-play-icon">▶</div>
                                    </div>
                                ) : (
                                    <img src={photo.url} alt={photo.title || 'Memory'} />
                                )}
                            </div>
                            <div className="photo-info">
                                <div className="photo-title" title={photo.title || 'Untitled'}>
                                    {photo.title || 'Untitled'}
                                </div>

                                {isVideoFile && (
                                    <div className="photo-video-badge">🎥 Video</div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Empty State */}
            {photos.length === 0 && (
                <div className="empty-album">
                    <span className="empty-icon">📷</span>
                    <h3>No photos yet</h3>
                    <p>Upload photos to this album to see them here</p>
                </div>
            )}

            {/* Photo Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        className="photo-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <motion.div
                            className="photo-modal-content"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button className="modal-close" onClick={() => setSelectedPhoto(null)}>×</button>
                            {isVideo(selectedPhoto) ? (
                                <video
                                    controls
                                    autoPlay
                                    className="modal-video"
                                    style={{ maxWidth: '100%', maxHeight: '70vh' }}
                                >
                                    <source src={selectedPhoto.url} type={selectedPhoto.contentType || 'video/mp4'} />
                                </video>
                            ) : (
                                <img
                                    src={selectedPhoto.url}
                                    alt={selectedPhoto.title || 'Memory'}
                                    className="modal-image"
                                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                                />
                            )}
                            <div className="modal-info">
                                {isVideo(selectedPhoto) && <p className="modal-video-note">🎥 Video</p>}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AlbumView;