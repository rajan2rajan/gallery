import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './VideoModal.css';

const VideoModal = ({ videoUrl, onClose }) => {
    const videoRef = useRef(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        // Prevent scrolling on body when modal is open
        document.body.style.overflow = 'hidden';

        // Auto-play video when modal opens
        if (videoRef.current) {
            videoRef.current.play().catch(err => {
                console.log('Auto-play failed:', err);
            });
        }

        // Clean up function - runs when modal closes
        return () => {
            // COMPLETELY STOP THE VIDEO
            if (videoRef.current) {
                videoRef.current.pause();           // Stop playback
                videoRef.current.currentTime = 0;   // Reset to beginning
                videoRef.current.src = '';          // Remove video source
                videoRef.current.load();             // Reset video element
            }
            // Restore body scroll
            document.body.style.overflow = 'auto';
        };
    }, []);

    // Handle ESC key press
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const closeModal = () => {
        // Stop video before calling onClose
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            videoRef.current.src = '';
            videoRef.current.load();
        }
        // Call the parent's onClose function
        onClose();
    };

    const handleOverlayClick = (e) => {
        // Only close if clicking the overlay background, not the video container
        if (e.target === overlayRef.current) {
            closeModal();
        }
    };

    return (
        <motion.div
            ref={overlayRef}
            className="video-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
        >
            <motion.div
                className="video-modal-container"
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={{ type: "spring", damping: 25 }}
            >
                <button className="video-modal-close" onClick={closeModal}>
                    ×
                </button>

                <video
                    ref={videoRef}
                    className="video-player"
                    controls
                    playsInline
                    preload="auto"
                    controlsList="nodownload"
                >
                    <source src={videoUrl} type="video/mp4" />
                    <source src={videoUrl} type="video/quicktime" />
                    <source src={videoUrl} type="video/webm" />
                    Your browser does not support the video tag.
                </video>

                <div className="video-modal-footer">
                    <p className="video-modal-note">🎥 Video Player</p>
                    <p className="video-modal-tip">Click outside or press ESC to close</p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default VideoModal;