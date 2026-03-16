// import React, { useState, useEffect, useRef } from 'react';
// import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
// import { useAuth } from '../context/AuthContext';
// import api from '../utils/api';
// import '../styles/Home.css';

// const HomePage = () => {
//   const { getToken } = useAuth();
//   const [homepagePhotos, setHomepagePhotos] = useState([]);
//   const [galleryPhotos, setGalleryPhotos] = useState([]);
//   const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [selectedYear, setSelectedYear] = useState(null);
//   const [showYearGallery, setShowYearGallery] = useState(false);
//   const [photosByYear, setPhotosByYear] = useState({});
//   const [hoveredPhoto, setHoveredPhoto] = useState(null);
//   const [selectedPhoto, setSelectedPhoto] = useState(null);
//   const [photoPositions, setPhotoPositions] = useState([]);
//   const [timeTogether, setTimeTogether] = useState({
//     years: 0,
//     months: 0,
//     days: 0,
//     hours: 0,
//     minutes: 0,
//     seconds: 0
//   });

//   const heroRef = useRef(null);
//   const polaroidRef = useRef(null);
  
//   // Scroll animations
//   const { scrollYProgress } = useScroll();

// // Hero section (Puku text) - DISAPPEARS SLOWER as you scroll DOWN
// const heroBlur = useTransform(scrollYProgress, [0, 0.6], [0, 15]);
// const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
// const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -80]);

// // Polaroid section - HIGHER to avoid timeline card
// const polaroidBlur = useTransform(scrollYProgress, [0, 0.2], [10, 0]);
// const polaroidOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
// const polaroidY = useTransform(scrollYProgress, [0, 0.1], [100, -30]); // Changed from -30 to -80

// // Increased from [120, 0] to [200, 0] - starts lower, ends at center

//   const relationshipStart = new Date('2023-01-15T00:00:00');

//   useEffect(() => {
//     fetchHomepagePhotos();
//     fetchGalleryPhotos();
//   }, []);

//   // Auto-rotate background photos
//   useEffect(() => {
//     if (homepagePhotos.length === 0) return;
    
//     const interval = setInterval(() => {
//       setCurrentPhotoIndex((prevIndex) => 
//         prevIndex === homepagePhotos.length - 1 ? 0 : prevIndex + 1
//       );
//     }, 4000);
    
//     return () => clearInterval(interval);
//   }, [homepagePhotos]);

//   // Generate random positions for photos when gallery photos change
//   useEffect(() => {
//     if (galleryPhotos.length > 0) {
//       const positions = galleryPhotos.map(() => ({
//         rotate: Math.random() * 10 - 5,
//         x: Math.random() * 40 - 20,
//         y: Math.random() * 30 - 15,
//         scale: 0.9 + Math.random() * 0.2,
//         zIndex: Math.floor(Math.random() * 100)
//       }));
//       setPhotoPositions(positions);
//     }
//   }, [galleryPhotos]);

//   // Fetch homepage photos for background
//   const fetchHomepagePhotos = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get('/homepage-photos');
      
//       if (response.data && Array.isArray(response.data) && response.data.length > 0) {
//         setHomepagePhotos(response.data);
//       } else {
//         setHomepagePhotos([]);
//       }
//     } catch (err) {
//       console.error('Error fetching homepage photos:', err);
//       setHomepagePhotos([]);
//     }
//   };

//   // Fetch ALL photos from backend for gallery
// // Fetch ALL photos from backend grouped by year
// const fetchGalleryPhotos = async () => {
//   try {
//     const token = await getToken();
//     const response = await api.get('/photos/by-year', {
//       headers: { Authorization: `Bearer ${token}` }
//     });
    
//     console.log('Photos by year:', response.data);
    
//     // The response is already grouped by year
//     // We need to flatten them for the gallery view
//     const allPhotos = [];
//     Object.values(response.data).forEach(yearPhotos => {
//       allPhotos.push(...yearPhotos);
//     });
    
//     setGalleryPhotos(allPhotos);
//     setPhotosByYear(response.data); // Store the grouped data separately
//   } catch (error) {
//     console.error('Error fetching gallery photos:', error);
//   } finally {
//     setLoading(false);
//   }
// };

//   // Group photos by year (from backend data)
//   const groupPhotosByYear = (photos) => {
//     const grouped = {};
//     photos.forEach(photo => {
//       const year = new Date(photo.uploadedAt).getFullYear();
//       if (!grouped[year]) {
//         grouped[year] = [];
//       }
//       grouped[year].push(photo);
//     });
//     return grouped;
//   };

//   // Update time together
//   useEffect(() => {
//     const calculateTimeTogether = () => {
//       const now = new Date();
//       const diff = now - relationshipStart;

