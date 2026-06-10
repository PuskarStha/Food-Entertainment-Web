import React, { useState, useEffect } from 'react';
import { db, setActiveFolderHandle } from './db';
import Onboarding from './components/Onboarding';
import WatchlistModule from './components/WatchlistModule';
import RestaurantModule from './components/RestaurantModule';
import InstallPrompt from './components/InstallPrompt';
import Logo from './components/Logo';
import {
  Film, Utensils, Sparkles, User, Coffee, Tv, Edit3, Calendar,
  Heart, BadgeCheck, FolderOpen, HardDrive, Loader2, FolderCheck, LogOut
} from 'lucide-react';
import {
  getStoredDirectoryHandle,
  checkPermission,
  requestPermission,
  clearStoredDirectoryHandle,
  isFileSystemSupported
} from './storage';

// App state machine
type AppState = 'loading' | 'reconnect' | 'onboarding' | 'workspace';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [username, setUsername] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'Movie' | 'Series' | 'Restaurant' | 'Profile'>('Movie');

  // Profile fields
  const [gender, setGender] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [favGenre, setFavGenre] = useState<string>('');
  const [favCuisine, setFavCuisine] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Folder state
  const [storedHandle, setStoredHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [storedFolderName, setStoredFolderName] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Stats
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [restaurantCount, setRestaurantCount] = useState<number>(0);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Morning';
    if (hr < 17) return 'Afternoon';
    return 'Evening';
  };

  const getFirstName = (name: string) => {
    if (!name) return 'Cozy Guest';
    return name.trim().split(/\s+/)[0];
  };

  // Fetch counts when profile is viewed or workspace loads
  useEffect(() => {
    if (appState === 'workspace') {
      const fetchCounts = async () => {
        try {
          const wCount = await db.watchlist.count();
          const rCount = await db.restaurants.count();
          setWatchlistCount(wCount);
          setRestaurantCount(rCount);
        } catch (err) {
          console.error('Failed to query counts:', err);
        }
      };
      fetchCounts();
    }
  }, [activeTab, appState]);

  // ── Startup initialization ─────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const savedName = localStorage.getItem('cozy-user-name');
        const storageMode = localStorage.getItem('cozy-storage-mode');
        const folderName = localStorage.getItem('cozy-folder-name');

        // Load profile preferences
        setGender(localStorage.getItem('cozy-user-gender') || '');
        setDob(localStorage.getItem('cozy-user-dob') || '');
        setFavGenre(localStorage.getItem('cozy-user-fav-genre') || '');
        setFavCuisine(localStorage.getItem('cozy-user-fav-cuisine') || '');

        if (savedName) setUsername(savedName);

        if (storageMode === 'folder' && isFileSystemSupported()) {
          // Try to restore folder handle
          const handle = await getStoredDirectoryHandle();
          if (handle) {
            setStoredHandle(handle);
            setStoredFolderName(folderName || handle.name);
            // Check if permission is already granted (e.g. same session)
            const hasPermission = await checkPermission(handle);
            if (hasPermission) {
              setActiveFolderHandle(handle);
              const isLoggedOut = localStorage.getItem('cozy-logged-out') === 'true';
              setAppState(savedName && !isLoggedOut ? 'workspace' : 'onboarding');
            } else {
              // Need user to click to re-grant permission
              setAppState('reconnect');
            }
            return;
          }
        }

        if (storageMode === 'browser' || !storageMode) {
          // Browser storage mode — no folder needed
          setActiveFolderHandle(null);
          const isLoggedOut = localStorage.getItem('cozy-logged-out') === 'true';
          setAppState(savedName && !isLoggedOut ? 'workspace' : 'onboarding');
          return;
        }

        // Fallback: no prior session
        setAppState('onboarding');
      } catch (err) {
        console.error('Startup error:', err);
        setAppState('onboarding');
      }
    };

    init();
  }, []);

  // ── Reconnect to folder (must be inside a click handler per browser rules) ─
  const handleReconnect = async () => {
    if (!storedHandle) return;
    setIsReconnecting(true);
    try {
      const granted = await requestPermission(storedHandle);
      if (granted) {
        setActiveFolderHandle(storedHandle);
        const savedName = localStorage.getItem('cozy-user-name');
        const isLoggedOut = localStorage.getItem('cozy-logged-out') === 'true';
        setAppState(savedName && !isLoggedOut ? 'workspace' : 'onboarding');
      } else {
        // Permission denied — fall back to choosing again
        await clearStoredDirectoryHandle();
        setAppState('onboarding');
      }
    } catch {
      setAppState('onboarding');
    } finally {
      setIsReconnecting(false);
    }
  };

  // ── Enter workspace from onboarding ────────────────────────────────────────
  const handleEnterWorkspace = (name: string, folderName: string | null) => {
    localStorage.setItem('cozy-user-name', name);
    localStorage.removeItem('cozy-logged-out');
    setUsername(name);
    setStoredFolderName(folderName);
    setActiveTab('Movie');
    setAppState('workspace');
  };

  // ── Go back to onboarding to change folder / storage ───────────────────────
  const handleChangeStorage = async () => {
    await clearStoredDirectoryHandle();
    setActiveFolderHandle(null);
    localStorage.removeItem('cozy-storage-mode');
    localStorage.removeItem('cozy-folder-name');
    setStoredFolderName(null);
    setStoredHandle(null);
    setAppState('onboarding');
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    localStorage.setItem('cozy-logged-out', 'true');
    setAppState('onboarding');
  };

  const currentMode = localStorage.getItem('cozy-storage-mode');
  const currentFolderName = localStorage.getItem('cozy-folder-name');

  // ── STATES ─────────────────────────────────────────────────────────────────

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
        <Logo size={80} className="animate-pulse" />
        <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Loading your cozy sanctuary…
        </span>
      </div>
    );
  }

  if (appState === 'reconnect') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-[#EFECE6] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#1B4332] px-8 py-8 flex flex-col items-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl" />
            <Logo size={60} className="mb-3 relative" />
            <p className="text-sm font-serif font-semibold text-white relative">Welcome back!</p>
          </div>

          <div className="px-8 py-7 text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <FolderCheck size={28} className="text-amber-600" />
            </div>

            <div>
              <h2 className="text-base font-serif font-semibold text-[#1B4332]">Reconnect your data folder</h2>
              <p className="text-xs text-[#8D8880] mt-2 leading-relaxed">
                Your data is stored in:
              </p>
              <p className="mt-2 font-mono text-sm font-bold text-[#4A443F] bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-4 py-2.5 inline-block">
                📁 {storedFolderName || 'Your saved folder'}
              </p>
              <p className="text-xs text-[#8D8880] mt-3 leading-relaxed">
                Click below to reconnect. Your browser needs a quick confirmation before reading your files.
              </p>
            </div>

            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="w-full py-3.5 bg-[#1B4332] hover:bg-[#143225] text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {isReconnecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FolderOpen size={16} />
              )}
              {isReconnecting ? 'Reconnecting…' : 'Reconnect to My Folder'}
            </button>

            <button
              onClick={handleChangeStorage}
              className="text-xs text-[#8D8880] hover:text-[#4A443F] underline cursor-pointer transition-colors"
            >
              Choose a different folder instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'onboarding') {
    return <Onboarding onEnter={handleEnterWorkspace} />;
  }

  // ── WORKSPACE ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#4A443F] flex flex-col selection:bg-amber-100 selection:text-amber-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#EFECE6] px-4 py-3 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="font-serif font-semibold text-base tracking-tight text-[#1B4332] leading-tight">
                Food & Entertainment
              </h1>
              <p className="text-[10px] text-[#8D8880] font-sans flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500 fill-amber-500" />
                Offline Sanctuary Space
              </p>
            </div>
          </div>

          {/* Storage status pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#FAF9F6] border border-[#EFECE6] px-3 py-1.5 rounded-full text-[10px] font-semibold text-[#8D8880]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332] animate-pulse" />
            {currentMode === 'folder' && currentFolderName ? (
              <span className="flex items-center gap-1">
                <FolderCheck size={11} className="text-emerald-600" />
                <span className="font-bold text-[#1B4332] truncate max-w-[120px]">{currentFolderName}</span>
              </span>
            ) : (
              <span>Browser Storage</span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-6 px-4 sm:px-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="bg-[#FAF9F6] min-h-[450px]">
          {activeTab === 'Movie' || activeTab === 'Series' ? (
            <div className="animate-fade-in-simple space-y-4">
              <div className="text-left border-b border-[#EFECE6] pb-3">
                <h2 className="font-serif text-2xl md:text-3xl font-light text-[#1B4332] tracking-tight">
                  Good {getGreeting()}, <span className="italic">{getFirstName(username)}</span>
                </h2>
                <p className="mt-1 text-xs text-[#8D8880]">
                  Track seen {activeTab === 'Movie' ? 'movie masterpieces' : 'TV series episodes'} and record cozy verdicts offline.
                </p>
              </div>
              <WatchlistModule username={username} activeType={activeTab} />
            </div>
          ) : activeTab === 'Restaurant' ? (
            <div className="animate-fade-in-simple space-y-4">
              <div className="text-left border-b border-[#EFECE6] pb-3">
                <h2 className="font-serif text-2xl md:text-3xl font-light text-[#1B4332] tracking-tight">
                  Happy Dining, <span className="italic">{getFirstName(username)}</span>
                </h2>
                <p className="mt-1 text-xs text-[#8D8880]">
                  Snap culinary memories, list local bistros, and compile curated food recommendations.
                </p>
              </div>
              <RestaurantModule username={username} />
            </div>
          ) : (
            <div className="animate-fade-in-simple space-y-4">
              <div className="text-left border-b border-[#EFECE6] pb-3">
                <h2 className="font-serif text-2xl md:text-3xl font-light text-[#1B4332] tracking-tight">
                  My Sanctuary Profile
                </h2>
                <p className="mt-1 text-xs text-[#8D8880]">Customize your profile and personal preferences.</p>
              </div>

              {!isEditing ? (
                <div className="max-w-2xl mx-auto space-y-6 text-left animate-slide-in">
                  {/* Hero profile card */}
                  <div className="bg-[#1B4332] text-white rounded-3xl p-6 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#E8F5E9]/10 rounded-full blur-xl -ml-5 -mb-5" />
                    <div className="relative flex flex-col sm:flex-row items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-3xl font-serif font-bold select-none">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1 text-center sm:text-left flex-1">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                          <h3 className="font-serif font-semibold text-2xl tracking-tight text-white">{username}</h3>
                          <BadgeCheck size={18} className="text-emerald-300 fill-emerald-800 shrink-0" />
                        </div>
                        <p className="text-xs text-[#D8F3DC] font-medium">Workspace Proprietor</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-white/20 backdrop-blur-sm shrink-0"
                        title="Sign Out"
                      >
                        <LogOut size={14} />
                        Logout
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 hover:border-[#1B4332]/20 transition-all shadow-2xs group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8D8880] uppercase tracking-wider">Cine Watchlist</span>
                        <div className="p-1.5 bg-[#1B4332]/5 rounded-lg text-[#1B4332]"><Film size={14} /></div>
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-serif font-bold text-[#1B4332] tabular-nums">{watchlistCount}</span>
                        <span className="text-xs text-[#8D8880] ml-1.5">titles tracked</span>
                      </div>
                    </div>
                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 hover:border-[#1B4332]/20 transition-all shadow-2xs group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8D8880] uppercase tracking-wider">Culinary Diary</span>
                        <div className="p-1.5 bg-[#1B4332]/5 rounded-lg text-[#1B4332]"><Utensils size={14} /></div>
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-serif font-bold text-[#1B4332] tabular-nums">{restaurantCount}</span>
                        <span className="text-xs text-[#8D8880] ml-1.5">spots logged</span>
                      </div>
                    </div>
                  </div>

                  {/* Storage panel */}
                  <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-2xs text-left space-y-4">
                    <h4 className="text-[10px] font-bold text-[#8D8880] uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-[#FAF9F6]">
                      {currentMode === 'folder' ? (
                        <FolderCheck size={12} className="text-[#1B4332]" />
                      ) : (
                        <HardDrive size={12} className="text-[#1B4332]" />
                      )}
                      Data Storage Location
                    </h4>

                    {currentMode === 'folder' && currentFolderName ? (
                      <div className="space-y-1">
                        <p className="text-[11px] text-[#8D8880]">Your data is saved as files in:</p>
                        <p className="text-sm font-bold text-[#1B4332] font-mono bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 flex items-center gap-2">
                          <FolderOpen size={14} className="text-amber-600 shrink-0" />
                          {currentFolderName}
                        </p>
                        <p className="text-[10px] text-[#8D8880] leading-relaxed">
                          Files: <code className="font-mono">cozy-watchlist.json</code> &amp; <code className="font-mono">cozy-restaurants.json</code>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] text-[#8D8880] leading-relaxed">
                          Data is stored privately inside this browser. No files on your device.
                        </p>
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#FAF9F6] flex justify-end">
                      <button
                        onClick={handleChangeStorage}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[10.5px] font-bold transition cursor-pointer"
                      >
                        <FolderOpen size={12} />
                        Change Storage Location
                      </button>
                    </div>
                  </div>

                  {/* Personal details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <h4 className="text-[10px] font-bold text-[#8D8880] uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-[#FAF9F6]">
                        <User size={12} className="text-[#1B4332]" /> Registry Identity
                      </h4>
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8D8880] font-medium">Gender</span>
                          <span className="font-semibold text-[#4A443F] bg-[#FAF9F6] border border-[#EFECE6] px-2.5 py-1 rounded-lg">
                            {gender || <span className="text-[#8D8880] font-normal italic">Not specified</span>}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8D8880] font-medium">Date of Birth</span>
                          <span className="font-semibold text-[#4A443F] bg-[#FAF9F6] border border-[#EFECE6] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <Calendar size={11} className="text-[#8D8880]" />
                            {dob ? new Date(dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-[#8D8880] font-normal italic">Not specified</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <h4 className="text-[10px] font-bold text-[#8D8880] uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-[#FAF9F6]">
                        <Heart size={12} className="text-[#1B4332]" /> Personal Affinities
                      </h4>
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8D8880] font-medium">Favored Genre</span>
                          <span className="font-semibold text-[#1B4332] bg-[#1B4332]/5 border border-[#1B4332]/10 px-2.5 py-1 rounded-lg truncate max-w-[150px]">
                            {favGenre || <span className="text-[#8D8880] font-normal italic">Not specified</span>}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8D8880] font-medium">Cuisine Style</span>
                          <span className="font-semibold text-[#1B4332] bg-[#1B4332]/5 border border-[#1B4332]/10 px-2.5 py-1 rounded-lg truncate max-w-[150px]">
                            {favCuisine || <span className="text-[#8D8880] font-normal italic">Not specified</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-5 py-3 bg-[#1B4332] text-white hover:bg-[#153427] rounded-xl text-xs font-semibold transition cursor-pointer shadow-md"
                    >
                      <Edit3 size={12} /> Customize Profile
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit form */
                <div className="bg-white border border-[#EFECE6] rounded-3xl p-6 shadow-sm max-w-md mx-auto space-y-5 text-left animate-slide-in">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center text-xl font-serif font-bold select-none">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif font-semibold text-base text-gray-900">Editing Profile</h3>
                      <p className="text-[10px] text-[#8D8880] mt-1">Update your personal details below.</p>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-[#FAF9F6] pt-4">
                    <div className="space-y-1.5">
                      <label htmlFor="pf-username-inp" className="block text-xs font-semibold text-[#8D8880]">Edit Username</label>
                      <input
                        id="pf-username-inp"
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium"
                        value={username}
                        onChange={(e) => {
                          if (e.target.value.trim()) {
                            setUsername(e.target.value);
                            localStorage.setItem('cozy-user-name', e.target.value);
                          }
                        }}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="pf-gender-inp" className="block text-xs font-semibold text-[#8D8880]">Gender</label>
                      <select
                        id="pf-gender-inp"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium cursor-pointer"
                        value={gender}
                        onChange={(e) => { setGender(e.target.value); localStorage.setItem('cozy-user-gender', e.target.value); }}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="pf-dob-inp" className="block text-xs font-semibold text-[#8D8880]">Date of Birth</label>
                      <input
                        id="pf-dob-inp"
                        type="date"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium cursor-pointer"
                        value={dob}
                        onChange={(e) => { setDob(e.target.value); localStorage.setItem('cozy-user-dob', e.target.value); }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="pf-genre-inp" className="block text-xs font-semibold text-[#8D8880]">Favorite Film/Show Genre</label>
                      <input
                        id="pf-genre-inp"
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium"
                        value={favGenre}
                        onChange={(e) => { setFavGenre(e.target.value); localStorage.setItem('cozy-user-fav-genre', e.target.value); }}
                        placeholder="e.g., Sci-Fi, Romance, Thriller"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="pf-cuisine-inp" className="block text-xs font-semibold text-[#8D8880]">Favorite Food Cuisine</label>
                      <input
                        id="pf-cuisine-inp"
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium"
                        value={favCuisine}
                        onChange={(e) => { setFavCuisine(e.target.value); localStorage.setItem('cozy-user-fav-cuisine', e.target.value); }}
                        placeholder="e.g., Italian, Japanese, Nepalese"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#FAF9F6] flex justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1B4332] text-white hover:bg-[#153427] rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                    >
                      <BadgeCheck size={14} /> Save & View Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EFECE6] bg-white py-6 px-4 text-center text-xs text-gray-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1">
            <Coffee size={12} className="text-amber-600 fill-amber-100" />
            Designed as a cozy, offline-first companion application.
          </p>
          <p className="font-mono text-[10px]">
            {currentMode === 'folder' ? 'File System Storage' : 'Browser IndexedDB'} &bull; Standalone PWA &bull; v2.0.0
          </p>
        </div>
      </footer>

      {/* Bottom nav */}
      <nav id="sanctuary-bottom-nav" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFECE6] py-1.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {([
            { id: 'Movie' as const, label: 'Movie', icon: Film },
            { id: 'Series' as const, label: 'Series', icon: Tv },
            { id: 'Restaurant' as const, label: 'Restaurant', icon: Utensils },
            { id: 'Profile' as const, label: 'Profile', icon: User },
          ]).map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all duration-150 cursor-pointer ${
                  isActive ? 'text-[#1B4332] scale-105' : 'text-[#8D8880] hover:text-[#4A443F]'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors duration-150 ${isActive ? 'bg-[#1B4332]/10' : 'bg-transparent'}`}>
                  <Icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                </div>
                <span className="text-[10px] font-bold tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <InstallPrompt />
    </div>
  );
}
