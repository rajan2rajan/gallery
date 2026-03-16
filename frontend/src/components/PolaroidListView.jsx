import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './PolaroidListView.css';

const PolaroidListView = ({ photos, folderName, selectedPhotoId }) => {
  const [hoveredPhoto, setHoveredPhoto] = useState(null);
  const selectedRef = useRef(null);

  // Scroll to selected photo when component mounts
  useEffect(() => {
    if (selectedPhotoId && selectedRef.current) {
      setTimeout(() => {
        selectedRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 100);
    }
  }, [selectedPhotoId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (photos.length === 0) {
    return (
      <div className="no-photos-message">
        <span className="no-photos-icon">📸</span>
        <p>No photos in {folderName || 'this album'}</p>
      </div>
    );
  }

  return (
    <div className="polaroid-list-container">
      <h2 className="list-title">
        {folderName || 'Album Photos'}
      </h2>
      <div className="photos-list">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            ref={photo.id === selectedPhotoId ? selectedRef : null}
            className={`photo-list-item ${photo.id === selectedPhotoId ? 'selected' : ''} ${hoveredPhoto === photo.id ? 'hovered' : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, x: 10 }}
            onHoverStart={() => setHoveredPhoto(photo.id)}
            onHoverEnd={() => setHoveredPhoto(null)}
          >
            <div className="list-photo-thumb">
              <img src={photo.url} alt={photo.title} />
              {photo.contentType?.startsWith('video/') && (
                <span className="thumb-video-badge">🎥</span>
              )}
            </div>
            <div className="list-photo-info">
              <h3>{photo.title || 'Untitled Memory'}</h3>
              <div className="list-photo-meta">
                <span className="list-photo-date">
                  📅 {formatDate(photo.uploadedAt)}
                </span>
                {photo.size && (
                  <span className="list-photo-size">
                    💾 {formatFileSize(photo.size)}
                  </span>
                )}
              </div>
              {photo.description && (
                <p className="list-photo-description">{photo.description}</p>
              )}
              {photo.folderName && (
                <span className="list-photo-folder">📁 {photo.folderName}</span>
              )}
            </div>
            {photo.id === selectedPhotoId && (
              <div className="selected-indicator">
                <span className="indicator-icon">✨</span>
                <span className="indicator-text">Selected</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PolaroidListView;