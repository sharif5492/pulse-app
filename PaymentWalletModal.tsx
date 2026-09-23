import React, { useState, useEffect } from 'react';
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, 
  AlertCircle, ShieldCheck, Copy, Check, ChevronRight, X, 
  CreditCard, Sparkles, Zap, DollarSign, RefreshCw, Send, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PaymentMethodType, WalletTransaction, WalletPackage } from '../types';
import { audioUtils } from '../lib/audioUtils';
import confetti from 'canvas-confetti';

interface PaymentWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'purchase' | 'withdraw' | 'history';
}

const COIN_PACKAGES: WalletPackage[] = [
  {
    id: 'pkg_starter',
    name: 'Starter Pack',
    coins: 500,
    pricePkr: 140,
    priceUsd: 0.50,
  },
  {
    id: 'pkg_popular',
    name: 'Popular Pack',
    coins: 1200,
    bonusCoins: 200,
    pricePkr: 280,
    priceUsd: 1.00,
    popular: true,
    badge: '🔥 POPULAR (+200 BONUS)',
  },
  {
    id: 'pkg_value',
    name: 'Pro Creator',
    coins: 3500,
    bonusCoins: 500,
    pricePkr: 700,
    priceUsd: 2.50,
    badge: '⭐ BEST VALUE',
  },
  {
    id: 'pkg_master',
    name: 'Master Streamer',
    coins: 7500,
    bonusCoins: 1500,
    pricePkr: 1400,
    priceUsd: 5.00,
    badge: '🚀 +20% EXTRA',
  },
  {
    id: 'pkg_vip',
    name: 'VIP Elite',
    coins: 16000,
    bonusCoins: 4000,
    pricePkr: 2800,
    priceUsd: 10.00,
    badge: '💎 VIP BADGE',
  },
  {
    id: 'pkg_whale',
    name: 'Mega Whaler',
    coins: 45000,
    bonusCoins: 15000,
    pricePkr: 7000,
    priceUsd: 25.00,
    badge: '👑 60,000 TOTAL',
  },
];

interface MethodConfig {
  id: PaymentMethodType;
  name: string;
  tagline: string;
  currency: 'PKR' | 'USD';
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  brandColor: string;
  brandGradient: string;
  iconText: string;
  inputPlaceholder: string;
  inputLabel: string;
  accountTypeLabel: string;
}

const PAYMENT_METHODS: MethodConfig[] = [
  {
    id: 'jazzcash',
    name: 'JazzCash',
    tagline: 'Pakistan #1 Mobile Account',
    currency: 'PKR',
    badgeBg: 'bg-red-500/15',
    badgeBorder: 'border-red-500/40',
    badgeText: 'text-red-400',
    brandColor: '#E2001A',
    brandGradient: 'from-red-600 via-rose-600 to-amber-600',
    iconText: 'JC',
    inputPlaceholder: '03001234567 (11 digits)',
    inputLabel: 'JazzCash Mobile Account Number',
    accountTypeLabel: 'JazzCash Account Title',
  },
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    tagline: 'Instant Mobile Wallet',
    currency: 'PKR',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-400',
    brandColor: '#00A859',
    brandGradient: 'from-emerald-600 via-teal-600 to-green-600',
    iconText: 'EP',
    inputPlaceholder: '03451234567 (11 digits)',
    inputLabel: 'Easypaisa Mobile Number',
    accountTypeLabel: 'Easypaisa Account Title',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    tagline: 'Global Fast Checkout',
    currency: 'USD',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/40',
    badgeText: 'text-blue-400',
    brandColor: '#0079C1',
    brandGradient: 'from-blue-600 via-sky-600 to-indigo-600',
    iconText: 'PP',
    inputPlaceholder: 'your-email@paypal.com',
    inputLabel: 'PayPal Account Email Address',
    accountTypeLabel: 'PayPal Account Holder Name',
  },
  {
    id: 'skrill',
    name: 'Skrill',
    tagline: 'Worldwide Digital Wallet',
    currency: 'USD',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/40',
    badgeText: 'text-purple-400',
    brandColor: '#811345',
    brandGradient: 'from-purple-700 via-fuchsia-700 to-pink-600',
    iconText: 'SK',
    inputPlaceholder: 'your-email@skrill.com',
    inputLabel: 'Skrill Registered Email Address',
    accountTypeLabel: 'Skrill Account Holder Name',
  },
];

