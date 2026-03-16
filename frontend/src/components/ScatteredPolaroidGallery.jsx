import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ScatteredPolaroidGallery.css';

const ScatteredPolaroidGallery = ({ photos }) => {
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
      <div className="no-photos-message">
        <span className="no-photos-icon">📸</span>
        <p>No photos in this album</p>
      </div>
    );
  }

  return (
    <div className="scattered-container">
      {/* Scattered Polaroid Pile */}
      <div className="scattered-pile">
        {photos.map((photo, index) => {
          const position = photoPositions[index] || { rotate: 0, x: 0, y: 0, scale: 1, zIndex: index };
          
          return (
            <motion.div
              key={photo.id}
              className={`scattered-card ${hoveredPhoto === photo.id ? 'hovered' : ''} ${selectedPhoto === photo.id ? 'selected' : ''}`}
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
              <div className="scattered-photo">
                <img src={photo.url} alt={photo.title || 'Memory'} />
              </div>
              <div className="scattered-footer">
                <span className="scattered-date">
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
            className="scattered-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div 
              className="scattered-modal-content"
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

export default ScatteredPolaroidGallery;