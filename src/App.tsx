import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeFeed } from './components/HomeFeed';
import { ReelsFeed } from './components/ReelsFeed';
import { LiveRoomsView } from './components/LiveRoomsView';
import { DirectMessagesView } from './components/DirectMessagesView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { CameraView } from './components/CameraView';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { AIChatAssistant } from './components/AIChatAssistant';
import { SplashScreen } from './components/SplashScreen';
import { StoryViewer } from './components/StoryViewer';
import { ActiveLiveRoom } from './components/ActiveLiveRoom';
import { AuthModal } from './components/AuthModal';
import { CreatePostModal } from './components/CreatePostModal';
import { NotificationToast } from './components/NotificationToast';
import { CallOverlay } from './components/CallOverlay';
import { IncomingCallDialog } from './components/IncomingCallDialog';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { UserSearchModal } from './components/UserSearchModal';
import { CoinsRewardModal } from './components/CoinsRewardModal';
import { CoinRewardBanner } from './components/CoinRewardBanner';
import { PaymentWalletModal } from './components/PaymentWalletModal';

const MainAppContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    isMobilePreviewFrame,
    activeCall,
    incomingCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleCallMute,
    toggleCallVideo,
    flipCallCamera,
    toggleSpeaker,
    setCallVoiceEffect,
    isUserSearchOpen,
    closeUserSearchModal,
    isCoinsRewardModalOpen,
    closeCoinsRewardModal,
    isPaymentWalletOpen,
    closePaymentWallet,
    walletInitialTab,
    activeConversation,
  } = useApp();
  const { isAuthenticated, user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const isChatRoomOpen = Boolean(activeConversation) && (activeTab === 'dms' || activeTab === 'messages');

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeFeed />;
      case 'reels':
        return <ReelsFeed />;
      case 'live':
        return <LiveRoomsView />;
      case 'dms':
      case 'messages':
        return <DirectMessagesView />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return <ProfileView />;
      case 'camera':
        return <CameraView />;
      case 'settings':
        return <SettingsView onReplaySplash={() => setShowSplash(true)} />;
      case 'auth':
        return <AuthView />;
      case 'ai_chat':
        return <AIChatAssistant onBack={() => setActiveTab('dms')} />;
      default:
        return <HomeFeed />;
    }
  };

  return (
    <div className={`min-h-screen h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start relative selection:bg-fuchsia-500 selection:text-white ${isMobilePreviewFrame ? 'p-2 sm:p-6 bg-slate-950' : ''}`}>
      {/* 5-Second Glowing Pulse Heart Splash Screen */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Background ambient lighting effects for Vibrant Palette */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Mobile Device Shell */}
      <div 
        className={`w-full ${
          isMobilePreviewFrame 
            ? 'max-w-[430px] h-[92vh] max-h-[890px] rounded-[44px] border-[5px] border-slate-800 shadow-2xl shadow-fuchsia-950/20 overflow-hidden relative flex flex-col bg-slate-950 ring-1 ring-white/10' 
            : 'max-w-2xl h-full min-h-screen sm:h-[100dvh] relative flex flex-col bg-slate-950 shadow-2xl border-x border-slate-900/60 overflow-hidden'
        }`}
      >
        {/* Dynamic Island Pill for Mockup Frame */}
        {isMobilePreviewFrame && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-full z-40 flex items-center justify-between px-3 border border-white/5 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <span className="w-2 h-2 rounded-full bg-indigo-950 border border-indigo-500/40" />
          </div>
        )}

        {/* Global Toast Notification */}
        <NotificationToast />

        {/* Top Header (hidden during active 1-on-1 chat room for immersive full-screen messaging) */}
        {!isChatRoomOpen && <Header />}

        {/* Main Body View */}
        <main className={`flex-1 ${isChatRoomOpen ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overscroll-contain'} relative no-scrollbar`}>
          {renderActiveView()}
        </main>

        {/* Bottom Navigation Dock (hidden during chat room and camera view for immersive full-screen experience) */}
        {!isChatRoomOpen && activeTab !== 'camera' && <BottomNav />}

        {/* Full-screen Overlays */}
        <StoryViewer />
        <ActiveLiveRoom />
        <CreatePostModal />
        <AuthModal />

        {/* Real-time WebRTC Calling Overlays */}
        {activeCall && (
          <CallOverlay 
            session={activeCall}
            onEndCall={endCall}
            onToggleMute={toggleCallMute}
            onToggleVideo={toggleCallVideo}
            onFlipCamera={flipCallCamera}
            onToggleSpeaker={toggleSpeaker}
            onSetVoiceEffect={setCallVoiceEffect}
          />
        )}

        {incomingCall && (
          <IncomingCallDialog 
            session={incomingCall}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}

        {/* Dynamic PWA Add to Home Screen Banner */}
        <PWAInstallBanner />

        {/* Global User Search & Friend Requests Modal */}
        <UserSearchModal 
          isOpen={isUserSearchOpen} 
          onClose={closeUserSearchModal} 
        />

        {/* Floating Top Coin Reward Banner */}
        <CoinRewardBanner />

        {/* Global Fake Coins & Rewards Wallet Hub Modal */}
        <CoinsRewardModal 
          isOpen={isCoinsRewardModalOpen} 
          onClose={closeCoinsRewardModal} 
        />

        {/* Global Payment & Payouts Wallet Modal (JazzCash, Easypaisa, PayPal, Skrill) */}
        <PaymentWalletModal
          isOpen={isPaymentWalletOpen}
          onClose={closePaymentWallet}
          initialTab={walletInitialTab}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </AuthProvider>
  );
}
