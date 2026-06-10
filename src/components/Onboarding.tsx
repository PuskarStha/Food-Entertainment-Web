import React, { useState } from 'react';
import Logo from './Logo';
import { Sparkles, ArrowRight, BookOpen } from 'lucide-react';

interface OnboardingProps {
  onEnter: (username: string) => void;
}

export default function Onboarding({ onEnter }: OnboardingProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEnter(username.trim() || 'Cozy Companion');
  };

  return (
    <div 
      id="onboarding-screen"
      className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 selection:bg-amber-100 selection:text-amber-900 transition-colors duration-300"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#EFECE6] p-8 md:p-10 shadow-sm flex flex-col items-center animate-fade-in">
        {/* Beautiful vector logo */}
        <Logo size={90} className="mb-5" />

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[#1B4332] tracking-tight flex items-center justify-center gap-2">
            Food & Entertainment
            <Sparkles size={20} className="text-amber-500 fill-amber-500 animate-pulse shrink-0" />
          </h1>
          <p className="text-xs text-[#8D8880] mt-2.5 max-w-sm leading-relaxed mx-auto">
            Your offline-first tracker. Lovingly log your private movie watchlists, TV series, and restaurant diaries.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label htmlFor="username-input" className="block text-xs font-semibold tracking-wider text-[#8D8880] uppercase">
              How shall we call you?
            </label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name... (optional)"
              maxLength={24}
              className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-sm transition-colors duration-200 outline-none placeholder:text-[#8D8880]/60 text-[#4A443F]"
            />
          </div>

          <button
            id="enter-workspace-btn"
            type="submit"
            className="w-full py-3.5 bg-[#1B4332] hover:bg-[#143225] text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm flex items-center justify-center gap-2 group cursor-pointer hover:translate-y-[-1px] active:translate-y-[1px]"
          >
            Enter Your Workspace
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#EFECE6] w-full flex items-center justify-center gap-2 text-xs text-gray-400">
          <BookOpen id="private-badge" size={14} />
          <span>100% Client-Side & Persistent (IndexedDB)</span>
        </div>
      </div>
    </div>
  );
}
