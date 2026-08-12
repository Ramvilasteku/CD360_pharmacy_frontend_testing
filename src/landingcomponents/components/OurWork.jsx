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
import {
  clientsLogo,
  clientReels,
  clientPosts,
  onlyActive,
} from "./OurWorkData";

/* =========================================================
   YOUTUBE IFRAME API — loaded once, shared by every player
========================================================= */

let ytApiPromise = null;

const loadYouTubeApi = () => {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });

  return ytApiPromise;
};

/* shorts/ID | youtu.be/ID | watch?v=ID | embed/ID */
const getYouTubeId = (url = "") => {
  const match = url.match(
    /(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
};

/* =========================================================
   ONE REEL — renders an <video> or a YouTube player.
   Only the active slide plays; everything else is paused
   and muted so two audio tracks can never overlap.
========================================================= */

const ReelPlayer = ({ client, isActive, isMuted, onEnded }) => {
  const isYouTube = client.type === "youtube";

  /* ---------- mp4 ---------- */
  const videoRef = useRef(null);

  useEffect(() => {
    if (isYouTube) return;

    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.muted = isMuted;
      el.play().catch(() => {});
    } else {
      el.pause();
      el.muted = true;
      el.currentTime = 0;
    }
  }, [isActive, isMuted, isYouTube]);

  /* ---------- youtube ---------- */
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);

  const videoId = isYouTube ? getYouTubeId(client.reel) : null;

  useEffect(() => {
    if (!isYouTube || !videoId) return;

    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;

      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) onEnded?.();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch (_) {
        /* player already gone */
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!isYouTube || !ready || !player) return;

    if (isActive) {
      if (isMuted) player.mute();
      else player.unMute();
      player.seekTo(0);
      player.playVideo();
    } else {
      player.mute();
      player.pauseVideo();
      player.seekTo(0);
    }
  }, [isActive, isMuted, ready, isYouTube]);

  /* ---------- render ---------- */

  if (isYouTube) {
    if (!videoId) {
      return <div className="ow-reel-error">Invalid video link</div>;
    }

    return (
      <div className="ow-yt-frame">
        <div ref={hostRef} />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={client.reel}
      playsInline
      preload="metadata"
      onEnded={onEnded}
      style={{ borderRadius: "20px", width: "100%" }}
    />
  );
};

/* =========================================================
   OUR WORK
========================================================= */

const OurWork = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef(null);

  // Auto-advance when a reel finishes
  const handleVideoEnd = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };

  // Each ReelPlayer reacts to isActive/isMuted itself
  const handleSlideChange = (swiper) => {
    setCurrentIndex(swiper.realIndex);
    setIsMuted(true);
  };

  const toggleMute = () => setIsMuted((prev) => !prev);

  const handleNext = () => swiperRef.current?.slideNext();
  const handlePrev = () => swiperRef.current?.slidePrev();

  const activeReels = React.useMemo(() => onlyActive(clientReels), []);
  const activePosts = React.useMemo(() => onlyActive(clientPosts), []);
  const activeLogos = React.useMemo(() => onlyActive(clientsLogo), []);

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

        {/* Main Content - Reels */}
        <div className="ow-main-content-wrapper">
          <div className="ow-main-content">
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
                {activeReels.map((client, index) => (
                  <SwiperSlide key={client.id} className="ow-swiper-slide">
                    <div className="ow-reel-wrapper">
                      <ReelPlayer
                        client={client}
                        isActive={index === currentIndex}
                        isMuted={isMuted}
                        onEnded={handleVideoEnd}
                      />

                      {/* Controls Overlay */}
                      <div className="ow-video-overlay">
                        {/* Client Info - Top Left */}
                        <div className="ow-client-info">
                          <h3>{client.name}</h3>
                        </div>

                        {/* Counter */}
                        <div className="ow-counter">
                          <span>{currentIndex + 1}</span>
                          <span>/</span>
                          <span>{activeReels.length}</span>
                        </div>

                        {/* Mute / Unmute */}
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

                        {/* Navigation Arrows */}
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
            slidesPerView={4}
            spaceBetween={50}
            centeredSlides={true}
            loop={true}
            autoplay={{
              delay: 2000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              320: { slidesPerView: 2, spaceBetween: 30 },
              768: { slidesPerView: 5, spaceBetween: 20 },
              1200: { slidesPerView: 7, spaceBetween: 45 },
            }}
            modules={[Autoplay]}
            className="ow-post-swiper"
          >
            {activePosts.map((client) => (
              <SwiperSlide key={client.id}>
                <div className="ow-post-image">
                  <img src={client.image} alt={client.title} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Client Logos */}
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
              320: { slidesPerView: 2, spaceBetween: 30 },
              768: { slidesPerView: 5, spaceBetween: 20 },
              1200: { slidesPerView: 7, spaceBetween: 25 },
            }}
            modules={[Autoplay]}
            className="ow-logo-swiper"
          >
            {activeLogos.map((client) => (
              <SwiperSlide key={client.id}>
                <div className="ow-logo-image">
                  <img src={client.logo} alt={client.name} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      <div className="gmb-instagram-links">
        <iframe
          title="Google Reviews"
          src="https://widgets.sociablekit.com/google-reviews/iframe/25687238"
          frameBorder="0"
          width="100%"
          height="550px"
        ></iframe>

        <iframe
          title="Instagram Reels"
          src="https://widgets.sociablekit.com/instagram-reels/iframe/25687241"
          frameBorder="0"
          width="100%"
          height="1000px"
        ></iframe>
      </div>
    </section>
  );
};

export default OurWork;
