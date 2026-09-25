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
      case 'home': return <HomeFeed />;
      case 'reels': return <ReelsFeed />;
      case 'live': return <LiveRoomsView />;
      case 'dms':
      case 'messages': return <DirectMessagesView />;
      case 'notifications': return <NotificationsView />;
      case 'profile': return <ProfileView />;
      case 'camera': return <CameraView />;
      case 'settings': return <SettingsView onReplaySplash={() => setShowSplash(true)} />;
      case 'auth': return <AuthView />;
      case 'ai_chat': return <AIChatAssistant onBack={() => setActiveTab('dms')} />;
      default: return <HomeFeed />;
    }
  };

  return (
    <div className="min-h-screen h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col relative selection:bg-fuchsia-500 selection:text-white overflow-hidden">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* --- YAHAN FIX KIYA HAI - AB FULL SCREEN MOBILE APP --- */}
      <div className={`w-full h-full flex flex-col bg-slate-950 overflow-hidden relative ${
          isMobilePreviewFrame
           ? 'max-w-[430px] h-[92vh] max-h-[890px] rounded-[44px] border-[5px] border-slate-800 shadow-2xl mx-auto my-auto'
            : 'max-w-full'
        }`}>

        {isMobilePreviewFrame && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-full z-40 flex items-center justify-between px-3 border border-white/5 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <span className="w-2 h-2 rounded-full bg-indigo-950 border border-indigo-500/40" />
          </div>
        )}

        <NotificationToast />
        {!isChatRoomOpen && <Header />}
        <main className={`flex-1 ${isChatRoomOpen? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overscroll-contain'} relative no-scrollbar`}>
          {renderActiveView()}
        </main>
        {!isChatRoomOpen && activeTab!== 'camera' && <BottomNav />}

        <StoryViewer />
        <ActiveLiveRoom />
        <CreatePostModal />
        <AuthModal />

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

        <PWAInstallBanner />
        <UserSearchModal isOpen={isUserSearchOpen} onClose={closeUserSearchModal} />
        <CoinRewardBanner />
        <CoinsRewardModal isOpen={isCoinsRewardModalOpen} onClose={closeCoinsRewardModal} />
        <PaymentWalletModal isOpen={isPaymentWalletOpen} onClose={closePaymentWallet} initialTab={walletInitialTab} />
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
