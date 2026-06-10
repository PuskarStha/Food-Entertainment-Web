import React, { useState } from 'react';
import Logo from './Logo';
import {
  Sparkles, ArrowRight, FolderOpen, HardDrive, Shield, CheckCircle2, Loader2
} from 'lucide-react';
import { isFileSystemSupported, pickFolder } from '../storage';
import { setActiveFolderHandle, getActiveFolderHandle } from '../db';

interface OnboardingProps {
  onEnter: (username: string, folderName: string | null) => void;
}

type StorageChoice = 'folder' | 'browser';

export default function Onboarding({ onEnter }: OnboardingProps) {
  const [username, setUsername] = useState(localStorage.getItem('cozy-user-name') || '');
  const [storageChoice, setStorageChoice] = useState<StorageChoice>(
    (localStorage.getItem('cozy-storage-mode') as StorageChoice) || 'folder'
  );
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(
    localStorage.getItem('cozy-folder-name') || null
  );
  const [pickedHandle, setPickedHandle] = useState<FileSystemDirectoryHandle | null>(
    getActiveFolderHandle() || null
  );
  const [isPicking, setIsPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const fsSupported = isFileSystemSupported();

  const handlePickFolder = async () => {
    setIsPicking(true);
    setPickError(null);
    try {
      const handle = await pickFolder();
      if (handle) {
        setStorageChoice('folder');
        setPickedHandle(handle);
        setSelectedFolderName(handle.name);
      }
    } catch (err) {
      setPickError('Could not access the folder. Please try again.');
      console.error(err);
    } finally {
      setIsPicking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (storageChoice === 'folder') {
      if (!pickedHandle) {
        setPickError('Please choose a folder first.');
        return;
      }
      setActiveFolderHandle(pickedHandle);
      localStorage.setItem('cozy-storage-mode', 'folder');
      localStorage.setItem('cozy-folder-name', pickedHandle.name);
    } else {
      setActiveFolderHandle(null);
      localStorage.setItem('cozy-storage-mode', 'browser');
      localStorage.removeItem('cozy-folder-name');
    }

    onEnter(username.trim() || 'Cozy Companion', selectedFolderName);
  };

  return (
    <div
      id="onboarding-screen"
      className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 selection:bg-amber-100 selection:text-amber-900"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#EFECE6] shadow-sm flex flex-col items-center overflow-hidden">
        {/* Top brand strip */}
        <div className="w-full bg-[#1B4332] px-8 pt-8 pb-10 flex flex-col items-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full -ml-8 -mb-8 blur-xl" />
          <Logo size={72} className="mb-4 relative" />
          <h1 className="font-serif font-semibold text-2xl tracking-tight text-white flex items-center gap-2 relative">
            Food & Entertainment
            <Sparkles size={18} className="text-amber-400 fill-amber-400 animate-pulse" />
          </h1>
          <p className="text-xs text-[#D8F3DC]/80 mt-2 text-center leading-relaxed max-w-xs relative">
            Your personal cozy tracker — movies, series, and restaurant diaries. Fully private, always offline-first.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full px-8 py-7 space-y-6">
          {/* Name input */}
          <div className="space-y-2">
            <label htmlFor="username-input" className="block text-xs font-bold tracking-wider text-[#8D8880] uppercase">
              Your Name
            </label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name (optional)"
              maxLength={24}
              className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-sm transition-colors outline-none placeholder:text-[#8D8880]/60 text-[#4A443F]"
            />
          </div>

          {/* Storage choice */}
          <div className="space-y-3">
            <label className="block text-xs font-bold tracking-wider text-[#8D8880] uppercase">
              Where should we save your data?
            </label>

            <div className="space-y-2.5">
              {/* Option 1: Choose a folder */}
              {fsSupported && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={handlePickFolder}
                    disabled={isPicking}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer disabled:opacity-70 ${
                      storageChoice === 'folder'
                        ? 'border-[#1B4332] bg-[#1B4332]/4'
                        : 'border-[#EFECE6] bg-[#FAF9F6] hover:border-[#1B4332]/30'
                    }`}
                  >
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      storageChoice === 'folder' ? 'bg-[#1B4332] text-white' : 'bg-[#EFECE6] text-[#8D8880]'
                    }`}>
                      {isPicking ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#1B4332]">Choose a Folder</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Recommended</span>
                      </div>
                      
                      {storageChoice === 'folder' && selectedFolderName ? (
                        <p className="text-[11px] text-[#1B4332] mt-1 font-semibold flex items-center gap-1.5 leading-relaxed bg-[#1B4332]/10 p-1.5 rounded inline-block">
                          📁 {selectedFolderName} <span className="text-[#8D8880] font-normal text-[9px] ml-1 uppercase underline hover:text-[#1B4332]">Change</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#8D8880] mt-1 leading-relaxed">
                          Pick any folder on your device — Documents, Desktop, USB drive. Your data saves as files there and reloads next time you choose the same folder.
                        </p>
                      )}
                    </div>
                  </button>
                  {pickError && storageChoice === 'folder' && (
                    <p className="text-[11px] text-red-600 px-2">{pickError}</p>
                  )}
                </div>
              )}

              {/* Option 2: Browser storage */}
              <button
                type="button"
                onClick={() => setStorageChoice('browser')}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                  storageChoice === 'browser'
                    ? 'border-[#1B4332] bg-[#1B4332]/4'
                    : 'border-[#EFECE6] bg-[#FAF9F6] hover:border-[#1B4332]/30'
                }`}
              >
                <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  storageChoice === 'browser' ? 'bg-[#1B4332] text-white' : 'bg-[#EFECE6] text-[#8D8880]'
                }`}>
                  <HardDrive size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1B4332]">Keep in This Browser</p>
                  <p className="text-[11px] text-[#8D8880] mt-1 leading-relaxed">
                    Data stays inside this browser only. No files created. Convenient but data may be lost if you clear browser storage.
                  </p>
                </div>
              </button>
            </div>

          </div>

          {/* Submit */}
          <button
            id="enter-workspace-btn"
            type="submit"
            className="w-full py-3.5 bg-[#1B4332] hover:bg-[#143225] text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 group cursor-pointer hover:-translate-y-px active:translate-y-px"
          >
            {username ? `Continue as ${username}` : 'Create Your Sanctuary'}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Privacy note */}
          <div className="flex items-start gap-2.5 text-[10.5px] text-[#8D8880] pt-1">
            <Shield size={13} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              All data stays <strong className="text-[#4A443F]">entirely on your device</strong>. No accounts, no cloud sync, no tracking — ever.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