export const PaymentWalletModal: React.FC<PaymentWalletModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'purchase'
}) => {
  const { 
    pulseCoins, 
    walletTransactions, 
    purchaseCoinsWithPayment, 
    withdrawCoinsToPayment, 
    user 
  } = useAuth();
  const { walletInitialTab } = useApp();

  const [activeTab, setActiveTab] = useState<'purchase' | 'withdraw' | 'history'>('purchase');
  
  // Purchase states
  const [selectedPackage, setSelectedPackage] = useState<WalletPackage>(COIN_PACKAGES[1]);
  const [purchaseMethod, setPurchaseMethod] = useState<PaymentMethodType>('jazzcash');
  const [purchaseAccountDetails, setPurchaseAccountDetails] = useState('');
  const [purchaseAccountTitle, setPurchaseAccountTitle] = useState(user?.name || '');
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseSuccessReceipt, setPurchaseSuccessReceipt] = useState<WalletTransaction | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Withdrawal states
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethodType>('jazzcash');
  const [withdrawCoinsAmount, setWithdrawCoinsAmount] = useState<number>(1000);
  const [withdrawAccountDetails, setWithdrawAccountDetails] = useState('');
  const [withdrawAccountTitle, setWithdrawAccountTitle] = useState(user?.name || '');
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  const [withdrawalSuccessReceipt, setWithdrawalSuccessReceipt] = useState<WalletTransaction | null>(null);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  // History states
  const [historyFilter, setHistoryFilter] = useState<'all' | 'purchase' | 'withdrawal'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewReceiptTxn, setViewReceiptTxn] = useState<WalletTransaction | null>(null);

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(walletInitialTab || initialTab || 'purchase');
      setPurchaseError(null);
      setWithdrawalError(null);
      setPurchaseSuccessReceipt(null);
      setWithdrawalSuccessReceipt(null);
      if (user?.name) {
        setPurchaseAccountTitle(user.name);
        setWithdrawAccountTitle(user.name);
      }
    }
  }, [isOpen, walletInitialTab, initialTab, user]);

  if (!isOpen) return null;

  // Real-time calculation helpers (1,000 Coins = Rs. 280 PKR = $1.00 USD)
  const currentPkrValue = Math.round((pulseCoins / 1000) * 280);
  const currentUsdValue = ((pulseCoins / 1000) * 1.00).toFixed(2);

  const selectedPurchaseMethodConfig = PAYMENT_METHODS.find(m => m.id === purchaseMethod) || PAYMENT_METHODS[0];
  const selectedWithdrawMethodConfig = PAYMENT_METHODS.find(m => m.id === withdrawMethod) || PAYMENT_METHODS[0];

  const withdrawPkrValue = Math.round((withdrawCoinsAmount / 1000) * 280);
  const withdrawUsdValue = ((withdrawCoinsAmount / 1000) * 1.00).toFixed(2);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    audioUtils.playPop();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit Purchase
  const handleExecutePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseError(null);

    if (!purchaseAccountDetails.trim()) {
      setPurchaseError(`Please enter your valid ${selectedPurchaseMethodConfig.name} account details.`);
      return;
    }

    setIsProcessingPurchase(true);
    audioUtils.playPop();

    // Total coins including bonus
    const totalCoins = selectedPackage.coins + (selectedPackage.bonusCoins || 0);
    const fiatAmount = selectedPurchaseMethodConfig.currency === 'PKR' ? selectedPackage.pricePkr : selectedPackage.priceUsd;

    try {
      // Simulate realistic payment gateway processing
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const res = await purchaseCoinsWithPayment(
        totalCoins,
        fiatAmount,
        selectedPurchaseMethodConfig.currency,
        purchaseMethod,
        purchaseAccountDetails.trim(),
        purchaseAccountTitle.trim() || user?.name || 'Pulse Member'
      );

      setIsProcessingPurchase(false);
      if (res.success) {
        setPurchaseSuccessReceipt(res.transaction);
        try {
          confetti({
            particleCount: 75,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#eab308', '#22c55e', '#3b82f6', '#ec4899'],
          });
        } catch (e) {}
      }
    } catch (err: any) {
      setIsProcessingPurchase(false);
      setPurchaseError(err.message || 'Payment processing failed. Please try again.');
    }
  };

  // Submit Withdrawal
  const handleExecuteWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalError(null);

    if (withdrawCoinsAmount < 1000) {
      setWithdrawalError('Kam az kam 1,000 Coins (Rs. 280 / $1.00) ka withdrawal zaroori hai.');
      return;
    }

    if (pulseCoins < withdrawCoinsAmount) {
      setWithdrawalError(`Aapke paas sirf ${pulseCoins.toLocaleString()} coins mojood hain.`);
      return;
    }

    if (!withdrawAccountDetails.trim()) {
      setWithdrawalError(`Please enter your valid ${selectedWithdrawMethodConfig.name} account details.`);
      return;
    }

    setIsProcessingWithdrawal(true);
    audioUtils.playPop();

    const fiatAmount = selectedWithdrawMethodConfig.currency === 'PKR' ? withdrawPkrValue : parseFloat(withdrawUsdValue);

    try {
      // Simulate secure payout gateway transfer
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await withdrawCoinsToPayment(
        withdrawCoinsAmount,
        fiatAmount,
        selectedWithdrawMethodConfig.currency,
        withdrawMethod,
        withdrawAccountDetails.trim(),
        withdrawAccountTitle.trim() || user?.name || 'Pulse Member'
      );

      setIsProcessingWithdrawal(false);
      if (res.success && res.transaction) {
        setWithdrawalSuccessReceipt(res.transaction);
        try {
          confetti({
            particleCount: 65,
            spread: 70,
            origin: { y: 0.5 },
            colors: ['#22c55e', '#10b981', '#fbbf24'],
          });
        } catch (e) {}
      } else {
        setWithdrawalError(res.error || 'Withdrawal request failed.');
      }
    } catch (err: any) {
      setIsProcessingWithdrawal(false);
      setWithdrawalError(err.message || 'Withdrawal processing error.');
    }
  };

  const filteredTransactions = walletTransactions.filter(txn => {
    if (historyFilter === 'all') return true;
    return txn.type === historyFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[94vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Ambient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-emerald-500 to-blue-500" />

        {/* Header Section */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Wallet className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  Payment Wallet & Payouts
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Upcoming Update
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span>JazzCash</span> • <span>Easypaisa</span> • <span>PayPal</span> • <span>Skrill</span>
                <span className="text-amber-400 font-semibold">• upcoming update purchase and withdrawal</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioUtils.playPop();
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Wallet Balance Overview Card */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80">
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 relative overflow-hidden shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Available Wallet Balance
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {pulseCoins.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-amber-400">🪙 Coins</span>
                </div>
              </div>

              {/* Conversion Values Display */}
              <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="px-2.5 py-1 text-center border-r border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">PKR Value</div>
                  <div className="text-sm font-black text-white">Rs. {currentPkrValue.toLocaleString()}</div>
                </div>
                <div className="px-2.5 py-1 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-400">USD Value</div>
                  <div className="text-sm font-black text-white">${currentUsdValue}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Secured 256-bit Encryption
              </span>
              <span className="text-amber-400/90 font-medium">Rate: 1,000 Coins = Rs. 280 / $1.00</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 p-2 bg-slate-950 border-b border-slate-800">
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('purchase');
              setPurchaseSuccessReceipt(null);
            }}
            className={`py-2 px-2 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'purchase'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-300" />
            <span>Buy Coins (Upcoming)</span>
          </button>

          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('withdraw');
              setWithdrawalSuccessReceipt(null);
            }}
            className={`py-2 px-2 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-slate-950" />
            <span>Withdraw (Upcoming)</span>
          </button>

          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('history');
            }}
            className={`py-2 px-2 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>History ({walletTransactions.length})</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar">

          {/* ========================================================================= */}
          {/* TAB 1: PURCHASE / DEPOSIT COINS                                          */}
          {/* ========================================================================= */}
          {activeTab === 'purchase' && (
            <>
              {purchaseSuccessReceipt ? (
                /* Success Receipt View */
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Payment Successful!</h3>
                    <p className="text-xs text-emerald-300/90 mt-0.5">
                      +{purchaseSuccessReceipt.coins.toLocaleString()} Coins aapke wallet mein add ho gaye hain!
                    </p>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-3 text-left space-y-2 text-xs border border-slate-800">
                    <div className="flex justify-between text-slate-400">
                      <span>Reference ID:</span>
                      <span className="text-white font-mono font-bold flex items-center gap-1">
                        {purchaseSuccessReceipt.referenceId}
                        <button 
                          onClick={() => handleCopy(purchaseSuccessReceipt.referenceId, 'rcpt_p')}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          {copiedId === 'rcpt_p' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Method:</span>
                      <span className="text-white font-bold uppercase">{purchaseSuccessReceipt.method}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Amount Paid:</span>
                      <span className="text-emerald-400 font-bold">
                        {purchaseSuccessReceipt.currency === 'PKR' ? `Rs. ${purchaseSuccessReceipt.fiatAmount}` : `$${purchaseSuccessReceipt.fiatAmount}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-bold">Completed & Verified</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPurchaseSuccessReceipt(null);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all"
                  >
                    Done (Explore Reels & Gifts)
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecutePurchase} className="space-y-4">
                  {/* Step 1: Select Coin Package */}
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>1. Select Coin Package</span>
                      <span className="text-[11px] text-amber-400 font-bold">
                        1,000 Coins = Rs. 280 / $1.00
                      </span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {COIN_PACKAGES.map((pkg) => {
                        const isSelected = selectedPackage.id === pkg.id;
                        const totalCoins = pkg.coins + (pkg.bonusCoins || 0);

                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => {
                              audioUtils.playPop();
                              setSelectedPackage(pkg);
                            }}
                            className={`p-3 rounded-2xl border text-left relative transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10 ring-1 ring-amber-400'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {pkg.badge && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1.5 w-fit">
                                {pkg.badge}
                              </span>
                            )}
                            <div>
                              <div className="text-base sm:text-lg font-black text-white flex items-center gap-1">
                                <span>{totalCoins.toLocaleString()}</span>
                                <span className="text-xs text-amber-400">🪙</span>
                              </div>
                              {pkg.bonusCoins && (
                                <div className="text-[10px] text-emerald-400 font-bold">
                                  Includes +{pkg.bonusCoins} Bonus!
                                </div>
                              )}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                              <span className="text-xs font-black text-slate-300">
                                Rs. {pkg.pricePkr}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                (${pkg.priceUsd})
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Select Payment Method */}
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                      2. Choose Payment Method
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const isSelected = purchaseMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              audioUtils.playPop();
                              setPurchaseMethod(m.id);
                              setPurchaseError(null);
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? `bg-slate-950 border-amber-400 shadow-sm ring-1 ring-amber-400/80`
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${m.brandGradient} flex items-center justify-center font-black text-white text-xs shadow-md shrink-0`}>
                              {m.iconText}
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-black text-white truncate flex items-center gap-1">
                                <span>{m.name}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${m.badgeBg} ${m.badgeText}`}>
                                  {m.currency}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{m.tagline}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Notice directly below payment methods as requested */}
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-amber-200 shadow-inner">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                          upcoming update purchase and withdrawal
                        </p>
                        <p className="text-[11px] text-amber-100/80 leading-relaxed">
                          JazzCash, Easypaisa, PayPal aur Skrill payment methods preserve hain. Filhal testing k doran kisi ko ghalat mehsos na ho, is liye purchase option disable rakha gaya hai. Aglay official update me activate hoga.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Account Details Input */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 opacity-90">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">
                        {selectedPurchaseMethodConfig.inputLabel}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Upcoming Update
                      </span>
                    </div>

                    <input
                      type="text"
                      disabled={true}
                      value={purchaseAccountDetails}
                      onChange={(e) => setPurchaseAccountDetails(e.target.value)}
                      placeholder={`${selectedPurchaseMethodConfig.name} - upcoming update purchase and withdrawal`}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 placeholder-slate-500 text-sm focus:outline-none cursor-not-allowed"
                    />

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        {selectedPurchaseMethodConfig.accountTypeLabel}
                      </label>
                      <input
                        type="text"
                        disabled={true}
                        value={purchaseAccountTitle}
                        onChange={(e) => setPurchaseAccountTitle(e.target.value)}
                        placeholder="Account Title"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 placeholder-slate-500 text-xs focus:outline-none cursor-not-allowed"
                      />
                    </div>

                    <p className="text-[10px] text-amber-300/80 leading-relaxed flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>upcoming update purchase and withdrawal • Payment method is preserved for upcoming update.</span>
                    </p>
                  </div>

                  {/* Summary & Submit Action (Disabled with requested text) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={true}
                      className="w-full py-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-inner"
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>upcoming update purchase and withdrawal</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-500 mt-2">
                      Payment method filhal disable rakha gaya hai ta k kisi ko ghalat mehsos na ho. Upcoming update me purchase and withdrawal shuru ho jayenge.
                    </p>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: WITHDRAW CASH                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'withdraw' && (
            <>
              {withdrawalSuccessReceipt ? (
                /* Withdrawal Success Receipt */
                <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-center space-y-4 animate-in zoom-in-95">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Withdrawal Successful!</h3>
                    <p className="text-xs text-amber-300/90 mt-0.5">
                      Aapki payout request successfully process ho gayi hai!
                    </p>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-3 text-left space-y-2 text-xs border border-slate-800">
                    <div className="flex justify-between text-slate-400">
                      <span>Tracking / Ref ID:</span>
                      <span className="text-white font-mono font-bold flex items-center gap-1">
                        {withdrawalSuccessReceipt.referenceId}
                        <button 
                          onClick={() => handleCopy(withdrawalSuccessReceipt.referenceId, 'rcpt_w')}
                          className="text-amber-400 hover:text-amber-300"
                        >
                          {copiedId === 'rcpt_w' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Method:</span>
                      <span className="text-white font-bold uppercase">{withdrawalSuccessReceipt.method}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Account Details:</span>
                      <span className="text-white font-medium">{withdrawalSuccessReceipt.accountDetails}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Coins Redeemed:</span>
                      <span className="text-red-400 font-bold">-{withdrawalSuccessReceipt.coins.toLocaleString()} 🪙</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Payout Amount:</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {withdrawalSuccessReceipt.currency === 'PKR' ? `Rs. ${withdrawalSuccessReceipt.fiatAmount}` : `$${withdrawalSuccessReceipt.fiatAmount}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-bold">Transferred / Completed</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setWithdrawalSuccessReceipt(null);
                      setActiveTab('history');
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all"
                  >
                    View in Transaction History
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecuteWithdrawal} className="space-y-4">
                  {/* Step 1: Select Withdrawal Payout Method */}
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                      1. Select Payout Method
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const isSelected = withdrawMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              audioUtils.playPop();
                              setWithdrawMethod(m.id);
                              setWithdrawalError(null);
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? `bg-slate-950 border-amber-400 shadow-sm ring-1 ring-amber-400/80`
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${m.brandGradient} flex items-center justify-center font-black text-white text-xs shadow-md shrink-0`}>
                              {m.iconText}
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-black text-white truncate flex items-center gap-1">
                                <span>{m.name}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${m.badgeBg} ${m.badgeText}`}>
                                  {m.currency}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{m.tagline}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Notice directly below payout methods as requested */}
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-amber-200 shadow-inner">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                          upcoming update purchase and withdrawal
                        </p>
                        <p className="text-[11px] text-amber-100/80 leading-relaxed">
                          JazzCash, Easypaisa, PayPal aur Skrill payout methods preserve hain. Filhal testing k doran kisi ko ghalat mehsos na ho, is liye withdrawal option disable rakha gaya hai. Aglay official update me activate hoga.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Coin Amount to Withdraw */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 opacity-90">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">2. Coins to Cash Out</span>
                      <span className="text-[11px] text-amber-400 font-bold">
                        Min: 1,000 Coins (Rs. 280 / $1.00)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        disabled={true}
                        min="1000"
                        step="100"
                        value={withdrawCoinsAmount}
                        onChange={(e) => setWithdrawCoinsAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 font-black text-lg focus:outline-none cursor-not-allowed"
                      />
                      <span className="text-sm font-black text-amber-400 shrink-0">🪙 Coins</span>
                    </div>

                    {/* Live Payout Conversion Card */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Redeeming:</span>
                        <span className="text-white font-bold">{withdrawCoinsAmount.toLocaleString()} Coins</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Gateway Fee (0% Promo):</span>
                        <span className="text-emerald-400 font-bold">FREE</span>
                      </div>
                      <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-800 text-sm font-black">
                        <span>Equivalent Payout Value:</span>
                        <span className="text-emerald-400">
                          {selectedWithdrawMethodConfig.currency === 'PKR' ? `Rs. ${withdrawPkrValue.toLocaleString()} PKR` : `$${withdrawUsdValue} USD`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Account Information */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 opacity-90">
                    <label className="block text-xs font-bold text-slate-300">
                      {selectedWithdrawMethodConfig.inputLabel}
                    </label>
                    <input
                      type="text"
                      disabled={true}
                      value={withdrawAccountDetails}
                      onChange={(e) => setWithdrawAccountDetails(e.target.value)}
                      placeholder={`${selectedWithdrawMethodConfig.name} - upcoming update purchase and withdrawal`}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 placeholder-slate-500 text-sm focus:outline-none cursor-not-allowed"
                    />

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        {selectedWithdrawMethodConfig.accountTypeLabel}
                      </label>
                      <input
                        type="text"
                        disabled={true}
                        value={withdrawAccountTitle}
                        onChange={(e) => setWithdrawAccountTitle(e.target.value)}
                        placeholder="Account Title"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 placeholder-slate-500 text-xs focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Submit Withdrawal Action (Disabled with requested text) */}
                  <div>
                    <button
                      type="button"
                      disabled={true}
                      className="w-full py-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-inner"
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>upcoming update purchase and withdrawal</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-500 mt-2">
                      Withdrawal method filhal disable rakha gaya hai ta k kisi ko ghalat mehsos na ho. Upcoming update me purchase and withdrawal shuru ho jayenge.
                    </p>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TRANSACTION HISTORY                                               */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {/* History Filter Chips */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {(['all', 'purchase', 'withdrawal'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      audioUtils.playPop();
                      setHistoryFilter(f);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                      historyFilter === f
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All Activity' : f === 'purchase' ? 'Deposits 🪙' : 'Withdrawals 💸'}
                  </button>
                ))}
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-300">No Transactions Found</div>
                  <p className="text-xs text-slate-500">
                    Aapki JazzCash, Easypaisa, PayPal aur Skrill payments yahan show hongi.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((txn) => {
                    const isPurchase = txn.type === 'purchase';
                    const methodCfg = PAYMENT_METHODS.find(m => m.id === txn.method) || PAYMENT_METHODS[0];

                    return (
                      <div
                        key={txn.id}
                        onClick={() => setViewReceiptTxn(txn)}
                        className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white bg-gradient-to-tr ${methodCfg.brandGradient} shrink-0`}>
                            {methodCfg.iconText}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">
                                {isPurchase ? 'Coins Deposit' : 'Cash Withdrawal'}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                txn.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}>
                                {txn.status}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-slate-300">{methodCfg.name}</span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-500">{txn.referenceId}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-sm font-black ${isPurchase ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isPurchase ? `+${txn.coins.toLocaleString()} 🪙` : `-${txn.coins.toLocaleString()} 🪙`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {txn.currency === 'PKR' ? `Rs. ${txn.fiatAmount}` : `$${txn.fiatAmount}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer with Support Notes */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Pulse Payment Gateway</span>
          </div>
          <span className="text-amber-400 font-bold">24/7 Fast Processing</span>
        </div>
      </div>

      {/* Embedded Single Receipt Modal Viewer */}
      {viewReceiptTxn && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setViewReceiptTxn(null)}
        >
          <div 
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Transaction Receipt</span>
              </h4>
              <button 
                onClick={() => setViewReceiptTxn(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Reference ID:</span>
                <span className="text-white font-mono font-bold flex items-center gap-1">
                  {viewReceiptTxn.referenceId}
                  <button 
                    onClick={() => handleCopy(viewReceiptTxn.referenceId, 'rec_v')}
                    className="text-amber-400"
                  >
                    {copiedId === 'rec_v' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Type:</span>
                <span className="text-white font-bold capitalize">{viewReceiptTxn.type}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Method:</span>
                <span className="text-white font-bold uppercase">{viewReceiptTxn.method}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Account:</span>
                <span className="text-white font-mono">{viewReceiptTxn.accountDetails}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Coins:</span>
                <span className="text-amber-400 font-bold">{viewReceiptTxn.coins.toLocaleString()} 🪙</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fiat Amount:</span>
                <span className="text-emerald-400 font-bold">
                  {viewReceiptTxn.currency === 'PKR' ? `Rs. ${viewReceiptTxn.fiatAmount}` : `$${viewReceiptTxn.fiatAmount}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Date:</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {new Date(viewReceiptTxn.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setViewReceiptTxn(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
