import React from 'react';
import './growthQuest.css';
import { QuestProvider, useQuest } from './context/QuestContext';
import { Hud, Toasts, LevelUp, Confetti } from './components/Overlays';
import { Nav, Hero } from './components/Top';
import Quiz from './components/Quiz';
import {
  Outcomes, Platform, Team, Why, Comparison, Reach, Founder, Faq, Trust, Footer,
} from './components/Sections';
import SpinOffer from './components/SpinOffer';
import BookingForm from './components/BookingForm';
import { ShareModal, LeaderboardModal, SpinFab } from './components/Modals';

function Page() {
  const { confettiRef } = useQuest();
  return (
    <div className="ccgs-root">
      <Hud />
      <Toasts />
      <LevelUp />
      <Confetti ref={confettiRef} />

      <Nav />
      <Hero />
      <Quiz />
      <Outcomes />
      <Platform />
      <Team />
      <Why />
      <Comparison />
      <Reach />
      <SpinOffer />
      <Founder />
      <BookingForm />
      <Faq />
      <Trust />
      <Footer />

      <ShareModal />
      <LeaderboardModal />
      <SpinFab />
    </div>
  );
}

/* Usage:  <Route path="/growth-quest" element={<GrowthQuest />} />  */
export default function GrowthQuest() {
  return (
    <QuestProvider>
      <Page />
    </QuestProvider>
  );
}
