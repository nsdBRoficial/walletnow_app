/**
 * @module src\components\modals\ExportSecretKeyModal.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Eye, EyeOff, Copy, CheckCircle, AlertTriangle, X, KeyRound } from 'lucide-react';
import { DeviceVault } from '../../security/deviceVault';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';

interface ExportSecretKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'warning' | 'confirm' | 'reveal';

/**
 * ExportSecretKeyModal — Modal de revelação da Secret Key para contas importadas
 *
 * SEGURANÇA:
 * - Secret Key não é copiada automaticamente.
 * - Proteção de screenshot via CSS blur.
 * - Anti-seleção de texto por padrão.
 * - Limpeza no unmount.
 */
export const ExportSecretKeyModal: React.FC<ExportSecretKeyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { activeAccount } = useWallet();
  const [step, setStep] = useState<Step>('warning');
  const [isRevealed, setIsRevealed] = useState(false);
  const [secretKey, setSecretKey] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const handleClose = useCallback(() => {
    setSecretKey('');
    setIsRevealed(false);
    setStep('warning');
    setIsCopied(false);
    setError(null);
    setConfirmChecked(false);
    onClose();
  }, [onClose]);

  const handleReveal = useCallback(async () => {
    if (!user || !activeAccount) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. First try to get it from volatile memory as it might be loaded
      let sk = DeviceVault.getVolatileSecret();

      // 2. If not available in volatile memory, decrypt it from local storage
      if (!sk) {
        let storageKey = `@walletnow:secret:${user.id}:${activeAccount.stellar_public_key}`;
        let rawStorage = localStorage.getItem(storageKey);
        
        if (!rawStorage && (activeAccount.is_default || activeAccount.account_type === 'legacy' || activeAccount.account_type === 'generated')) {
            storageKey = `@walletnow:secret:${user.id}`;
            rawStorage = localStorage.getItem(storageKey);
        }

        if (rawStorage) {
            const vaultData = JSON.parse(rawStorage);
            const encKey = await DeviceVault.generateEncryptionKey(user.id);
            sk = await DeviceVault.decryptSecret(vaultData.ciphertext, vaultData.iv, encKey);
        }
      }

      if (!sk) {
        setError('Chave secreta não encontrada no cofre criptografado local.');
        return;
      }

      setSecretKey(sk);
      setStep('reveal');
    } catch {
      setError('Falha ao decodificar a Chave Secreta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [user, activeAccount]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secretKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      setError('Seu navegador bloqueou a cópia automática. Anote manualmente.');
    }
  }, [secretKey]);

  useEffect(() => {
    if (!isOpen) {
      setSecretKey('');
      setIsRevealed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={handleClose} aria-label="Fechar modal">
          <X size={20} />
        </button>

        {step === 'warning' && (
          <>
            <div style={{ ...styles.iconWrapper, background: 'rgba(239, 68, 68, 0.15)' }}>
              <AlertTriangle size={40} color="#f87171" />
            </div>
            <h2 style={styles.title}>⚠️ Danger Zone</h2>
            <p style={styles.subtitle}>
              Você está prestes a ver sua <strong>Chave Secreta (Secret Key)</strong>.
            </p>

            <div style={styles.warningBox}>
              <ul style={styles.warningList}>
                <li>🔴 <strong>Nunca compartilhe</strong> esta chave com ninguém</li>
                <li>🔴 Qualquer pessoa com esta chave <strong>controla todos os seus fundos</strong> nesta conta</li>
                <li>🔴 Phishers e golpistas pedirão por esta chave. Não caia em golpes!</li>
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

        {step === 'confirm' && (
          <>
            <div style={styles.iconWrapper}>
              <Shield size={40} color="#a78bfa" />
            </div>
            <h2 style={styles.title}>Confirmar Acesso</h2>
            <p style={styles.subtitle}>
              Confirme que você entende o risco de exibir sua chave secreta.
            </p>

            <div style={styles.checkboxContainer}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={e => setConfirmChecked(e.target.checked)}
                  style={styles.checkbox}
                  id="secret-confirm-checkbox"
                />
                <span>
                  Estou ciente de que estou visualizando uma informação de segurança crítica e me responsabilizo pela sua guarda segura.
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
              {isLoading ? 'Carregando...' : 'Revelar Chave Secreta'}
            </button>

            {error && <p style={styles.errorText}>{error}</p>}

            <button style={styles.ghostBtn} onClick={() => setStep('warning')}>
              Voltar
            </button>
          </>
        )}

        {step === 'reveal' && (
          <>
            <div style={styles.iconWrapper}>
              <KeyRound size={32} color="#34d399" />
            </div>
            <h2 style={styles.title}>Sua Chave Secreta</h2>
            <p style={styles.subtitle}>
              Copie com cuidado. Esta conta é gerida por esta chave.
            </p>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <div
                style={{
                  ...styles.secretKeyBox,
                  filter: isRevealed ? 'none' : 'blur(8px)',
                  userSelect: isRevealed ? 'text' : 'none',
                  transition: 'filter 0.3s ease',
                  wordBreak: 'break-all',
                }}
              >
                {secretKey}
              </div>

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

            <button
              style={styles.primaryBtn}
              onClick={handleClose}
            >
              Concluído
            </button>
          </>
        )}
      </div>
    </div>
  );
};

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
  secretKeyBox: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    borderRadius: '10px',
    padding: '20px 16px',
    color: '#e2e8f0',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    textAlign: 'center',
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