//       setTimeTogether({
//         years: Math.floor(diff / (1000 * 60 * 60 * 24 * 365)),
//         months: Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)),
//         days: Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)),
//         hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
//         minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
//         seconds: Math.floor((diff % (1000 * 60)) / 1000)
//       });
//     };

//     calculateTimeTogether();
//     const interval = setInterval(calculateTimeTogether, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   const groupedByYear = groupPhotosByYear(galleryPhotos);
//   // Get years from backend data and sort descending
//   const availableYears = Object.keys(groupedByYear).sort((a, b) => b - a);

//   const handleYearClick = (year) => {
//     setSelectedYear(year);
//     setShowYearGallery(true);
//   };

//   const handleBackToHome = () => {
//     setShowYearGallery(false);
//     setSelectedYear(null);
//     setSelectedPhoto(null);
//   };

//   const formatDate = (timestamp) => {
//     if (!timestamp) return 'Unknown date';
//     const date = new Date(timestamp);
//     return date.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   if (loading) {
//     return (
//       <div className="image-home">
//         <div className="image-background">
//           <div className="background-image loading-bg"></div>
//           <div className="image-overlay"></div>
//         </div>
//         <div className="content-container">
//           <div className="loading-spinner"></div>
//           <p className="loading-text">Loading memories...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="image-home">
//       {/* Background Slideshow */}
//       <div className="image-background">
//         <AnimatePresence mode="wait">
//           {homepagePhotos.length > 0 ? (
//             <motion.div
//               key={currentPhotoIndex}
//               className="background-image slideshow-image"
//               initial={{ opacity: 0, scale: 1.1 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0, scale: 0.95 }}
//               transition={{ duration: 1.5, ease: "easeInOut" }}
//               style={{ 
//                 backgroundImage: `url(${homepagePhotos[currentPhotoIndex]?.url})`
//               }}
//             />
//           ) : (
//             <motion.div
//               className="background-image slideshow-image"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               style={{ 
//                 backgroundImage: `url(${process.env.PUBLIC_URL}/images/background.png)`
//               }}
//             />
//           )}
//         </AnimatePresence>
//         <div className="image-overlay"></div>
//       </div>

//       {!showYearGallery ? (
//         <>
//           {/* Hero Section - DISAPPEARS when scrolling DOWN */}
//           <motion.div 
//             ref={heroRef}
//             className="content-container hero-section"
//             style={{
//               filter: `blur(${heroBlur}px)`,
//               opacity: heroOpacity,
//               y: heroY,
//               pointerEvents: heroOpacity.get() < 0.1 ? 'none' : 'auto'
//             }}
//           >
//             <motion.h1 
//               className="main-heading"
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.8 }}
//             >
//               Puku
//             </motion.h1>

//             <motion.p 
//               className="sub-heading"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.8, delay: 0.2 }}
//             >
//               Every moment with you is a beautiful dream
//             </motion.p>
//           </motion.div>

//           {/* Memories by Year Section - BECOMES VISIBLE when scrolling DOWN */}
//           <motion.div 
//             ref={polaroidRef}
//             className="polaroid-section-compact"
//             style={{
//               filter: `blur(${polaroidBlur}px)`,
//               opacity: polaroidOpacity,
//               y: polaroidY
//             }}
//           >
//             <div className="polaroid-section-header-compact">
//               <h2 className="polaroid-section-title-compact">memories by year</h2>
//               <p className="polaroid-section-subtitle-compact">click to explore</p>
//             </div>

//             {/* Years Grid - 3 per row */}
//             {/* Years Grid - 3 per row with one Coming Soon card */}
// <div className="years-grid-compact">
//   {/* Real year cards with photos */}
//   {availableYears.slice(0, 5).map(year => (
//     <motion.div
//       key={year}
//       className="year-polaroid-card"
//       initial={{ opacity: 0, y: 30 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.4 }}
//       whileHover={{ 
//         y: -8,
//         transition: { duration: 0.2 }
//       }}
//       onClick={() => handleYearClick(year)}
//     >
//       <div className="polaroid-stack">
//         {photosByYear[year].slice(0, 3).map((photo, index) => (
//           <div 
//             key={photo.id}
//             className={`stack-polaroid stack-${index + 1}`}
//             style={{ 
//               backgroundImage: `url(${photo.url})`,
//               transform: `rotate(${index * 4 - 4}deg) translateY(${index * -3}px)`
//             }}
//           >
//             <div className="polaroid-bottom"></div>
//           </div>
//         ))}
        
//         {/* Year badge with photo count */}
//         <div className="stack-year-badge">
//           <span className="stack-year-number">{year}</span>
//           <span className="stack-photo-count">{photosByYear[year].length}</span>
//         </div>
//       </div>
//     </motion.div>
//   ))}

