import React, { useState, useEffect } from 'react';
import { seedDatabase, db } from './db';
import Onboarding from './components/Onboarding';
import WatchlistModule from './components/WatchlistModule';
import RestaurantModule from './components/RestaurantModule';
import InstallPrompt from './components/InstallPrompt';
import Logo from './components/Logo';
import { 
  Film, Utensils, Sparkles, User, Coffee, Tv, Edit3, Calendar, Heart, BadgeCheck
} from 'lucide-react';

export default function App() {
  const [username, setUsername] = useState<string>('');
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'Movie' | 'Series' | 'Restaurant' | 'Profile'>('Movie');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Expanded profile state details
  const [gender, setGender] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [favGenre, setFavGenre] = useState<string>('');
  const [favCuisine, setFavCuisine] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Dynamic dashboard count stats
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [restaurantCount, setRestaurantCount] = useState<number>(0);

  // Synchronously fetch watchlist and restaurant counts from indexdb database
  useEffect(() => {
    if (activeTab === 'Profile' || hasOnboarded) {
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
  }, [activeTab, hasOnboarded]);

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

  useEffect(() => {
    // Initialize database seed on startup
    const initDbAndUser = async () => {
      try {
        // Force-clear any preloaded mock items exactly once for returning test sessions
        const hasClearedSeed = localStorage.getItem('cozy-db-seeded-cleared-v2');
        if (!hasClearedSeed) {
          await seedDatabase(true); // force-clears tables
          localStorage.setItem('cozy-db-seeded-cleared-v2', 'true');
        } else {
          await seedDatabase();
        }
        
        // Retrieve local profile and preferences
        const savedName = localStorage.getItem('cozy-user-name');
        if (savedName) {
          setUsername(savedName);
          setHasOnboarded(true);
        }
        
        setGender(localStorage.getItem('cozy-user-gender') || '');
        setDob(localStorage.getItem('cozy-user-dob') || '');
        setFavGenre(localStorage.getItem('cozy-user-fav-genre') || '');
        setFavCuisine(localStorage.getItem('cozy-user-fav-cuisine') || '');
      } catch (err) {
        console.error('Core startup loading fail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initDbAndUser();
  }, []);

  const handleEnterWorkspace = (name: string) => {
    localStorage.setItem('cozy-user-name', name);
    setUsername(name);
    setHasOnboarded(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
        <Logo size={80} className="animate-pulse" />
        <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Prepping your cozy tracking space...</span>
      </div>
    );
  }

  // Entrance screen
  if (!hasOnboarded) {
    return <Onboarding onEnter={handleEnterWorkspace} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#4A443F] flex flex-col selection:bg-amber-100 selection:text-amber-950 pb-24">
      {/* Header section with brand info */}
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

          {/* Quick status label */}
          <div className="hidden sm:flex items-center gap-2 bg-[#FAF9F6] border border-[#EFECE6] px-3 py-1.5 rounded-full text-[10px] font-semibold text-[#8D8880]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332] animate-pulse" />
            100% Client-side Secure
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 py-6 px-4 sm:px-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Selected Dashboard workspace container */}
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
                <p className="mt-1 text-xs text-[#8D8880]">Customize your profile details and personal culinary/entertainment preferences.</p>
              </div>
              
              {/* Profile Card & Management Panels */}
              {!isEditing ? (
                <div className="max-w-2xl mx-auto space-y-6 text-left animate-slide-in">
                  
                  {/* Hero profile card */}
                  <div className="bg-[#1B4332] text-white rounded-3xl p-6 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#E8F5E9]/10 rounded-full blur-xl -ml-5 -mb-5" />
                    
                    <div className="relative flex flex-col sm:flex-row items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-3xl font-serif font-bold select-none shadow-xs">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                          <h3 className="font-serif font-semibold text-2xl tracking-tight leading-none text-white">{username}</h3>
                          <BadgeCheck size={18} className="text-emerald-300 fill-emerald-800 shrink-0" />
                        </div>
                        <p className="text-xs text-[#D8F3DC] font-medium tracking-wide">Workspace Proprietor</p>
                        <div className="inline-flex items-center gap-1.5 text-[10px] bg-white/15 text-[#E8F5E9] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs select-none">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          Cozy Curator Sanctuary
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Database Stats Bento (Content Architecture) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 hover:border-[#1B4332]/20 transition-all duration-200 shadow-2xs group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8D8880] uppercase tracking-wider">Cine Watchlist</span>
                        <div className="p-1.5 bg-[#1B4332]/5 rounded-lg text-[#1B4332]">
                          <Film size={14} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-serif font-bold text-[#1B4332] tabular-nums">{watchlistCount}</span>
                        <span className="text-xs text-[#8D8880] ml-1.5 block sm:inline">titles tracked</span>
                      </div>
                      <div className="mt-2 text-[9px] text-[#8D8880] leading-none group-hover:text-[#1B4332] transition-colors">
                        Ready to watch & enjoy offline
                      </div>
                    </div>

                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 hover:border-[#1B4332]/20 transition-all duration-200 shadow-2xs group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8D8880] uppercase tracking-wider">Culinary Diary</span>
                        <div className="p-1.5 bg-[#1B4332]/5 rounded-lg text-[#1B4332]">
                          <Utensils size={14} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-serif font-bold text-[#1B4332] tabular-nums">{restaurantCount}</span>
                        <span className="text-xs text-[#8D8880] ml-1.5 block sm:inline">spots logged</span>
                      </div>
                      <div className="mt-2 text-[9px] text-[#8D8880] leading-none group-hover:text-[#1B4332] transition-colors">
                        Favorite local eateries and cafés
                      </div>
                    </div>
                  </div>

                  {/* Personal & Affinity Details Bento Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal Registry Card */}
                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <h4 className="text-[10px] font-bold text-[#8D8880] uppercase tracking-widest flex items-center gap-1.5 select-none font-sans pb-2 border-b border-[#FAF9F6]">
                        <User size={12} className="text-[#1B4332]" />
                        Registry Identity
                      </h4>
                      
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8D8880] font-medium">Gender Affiliation</span>
                          <span className="font-semibold text-[#4A443F] bg-[#FAF9F6] border border-[#EFECE6] px-2.5 py-1 rounded-lg">
                            {gender || <span className="text-[#8D8880] font-normal italic">Not specified</span>}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8D8880] font-medium">Date of Birth</span>
                          <span className="font-semibold text-[#4A443F] bg-[#FAF9F6] border border-[#EFECE6] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <Calendar size={11} className="text-[#8D8880]" />
                            {dob ? (
                              new Date(dob).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            ) : (
                              <span className="text-[#8D8880] font-normal italic">Not specified</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sanctuary Affinities Card */}
                    <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 space-y-4 shadow-2xs">
                      <h4 className="text-[10px] font-bold text-[#8D8880] uppercase tracking-widest flex items-center gap-1.5 select-none font-sans pb-2 border-b border-[#FAF9F6]">
                        <Heart size={12} className="text-[#1B4332]" />
                        Personal Affinities
                      </h4>
                      
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs col-span-2">
                          <span className="text-[#8D8880] font-medium">Favored Genre</span>
                          <span className="font-semibold text-[#1B4332] bg-[#1B4332]/5 border border-[#1B4332]/10 px-2.5 py-1 rounded-lg truncate max-w-[150px]" title={favGenre || "Cozy Stories"}>
                            {favGenre || <span className="text-[#8D8880] font-normal italic">Not specified</span>}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs col-span-2">
                          <span className="text-[#8D8880] font-medium">Cuisine Styles</span>
                          <span className="font-semibold text-[#1B4332] bg-[#1B4332]/5 border border-[#1B4332]/10 px-2.5 py-1 rounded-lg truncate max-w-[150px]" title={favCuisine || "Comfort Eats"}>
                            {favCuisine || <span className="text-[#8D8880] font-normal italic">Not specified</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-5 py-3 bg-[#1B4332] text-white hover:bg-[#153427] rounded-xl text-xs font-semibold transition cursor-pointer shadow-md select-none"
                    >
                      <Edit3 size={12} />
                      Customize Sanctuary Profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#EFECE6] rounded-3xl p-6 shadow-sm max-w-md mx-auto space-y-5 text-left animate-slide-in">
                  
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center text-xl font-serif font-bold select-none">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif font-semibold text-base text-gray-900 leading-none">Editing Profile</h3>
                      <p className="text-[10px] text-[#8D8880] mt-1">Make changes to secure outline register below.</p>
                    </div>
                  </div>

                  {/* Edit profile fields */}
                  <div className="space-y-4 border-t border-[#FAF9F6] pt-4">
                    {/* Username */}
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

                    {/* Gender selection */}
                    <div className="space-y-1.5">
                      <label htmlFor="pf-gender-inp" className="block text-xs font-semibold text-[#8D8880]">Gender</label>
                      <select
                        id="pf-gender-inp"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium cursor-pointer"
                        value={gender}
                        onChange={(e) => {
                          setGender(e.target.value);
                          localStorage.setItem('cozy-user-gender', e.target.value);
                        }}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    {/* DOB Field */}
                    <div className="space-y-1.5">
                      <label htmlFor="pf-dob-inp" className="block text-xs font-semibold text-[#8D8880]">Date of Birth (DOB)</label>
                      <input
                        id="pf-dob-inp"
                        type="date"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium cursor-pointer"
                        value={dob}
                        onChange={(e) => {
                          setDob(e.target.value);
                          localStorage.setItem('cozy-user-dob', e.target.value);
                        }}
                      />
                    </div>

                    {/* Favorite Category */}
                    <div className="space-y-1.5">
                      <label htmlFor="pf-genre-inp" className="block text-xs font-semibold text-[#8D8880]">Favorite Film/Show Genre</label>
                      <input
                        id="pf-genre-inp"
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium"
                        value={favGenre}
                        onChange={(e) => {
                          setFavGenre(e.target.value);
                          localStorage.setItem('cozy-user-fav-genre', e.target.value);
                        }}
                        placeholder="e.g., Sci-Fi, Romance, Thriller"
                      />
                    </div>

                    {/* Favorite Cuisine */}
                    <div className="space-y-1.5">
                      <label htmlFor="pf-cuisine-inp" className="block text-xs font-semibold text-[#8D8880]">Favorite Food Cuisine</label>
                      <input
                        id="pf-cuisine-inp"
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none text-[#4A443F] font-medium"
                        value={favCuisine}
                        onChange={(e) => {
                          setFavCuisine(e.target.value);
                          localStorage.setItem('cozy-user-fav-cuisine', e.target.value);
                        }}
                        placeholder="e.g., Italian, Japanese, Nepalese"
                      />
                    </div>
                  </div>

                  {/* Save action to return to Info Mode */}
                  <div className="pt-4 border-t border-[#FAF9F6] flex justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1B4332] text-white hover:bg-[#153427] rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs select-none"
                    >
                      <BadgeCheck size={14} />
                      Save & View Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Cozy Footer */}
      <footer className="border-t border-[#EFECE6] bg-white py-6 px-4 text-center text-xs text-gray-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1">
            <Coffee size={12} className="text-amber-600 fill-amber-100" />
            Designed as a cozy, offline-first companion application.
          </p>
          <p className="font-mono text-[10px]">
            IndexedDB Persistence &bull; Standalone PWA Enabled &bull; v1.2.0
          </p>
        </div>
      </footer>

      {/* Sticky Bottom Navigation Bar */}
      <nav id="sanctuary-bottom-nav" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFECE6] py-1.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {[
            { id: 'Movie' as const, label: 'Movie', icon: Film },
            { id: 'Series' as const, label: 'Series', icon: Tv },
            { id: 'Restaurant' as const, label: 'Restaurant', icon: Utensils },
            { id: 'Profile' as const, label: 'Profile', icon: User },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? 'text-[#1B4332] scale-105' 
                    : 'text-[#8D8880] hover:text-[#4A443F]'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors duration-150 ${
                  isActive ? 'bg-[#1B4332]/10' : 'bg-transparent'
                }`}>
                  <Icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                </div>
                <span className="text-[10px] font-bold tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* PWA Install Promo Trigger */}
      <InstallPrompt />
    </div>
  );
}
