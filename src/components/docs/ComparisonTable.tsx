/**
 * @module src\components\docs\ComparisonTable.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — ComparisonTable
 *
 * Tabela de comparação reutilizável (WhyWalletNow + WhyNotYourself).
 */

import React from 'react';
import { Check, X } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  diy: string | boolean;
  wn: string | boolean;
}

interface ComparisonTableProps {
  headers: [string, string, string];
  rows: ComparisonRow[];
  conclusion?: string;
}

export default function ComparisonTable({ headers, rows, conclusion }: ComparisonTableProps) {
  const renderCell = (val: string | boolean) => {
    if (val === true) return <span className="ct-check"><Check size={14} /></span>;
    if (val === false) return <span className="ct-cross"><X size={14} /></span>;
    return <span className="ct-text">{val}</span>;
  };

  return (
    <div className="ct-root">
      <div className="ct-scroll">
        <table className="ct-table">
          <thead>
            <tr>
              <th className="ct-th ct-th--feature">{headers[0]}</th>
              <th className="ct-th ct-th--diy">{headers[1]}</th>
              <th className="ct-th ct-th--wn">{headers[2]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="ct-row">
                <td className="ct-td ct-td--feature">{row.feature}</td>
                <td className="ct-td ct-td--diy">{renderCell(row.diy)}</td>
                <td className="ct-td ct-td--wn">{renderCell(row.wn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conclusion && (
        <div className="ct-conclusion">
          <span>{conclusion}</span>
        </div>
      )}

      <style>{`
        .ct-root { width: 100%; }
        .ct-scroll { overflow-x: auto; }
        .ct-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .ct-th {
          padding: 10px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-tertiary);
          border-bottom: 1px solid var(--border-subtle);
        }
        .ct-th--wn { color: var(--accent); }

        .ct-row { border-bottom: 1px solid var(--border-light); transition: background 0.15s; }
        .ct-row:hover { background: var(--bg-hover); }

        .ct-td {
          padding: 11px 16px;
          vertical-align: middle;
        }
        .ct-td--feature { color: var(--text-secondary); font-weight: 500; }
        .ct-td--diy { color: var(--text-tertiary); }
        .ct-td--wn { color: var(--text-primary); }

        .ct-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          background: rgba(0,255,153,0.1);
          color: var(--accent);
          border-radius: 50%;
        }
        .ct-cross {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          color: var(--text-disabled);
        }
        .ct-text { font-family: 'JetBrains Mono', monospace; font-size: 11px; }

        .ct-conclusion {
          margin-top: 20px;
          padding: 16px 20px;
          background: linear-gradient(90deg, rgba(0,255,153,0.06), transparent);
          border-left: 3px solid var(--accent);
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
