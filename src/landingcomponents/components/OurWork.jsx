import React, { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, EffectCards } from "swiper/modules";
import { Autoplay } from "swiper/modules";
import "swiper/css/effect-cards";
import "swiper/css";
import "swiper/css/navigation";
import "./OurWork.css";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { clientsLogo } from "./OurWorkData";
import { clientReels } from "./OurWorkData";
import { clientPosts } from "./OurWorkData";

const OurWork = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef(null);

  // Handle video end - auto swipe to next
  const handleVideoEnd = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };

  // Handle slide change - only play current video
  const handleSlideChange = (swiper) => {
    const newIndex = swiper.realIndex;
    setCurrentIndex(newIndex);
    setIsMuted(true);
  };

  // Effect to control video playback - ensure only current video plays with audio
  useEffect(() => {
    // Get all videos in the swiper
    const allVideos = document.querySelectorAll(".ow-swiper-slide video");

    allVideos.forEach((video, index) => {
      if (index === currentIndex) {
        // This is the current video - play it with correct mute state
        video.muted = isMuted;
        video.currentTime = 0;
        video.play().catch((err) => console.log("Play error:", err));
      } else {
        // All other videos - pause and mute them completely
        video.pause();
        video.muted = true;
        video.currentTime = 0;
      }
    });
  }, [currentIndex, isMuted]);

  // Handle mute/unmute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Handle next slide
  const handleNext = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };

  // Handle previous slide
  const handlePrev = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
  };

  return (
    <section className="our-work-section">
      <div className="our-work-container">
        {/* Section Header */}
        <div className="ow-section-header">
          <span className="ow-badge">Our Success Stories</span>
          <h2>See Our Work in Action</h2>
          <p>
            Discover how CareDesk360 is transforming healthcare practices across
            India. Click on any clinic to see their growth journey.
          </p>
        </div>

        {/* Main Content - Reels with Posts Background */}
        <div className="ow-main-content-wrapper">
          {/* Posts Background - Three Rows */}
          {/* Centered Reels - Foreground */}
          <div className="ow-main-content">
            {/* Left Side - Reels Swiper */}
            <div className="ow-reels-container">
              <Swiper
                onSwiper={(swiper) => (swiperRef.current = swiper)}
                onSlideChange={handleSlideChange}
                modules={[Navigation, EffectCards]}
                effect="cards"
                grabCursor={true}
                cardsEffect={{
                  perSlideRotate: 3,
                  perSlideOffset: 10,
                }}
                className="ow-swiper"
              >
                {clientReels.map((client, index) => (
                  <SwiperSlide key={client.id} className="ow-swiper-slide">
                    <div className="ow-reel-wrapper">
                      {/* Video Player - Controlled by useEffect to avoid multiple audios */}
                      <video
                        onEnded={handleVideoEnd}
                        src={client.reel}
                        style={{ borderRadius: "20px", width: "100%" }}
                      />

                      {/* Video Controls Overlay */}
                      <div className="ow-video-overlay">
                        {/* Client Info - Top Left */}
                        <div className="ow-client-info">
                          <h3>{client.name}</h3>
                        </div>

                        {/* Video Counter - Top Right */}
                        <div className="ow-counter">
                          <span>{currentIndex + 1}</span>
                          <span>/</span>
                          <span>{clientReels.length}</span>
                        </div>

                        {/* Video Controls - Bottom Left - Only Mute/Unmute */}
                        <div className="ow-video-controls">
                          <button
                            className="ow-control-btn mute-btn"
                            onClick={toggleMute}
                            aria-label="Mute/Unmute"
                            title={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                          </button>
                        </div>

                        {/* Navigation Arrows - Right Side */}
                        <div className="ow-nav-arrows">
                          <button
                            className="ow-nav-btn"
                            onClick={handlePrev}
                            aria-label="Previous"
                            title="Previous"
                          >
                            <NorthIcon />
                          </button>
                          <button
                            className="ow-nav-btn"
                            onClick={handleNext}
                            aria-label="Next"
                            title="Next"

                          >
                            <SouthIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>

        {/* Post Section */}
        <div className="ow-post-sidebar">
          <h1>Our Posts</h1>
          <Swiper
            slidesPerView={5}
            spaceBetween={50}
            centeredSlides={true}
            loop={true}
            autoplay={{
              delay: 2000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              320: {
                slidesPerView: 3,
                spaceBetween: 15,
              },
              768: {
                slidesPerView: 5,
                spaceBetween: 20,
              },
              1200: {
                slidesPerView: 7,
                spaceBetween: 45,
              },
            }}
            modules={[Autoplay]}
            className="ow-post-swiper"
          >
            {clientPosts.map((client) => (
              <SwiperSlide key={client.id}>
                <div className="ow-post-image">
                  <img src={client.image} alt={client.title} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/*Client Logos */}
        <div className="ow-clients-sidebar">
          <h1>Our Clients</h1>
          <Swiper
            slidesPerView={5}
            spaceBetween={35}
            centeredSlides={true}
            loop={true}
            autoplay={{
              delay: 1000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              320: {
                slidesPerView: 3,
                spaceBetween: 15,
              },
              768: {
                slidesPerView: 5,
                spaceBetween: 20,
              },
              1200: {
                slidesPerView: 7,
                spaceBetween: 25,
              },
            }}
            modules={[Autoplay]}
            className="ow-logo-swiper"
          >
            {clientsLogo.map((client) => (
              <SwiperSlide key={client.id}>
                <div className="ow-logo-image">
                  <img src={client.logo} alt={client.name} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default OurWork;
