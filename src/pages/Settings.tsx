import { ArrowLeft, Camera, CheckCircle2, Copy, Loader2, ShieldAlert, ShieldCheck, UploadCloud, Mail, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
   * Função que simula o processamento criptográfico (ZK-STARK) final
   */
  const handleVerify = () => {
    if (!canSubmit) return;

    // 1. Muda o status para 'processing' (Mostra o spinner principal)
    setKycStatus('processing');

    // 2. Aguarda 3 segundos simulando a comunicação com a rede blockchain
    setTimeout(() => {
      // 3. Muda o status para 'verified' (Desabilita campos e mostra mensagem de sucesso)
      setKycStatus('verified');
    }, 3000);
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
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={kycStatus !== 'pending' || phoneStatus === 'verified'}
                    placeholder="+55 (11) 90000-0000"
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
                    onChange={(e) => setCpf(e.target.value)}
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
                    onChange={(e) => setBirthDate(e.target.value)}
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

        {/* Seção 2: Informações da Carteira Web3 */}
        <section>
          <h2 className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-4">Carteira Web3</h2>

          <div className="bg-[#161616] rounded-[24px] p-6 border border-white/5 shadow-lg">
            <label className="text-xs text-gray-500 mb-2 block">Endereço Stellar</label>

            {/* Exibição do Endereço Público (Public Key) */}
            <div className="flex items-center justify-between bg-black/50 border border-white/10 p-4 rounded-xl">
              <span className="text-sm text-gray-300 truncate mr-4 font-mono">
                {profile?.stellar_address
                  ? `${profile.stellar_address.substring(0, 8)}...${profile.stellar_address.substring(profile.stellar_address.length - 8)}`
                  : 'Gerando carteira...'
                }
              </span>
              <button
                onClick={() => {
                  if (profile?.stellar_address) {
                    navigator.clipboard.writeText(profile.stellar_address);
                    // Opcional: Adicionar um Toast de sucesso aqui
                  }
                }}
                className="text-gray-500 hover:text-[#00E676] transition-colors"
                title="Copiar Endereço"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>

            {/* Texto educativo para o usuário */}
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              Esta é a sua chave pública na rede Stellar. Suas chaves privadas são protegidas por criptografia e acessíveis apenas via sua biometria (Passkey).
            </p>
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
    </div>
  );
}
