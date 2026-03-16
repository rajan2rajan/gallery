import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './YearPolaroidGallery.css';

const YearPolaroidGallery = ({ photos, year }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [hoveredPhoto, setHoveredPhoto] = useState(null);
  const [photoPositions, setPhotoPositions] = useState([]);

  // Generate random positions for photos
  useEffect(() => {
    const positions = photos.map(() => ({
      rotate: Math.random() * 10 - 5,
      x: Math.random() * 40 - 20,
      y: Math.random() * 30 - 15,
      scale: 0.9 + Math.random() * 0.2,
      zIndex: Math.floor(Math.random() * 100)
    }));
    setPhotoPositions(positions);
  }, [photos]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (photos.length === 0) {
    return (
      <div className="year-no-photos">
        <span className="year-no-photos-icon">📸</span>
        <p>No photos for {year}</p>
      </div>
    );
  }

  return (
    <div className="year-gallery-container">
      {/* Year Badge */}
      <div className="year-gallery-badge">
        <span className="badge-year">{year}</span>
        <span className="badge-count">{photos.length} memories</span>
      </div>

      {/* Scattered Polaroid Grid */}
      <div className="year-polaroid-grid">
        {photos.map((photo, index) => {
          const position = photoPositions[index] || { rotate: 0, x: 0, y: 0, scale: 1, zIndex: index };
          
          return (
            <motion.div
              key={photo.id}
              className={`year-polaroid-card ${hoveredPhoto === photo.id ? 'hovered' : ''} ${selectedPhoto === photo.id ? 'selected' : ''}`}
              style={{
                rotate: `${position.rotate}deg`,
                x: position.x,
                y: position.y,
                scale: position.scale,
                zIndex: selectedPhoto === photo.id ? 1000 : hoveredPhoto === photo.id ? 200 : position.zIndex
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: 1, 
                scale: position.scale,
                rotate: `${position.rotate}deg`,
                x: position.x,
                y: position.y
              }}
              transition={{ 
                duration: 0.5,
                delay: index * 0.03
              }}
              whileHover={{ 
                scale: 1.1,
                rotate: `${position.rotate - 2}deg`,
                y: position.y - 20,
                transition: { duration: 0.2 }
              }}
              onClick={() => setSelectedPhoto(photo.id)}
              onHoverStart={() => setHoveredPhoto(photo.id)}
              onHoverEnd={() => setHoveredPhoto(null)}
            >
              <div className="year-polaroid-photo">
                <img src={photo.url} alt={photo.title || 'Memory'} />
              </div>
              <div className="year-polaroid-footer">
                <span className="year-polaroid-date">
                  {formatDate(photo.uploadedAt)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            className="year-polaroid-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div 
              className="year-polaroid-modal-content"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedPhoto(null)}>×</button>
              
              {photos.find(p => p.id === selectedPhoto) && (
                <>
                  <div className="modal-photo">
                    <img 
                      src={photos.find(p => p.id === selectedPhoto).url} 
                      alt={photos.find(p => p.id === selectedPhoto).title || 'Memory'} 
                    />
                  </div>
                  <div className="modal-info">
                    <p className="modal-date">
                      {formatDate(photos.find(p => p.id === selectedPhoto).uploadedAt)}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YearPolaroidGallery;