//   {/* ONE Coming Soon card - no year, just placeholder */}
//   <div className="year-polaroid-card coming-soon">
//     <div className="polaroid-stack">
//       <div className="stack-polaroid coming-soon-stack stack-1">
//         <div className="polaroid-bottom"></div>
//       </div>
//       <div className="stack-polaroid coming-soon-stack stack-2">
//         <div className="polaroid-bottom"></div>
//       </div>
//       <div className="stack-polaroid coming-soon-stack stack-3">
//         <div className="polaroid-bottom"></div>
//       </div>
      
//       {/* Coming Soon badge - NO YEAR, just text */}
//       <div className="stack-year-badge coming-soon-badge">
//         <span className="coming-soon-text">✨ coming soon</span>
//       </div>
//     </div>
//   </div>
// </div>
//           </motion.div>
//         </>
//       ) : (
//         /* Year Gallery View */
//         <div className="gallery-page">
//           <div className="gallery-content-overlay">
//             <button className="back-to-grid-btn" onClick={handleBackToHome}>
//               <span className="back-icon">←</span>
//             </button>

//             <div className="year-badge">
//               <span className="badge-year">{selectedYear}</span>
//               <span className="badge-count">{groupedByYear[selectedYear].length} photos</span>
//             </div>

//             <div className="polaroid-grid-container">
//               <div className="polaroid-grid">
//                 {groupedByYear[selectedYear].map((photo, index) => {
//                   const position = photoPositions[index] || { rotate: 0, x: 0, y: 0, scale: 1, zIndex: index };
                  
//                   return (
//                     <motion.div
//                       key={photo.id}
//                       className={`polaroid-card ${hoveredPhoto === photo.id ? 'hovered' : ''} ${selectedPhoto === photo.id ? 'selected' : ''}`}
//                       style={{
//                         rotate: `${position.rotate}deg`,
//                         x: position.x,
//                         y: position.y,
//                         scale: position.scale,
//                         zIndex: selectedPhoto === photo.id ? 1000 : hoveredPhoto === photo.id ? 200 : position.zIndex
//                       }}
//                       initial={{ opacity: 0, scale: 0.5 }}
//                       animate={{ 
//                         opacity: 1, 
//                         scale: position.scale,
//                         rotate: `${position.rotate}deg`,
//                         x: position.x,
//                         y: position.y
//                       }}
//                       transition={{ 
//                         duration: 0.5,
//                         delay: index * 0.03
//                       }}
//                       whileHover={{ 
//                         scale: 1.1,
//                         rotate: `${position.rotate - 2}deg`,
//                         y: position.y - 20,
//                         transition: { duration: 0.2 }
//                       }}
//                       onClick={() => setSelectedPhoto(photo.id)}
//                       onHoverStart={() => setHoveredPhoto(photo.id)}
//                       onHoverEnd={() => setHoveredPhoto(null)}
//                     >
//                       <div className="polaroid-photo">
//                         <img src={photo.url} alt={photo.title || 'Memory'} />
//                       </div>
//                       <div className="polaroid-footer">
//                         <span className="polaroid-date">
//                           {formatDate(photo.uploadedAt)}
//                         </span>
//                       </div>
//                     </motion.div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Photo Modal */}
//             <AnimatePresence>
//               {selectedPhoto && (
//                 <motion.div 
//                   className="polaroid-modal"
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   exit={{ opacity: 0 }}
//                   onClick={() => setSelectedPhoto(null)}
//                 >
//                   <motion.div 
//                     className="polaroid-modal-content"
//                     initial={{ scale: 0.8, y: 50 }}
//                     animate={{ scale: 1, y: 0 }}
//                     exit={{ scale: 0.8, y: 50 }}
//                     transition={{ type: "spring", damping: 20 }}
//                     onClick={e => e.stopPropagation()}
//                   >
//                     <button className="modal-close" onClick={() => setSelectedPhoto(null)}>×</button>
                    
//                     {groupedByYear[selectedYear].find(p => p.id === selectedPhoto) && (
//                       <>
//                         <div className="modal-photo">
//                           <img 
//                             src={groupedByYear[selectedYear].find(p => p.id === selectedPhoto).url} 
//                             alt={groupedByYear[selectedYear].find(p => p.id === selectedPhoto).title || 'Memory'} 
//                           />
//                         </div>
//                         <div className="modal-info">
//                           <p className="modal-date">
//                             {formatDate(groupedByYear[selectedYear].find(p => p.id === selectedPhoto).uploadedAt)}
//                           </p>
//                         </div>
//                       </>
//                     )}
//                   </motion.div>
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>
//         </div>
//       )}


