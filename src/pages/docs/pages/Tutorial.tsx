/**
 * @module src\pages\docs\pages\Tutorial.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React from 'react';
import { Fingerprint, ShieldCheck, Zap, Coins } from 'lucide-react';
import CodeBlock from '../../../components/docs/CodeBlock';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

export default function Tutorial() {
  const { lang } = useDocsI18n();

  return (
    <div className="tutorial-page">
      <h1>{lang === 'pt' ? 'O Guia Definitivo da WalletNow' : 'The Definitive WalletNow Guide'}</h1>
      <p className="doc-subtitle">
        {lang === 'pt' 
          ? 'Entenda por que criamos a WalletNow, como a mágica acontece por baixo dos panos e como você pode transformar seu aplicativo em uma potência Web3 sem que o seu usuário perceba.'
          : 'Understand why we created WalletNow, how the magic works under the hood, and how you can turn your app into a Web3 powerhouse without your user noticing.'}
      </p>

      <div className="doc-info-card">
        <strong>💡 {lang === 'pt' ? 'Para quem é este guia?' : 'Who is this guide for?'}</strong>{' '}
        {lang === 'pt'
          ? 'Diferente do Quick Start (que vai direto ao código), este guia é para arquitetos e desenvolvedores que querem entender os "porquês". Vamos mergulhar na dor que estamos resolvendo e na arquitetura que utilizamos.'
          : 'Unlike the Quick Start (which goes straight to code), this guide is for architects and developers who want to understand the "whys". We will dive into the pain we are solving and the architecture we use.'}
      </div>

      <div className="tutorial-section">
        <h2>1. {lang === 'pt' ? 'O Problema da Web3 (A Dor Real)' : 'The Web3 Problem (The Real Pain)'}</h2>
        <p>
          {lang === 'pt'
            ? 'Hoje, a barreira de entrada para aplicativos descentralizados (dApps) é monumental. Se você constrói um app maravilhoso no Stellar, o que seu usuário precisa fazer para usar?'
            : 'Today, the barrier to entry for decentralized applications (dApps) is monumental. If you build a wonderful app on Stellar, what does your user need to do to use it?'}
        </p>
        <ul className="pain-points-list">
          <li>❌ {lang === 'pt' ? 'Baixar uma extensão de navegador (Freighter, Albedo, etc).' : 'Download a browser extension (Freighter, Albedo, etc).'}</li>
          <li>❌ {lang === 'pt' ? 'Anotar 24 palavras em um papel (Seed Phrase) e entender de chaves privadas.' : 'Write down 24 words on paper (Seed Phrase) and understand private keys.'}</li>
          <li>❌ {lang === 'pt' ? 'Comprar XLM em uma corretora (KYC, taxas) só para pagar o "gas" da rede.' : 'Buy XLM on an exchange (KYC, fees) just to pay network "gas".'}</li>
          <li>❌ {lang === 'pt' ? 'Assinar transações assustadoras e ilegíveis ("Deseja assinar este XDR?").' : 'Sign scary and unreadable transactions ("Do you want to sign this XDR?").'}</li>
        </ul>
        <p>
          {lang === 'pt'
            ? 'Resultado: 95% dos usuários desistem antes mesmo de ver a primeira tela do seu app. A WalletNow existe para mudar isso.'
            : 'Result: 95% of users give up before even seeing the first screen of your app. WalletNow exists to change this.'}
        </p>
      </div>

      <div className="tutorial-section">
        <h2>2. {lang === 'pt' ? 'A Solução: Abstração Total' : 'The Solution: Total Abstraction'}</h2>
        
        <div className="dynamic-explainer-card">
          <img src={`${import.meta.env.BASE_URL}logo-walletnow.svg`} alt="WalletNow" className="explainer-logo" />
          <div className="explainer-text">
            <h3>{lang === 'pt' ? 'Nós somos o "Stripe" da Web3.' : 'We are the "Stripe" of Web3.'}</h3>
            <p>
              {lang === 'pt' 
                ? 'Em vez de expor o blockchain ao usuário, nós envelopamos tudo em uma SDK fluida. O usuário entra com biometria (FaceID), ganha uma carteira invisível e você (o desenvolvedor) paga as taxas de transação silenciosamente.'
                : 'Instead of exposing the blockchain to the user, we wrap everything in a fluid SDK. The user logs in with biometrics (FaceID), gets an invisible wallet, and you (the developer) pay transaction fees silently.'}
            </p>
          </div>
        </div>

        <div className="pillars-grid">
          <div className="pillar-card">
            <Fingerprint className="pillar-icon" />
            <h4>{lang === 'pt' ? 'Passkeys (FIDO2)' : 'Passkeys (FIDO2)'}</h4>
            <p>{lang === 'pt' ? 'A chave privada é gerada e travada no chip de segurança do celular do usuário. Sem senhas, sem seed phrases.' : 'The private key is generated and locked in the user\'s secure enclave. No passwords, no seed phrases.'}</p>
          </div>
          <div className="pillar-card">
            <Zap className="pillar-icon" />
            <h4>{lang === 'pt' ? 'Gas Patrocinado' : 'Sponsored Gas'}</h4>
            <p>{lang === 'pt' ? 'Usamos Fee Bumps (CAP-33) para que seu servidor pague a taxa de transação, liberando o usuário.' : 'We use Fee Bumps (CAP-33) so your server pays the transaction fee, freeing the user.'}</p>
          </div>
          <div className="pillar-card">
            <ShieldCheck className="pillar-icon" />
            <h4>{lang === 'pt' ? 'Auto-custódia' : 'Self-custody'}</h4>
            <p>{lang === 'pt' ? 'O DeviceVault garante que apenas o usuário possa assinar as transações localmente. O servidor não toca nos fundos.' : 'DeviceVault ensures only the user can sign transactions locally. The server never touches the funds.'}</p>
          </div>
          <div className="pillar-card">
            <Coins className="pillar-icon" />
            <h4>{lang === 'pt' ? 'Trilhos Fiat' : 'Fiat Rails'}</h4>
            <p>{lang === 'pt' ? 'Integração direta com Pix para transformar Reais em Stablecoins instantaneamente na Stellar.' : 'Direct Pix integration to transform fiat into Stablecoins instantly on Stellar.'}</p>
          </div>
        </div>
      </div>

      <div className="tutorial-section">
        <h2>3. {lang === 'pt' ? 'Como a SDK foi Arquitetada' : 'How the SDK was Architected'}</h2>
        <p>
          {lang === 'pt'
            ? 'Para garantir segurança máxima, dividimos a WalletNow em um modelo Cliente-Servidor onde o cliente (SDK) faz o trabalho pesado de criptografia, e o servidor atua como um "Despachante" patrocinador.'
            : 'To ensure maximum security, we split WalletNow into a Client-Server model where the client (SDK) does the heavy crypto lifting, and the server acts as a sponsoring "Dispatcher".'}
        </p>
        <CodeBlock
          lang="typescript"
          filename="arquitetura.ts"
          code={`// 1. O Client (SDK) gera um par de chaves local e pede a criação via Passkey.
// A chave privada NUNCA sai do aparelho. Fica criptografada via WebCrypto API.
const cred = await navigator.credentials.create({ publicKey: passkeyOptions });

// 2. O Client envia apenas a Chave Pública para o seu Backend.
// 3. O Seu Backend (usando nossa Cloud API) cria a conta na rede Stellar (Testnet/Mainnet).
// 4. O Backend patrocina as "Trustlines" (linhas de confiança para USDC/BRZ) pagando o gas.

// TUDO isso é abstraído na SDK com o método:
const wn = await WalletNowClient.init({ network: 'testnet' });
await wn.onboarding.createUser({ externalId: 'user@email.com' });`}
        />
      </div>

      <div className="tutorial-section">
        <h2>4. {lang === 'pt' ? 'Por Que Utilizar Nossos Componentes Visuais (React UI)?' : 'Why Use Our Visual Components (React UI)?'}</h2>
        <p>
          {lang === 'pt'
            ? 'Você pode construir seus próprios botões chamando os métodos da SDK, mas o pacote `@walletnow/react` já traz botões estilizados, tratamentos de erro nativos (como quando o usuário cancela a biometria) e gerenciamento de estado.'
            : 'You can build your own buttons by calling SDK methods, but the `@walletnow/react` package provides styled buttons, native error handling (like biometric cancellation), and state management.'}
        </p>

        <div className="ui-showcase">
          <div className="ui-showcase-left">
            <CodeBlock
              lang="tsx"
              filename="App.tsx"
              code={`import { WalletNowConnect } from '@walletnow/sdk/react';
// Ou se quiser o ambiente de simulação inteiro: 
// import TestnetKit from '@walletnow/sdk/testnetkit';

export function Header() {
  return (
    <header className="flex justify-between items-center p-4">
      <h1>Meu dApp Maravilhoso</h1>
      
      {/* Componente "plug & play" para autenticação */}
      <WalletNowConnect theme="dark" />
    </header>
  );
}`}
            />
          </div>
          <div className="ui-showcase-right">
             <div className="fake-btn-demo">
               <img src={`${import.meta.env.BASE_URL}logo-walletnow.svg`} alt="WalletNow Logo" style={{ width: 16, height: 16, filter: 'brightness(0)' }} />
               <span>Connect WalletNow</span>
               <Fingerprint size={16} />
             </div>
             <p className="caption">
               {lang === 'pt' 
                ? 'Este botão abre a biometria nativa (FaceID / TouchID / Windows Hello) e faz o login na conta Stellar do usuário automaticamente.' 
                : 'This button opens native biometrics (FaceID / TouchID / Windows Hello) and logs into the user\'s Stellar account automatically.'}
             </p>
          </div>
        </div>
      </div>

      <div className="tutorial-section">
        <h2>5. {lang === 'pt' ? 'O Playground e o Testnet Kit' : 'Playground & Testnet Kit'}</h2>
        <p>
          {lang === 'pt'
            ? 'Antes de escrever qualquer linha de código no seu App principal, recomendamos que você utilize nosso Playground interativo. Nele, você pode simular a jornada completa do usuário final.'
            : 'Before writing any code in your main App, we recommend using our interactive Playground. There, you can simulate the complete end-user journey.'}
        </p>
        <div className="doc-info-card">
          <strong>🛠️ {lang === 'pt' ? 'O que é o Testnet Kit?' : 'What is the Testnet Kit?'}</strong>{' '}
          {lang === 'pt'
            ? 'É uma infraestrutura real rodando na rede de testes (Testnet) da Stellar. Ao criar uma conta no Playground, você verá na prática a WalletNow patrocinando o gás (XLM) e emitindo dólares (USDC) falsos na sua carteira biométrica.'
            : 'It is a real infrastructure running on Stellar Testnet. When you create an account in the Playground, you will see WalletNow sponsoring gas (XLM) and minting fake dollars (USDC) into your biometric wallet.'}
        </div>
        <p>
          {lang === 'pt' 
            ? 'Acesse a barra lateral e clique em "Playground" para testar o painel visual. Crie uma conta com biometria, visualize seu endereço Stellar gerado e veja como os saldos chegam em menos de 3 segundos.'
            : 'Access the sidebar and click on "Playground" to test the visual dashboard. Create an account with biometrics, view your generated Stellar address, and watch balances arrive in under 3 seconds.'}
        </p>
      </div>

      <div className="tutorial-section">
        <h2>6. {lang === 'pt' ? 'Próximos Passos' : 'Next Steps'}</h2>
        <p>
          {lang === 'pt' 
            ? 'Agora que você entende a filosofia e a dor que estamos resolvendo, vá para a documentação de referência para explorar todos os métodos da SDK.' 
            : 'Now that you understand the philosophy and the pain we are solving, head over to the reference documentation to explore all SDK methods.'}
        </p>
        <ul>
          <li><a href="/docs/sdk">{lang === 'pt' ? 'Explore a Referência Completa da SDK' : 'Explore the Full SDK Reference'}</a></li>
          <li><a href="/docs/quick-start">{lang === 'pt' ? 'Pule para o Quick Start e comece a codar' : 'Jump to the Quick Start and start coding'}</a></li>
        </ul>
      </div>

      <style>{`
        .tutorial-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .tutorial-section {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pain-points-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 16px 0;
        }
        
        .pain-points-list li {
          background: rgba(255,0,0,0.05);
          border-left: 3px solid rgba(255,0,0,0.5);
          padding: 12px 16px;
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .dynamic-explainer-card {
          width: 100%;
          border-radius: var(--radius-lg);
          background: linear-gradient(145deg, rgba(0,255,153,0.05) 0%, rgba(0,0,0,0.2) 100%);
          border: 1px solid rgba(0, 255, 153, 0.2);
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-bottom: 32px;
        }
        
        .dynamic-explainer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 255, 153, 0.1);
          border-color: rgba(0, 255, 153, 0.4);
        }

        .explainer-logo {
          width: 80px;
          height: 80px;
          filter: drop-shadow(0 0 12px rgba(0,255,153,0.4));
          animation: float-logo 3s ease-in-out infinite;
        }

        @keyframes float-logo {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .explainer-text h3 {
          margin: 0 0 8px 0 !important;
          color: var(--text-primary);
          font-size: 20px;
        }

        .explainer-text p {
          margin: 0 !important;
          font-size: 15px;
          line-height: 1.6;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .pillar-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.2s;
        }

        .pillar-card:hover {
          border-color: var(--accent);
        }

        .pillar-icon {
          color: var(--accent);
          width: 24px;
          height: 24px;
        }

        .pillar-card h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 16px;
        }

        .pillar-card p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.5;
        }

        .ui-showcase {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          align-items: stretch;
          margin-top: 16px;
        }

        @media (max-width: 800px) {
          .ui-showcase {
            grid-template-columns: 1fr;
          }
          .dynamic-explainer-card {
            flex-direction: column;
            text-align: center;
            padding: 24px;
          }
        }

        .ui-showcase-right {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          gap: 16px;
        }

        .fake-btn-demo {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--accent);
          color: #000;
          padding: 12px 24px;
          border-radius: 100px;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 255, 153, 0.2);
          transition: opacity 0.2s, transform 0.2s;
        }

        .fake-btn-demo:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }

        .caption {
          font-size: 12px;
          color: var(--text-tertiary);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
