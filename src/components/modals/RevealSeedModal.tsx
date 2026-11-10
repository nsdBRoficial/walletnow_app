/**
 * @module src\components\modals\RevealSeedModal.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Eye, EyeOff, Copy, CheckCircle, AlertTriangle, X, Lock } from 'lucide-react';
import { MnemonicVault, type WalletVersion } from '../../security/mnemonicVault';
import { getMnemonicWords } from '../../utils/bip39Wallet';

interface RevealSeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  walletVersion: WalletVersion | null;
}

type Step = 'warning' | 'confirm' | 'reveal' | 'backup_confirm';

/**
 * RevealSeedModal — Modal de revelação da frase de recuperação (Pro Mode)
 *
 * SEGURANÇA:
 * - Mnemonic nunca é copiada para clipboard automaticamente
 * - Proteção básica de screenshot via CSS blur
 * - Anti-seleção de texto por padrão
 * - A mnemonic é limpa da UI no fechamento do modal
 * - Nunca é logada
 */
export const RevealSeedModal: React.FC<RevealSeedModalProps> = ({
  isOpen,
  onClose,
  userId,
  walletVersion,
}) => {
  const [step, setStep] = useState<Step>('warning');
  const [isRevealed, setIsRevealed] = useState(false);
  const [words, setWords] = useState<{ index: number; word: string }[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  // Limpa estado sensível ao fechar
  const handleClose = useCallback(() => {
    setWords([]);
    setIsRevealed(false);
    setStep('warning');
    setIsCopied(false);
    setError(null);
    setConfirmChecked(false);
    setBackupConfirmed(false);
    onClose();
  }, [onClose]);

  // Carrega mnemonic ao avançar para o passo de revelação
  const handleReveal = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mnemonic = await MnemonicVault.loadMnemonic(userId);
      if (!mnemonic) {
        setError('Frase de recuperação não encontrada. Pode ser uma carteira legada ou o vault está corrompido.');
        return;
      }
      setWords(getMnemonicWords(mnemonic));
      setStep('reveal');
    } catch {
      setError('Falha ao carregar frase de recuperação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Copia para clipboard com feedback e auto-limpeza
  const handleCopy = useCallback(async () => {
    const mnemonic = words.map(w => w.word).join(' ');
    try {
      await navigator.clipboard.writeText(mnemonic);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      setError('Seu navegador bloqueou a cópia automática. Anote manualmente.');
    }
  }, [words]);

  // Limpa words quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setWords([]);
      setIsRevealed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Carteira legada — sem suporte a seed phrase
  if (walletVersion === 'legacy' || walletVersion === null) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <button style={styles.closeBtn} onClick={handleClose} aria-label="Fechar">
            <X size={20} />
          </button>
          <div style={styles.iconWrapper}>
            <Lock size={40} color="#a78bfa" />
          </div>
          <h2 style={styles.title}>Pro Mode Indisponível</h2>
          <p style={styles.subtitle}>
            Sua carteira foi criada antes da atualização de autocustódia.
          </p>
          <p style={styles.body}>
            A frase de recuperação BIP39 está disponível apenas em carteiras criadas após esta atualização.
            Carteiras mais antigas continuam funcionando normalmente.
          </p>
          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              Para habilitar o Pro Mode no futuro, será necessário criar uma nova carteira e transferir seus fundos.
            </p>
          </div>
          <button style={styles.primaryBtn} onClick={handleClose}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={handleClose} aria-label="Fechar modal">
          <X size={20} />
        </button>

        {/* PASSO 1: Aviso de segurança */}
        {step === 'warning' && (
          <>
            <div style={{ ...styles.iconWrapper, background: 'rgba(239, 68, 68, 0.15)' }}>
              <AlertTriangle size={40} color="#f87171" />
            </div>
            <h2 style={styles.title}>⚠️ Atenção: Zona de Segurança Máxima</h2>
            <p style={styles.subtitle}>
              Você está prestes a ver sua frase de recuperação.
            </p>

            <div style={styles.warningBox}>
              <ul style={styles.warningList}>
                <li>🔴 <strong>Nunca compartilhe</strong> estas palavras com ninguém</li>
                <li>🔴 Nenhuma equipe do WalletNow jamais pedirá sua frase</li>
                <li>🔴 Qualquer pessoa com estas palavras <strong>controla seus fundos</strong></li>
                <li>🔴 Não fotografe nem salve em nuvem (Google Drive, iCloud etc.)</li>
                <li>🟡 Anote em papel e guarde em local físico seguro</li>
              </ul>
            </div>

            <button
              style={styles.primaryBtn}
              onClick={() => setStep('confirm')}
            >
              Entendi os riscos — Continuar
            </button>
            <button style={styles.ghostBtn} onClick={handleClose}>
              Cancelar
            </button>
          </>
        )}

        {/* PASSO 2: Confirmação do usuário */}
        {step === 'confirm' && (
          <>
            <div style={styles.iconWrapper}>
              <Shield size={40} color="#a78bfa" />
            </div>
            <h2 style={styles.title}>Confirmar Identidade</h2>
            <p style={styles.subtitle}>
              Confirme que você entende as responsabilidades de ter acesso à sua frase.
            </p>

            <div style={styles.checkboxContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={e => setConfirmChecked(e.target.checked)}
                  style={styles.checkbox}
                  id="seed-confirm-checkbox"
                />
                <span>
                  Estou em um local seguro e entendo que esta frase dá acesso total à minha carteira.
                  Jamais a compartilharei com ninguém.
                </span>
              </label>
            </div>

            <button
              style={{
                ...styles.primaryBtn,
                opacity: confirmChecked ? 1 : 0.4,
                cursor: confirmChecked ? 'pointer' : 'not-allowed',
              }}
              disabled={!confirmChecked || isLoading}
              onClick={handleReveal}
            >
              {isLoading ? 'Carregando...' : 'Revelar minha frase de recuperação'}
            </button>

            {error && <p style={styles.errorText}>{error}</p>}

            <button style={styles.ghostBtn} onClick={() => setStep('warning')}>
              Voltar
            </button>
          </>
        )}

        {/* PASSO 3: Exibição da seed phrase */}
        {step === 'reveal' && (
          <>
            <div style={styles.iconWrapper}>
              <Shield size={32} color="#34d399" />
            </div>
            <h2 style={styles.title}>Sua Frase de Recuperação</h2>
            <p style={styles.subtitle}>
              12 palavras que garantem acesso total à sua carteira.
            </p>

            {/* Anti-screenshot: blur removível pelo usuário */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  ...styles.seedGrid,
                  filter: isRevealed ? 'none' : 'blur(6px)',
                  userSelect: isRevealed ? 'none' : 'none',
                  transition: 'filter 0.3s ease',
                }}
              >
                {words.map(({ index, word }) => (
                  <div key={index} style={styles.wordCard}>
                    <span style={styles.wordIndex}>{index}</span>
                    <span style={styles.wordText}>{word}</span>
                  </div>
                ))}
              </div>

              {/* Overlay de "clique para revelar" */}
              {!isRevealed && (
                <div style={styles.blurOverlay} onClick={() => setIsRevealed(true)}>
                  <EyeOff size={24} color="#a78bfa" />
                  <span style={styles.blurText}>Clique para revelar</span>
                </div>
              )}
            </div>

            {isRevealed && (
              <div style={styles.actionRow}>
                <button style={styles.hideBtn} onClick={() => setIsRevealed(false)}>
                  <EyeOff size={16} />
                  Ocultar
                </button>
                <button style={styles.copyBtn} onClick={handleCopy}>
                  {isCopied ? (
                    <>
                      <CheckCircle size={16} color="#34d399" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            )}

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.warningBanner}>
              🔴 Anote estas palavras em papel. Não fotografe.
            </div>

            <button
              style={styles.primaryBtn}
              onClick={() => setStep('backup_confirm')}
            >
              Já anotei com segurança — Continuar
            </button>
          </>
        )}

        {/* PASSO 4: Confirmação de backup */}
        {step === 'backup_confirm' && (
          <>
            <div style={{ ...styles.iconWrapper, background: 'rgba(52, 211, 153, 0.15)' }}>
              <CheckCircle size={40} color="#34d399" />
            </div>
            <h2 style={styles.title}>Backup Confirmado</h2>
            <p style={styles.subtitle}>
              Uma última confirmação antes de concluir.
            </p>

            <div style={styles.checkboxContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={backupConfirmed}
                  onChange={e => setBackupConfirmed(e.target.checked)}
                  style={styles.checkbox}
                  id="backup-confirm-checkbox"
                />
                <span>
                  Confirmo que anotei minha frase de recuperação em local físico seguro e sei que o WalletNow
                  não armazena uma cópia desta frase nos servidores.
                </span>
              </label>
            </div>

            <button
              style={{
                ...styles.primaryBtn,
                opacity: backupConfirmed ? 1 : 0.4,
                cursor: backupConfirmed ? 'pointer' : 'not-allowed',
              }}
              disabled={!backupConfirmed}
              onClick={handleClose}
            >
              ✅ Concluir
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Estilos inline (consistentes com o design system WalletNow) ──────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    borderRadius: '20px',
    padding: '32px 28px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: '8px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    background: 'rgba(167, 139, 250, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '20px',
    fontWeight: 700,
    textAlign: 'center',
    margin: '0 0 8px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  body: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: '0 0 20px',
  },
  warningBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  warningList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: '#fca5a5',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  warningBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: '13px',
    textAlign: 'center',
    margin: '16px 0',
  },
  infoBox: {
    background: 'rgba(167, 139, 250, 0.1)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    borderRadius: '12px',
    padding: '14px 18px',
    marginBottom: '20px',
  },
  infoText: {
    color: '#c4b5fd',
    fontSize: '13px',
    margin: 0,
    lineHeight: 1.5,
    textAlign: 'center',
  },
  checkboxContainer: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  checkboxLabel: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    color: '#cbd5e1',
    fontSize: '13px',
    lineHeight: 1.6,
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
    marginTop: '2px',
    accentColor: '#a78bfa',
    cursor: 'pointer',
  },
  seedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '16px',
  },
  wordCard: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    borderRadius: '10px',
    padding: '10px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  wordIndex: {
    color: '#6b7280',
    fontSize: '11px',
    fontWeight: 600,
    minWidth: '16px',
  },
  wordText: {
    color: '#e2e8f0',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  blurOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    borderRadius: '12px',
  },
  blurText: {
    color: '#a78bfa',
    fontSize: '14px',
    fontWeight: 600,
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
  },
  hideBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#94a3b8',
    padding: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  copyBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(167, 139, 250, 0.15)',
    border: '1px solid rgba(167, 139, 250, 0.3)',
    borderRadius: '10px',
    color: '#a78bfa',
    padding: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  primaryBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '10px',
    transition: 'opacity 0.2s',
  },
  ghostBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#6b7280',
    padding: '12px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  errorText: {
    color: '#f87171',
    fontSize: '13px',
    textAlign: 'center',
    margin: '8px 0',
  },
};