//       {/* Timeline Card - Bottom Right */}
//       <motion.div 
//         className="timeline-card-compact"
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.8, delay: 0.6 }}
//       >
//         <div className="timeline-header-compact">
//           <span>Since {relationshipStart.toLocaleDateString('en-US', { 
//             month: 'short', 
//             year: 'numeric' 
//           })}</span>
//         </div>
//         <div className="timeline-grid-compact">
//           <div className="timeline-item-compact">
//             <span className="timeline-number">{timeTogether.years}</span>
//             <span className="timeline-unit">y</span>
//           </div>
//           <div className="timeline-item-compact">
//             <span className="timeline-number">{timeTogether.months}</span>
//             <span className="timeline-unit">m</span>
//           </div>
//           <div className="timeline-item-compact">
//             <span className="timeline-number">{timeTogether.days}</span>
//             <span className="timeline-unit">d</span>
//           </div>
//           <div className="timeline-item-compact">
//             <span className="timeline-number">{timeTogether.hours}</span>
//             <span className="timeline-unit">h</span>
//           </div>
//           <div className="timeline-item-compact">
//             <span className="timeline-number">{timeTogether.minutes}</span>
//             <span className="timeline-unit">min</span>
//           </div>
//           <div className="timeline-item-compact">
//             <span className="timeline-number seconds">{timeTogether.seconds}</span>
//             <span className="timeline-unit">s</span>
//           </div>
//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default HomePage;


import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
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
  
  // Hero section - disappears as you scroll down
  const heroBlur = useTransform(scrollYProgress, [0, 0.3], [0, 15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);

  // Folders section - appears as you scroll down
  const foldersBlur = useTransform(scrollYProgress, [0, 0.2], [10, 0]);
  const foldersOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const foldersY = useTransform(scrollYProgress, [0, 0.2], [150, -30]);

  const relationshipStart = new Date('2023-01-15T00:00:00');

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

  // Fetch all folders
const fetchFolders = async () => {
  try {
    setLoading(true);
    const response = await api.get('/folders');
    
    // For each folder, fetch a few sample photos
    const foldersWithSamples = await Promise.all(
      response.data.map(async (folder) => {
        try {
          const photosResponse = await api.get(`/folders/${folder.id}?limit=4`);
          return {
            ...folder,
            samplePhotos: photosResponse.data.photos?.map(p => p.url) || []
          };
        } catch (error) {
          return {
            ...folder,
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
              className="background-image slideshow-image"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{ 
                backgroundImage: `url(${homepagePhotos[currentPhotoIndex]?.url})`
              }}
            />
          ) : (
            <motion.div
              className="background-image slideshow-image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ 
                backgroundImage: `url(${process.env.PUBLIC_URL}/images/background.png)`
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
        whileHover={{ 
          y: -8,
          transition: { duration: 0.2 }
        }}
        onClick={() => {
          setClickedFolder(folder.id);
          // Navigate to folder after pop animation
          setTimeout(() => {
            handleFolderClick(folder.id);
            setClickedFolder(null);
          }, 300);
        }}
      >
        {/* Stack of Polaroid photos */}
        <div className="folder-polaroid-stack">
          {folder.samplePhotos && folder.samplePhotos.length > 0 ? (
            <>
              {folder.samplePhotos.slice(0, 4).map((photo, index) => (
                <div 
                  key={index}
                  className="stack-polaroid"
                  style={{ 
                    backgroundImage: `url(${photo})`,
                    zIndex: 4 - index
                  }}
                >
                  <div className="polaroid-bottom"></div>
                </div>
              ))}
            </>
          ) : (
            /* Placeholder if no photos */
            <>
              {[1,2,3,4].map((_, index) => (
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
        /* Folder Content View */
        <div className="gallery-page">
          <div className="gallery-content-overlay">
            <button className="back-to-grid-btn" onClick={handleBackToFolders}>
              <span className="back-icon">←</span>
            </button>

            <div className="folder-badge">
              <span className="badge-folder">{selectedFolder?.name}</span>
              <span className="badge-count">{folderPhotos.length} photos</span>
            </div>

            <div className="polaroid-grid-container">
              <div className="polaroid-grid">
                {folderPhotos.map((photo, index) => {
                  const position = photoPositions[index] || { rotate: 0, x: 0, y: 0, scale: 1, zIndex: index };
                  
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
                      onClick={() => setSelectedPhoto(photo.id)}
                      onHoverStart={() => setHoveredPhoto(photo.id)}
                      onHoverEnd={() => setHoveredPhoto(null)}
                    >
                      <div className="polaroid-photo">
                        <img src={photo.url} alt={photo.title || 'Memory'} />
                      </div>
                      <div className="polaroid-footer">
                        <span className="polaroid-date">
                          {formatDate(photo.uploadedAt)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

{/* Photo Modal */}
<AnimatePresence>
  {selectedPhoto && (
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
              {/* TITLE REMOVED - No more h3 element */}
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