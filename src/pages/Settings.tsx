/**
 * @module src/pages/Settings.tsx
 * @description Página principal da aplicação (Settings) — orquestração de estado, saldos Stellar e ações do usuário (exporta: Settings).
 */
import { ArrowLeft, Camera, CheckCircle2, Copy, Loader2, ShieldAlert, ShieldCheck, UploadCloud, Mail, MessageCircle, ArrowDownLeft, ArrowUpRight, ArrowRight, RefreshCw, Coins, ExternalLink, Clock, Eye, KeyRound, Wallet, Globe, Check, Plus } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { supabase } from '../lib/supabase';
import { IdentityService } from '../services/identityService';
import { WalletFactory } from '../services/walletFactory';
import { OracleService } from '../services/oracleService';
import { StorageService } from '../services/storageService';
import ReceiveCryptoModal from '../components/modals/ReceiveCryptoModal';
import SwapModal from '../components/modals/SwapModal';
import OnChainSendModal from '../components/modals/OnChainSendModal';
import ImportWalletModal from '../components/modals/ImportWalletModal';
import { RevealSeedModal } from '../components/modals/RevealSeedModal';
import { ExportSecretKeyModal } from '../components/modals/ExportSecretKeyModal';
import { MnemonicVault } from '../security/mnemonicVault';

/**
 * Settings — The Trust Layer
 * 
 * BOX 1: Identidade (KYC) — formulário completo + ZK-STARK
 * BOX 2: Autocustódia Web3 / BIP39 — gerenciamento de contas, seed phrase, importação
 * BOX 3: Carteira Web3 Pro Mode — balances, assets, receive/send/swap
 */
