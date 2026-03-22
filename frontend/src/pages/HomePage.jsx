import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import VideoModal from '../components/VideoModal';
import '../styles/Home.css';

const HomePage = () => {
  const { getToken } = useAuth();
  const [homepagePhotos, setHomepagePhotos] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showFolderContent, setShowFolderContent] = useState(false);
  const [folderPhotos, setFolderPhotos] = useState([]);
  const [hoveredPhoto, setHoveredPhoto] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPositions, setPhotoPositions] = useState([]);
  const [clickedFolder, setClickedFolder] = useState(null);

  // Video modal states
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);

  const [timeTogether, setTimeTogether] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const heroRef = useRef(null);
  const foldersRef = useRef(null);

  // Scroll animations
  const { scrollYProgress } = useScroll();
  const heroBlur = useTransform(scrollYProgress, [0, 0.3], [0, 15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);
  const foldersBlur = useTransform(scrollYProgress, [0, 0.2], [10, 0]);
  const foldersOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const foldersY = useTransform(scrollYProgress, [0, 0.2], [150, -30]);

  const relationshipStart = new Date('2025-02-17T00:00:00');
  // Detect if user is on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    fetchHomepagePhotos();
    fetchFolders();
  }, []);

  // Auto-rotate background photos
  useEffect(() => {
    if (homepagePhotos.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPhotoIndex((prevIndex) =>
        prevIndex === homepagePhotos.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [homepagePhotos]);

  // Generate random positions for photos when folder photos change
  useEffect(() => {
    if (folderPhotos.length > 0) {
      const positions = folderPhotos.map(() => ({
        rotate: Math.random() * 10 - 5,
        x: Math.random() * 40 - 20,
        y: Math.random() * 30 - 15,
        scale: 0.9 + Math.random() * 0.2,
        zIndex: Math.floor(Math.random() * 100)
      }));
      setPhotoPositions(positions);
    }
  }, [folderPhotos]);

  // ========== VIDEO DETECTION ==========
  const isVideoFile = (file) => {
    return file.contentType?.startsWith('video/') ||
      file.isVideo === true ||
      file.url?.match(/\.(mp4|mov|webm|avi|mkv)$/i);
  };

  // ========== MEDIA CLICK HANDLER ==========
  const handleMediaClick = (photo) => {
    if (isVideoFile(photo)) {
      // Close photo modal if open
      setSelectedPhoto(null);
      // Open video modal
      setSelectedVideoUrl(photo.url);
      setShowVideoModal(true);
    } else {
      // Close video modal if open
      setShowVideoModal(false);
      setSelectedVideoUrl(null);
      // Open photo modal
      setSelectedPhoto(photo.id);
    }
  };

  // Add this inside your HomePage component (before the return statement)
  const VideoThumbnail = ({ videoUrl, onClick }) => {
    const [hasError, setHasError] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
      // Check if video thumbnail is visible on mobile
      const checkVideo = () => {
        if (videoRef.current) {
          // On mobile, video often doesn't show thumbnail
          // We'll detect if the video element has a valid frame
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 10;
          canvas.height = 10;

          try {
            ctx.drawImage(videoRef.current, 0, 0, 10, 10);
            const pixelData = ctx.getImageData(0, 0, 10, 10).data;
            const isBlack = pixelData.every(val => val === 0);

            // If all pixels are black or video isn't showing properly
            if (isBlack) {
              setHasError(true);
            }
          } catch (err) {
            setHasError(true);
          }
        }
      };

      // Wait a bit for video to load
      const timer = setTimeout(checkVideo, 1000);

      return () => clearTimeout(timer);
    }, [videoUrl]);

    return (
      <div className="polaroid-video-thumbnail" onClick={onClick}>
        {hasError ? (
          // Mobile fallback - show video icon
          <div className="video-mobile-fallback">
            <span className="video-mobile-icon">🎥</span>
            <span className="video-mobile-text">Video</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            preload="metadata"
            className="polaroid-video-preview"
            muted
          />
        )}
        <div className="polaroid-play-icon">▶</div>
      </div>
    );
  };

  // Fetch homepage photos for background
  const fetchHomepagePhotos = async () => {
    try {
      const response = await api.get('/homepage-photos');

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setHomepagePhotos(response.data);
      } else {
        setHomepagePhotos([]);
      }
    } catch (err) {
      console.error('Error fetching homepage photos:', err);
      setHomepagePhotos([]);
    }
  };

  // Fetch all folders with sample media (both photos and videos)
  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/folders');

      // For each folder, fetch a few sample media (photos + videos)
      const foldersWithSamples = await Promise.all(
        response.data.map(async (folder) => {
          try {
            // Fetch photos and videos for this folder
            const mediaResponse = await api.get(`/folders/${folder.id}?limit=8`);
            const allMedia = mediaResponse.data.photos || [];

            // Take first 4 media items for the stack
            const sampleMedia = allMedia.slice(0, 4);

            // Create stack items with type info
            const stackItems = sampleMedia.map(media => ({
              url: media.url,
              isVideo: media.contentType?.startsWith('video/') ||
                media.isVideo === true ||
                media.url?.match(/\.(mp4|mov|webm|avi|mkv)$/i)
            }));

            return {
              ...folder,
              stackItems: stackItems,
              samplePhotos: sampleMedia.map(m => m.url) // Keep for backward compatibility
            };
          } catch (error) {
            console.warn(`Could not fetch media for folder ${folder.id}:`, error.message);
            return {
              ...folder,
              stackItems: [],
              samplePhotos: []
            };
          }
        })
      );

      console.log('Folders with samples:', foldersWithSamples);
      setFolders(foldersWithSamples);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch photos in a specific folder
  const fetchFolderPhotos = async (folderId) => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await api.get(`/folders/${folderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFolderPhotos(response.data.photos || []);
      setSelectedFolder(response.data.folder);
      setShowFolderContent(true);
    } catch (error) {
      console.error('Error fetching folder photos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update time together
  useEffect(() => {
    const calculateTimeTogether = () => {
      const now = new Date();
      const diff = now - relationshipStart;

      setTimeTogether({
        years: Math.floor(diff / (1000 * 60 * 60 * 24 * 365)),
        months: Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)),
        days: Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    calculateTimeTogether();
    const interval = setInterval(calculateTimeTogether, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFolderClick = (folderId) => {
    fetchFolderPhotos(folderId);
  };

  const handleBackToFolders = () => {
    setShowFolderContent(false);
    setSelectedFolder(null);
    setFolderPhotos([]);
    setSelectedPhoto(null);
    setShowVideoModal(false);
    setSelectedVideoUrl(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && folders.length === 0) {
    return (
      <div className="image-home">
        <div className="image-background">
          <div className="background-image loading-bg"></div>
          <div className="image-overlay"></div>
        </div>
        <div className="content-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="image-home">
      {/* Background Slideshow */}
      <div className="image-background">
        <AnimatePresence mode="wait">
          {homepagePhotos.length > 0 ? (
            <motion.div
              key={currentPhotoIndex}
              className="background-image slideshow-image mobile-optimized"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1, ease: "easeInOut" } }}
              style={{
                backgroundImage: `url(${homepagePhotos[currentPhotoIndex]?.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transform: 'scale(1)',
                transformOrigin: 'center center',
                willChange: 'opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
          ) : (
            <motion.div
              className="background-image slideshow-image mobile-optimized"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                backgroundImage: `url(${process.env.PUBLIC_URL}/images/background.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transform: 'scale(1)',
                transformOrigin: 'center center',
                willChange: 'opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
          )}
        </AnimatePresence>
        <div className="image-overlay"></div>
      </div>

      {!showFolderContent ? (
        <>
          {/* Hero Section */}
          <motion.div
            ref={heroRef}
            className="content-container hero-section"
            style={{
              filter: `blur(${heroBlur}px)`,
              opacity: heroOpacity,
              y: heroY,
              pointerEvents: heroOpacity.get() < 0.1 ? 'none' : 'auto'
            }}
          >
            <motion.h1
              className="main-heading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Puku
            </motion.h1>

            <motion.p
              className="sub-heading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Every moment with you is a beautiful dream
            </motion.p>
          </motion.div>

          {/* Folders Section */}
          <motion.div
            ref={foldersRef}
            className="folders-section"
            style={{
              filter: `blur(${foldersBlur}px)`,
              opacity: foldersOpacity,
              y: foldersY
            }}
          >
            <div className="folders-section-header">
              <h2 className="folders-section-title">my albums</h2>
              <p className="folders-section-subtitle">click to explore</p>
            </div>

            {/* Folders Grid */}
            <div className="folders-grid-home">
              {folders.length === 0 ? (
                <div className="no-folders-home">
                  <p>No albums yet.</p>
                </div>
              ) : (
                folders.map(folder => (
                  <motion.div
                    key={folder.id}
                    className={`folder-card-home ${clickedFolder === folder.id ? 'popped' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    onClick={() => {
                      setClickedFolder(folder.id);
                      setTimeout(() => {
                        handleFolderClick(folder.id);
                        setClickedFolder(null);
                      }, 300);
                    }}
                  >
                    {/* Stack of Polaroid photos */}
                    <div className="folder-polaroid-stack">
                      {folder.stackItems && folder.stackItems.length > 0 ? (
                        <>
                          {folder.stackItems.slice(0, 4).map((item, index) => (
                            <div
                              key={index}
                              className={`stack-polaroid ${item.isVideo ? 'video-stack' : ''}`}
                              style={{
                                zIndex: 4 - index
                              }}
                            >
                              {item.isVideo ? (
                                <div className="stack-video-preview">
                                  <video
                                    src={item.url}
                                    preload="metadata"
                                    className="stack-video"
                                  />
                                  <div className="stack-video-icon">🎥</div>
                                </div>
                              ) : (
                                <div
                                  className="stack-photo"
                                  style={{ backgroundImage: `url(${item.url})` }}
                                />
                              )}
                              <div className="polaroid-bottom"></div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          {[1, 2, 3, 4].map((_, index) => (
                            <div
                              key={index}
                              className="stack-polaroid placeholder"
                              style={{ zIndex: 4 - index }}
                            >
                              <div className="polaroid-bottom"></div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Folder info */}
                    <div className="folder-info-home">
                      <h3 className="folder-name-home">{folder.name}</h3>
                      {folder.description && (
                        <p className="folder-description-home">{folder.description}</p>
                      )}
                      <span className="folder-photo-count-home">{folder.photoCount || 0} photos</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      ) : (
        /* Folder Content View - POLAROID GRID WITH VIDEO SUPPORT */
        <div className="gallery-page">
          <div className="gallery-content-overlay">
            <button className="back-to-grid-btn" onClick={handleBackToFolders}>
              <span className="back-icon">←</span>
            </button>

            <div className="folder-badge">
              <span className="badge-folder">{selectedFolder?.name}</span>
              <span className="badge-count">{folderPhotos.length} photos</span>
            </div>

            <div className="polaroid-grid">
              {folderPhotos.map((photo, index) => {
                const position = photoPositions[index] || { rotate: 0, x: 0, y: 0, scale: 1, zIndex: index };
                const isVideo = isVideoFile(photo);

                return (
                  <motion.div
                    key={photo.id}
                    className={`polaroid-card ${hoveredPhoto === photo.id ? 'hovered' : ''} ${selectedPhoto === photo.id ? 'selected' : ''}`}
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
                    onHoverStart={() => setHoveredPhoto(photo.id)}
                    onHoverEnd={() => setHoveredPhoto(null)}
                  >
                    {/* <div className="polaroid-photo">
                      {isVideo ? (
                        <div className="video-thumbnail-simple" onClick={() => handleMediaClick(photo)}>
                          <video
                            src={photo.url}
                            preload="metadata"
                            className="video-preview"
                          />
                          <div className="video-play-icon-simple">▶</div>
                        </div>
                      ) : (
                        <img
                          src={photo.url}
                          alt={photo.title || 'Memory'}
                          onClick={() => handleMediaClick(photo)}
                        />
                      )}
                    </div> */}
                    <div className="polaroid-photo">
                      {isVideoFile(photo) ? (
                        <div className="polaroid-video-thumbnail" onClick={() => handleMediaClick(photo)}>
                          {isMobile ? (
                            // Mobile: Show video icon (works everywhere)
                            <div className="video-mobile-fallback">
                              <span className="video-mobile-icon">▶</span>
                              <span className="video-mobile-text">Video</span>
                            </div>
                          ) : (
                            // Desktop: Show actual video frame
                            <video
                              src={photo.url}
                              preload="metadata"
                              className="polaroid-video-preview"
                            />
                          )}
                          <div className="polaroid-play-icon">▶</div>
                        </div>
                      ) : (
                        <img
                          src={photo.url}
                          alt={photo.title || 'Memory'}
                          onClick={() => handleMediaClick(photo)}
                        />
                      )}
                    </div>
                    <div className="polaroid-footer">
                      <span className="polaroid-date">
                        {formatDate(photo.uploadedAt)}
                        {isVideo && <span className="video-badge"> 🎥</span>}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Photo Modal */}
            <AnimatePresence>
              {selectedPhoto && !showVideoModal && (
                <motion.div
                  className="polaroid-modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedPhoto(null)}
                >
                  <motion.div
                    className="polaroid-modal-content"
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    transition={{ type: "spring", damping: 20 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button className="modal-close" onClick={() => setSelectedPhoto(null)}>×</button>

                    {folderPhotos.find(p => p.id === selectedPhoto) && (
                      <>
                        <div className="modal-photo-container">
                          <img
                            src={folderPhotos.find(p => p.id === selectedPhoto).url}
                            alt="Memory"
                            className="modal-full-image"
                          />
                        </div>
                        <div className="modal-info">
                          <p className="modal-date">
                            {formatDate(folderPhotos.find(p => p.id === selectedPhoto).uploadedAt)}
                          </p>
                          {folderPhotos.find(p => p.id === selectedPhoto).description && (
                            <p className="modal-description">{folderPhotos.find(p => p.id === selectedPhoto).description}</p>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video Modal */}
            <AnimatePresence>
              {showVideoModal && selectedVideoUrl && (
                <VideoModal
                  videoUrl={selectedVideoUrl}
                  onClose={() => {
                    setShowVideoModal(false);
                    setSelectedVideoUrl(null);
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Timeline Card - Bottom Right */}
      <motion.div
        className="timeline-card-compact"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="timeline-header-compact">
          <span>Since {relationshipStart.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          })}</span>
        </div>
        <div className="timeline-grid-compact">
          <div className="timeline-item-compact">
            <span className="timeline-number">{timeTogether.years}</span>
            <span className="timeline-unit">y</span>
          </div>
          <div className="timeline-item-compact">
            <span className="timeline-number">{timeTogether.months}</span>
            <span className="timeline-unit">m</span>
          </div>
          <div className="timeline-item-compact">
            <span className="timeline-number">{timeTogether.days}</span>
            <span className="timeline-unit">d</span>
          </div>
          <div className="timeline-item-compact">
            <span className="timeline-number">{timeTogether.hours}</span>
            <span className="timeline-unit">h</span>
          </div>
          <div className="timeline-item-compact">
            <span className="timeline-number">{timeTogether.minutes}</span>
            <span className="timeline-unit">min</span>
          </div>
          <div className="timeline-item-compact">
            <span className="timeline-number seconds">{timeTogether.seconds}</span>
            <span className="timeline-unit">s</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;