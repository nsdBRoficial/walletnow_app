/**
 * @module src/components/docs/CodeBlock.tsx
 * @description Componente de interface do portal de documentação técnica e TestnetKit (CodeBlock) (exporta: CodeLang, CodeBlock).
 */
/**
 * WalletNow Developer Portal — CodeBlock
 *
 * Syntax highlight com CSS puro + JetBrains Mono (já carregada).
 * Botão "Copy" com feedback visual. Zero dependências externas.
 */

import React, { useState, useCallback } from 'react';
import { useDocsI18n } from '../../contexts/DocsI18nContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CodeLang = 'typescript' | 'bash' | 'json' | 'text';

interface CodeBlockProps {
  code: string;
  lang?: CodeLang;
  filename?: string;
  showCopy?: boolean;
  highlight?: number[]; // linha a destacar (1-indexed)
}

// ─── Tokenizer simples (sem deps externas) ───────────────────────────────────

function tokenizeTS(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    // Strings
    .replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g,
      '<span class="cb-string">$1</span>')
    // Comentários de linha
    .replace(/(\/\/[^\n]*)/g, '<span class="cb-comment">$1</span>')
    // Keywords
    .replace(/\b(import|export|from|const|let|var|async|await|return|new|class|interface|type|extends|implements|if|else|try|catch|throw|true|false|null|undefined|void|Promise)\b/g,
      '<span class="cb-keyword">$1</span>')
    // Tipos capitalizados
    .replace(/\b([A-Z][A-Za-z0-9_]+)\b/g,
      '<span class="cb-type">$1</span>')
    // Números
    .replace(/\b(\d+)\b/g, '<span class="cb-number">$1</span>');
}

function tokenizeBash(code: string): string {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/^(#[^\n]*)/gm, '<span class="cb-comment">$1</span>')
    .replace(/^(npm|npx|pnpm|yarn|node|git|cd|mkdir)\b/gm, '<span class="cb-keyword">$1</span>');
}

function tokenizeJSON(code: string): string {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="cb-json-key">$1</span>:')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="cb-string">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="cb-keyword">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="cb-number">$1</span>');
}

function tokenize(code: string, lang: CodeLang): string {
  switch (lang) {
    case 'typescript': return tokenizeTS(code);
    case 'bash': return tokenizeBash(code);
    case 'json': return tokenizeJSON(code);
    default: return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CodeBlock({
  code,
  lang = 'typescript',
  filename,
  showCopy = true,
  highlight = [],
}: CodeBlockProps) {
  const { t } = useDocsI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const langLabel: Record<CodeLang, string> = {
    typescript: 'TypeScript',
    bash: 'Bash',
    json: 'JSON',
    text: 'Text',
  };

  const lines = code.split('\n');

  return (
    <div className="cb-root">
      {/* Header */}
      <div className="cb-header">
        <div className="cb-header-left">
          {filename && <span className="cb-filename">{filename}</span>}
          {!filename && <span className="cb-lang">{langLabel[lang]}</span>}
        </div>
        {showCopy && (
          <button className="cb-copy" onClick={handleCopy} aria-label="Copy code">
            {copied ? t.common.copiedBtn : t.common.copyBtn}
          </button>
        )}
      </div>

      {/* Code */}
      <div className="cb-scroll">
        <table className="cb-table">
          <tbody>
            {lines.map((line, i) => {
              const lineNum = i + 1;
              const isHighlighted = highlight.includes(lineNum);
              const html = tokenize(line || ' ', lang);
              return (
                <tr key={i} className={isHighlighted ? 'cb-line cb-line--highlighted' : 'cb-line'}>
                  <td className="cb-ln" aria-hidden="true">{lineNum}</td>
                  <td
                    className="cb-code"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        .cb-root {
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          overflow: hidden;
          background: var(--docs-code-bg, #0d0d0f);
          font-size: 13px;
          line-height: 1.6;
        }
        .cb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(255,255,255,0.02);
        }
        .cb-header-left { display: flex; align-items: center; gap: 8px; }
        .cb-filename, .cb-lang {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .cb-copy {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 3px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .cb-copy:hover { color: var(--accent); border-color: var(--accent); }
        .cb-scroll { overflow-x: auto; }
        .cb-table { border-collapse: collapse; width: 100%; min-width: 100%; }
        .cb-line { display: table-row; }
        .cb-line--highlighted { background: rgba(0,255,153,0.06); }
        .cb-ln {
          display: table-cell;
          width: 40px;
          min-width: 40px;
          padding: 0 12px 0 16px;
          text-align: right;
          color: var(--text-disabled);
          font-family: 'JetBrains Mono', monospace;
          user-select: none;
          vertical-align: top;
        }
        .cb-code {
          display: table-cell;
          padding: 0 16px 0 0;
          font-family: 'JetBrains Mono', monospace;
          white-space: pre;
          color: #e2e8f0;
          vertical-align: top;
        }
        /* Syntax colors */
        .cb-keyword { color: #c792ea; }
        .cb-string { color: #c3e88d; }
        .cb-comment { color: #546e7a; font-style: italic; }
        .cb-type { color: #82aaff; }
        .cb-number { color: #f78c6c; }
        .cb-json-key { color: #82aaff; }
      `}</style>
    </div>
  );
}
