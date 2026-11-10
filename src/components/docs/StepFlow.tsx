/**
 * @module src/components/docs/StepFlow.tsx
 * @description Componente de interface do portal de documentação técnica e TestnetKit (StepFlow) (exporta: StepFlow).
 */
/**
 * WalletNow Developer Portal — StepFlow
 *
 * Componente de fluxo visual em etapas com estados animados.
 * Usado no Playground (steps em tempo real) e no How It Works.
 */

import React from 'react';
import { CheckCircle, Circle, Loader, XCircle } from 'lucide-react';
import type { PlaygroundStep } from '../../lib/docs/playgroundEngine';

interface StepFlowProps {
  steps: PlaygroundStep[];
  compact?: boolean;
}

export default function StepFlow({ steps, compact = false }: StepFlowProps) {
  return (
    <div className={`sf-root${compact ? ' sf-root--compact' : ''}`}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id} className="sf-item">
            {/* Ícone + linha vertical */}
            <div className="sf-track">
              <div className={`sf-icon sf-icon--${step.status}`}>
                {step.status === 'pending' && <Circle size={compact ? 14 : 16} />}
                {step.status === 'running' && <Loader size={compact ? 14 : 16} className="sf-spin" />}
                {step.status === 'done' && <CheckCircle size={compact ? 14 : 16} />}
                {step.status === 'error' && <XCircle size={compact ? 14 : 16} />}
              </div>
              {!isLast && <div className={`sf-line sf-line--${step.status === 'done' ? 'active' : 'idle'}`} />}
            </div>

            {/* Conteúdo */}
            <div className="sf-content">
              <span className={`sf-label sf-label--${step.status}`}>{step.label}</span>
              {step.detail && !compact && (
                <span className="sf-detail">{step.detail}</span>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        .sf-root { display: flex; flex-direction: column; gap: 0; }
        .sf-root--compact { gap: 0; }
        .sf-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-height: 36px;
        }
        .sf-root--compact .sf-item { min-height: 28px; }

        .sf-track {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 20px;
        }
        .sf-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: color 0.3s;
        }
        .sf-icon--pending { color: var(--text-disabled); }
        .sf-icon--running { color: var(--accent); }
        .sf-icon--done { color: #10b981; }
        .sf-icon--error { color: #f43f5e; }

        .sf-spin {
          animation: sf-rotate 1s linear infinite;
        }
        @keyframes sf-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sf-line {
          flex: 1;
          width: 2px;
          min-height: 16px;
          margin: 2px 0;
          border-radius: 1px;
          transition: background 0.4s;
        }
        .sf-line--active { background: rgba(16,185,129,0.4); }
        .sf-line--idle { background: var(--border-subtle); }

        .sf-content {
          padding-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 1px;
        }
        .sf-root--compact .sf-content { padding-bottom: 6px; }

        .sf-label {
          font-size: 13px;
          font-weight: 500;
          transition: color 0.3s;
          font-family: 'Inter', sans-serif;
        }
        .sf-label--pending { color: var(--text-disabled); }
        .sf-label--running { color: var(--text-primary); }
        .sf-label--done { color: var(--text-secondary); }
        .sf-label--error { color: #f43f5e; }

        .sf-detail {
          font-size: 11px;
          color: var(--text-tertiary);
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  );
}