export default function Settings() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { accounts, activeAccount, switchAccount, importMnemonic, importSecretKey, loading: walletLoading } = useWallet();

  // ─── KYC States ───────────────────────────────────────────────────────────
  const [kycStatus, setKycStatus] = useState<'pending' | 'processing' | 'verified'>('pending');
  const [kycError, setKycError] = useState<string[] | null>(null);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'verified'>('idle');
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'sending' | 'verified'>('idle');
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [documentBase64, setDocumentBase64] = useState('');
  const [selfieBase64, setSelfieBase64] = useState('');

  // ─── Autocustódia States ──────────────────────────────────────────────────
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportSecretModalOpen, setIsExportSecretModalOpen] = useState(false);
  const [walletVersion, setWalletVersion] = useState<any | null>(null);

  // ─── Pro Mode States ──────────────────────────────────────────────────────
  const [xlmBalance, setXlmBalance] = useState<string>('0.00');
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [eurcBalance, setEurcBalance] = useState<string>('0.00');
  const [brzBalance, setBrzBalance] = useState<string>('0.00');
  const [brwBalance, setBrwBalance] = useState<string>('0.00');
  const [btcBalance, setBtcBalance] = useState<string>('0.00');
  const [tesouroBalance, setTesouroBalance] = useState<string>('0.00');
  const [xlmBrlPrice, setXlmBrlPrice] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isOnChainSendOpen, setIsOnChainSendOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  // ─── Validation ───────────────────────────────────────────────────────────
  const isNameValid = name.length > 5;
  const isCpfValid = cpf.length >= 14;
  const isBirthDateValid = birthDate.length === 10;
  const isAddressValid = address.length > 10;
  const isEmailValid = email.includes('@') && email.includes('.');
  const isPhoneValid = phone.length >= 11;
  const canSubmit = isNameValid && isCpfValid && isBirthDateValid && isAddressValid &&
    documentUploaded && selfieCaptured && emailStatus === 'verified' && phoneStatus === 'verified';

  // ─── Pro Mode balance fetch ────────────────────────────────────────────────
  const fetchProModeBalance = async () => {
    if (!activeAccount?.stellar_public_key) return;
    setIsLoadingBalance(true);
    try {
      const [balances, brlPrice] = await Promise.all([
        WalletFactory.getBalances(activeAccount.stellar_public_key),
        OracleService.getXlmToBrlPrice()
      ]);
      if (balances) {
        setBrzBalance(balances.brz);
        setBrwBalance(balances.brw);
        setXlmBalance(balances.xlm);
        setUsdcBalance(balances.usdc);
        setEurcBalance(balances.eurc);
        setBtcBalance(balances.btc);
        setTesouroBalance(balances.tesouro);
      }
      setXlmBrlPrice(brlPrice);
    } catch (e) {
      console.error('Falha ao carregar Web3 Pro Mode', e);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => { fetchProModeBalance(); }, [activeAccount?.stellar_public_key]);

  useEffect(() => {
    if (profile?.id) {
      const version = MnemonicVault.getWalletVersion(profile.id);
      setWalletVersion(version);
    }
  }, [profile?.id]);

  // ─── KYC load effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (profile?.kyc_verified) {
      setKycStatus('verified');
      setName(profile.full_name || '');
      setCpf(profile.cpf || '');
      setPhone(profile.whatsapp || '');
      setBirthDate(profile.birth_date || '');
      setAddress(profile.address || '');
      setEmailStatus('verified');
      setPhoneStatus('verified');
      setDocumentUploaded(true);
      setSelfieCaptured(true);
      localStorage.removeItem('walletnow_kyc_draft');
    } else {
      const savedDraft = localStorage.getItem('walletnow_kyc_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.name) setName(parsed.name);
          if (parsed.cpf) setCpf(parsed.cpf);
          if (parsed.birthDate) setBirthDate(parsed.birthDate);
          if (parsed.address) setAddress(parsed.address);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
        } catch (e) { console.error('Erro ao ler draft', e); }
      }
      const checkEmailProvider = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) setEmailStatus('verified');
      };
      checkEmailProvider();
    }
  }, [profile]);

  // Draft auto-save
  useEffect(() => {
    if (kycStatus !== 'verified') {
      localStorage.setItem('walletnow_kyc_draft', JSON.stringify({ name, cpf, birthDate, address, email, phone }));
    }
  }, [name, cpf, birthDate, address, email, phone, kycStatus]);

  // Email polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (emailStatus === 'sending') {
      intervalId = setInterval(async () => {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (!error && user?.email_confirmed_at) { setEmailStatus('verified'); clearInterval(intervalId); }
        } catch (e) { console.error('Poling de Email falhou', e); }
      }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [emailStatus]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && emailStatus === 'sending') setEmailStatus('verified');
    });
    return () => { subscription.unsubscribe(); };
  }, [emailStatus]);

  // ─── Image utils ─────────────────────────────────────────────────────────
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width, height = img.height;
          const MAX = 1280;
          if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
          else { if (height > MAX) { width *= MAX / height; height = MAX; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(event.target?.result as string); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setDocumentBase64(compressed);
        setDocumentUploaded(true);
      } catch (err) { console.error('Erro ao comprimir doc', err); }
    }
  };

  const handleSelfieChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setSelfieBase64(compressed);
        setSelfieCaptured(true);
      } catch (err) { console.error('Erro ao comprimir selfie', err); }
    }
  };

  // ─── KYC handlers ────────────────────────────────────────────────────────
  const handleVerifyEmail = async () => {
    if (!isEmailValid) return;
    setEmailStatus('sending');
    setTimeout(async () => {
      try {
        if (profile?.id) await supabase.from('profiles').update({ email }).eq('id', profile.id);
        setEmailStatus('verified');
        alert('MODO MOCK: E-mail verificado instantaneamente.');
      } catch (err: any) { setEmailStatus('idle'); }
    }, 1500);
  };

  const handleVerifyPhone = async () => {
    if (!isPhoneValid) return;
    setPhoneStatus('sending');
    setTimeout(() => {
      setPhoneStatus('idle');
      setShowPhoneOtp(true);
      alert('MODO MOCK: Use o código "123456" para aprovar o WhatsApp.');
    }, 1500);
  };

  const handleConfirmPhoneOtp = async () => {
    if (phoneOtp.length < 6) return;
    if (phoneOtp !== '123456') { alert('Token OTP inválido. Use "123456".'); return; }
    try {
      if (profile?.id) await supabase.from('profiles').update({ whatsapp: phone.replace(/\D/g, '') }).eq('id', profile.id);
      setPhoneStatus('verified');
      setShowPhoneOtp(false);
    } catch (err: any) { console.error(err); }
  };

  const handleVerify = async () => {
    if (!canSubmit || !profile) return;
    setKycError(null);
    setKycStatus('processing');
    try {
      const { isApproved, errorDetails } = await IdentityService.validateDocumentWithAI(
        documentBase64, selfieBase64, cpf, name, birthDate
      );
      if (!isApproved) { setKycError(errorDetails); throw new Error('IA reprovou validação.'); }
      await StorageService.uploadKycDocument(profile.id, documentBase64, selfieBase64);
      setKycStatus('verified');
    } catch (err: any) {
      console.error('Falha KYC:', err.message);
      setKycStatus('pending');
    }
  };

  const handleResetKyc = async () => {
    if (!profile) return;
    if (!window.confirm('Isso apagará sua assinatura KYC. Confirma?')) return;
    setKycStatus('processing');
    try {
      await supabase.from('profiles').update({ kyc_verified: false, kyczk_hash: null }).eq('id', profile.id);
      setKycStatus('pending');
      setKycError(null);
      setEmailStatus('idle');
      setPhoneStatus('idle');
      setDocumentUploaded(false);
      setSelfieCaptured(false);
      alert('Selo revogado! Pode reiniciar o fluxo.');
    } catch (err: any) {
      setKycStatus(profile.kyc_verified ? 'verified' : 'pending');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'legacy': return <Globe className="w-4 h-4 text-blue-400" />;
      case 'imported': return <KeyRound className="w-4 h-4 text-purple-400" />;
      case 'generated': return <ShieldCheck className="w-4 h-4 text-[#00E676]" />;
      default: return <Wallet className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] animate-in slide-in-from-right-8 duration-300">

      <header className="px-6 pt-8 pb-6 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-[#161616] rounded-full text-gray-400 hover:text-white border border-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">Configurações</h1>
      </header>

      <div className="flex-1 p-6 space-y-8 pb-24">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* BOX 1 — IDENTIDADE (KYC)                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-sm text-gray-400 font-medium uppercase tracking-wider mt-1">Identidade (KYC)</h2>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleResetKyc}
                disabled={kycStatus === 'processing'}
                className="text-[10px] text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-1.5 rounded border border-red-500/20 transition-colors uppercase font-bold tracking-wider disabled:opacity-50"
              >
                Resetar (Teste) ↻
              </button>
              {kycStatus === 'verified' ? (
                <span className="flex items-center gap-1 text-xs font-medium text-[#00E676] bg-[#00E676]/10 px-2.5 py-1 rounded-full border border-[#00E676]/20">
                  <ShieldCheck className="w-3.5 h-3.5" />Verificado (ZK)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-[#F27D26] bg-[#F27D26]/10 px-2.5 py-1 rounded-full border border-[#F27D26]/20">
                  <ShieldAlert className="w-3.5 h-3.5" />Pendente
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#161616] rounded-[24px] p-6 border border-white/5 shadow-lg">
            {kycStatus === 'verified' && (
              <div className="mb-6 p-4 bg-[#00E676]/10 border border-[#00E676]/20 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-500">
                <ShieldCheck className="w-5 h-5 text-[#00E676] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#00E676]">Identidade Validada</p>
                  <p className="text-xs text-[#00E676]/80 mt-1">Dados criptografados e validados na rede via prova ZK-STARK.</p>
                </div>
              </div>
            )}

            <div className="space-y-5 mb-6">

              {/* E-mail */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                    <Mail className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={emailStatus === 'verified' || kycStatus !== 'pending'}
                      placeholder="seu@email.com"
                      className="w-full bg-transparent text-white outline-none disabled:opacity-50 text-sm"
                    />
                    {emailStatus === 'verified' && <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />}
                  </div>
                  {emailStatus !== 'verified' && kycStatus === 'pending' && (
                    <button
                      onClick={handleVerifyEmail}
                      disabled={!isEmailValid || emailStatus === 'sending'}
                      className="text-xs bg-[#00E676]/10 text-[#00E676] px-3 py-2 rounded-lg border border-[#00E676]/20 hover:bg-[#00E676]/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {emailStatus === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verificar'}
                    </button>
                  )}
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">WhatsApp</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                    <MessageCircle className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 11) val = val.slice(0, 11);
                        setPhone(val);
                      }}
                      disabled={phoneStatus === 'verified' || kycStatus !== 'pending'}
                      placeholder="DDD + número (11 dígitos)"
                      className="w-full bg-transparent text-white outline-none disabled:opacity-50 text-sm"
                    />
                    {phoneStatus === 'verified' && <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />}
                  </div>
                  {phoneStatus !== 'verified' && kycStatus === 'pending' && (
                    <button
                      onClick={handleVerifyPhone}
                      disabled={!isPhoneValid || phoneStatus === 'sending'}
                      className="text-xs bg-[#00E676]/10 text-[#00E676] px-3 py-2 rounded-lg border border-[#00E676]/20 hover:bg-[#00E676]/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {phoneStatus === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verificar'}
                    </button>
                  )}
                </div>
                {showPhoneOtp && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Código OTP (6 dígitos)"
                      className="flex-1 bg-black/30 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00E676]"
                    />
                    <button
                      onClick={handleConfirmPhoneOtp}
                      disabled={phoneOtp.length < 6}
                      className="bg-[#00E676] hover:bg-[#00E676]/90 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                  </div>
                )}
              </div>

              {/* Nome */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">Nome Completo</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={kycStatus !== 'pending'}
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50 text-sm"
                    placeholder="Seu nome completo"
                  />
                  {isNameValid && (kycStatus === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#F27D26] ml-2 flex-shrink-0" />
                  ))}
                </div>
              </div>

              {/* CPF */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">CPF</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 11) val = val.slice(0, 11);
                      if (val.length > 9) val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                      else if (val.length > 6) val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
                      else if (val.length > 3) val = val.replace(/(\d{3})(\d{1,3})/, "$1.$2");
                      setCpf(val);
                    }}
                    disabled={kycStatus !== 'pending'}
                    placeholder="000.000.000-00"
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50 text-sm"
                  />
                  {isCpfValid && (kycStatus === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#F27D26] ml-2 flex-shrink-0" />
                  ))}
                </div>
              </div>

              {/* Data de Nascimento */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">Data de Nascimento</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 8) val = val.slice(0, 8);
                      if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
                      else if (val.length > 2) val = val.replace(/(\d{2})(\d{1,2})/, "$1/$2");
                      setBirthDate(val);
                    }}
                    disabled={kycStatus !== 'pending'}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50 text-sm"
                  />
                  {isBirthDateValid && (kycStatus === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#F27D26] ml-2 flex-shrink-0" />
                  ))}
                </div>
              </div>

              {/* Endereço */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">Endereço Residencial Completo</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={kycStatus !== 'pending'}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50 text-sm"
                  />
                  {isAddressValid && (kycStatus === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#F27D26] ml-2 flex-shrink-0" />
                  ))}
                </div>
              </div>
            </div>

            {/* Documentação */}
            <div className="mb-6">
              <label className="text-xs text-gray-500 mb-3 block">Documentação Necessária</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all duration-300 ${kycStatus !== 'pending' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${documentUploaded ? (kycStatus === 'verified' ? 'border-[#00E676] bg-[#00E676]/5 text-[#00E676]' : 'border-[#F27D26] bg-[#F27D26]/5 text-[#F27D26]') : 'border-white/10 hover:border-white/20 text-gray-400 hover:text-white bg-black/20'}`}>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleDocumentChange} disabled={kycStatus !== 'pending'} />
                  {documentUploaded ? (kycStatus === 'verified' ? <CheckCircle2 className="w-6 h-6 mb-2" /> : <Clock className="w-6 h-6 mb-2" />) : <UploadCloud className="w-6 h-6 mb-2" />}
                  <span className="text-xs font-medium text-center">RG, CNH ou Passaporte</span>
                </label>
                <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all duration-300 ${kycStatus !== 'pending' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${selfieCaptured ? (kycStatus === 'verified' ? 'border-[#00E676] bg-[#00E676]/5 text-[#00E676]' : 'border-[#F27D26] bg-[#F27D26]/5 text-[#F27D26]') : 'border-white/10 hover:border-white/20 text-gray-400 hover:text-white bg-black/20'}`}>
                  <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieChange} disabled={kycStatus !== 'pending'} />
                  {selfieCaptured ? (kycStatus === 'verified' ? <CheckCircle2 className="w-6 h-6 mb-2" /> : <Clock className="w-6 h-6 mb-2" />) : <Camera className="w-6 h-6 mb-2" />}
                  <span className="text-xs font-medium text-center">Capturar Selfie (Liveness)</span>
                </label>
              </div>
            </div>

            {kycError && kycError.length > 0 && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400 font-medium mb-2">A IA encontrou divergências:</p>
                <ul className="text-xs text-red-300 space-y-1 list-disc list-inside">
                  {kycError.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {kycStatus !== 'verified' && (
              <button
                onClick={handleVerify}
                disabled={!canSubmit || kycStatus === 'processing'}
                className="w-full flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 rounded-xl font-bold transition-all duration-300 disabled:opacity-50"
              >
                {kycStatus === 'processing' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Gerando prova criptográfica ZK-STARK...</>
                ) : 'Verificar Identidade'}
              </button>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* BOX 2 — AUTOCUSTÓDIA WEB3 / BIP39                                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center gap-2">
              Autocustódia Web3 <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest border border-purple-500/30">BIP39</span>
            </h2>
          </div>

          <div className="bg-[#161616] rounded-[24px] p-6 border border-white/5 shadow-lg space-y-6">

            {/* Lista de contas */}
            <div>
              <label className="text-xs text-gray-500 mb-3 block">Suas Carteiras ({accounts.length})</label>
              <div className="space-y-2">
                {walletLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                  </div>
                ) : accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => switchAccount(account.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors border ${
                      activeAccount?.id === account.id
                        ? 'bg-[#00E676]/10 border-[#00E676]/20'
                        : 'bg-black/20 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        {getAccountIcon(account.account_type)}
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-medium ${activeAccount?.id === account.id ? 'text-[#00E676]' : 'text-white'}`}>
                          {account.label}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {account.stellar_public_key.slice(0, 6)}...{account.stellar_public_key.slice(-4)}
                          <span className="ml-2 text-gray-600 uppercase">{account.account_type}</span>
                        </p>
                      </div>
                    </div>
                    {activeAccount?.id === account.id && <Check className="w-4 h-4 text-[#00E676]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Ações de Autocustódia */}
            <div>
              <label className="text-xs text-gray-500 mb-3 block">Ações de Autocustódia</label>
              <div className="grid grid-cols-1 gap-3">

                {/* Importar Carteira */}
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 bg-[#111] hover:bg-[#1a1a1a] rounded-xl border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Importar Carteira Existente</p>
                      <p className="text-[10px] text-gray-500">Seed Phrase ou Secret Key</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                </button>

                {/* Revelar Frase de Recuperação — para contas geradas/legadas */}
                {(activeAccount?.account_type === 'generated' || activeAccount?.account_type === 'legacy') && (
                  <button
                    onClick={() => setIsSeedModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 bg-[#111] hover:bg-[#1a1a1a] rounded-xl border border-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20">
                        <Eye className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">Revelar Frase de Recuperação</p>
                        <p className="text-[10px] text-gray-500">Seed Phrase de 12 palavras (BIP39)</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
                  </button>
                )}

                {/* Exportar Secret Key Stellar — disponível para todos os tipos */}
                <button
                  onClick={() => setIsExportSecretModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 bg-[#111] hover:bg-[#1a1a1a] rounded-xl border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500/20">
                      <KeyRound className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Exportar Secret Key Stellar</p>
                      <p className="text-[10px] text-red-500/80">Danger Zone — chave criptográfica bruta (S...)</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors" />
                </button>

              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* BOX 3 — CARTEIRA WEB3 PRO MODE                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center gap-2">
              Carteira Web3 <span className="text-[10px] bg-[#00E676]/20 text-[#00E676] px-2 py-0.5 rounded uppercase font-bold tracking-widest border border-[#00E676]/30">Pro Mode</span>
            </h2>
          </div>

          <div className="bg-[#161616] rounded-[24px] p-6 border border-white/5 shadow-lg space-y-4">

            {/* 1. XLM — Ativo Nativo Principal */}
            <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl border-l-[#00E676]/50 border-l-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#00E676]/20 bg-[#00E676]/5 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-[#00E676]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Lúmens (XLM)</p>
                  <p className="text-[10px] text-gray-500">Ativo Nativo da Rede Stellar</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{isLoadingBalance ? '...' : parseFloat(xlmBalance).toFixed(4)} <span className="text-xs text-gray-500">XLM</span></p>
                {(xlmBrlPrice > 0 && !isLoadingBalance) && (
                  <p className="text-[10px] text-gray-500">~ R$ {(parseFloat(xlmBalance) * xlmBrlPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
            </div>

            {/* 2. USDC — Stablecoin Principal */}
            <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl border-l-blue-400/50 border-l-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-blue-500/20 bg-blue-500/5 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-400">USDC</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">USD Coin</p>
                  <p className="text-[10px] text-gray-500">Stablecoin Principal (Circle)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{isLoadingBalance ? '...' : parseFloat(usdcBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                <p className="text-[10px] text-gray-500">Circle (Issuer)</p>
              </div>
            </div>

            {/* 3. EURC — Euro Stablecoin (condicional) */}
            {parseFloat(eurcBalance) > 0 && (
              <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center">
                    <span className="text-xs font-bold text-indigo-400">€RC</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Euro Coin</p>
                    <p className="text-[10px] text-gray-500">Euro Stablecoin (Circle)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{isLoadingBalance ? '...' : parseFloat(eurcBalance).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                  <p className="text-[10px] text-gray-500">Circle (Issuer)</p>
                </div>
              </div>
            )}

            {/* 4. BRZ — Real Brasileiro (condicional) */}
            {parseFloat(brzBalance) > 0 && (
              <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-green-500/20 bg-green-500/5 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-400">BRZ</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Brazilian Real</p>
                    <p className="text-[10px] text-gray-500">Real Digital (Transfero)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{isLoadingBalance ? '...' : parseFloat(brzBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-gray-500">Transfero (Issuer)</p>
                </div>
              </div>
            )}

            {/* 5. BRT — Tesouro Tokenizado RWA */}
            <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl border-l-blue-500/30 border-l-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-blue-500/20 bg-blue-500/5 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-500">BRT</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Tesouro Tokenizado</p>
                  <p className="text-[10px] text-gray-500">RWA (Etherfuse Brazil)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{isLoadingBalance ? '...' : (parseFloat(tesouroBalance || '0') || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-blue-500">Etherfuse (Issuer)</p>
              </div>
            </div>

            {/* 6. BRW — WalletNow Native (Secundário) */}
            <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl opacity-80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#00E676]/15 bg-[#00E676]/5 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#00E676]/70">BRW</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80">WalletNow Real</p>
                  <p className="text-[10px] text-gray-600">Token Interno (Testnet)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white/80">{isLoadingBalance ? '...' : parseFloat(brwBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-600">WalletNow (Issuer)</p>
              </div>
            </div>

            {/* Ações Pro */}
            <div className="pt-2">
              <label className="text-xs text-gray-500 mb-3 block">Ações Cripto Descentralizadas</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setIsReceiveOpen(true)} className="flex flex-col items-center justify-center py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 text-gray-400 hover:text-white">
                  <ArrowDownLeft className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-medium uppercase">Receber</span>
                </button>
                <button onClick={() => setIsOnChainSendOpen(true)} className="flex flex-col items-center justify-center py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 text-gray-400 hover:text-white">
                  <ArrowUpRight className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-medium uppercase">Enviar</span>
                </button>
                <button onClick={() => setIsSwapOpen(true)} className="flex flex-col items-center justify-center py-4 bg-white/5 hover:bg-[#F27D26]/20 hover:border-[#F27D26]/30 rounded-xl transition-colors border border-white/10 text-[#F27D26]">
                  <RefreshCw className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Swap</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-4 text-center">
                Aviso: O Modo PRO permite interagir diretamente com Contratos e Ativos. A responsabilidade das transações é custodiada inteiramente na sua Biometria Pessoal.
              </p>
            </div>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}
          className="w-full py-4 text-red-500 font-medium hover:bg-red-500/10 rounded-2xl transition-colors"
        >
          Sair da Conta
        </button>
      </div>

      {/* Modais */}
      <ImportWalletModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => { fetchProModeBalance(); }}
      />
      <RevealSeedModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        userId={profile?.id || ''}
        walletVersion={walletVersion}
      />
      <ExportSecretKeyModal
        isOpen={isExportSecretModalOpen}
        onClose={() => setIsExportSecretModalOpen(false)}
      />
      <ReceiveCryptoModal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} />
      <SwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} onSuccess={fetchProModeBalance} />
      <OnChainSendModal
        isOpen={isOnChainSendOpen}
        onClose={() => setIsOnChainSendOpen(false)}
        onSuccess={fetchProModeBalance}
      />
    </div>
  );
}
