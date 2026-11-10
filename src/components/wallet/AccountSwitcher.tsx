/**
 * @module src\components\wallet\AccountSwitcher.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Wallet, Plus, LogIn, Check, ShieldCheck, KeyRound, Globe } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import { useNavigate } from 'react-router-dom';

export default function AccountSwitcher() {
    const { accounts, activeAccount, switchAccount, loading: walletLoading } = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitch = async (id: string) => {
        await switchAccount(id);
        setIsOpen(false);
    };

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'legacy': return <Globe className="w-4 h-4 text-blue-400" />;
            case 'imported': return <KeyRound className="w-4 h-4 text-purple-400" />;
            case 'generated': return <ShieldCheck className="w-4 h-4 text-[#00E676]" />;
            default: return <Wallet className="w-4 h-4 text-gray-400" />;
        }
    };

    if (!activeAccount) {
        if (walletLoading) {
            return (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-xs text-gray-400">Carregando contas...</span>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-400">Conta não configurada</span>
            </div>
        );
    }

    return (
        <div className="relative z-50" ref={dropdownRef}>
            {/* Active Account Trigger */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#161616] hover:bg-[#222] border border-white/10 transition-colors shadow-lg"
            >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5">
                    {getAccountIcon(activeAccount.account_type)}
                </div>
                <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white leading-tight">
                        {activeAccount.label}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono tracking-wider">
                        {activeAccount.stellar_public_key.slice(0, 4)}...{activeAccount.stellar_public_key.slice(-4)}
                    </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-2 w-64 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 pb-2 mb-2 border-b border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold px-2">Suas Carteiras</p>
                    </div>

                    <div className="max-h-60 overflow-y-auto overflow-x-hidden px-2 space-y-1 scrollbar-hide">
                        {accounts.map(account => (
                            <button
                                key={account.id}
                                onClick={() => handleSwitch(account.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors ${
                                    activeAccount.id === account.id 
                                    ? 'bg-[#00E676]/10 border border-[#00E676]/20' 
                                    : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        {getAccountIcon(account.account_type)}
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className={`text-sm font-medium ${activeAccount.id === account.id ? 'text-[#00E676]' : 'text-gray-200'}`}>
                                            {account.label}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                            {account.stellar_public_key.slice(0, 4)}...{account.stellar_public_key.slice(-4)}
                                        </span>
                                    </div>
                                </div>
                                {activeAccount.id === account.id && (
                                    <Check className="w-4 h-4 text-[#00E676]" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/5 px-2">
                        <button 
                            onClick={() => { setIsOpen(false); navigate('/settings'); }}
                            className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                            <LogIn className="w-4 h-4" />
                            <span className="text-sm font-medium">Gerenciar Carteiras</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
