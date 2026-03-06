import { ArrowLeft, Camera, CheckCircle2, Copy, Loader2, ShieldAlert, ShieldCheck, UploadCloud, Mail, MessageCircle, ArrowDownLeft, ArrowUpRight, RefreshCw, Coins, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { IdentityService } from '../services/identityService';
import { WalletFactory } from '../services/walletFactory';
import { OracleService } from '../services/oracleService';
import ReceiveCryptoModal from '../components/modals/ReceiveCryptoModal';
import SwapModal from '../components/modals/SwapModal';
import SendModal from '../components/modals/SendModal';

/**
 * Tela de Configurações e Identidade (The Trust Layer)
 * 
 * Esta tela foi aprimorada para demonstrar um fluxo de KYC (Know Your Customer) robusto.
 * O usuário preenche dados pessoais, verifica E-mail e WhatsApp, envia documentos e tira uma selfie.
 * Ao final, simulamos a geração de uma prova ZK-STARK (Zero-Knowledge Proof),
 * que garante a identidade do usuário na rede sem expor seus dados sensíveis.
 */
export default function Settings() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Máquina de estados para o status do KYC geral:
  // 'pending' = Aguardando preenchimento
  // 'processing' = Gerando a prova ZK-STARK (Spinner)
  // 'verified' = Concluído com sucesso
  const [kycStatus, setKycStatus] = useState<'pending' | 'processing' | 'verified'>('pending');

  // Estados dos campos de texto básicos
  const [name, setName] = useState('João Silva');
  const [cpf, setCpf] = useState('123.456.789-00');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');

  // Estados para E-mail e WhatsApp e seus respectivos status de verificação
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'verified'>('idle');
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'sending' | 'verified'>('idle');

  // Estados dos módulos de documentação (Simulação de Upload/Selfie)
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);

  // Estados PRO Mode (Carteira Web3)
  const [brzBalance, setBrzBalance] = useState<string>('0.00');
  const [xlmBalance, setXlmBalance] = useState<string>('0.00');
  const [xlmBrlPrice, setXlmBrlPrice] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Estados para os Modais Web3
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  // Efeito para carregar os saldos da Blockchain no Pro Mode
  useEffect(() => {
    async function loadWeb3Data() {
      if (!profile?.stellar_address) return;
      setIsLoadingBalance(true);
      try {
        const [balances, brlPrice] = await Promise.all([
          WalletFactory.getBalances(profile.stellar_address),
          OracleService.getXlmToBrlPrice()
        ]);
        if (balances) {
          setBrzBalance(balances.brz);
          setXlmBalance(balances.xlm);
        }
        setXlmBrlPrice(brlPrice);
      } catch (e) {
        console.error("Falha ao carregar Web3 Pro Mode", e);
      } finally {
        setIsLoadingBalance(false);
      }
    }
    loadWeb3Data();
  }, [profile?.stellar_address]);

  // Efeito para carregar os dados se o perfil já foi verificado
  useEffect(() => {
    if (profile?.kyc_verified) {
      setKycStatus('verified');
      setName(profile.full_name || '');
      setCpf(profile.cpf || '');
      setPhone(profile.whatsapp || '');
      setBirthDate(profile.birth_date || '');
      setAddress(profile.address || '');
      // Mock de verificações aprovadas
      setEmailStatus('verified');
      setPhoneStatus('verified');
      setDocumentUploaded(true);
      setSelfieCaptured(true);
    }
  }, [profile]);

  // Lógica simples de validação visual (Retorna true se o campo estiver preenchido corretamente)
  const isNameValid = name.length > 5;
  const isCpfValid = cpf.length >= 14; // Formato 000.000.000-00
  const isBirthDateValid = birthDate.length === 10; // Formato DD/MM/YYYY
  const isAddressValid = address.length > 10;
  const isEmailValid = email.includes('@') && email.includes('.');
  const isPhoneValid = phone.length >= 11;

  // O botão de verificar a identidade (ZK-STARK) só é habilitado se TODOS os campos,
  // verificações (email/whatsapp) e documentos estiverem válidos.
  const canSubmit = isNameValid && isCpfValid && isBirthDateValid && isAddressValid &&
    documentUploaded && selfieCaptured &&
    emailStatus === 'verified' && phoneStatus === 'verified';

  /**
   * Simula o envio de um código de verificação para o E-mail
   */
  const handleVerifyEmail = () => {
    if (!isEmailValid) return;
    setEmailStatus('sending'); // Mostra o spinner no botão do e-mail
    setTimeout(() => {
      setEmailStatus('verified'); // Marca como verificado após 1.5s
    }, 1500);
  };

  /**
   * Simula o envio de um código de verificação para o WhatsApp
   */
  const handleVerifyPhone = () => {
    if (!isPhoneValid) return;
    setPhoneStatus('sending'); // Mostra o spinner no botão do WhatsApp
    setTimeout(() => {
      setPhoneStatus('verified'); // Marca como verificado após 1.5s
    }, 1500);
  };

  /**
   * Função que Processa a auditoria e Criptografa na Blockchain (ZK-STARK)
   */
  const handleVerify = async () => {
    if (!canSubmit || !profile) return;

    setKycStatus('processing');

    try {
      console.log('⏳ Iniciando Validação Zero-Knowledge KYC...');

      // 1. Gera o Super Hash Híbrido Criptografando todos os dados do formulário
      const secretSalt = profile.id; // Nosso 'Salt' inquebrável será o UUID interno do usuário
      const zkHash = IdentityService.generateZKHash(name, cpf, phone, email, birthDate, address, secretSalt);

      // 2. Garantia de Carteira WaaS (WalletFactory)
      // Caso a internet falhou no login e ele ainda não tem carteira criada, forçamos criação
      let targetAddress = profile.stellar_address;
      if (!targetAddress) {
        console.log('Criando a carteira do usuário no ato da validação KYC...');
        targetAddress = await WalletFactory.provisionWalletForUser(profile.id);
        if (!targetAddress) throw new Error('Falha ao instanciar carteira digital para mintagem KMS.');
      }

      // 3. Recuperação do Segredo Local e Mintagem ZK (CAP-33 Dual Signature)
      const userSecretKey = WalletFactory.getSecretKey(profile.id);
      if (!userSecretKey) throw new Error('Credencial secreta indisponível no dispositivo.');

      const txHash = await IdentityService.mintReputationZK(targetAddress, userSecretKey, zkHash);
      if (!txHash) throw new Error('A Blockchain rejeitou a transação do Selo KYC.');

      console.log('✅ Token ZK-STARK Mintado. Ledger TX:', txHash);

      // 4. Salvaguardando a Confiança Master no BD
      // Só gravamos no banco DEPOIS da Blockchain atestar que mintou o hash pra sempre.
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          cpf: cpf.replace(/\D/g, ''),
          whatsapp: phone.replace(/\D/g, ''),
          birth_date: birthDate,
          address: address,
          kyc_verified: true,
          kyczk_hash: zkHash // Guardamos o Hash para o front-end poder validar futuramente
        })
        .eq('id', profile.id);

      if (dbError) throw new Error(`Banco de Dados Database Rejeitou Update: ${dbError.message}`);

      // Tudo perfeito, marca a UI com selo imutável ✅
      setKycStatus('verified');

    } catch (err: any) {
      console.error('❌ Falha na Camada de KYC ZK-STARK:', err.message);
      setKycStatus('pending'); // Rebote para o usuário conseguir tentar novamente
      alert(err.message); // Temporário para MVP
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] animate-in slide-in-from-right-8 duration-300">

      {/* Cabeçalho com botão de Voltar */}
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

        {/* Seção 1: Identidade (KYC) */}
        <section>
          {/* Título da Seção e Badge de Status Dinâmico */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-gray-400 font-medium uppercase tracking-wider">Identidade (KYC)</h2>

            {kycStatus === 'verified' ? (
              <span className="flex items-center gap-1 text-xs font-medium text-[#00E676] bg-[#00E676]/10 px-2.5 py-1 rounded-full border border-[#00E676]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verificado (ZK)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-[#F27D26] bg-[#F27D26]/10 px-2.5 py-1 rounded-full border border-[#F27D26]/20">
                <ShieldAlert className="w-3.5 h-3.5" />
                Pendente
              </span>
            )}
          </div>

          {/* Container Principal do Formulário KYC */}
          <div className="bg-[#161616] rounded-[24px] p-6 border border-white/5 shadow-lg">

            {/* Mensagem de Sucesso (Só aparece quando verificado) */}
            {kycStatus === 'verified' && (
              <div className="mb-6 p-4 bg-[#00E676]/10 border border-[#00E676]/20 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-500">
                <ShieldCheck className="w-5 h-5 text-[#00E676] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#00E676]">Identidade Validada</p>
                  <p className="text-xs text-[#00E676]/80 mt-1">Dados criptografados e validados na rede via prova ZK-STARK.</p>
                </div>
              </div>
            )}

            {/* Campos de Dados Pessoais */}
            <div className="space-y-5 mb-8">

              {/* Campo: E-mail (Com verificação) */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={kycStatus !== 'pending' || emailStatus === 'verified'}
                    placeholder="seu@email.com"
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50"
                  />
                  {/* Se verificado, mostra o check verde. Se não, mostra o botão de verificar. */}
                  {emailStatus === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />
                  ) : (
                    <button
                      onClick={handleVerifyEmail}
                      disabled={!isEmailValid || emailStatus === 'sending'}
                      className="ml-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {emailStatus === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      {emailStatus === 'sending' ? 'Enviando...' : 'Verificar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Campo: WhatsApp (Com verificação) */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">WhatsApp</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      // Se a pessoa colar com 55 na frente (ex: 5511999999999), tiramos o 55 pra formatar limpo
                      if (val.startsWith('55') && val.length > 11) val = val.slice(2);

                      if (val.length > 11) val = val.slice(0, 11);
                      if (val.length > 7) val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                      else if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;

                      setPhone(val);
                    }}
                    disabled={kycStatus !== 'pending' || phoneStatus === 'verified'}
                    placeholder="(11) 90000-0000"
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50"
                  />
                  {/* Se verificado, mostra o check verde. Se não, mostra o botão de verificar via WhatsApp. */}
                  {phoneStatus === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />
                  ) : (
                    <button
                      onClick={handleVerifyPhone}
                      disabled={!isPhoneValid || phoneStatus === 'sending'}
                      // Usamos um tom de verde levemente diferente para remeter ao WhatsApp, ou o verde do tema
                      className="ml-2 text-xs bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {phoneStatus === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                      {phoneStatus === 'sending' ? 'Enviando...' : 'WhatsApp'}
                    </button>
                  )}
                </div>
              </div>

              {/* Campo: Nome Completo */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">Nome Completo</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={kycStatus !== 'pending'}
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50"
                  />
                  {/* Feedback Visual: Check verde se válido */}
                  {isNameValid && <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />}
                </div>
              </div>

              {/* Campo: CPF */}
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
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50"
                  />
                  {isCpfValid && <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />}
                </div>
              </div>

              {/* Campo: Data de Nascimento */}
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
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50"
                  />
                  {isBirthDateValid && <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />}
                </div>
              </div>

              {/* Campo: Endereço Residencial */}
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">Endereço Residencial Completo</label>
                <div className="flex items-center border-b border-white/10 focus-within:border-[#00E676] transition-colors pb-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={kycStatus !== 'pending'}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full bg-transparent text-white outline-none disabled:opacity-50"
                  />
                  {isAddressValid && <CheckCircle2 className="w-4 h-4 text-[#00E676] ml-2 flex-shrink-0" />}
                </div>
              </div>
            </div>

            {/* Módulo de Documentação (Upload e Selfie) */}
            <div className="mb-8">
              <label className="text-xs text-gray-500 mb-3 block">Documentação Necessária</label>
              <div className="grid grid-cols-2 gap-4">

                {/* Botão de Upload de Documento */}
                <button
                  onClick={() => setDocumentUploaded(!documentUploaded)}
                  disabled={kycStatus !== 'pending'}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                    ${documentUploaded
                      ? 'border-[#00E676] bg-[#00E676]/5 text-[#00E676]'
                      : 'border-white/10 hover:border-white/20 text-gray-400 hover:text-white bg-black/20'}`}
                >
                  {documentUploaded ? <CheckCircle2 className="w-6 h-6 mb-2" /> : <UploadCloud className="w-6 h-6 mb-2" />}
                  <span className="text-xs font-medium text-center">RG, CNH ou Passaporte</span>
                </button>

                {/* Botão de Captura de Selfie */}
                <button
                  onClick={() => setSelfieCaptured(!selfieCaptured)}
                  disabled={kycStatus !== 'pending'}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                    ${selfieCaptured
                      ? 'border-[#00E676] bg-[#00E676]/5 text-[#00E676]'
                      : 'border-white/10 hover:border-white/20 text-gray-400 hover:text-white bg-black/20'}`}
                >
                  {selfieCaptured ? <CheckCircle2 className="w-6 h-6 mb-2" /> : <Camera className="w-6 h-6 mb-2" />}
                  <span className="text-xs font-medium text-center">Capturar Selfie (Liveness)</span>
                </button>

              </div>
            </div>

            {/* Botão de Ação Principal (Verificar Identidade) */}
            {kycStatus !== 'verified' && (
              <button
                onClick={handleVerify}
                disabled={!canSubmit || kycStatus === 'processing'}
                className="w-full flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,230,118,0.15)]"
              >
                {kycStatus === 'processing' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando prova criptográfica ZK-STARK...
                  </>
                ) : (
                  'Verificar Identidade'
                )}
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center gap-2">
              Carteira Web3 <span className="text-[10px] bg-[#00E676]/20 text-[#00E676] px-2 py-0.5 rounded uppercase font-bold tracking-widest border border-[#00E676]/30">Pro Mode</span>
            </h2>
          </div>

          <div className="bg-[#161616] rounded-[24px] p-6 border border-white/5 shadow-lg space-y-6">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Endereço Public (Ledger Stellar)</label>

              {/* Exibição do Endereço Público (Public Key) */}
              <div className="flex items-center justify-between bg-black/50 border border-white/10 p-4 rounded-xl group hover:border-white/20 transition-colors">
                <span className="text-sm text-gray-300 truncate mr-4 font-mono">
                  {profile?.stellar_address
                    ? `${profile.stellar_address.substring(0, 8)}...${profile.stellar_address.substring(profile.stellar_address.length - 8)}`
                    : 'Gerando carteira...'
                  }
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (profile?.stellar_address) {
                        navigator.clipboard.writeText(profile.stellar_address);
                      }
                    }}
                    className="text-gray-500 hover:text-[#00E676] transition-colors"
                    title="Copiar Endereço"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  {profile?.stellar_address && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${profile.stellar_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-[#00E676] transition-colors"
                      title="Explorar na Stellar Expert"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Balanços On-Chain Transparentes */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Seus Ativos Blockchain</label>
              <div className="space-y-3">
                {/* Stablecoin BRZ */}
                <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white/10 bg-[#161616] flex items-center justify-center">
                      <span className="text-xs font-bold text-white">BRZ</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">BRZ Token</p>
                      <p className="text-[10px] text-gray-500">Brazilian Digital Token</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{isLoadingBalance ? '...' : parseFloat(brzBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-[#00E676]">Transfero (Issuer)</p>
                  </div>
                </div>

                {/* Cripto Nativa XLM */}
                <div className="flex items-center justify-between bg-black/30 border border-white/5 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#00E676]/20 bg-[#00E676]/5 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-[#00E676]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Lúmens (XLM)</p>
                      <p className="text-[10px] text-gray-500">Moeda Nativa da Rede</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{isLoadingBalance ? '...' : parseFloat(xlmBalance).toFixed(4)} <span className="text-xs text-gray-500">XLM</span></p>
                    {(xlmBrlPrice > 0 && !isLoadingBalance) && (
                      <p className="text-[10px] text-gray-500">~ R$ {(parseFloat(xlmBalance) * xlmBrlPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Hardcore (Pro Mode) */}
            <div className="pt-2">
              <label className="text-xs text-gray-500 mb-3 block">Ações Cripto Descentralizadas</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setIsReceiveOpen(true)} className="flex flex-col items-center justify-center py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 text-gray-400 hover:text-white">
                  <ArrowDownLeft className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-medium uppercase">Receber</span>
                </button>
                <button onClick={() => setIsSendOpen(true)} className="flex flex-col items-center justify-center py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 text-gray-400 hover:text-white">
                  <ArrowUpRight className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-medium uppercase">Enviar</span>
                </button>
                <button onClick={() => setIsSwapOpen(true)} className="flex flex-col items-center justify-center py-4 bg-white/5 hover:bg-[#F27D26]/20 hover:border-[#F27D26]/30 rounded-xl transition-colors border border-white/10 text-[#F27D26]">
                  <RefreshCw className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Swap</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-4 text-center">
                Aviso: O Modo PRO permite interagir diretamente com Contratos e Ativos que não são moedas fiduciárias garantidas e a responsabilidade das transações é custodiada inteiramente na sua Biometria Pessoal.
              </p>
            </div>

          </div>
        </section>

        {/* Botão de Logout */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/');
          }}
          className="w-full py-4 text-red-500 font-medium hover:bg-red-500/10 rounded-2xl transition-colors"
        >
          Sair da Conta
        </button>

      </div>

      <ReceiveCryptoModal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} />
      <SwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />
      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        onSuccess={() => { }}
      />
    </div>
  );
}
