import React, { useState, useEffect, useRef } from 'react';
import { safeHtml2Canvas } from '../utils';
import { db } from '../db';
import { WatchlistItem } from '../types';
import Logo from './Logo';
import { 
  Film, Tv, Star, Edit3, Trash2, Plus, Share2, 
  Download, Upload, Check, AlertTriangle, X, CheckSquare, Search, Copy, Image as ImageIcon
} from 'lucide-react';

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Anime",
  "Biography",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Food",
  "History",
  "Horror",
  "Musical",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of life",
  "Sports",
  "Superhero",
  "Thriller",
  "War",
  "Western",
  "Other"
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic (Czechia)", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom (UK)", "United States of America (USA)", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe", "Other"
];

interface WatchlistModuleProps {
  username: string;
  activeType: 'Movie' | 'Series';
}

export default function WatchlistModule({ username, activeType }: WatchlistModuleProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Watched' | 'Not Watched'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Movie' | 'Series'>('Movie');
  const [releaseYear, setReleaseYear] = useState<number | ''>('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [country, setCountry] = useState("United States of America (USA)");
  const [director, setDirector] = useState('');
  const [actors, setActors] = useState('');
  const [image, setImage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  // Sync format type input with active screen tab when form opens
  useEffect(() => {
    if (showAddForm) {
      setType(activeType);
    }
  }, [showAddForm, activeType]);

  // Editing state
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);

  // Review dialog states
  const [reviewingItem, setReviewingItem] = useState<WatchlistItem | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [verdict, setVerdict] = useState<string>('Must Watch');
  const [review, setReview] = useState('');

  // Warning state on toggle back to Not Watched
  const [warningItem, setWarningItem] = useState<WatchlistItem | null>(null);

  // Deletion confirmation modal state
  const [deletingItem, setDeletingItem] = useState<WatchlistItem | null>(null);

  // Sharing states
  const [sharingItem, setSharingItem] = useState<WatchlistItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharingProgress, setSharingProgress] = useState(false);

  // File Reference for Poster Image Upload
  const posterInputRef = useRef<HTMLInputElement>(null);

  // Load items from local IndexedDB
  const fetchItems = async () => {
    try {
      const data = await db.watchlist.orderBy('createdAt').reverse().toArray();
      
      // Auto-migrate any legacy 'Unwatched' status in the user's IndexedDB to 'Not Watched'
      let needsStateUpdate = false;
      const migratedData = await Promise.all(
        data.map(async (item) => {
          if ((item.status as any) === 'Unwatched') {
            needsStateUpdate = true;
            const updatedItem = { ...item, status: 'Not Watched' as const };
            if (item.id) {
              await db.watchlist.put(updatedItem);
            }
            return updatedItem;
          }
          return item;
        })
      );

      setItems(migratedData);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Compress and save optional image file as Base64 JPEG
  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450; // compress image size appropriately for IndexedDB
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65); // 0.65 quality JPEG is very compact (~15-25KB)
          setImage(compressedBase64);
        } else {
          setImage(event.target?.result as string);
        }
        setUploadProgress(false);
      };
      img.onerror = () => {
        setUploadProgress(false);
        alert('Could not decode local image.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setUploadProgress(false);
      alert('Failed reading file.');
    };
    reader.readAsDataURL(file);
  };

  // Handle new item insert
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const newItem: WatchlistItem = {
        title: title.trim(),
        type: type,
        releaseYear: releaseYear !== '' ? Number(releaseYear) : undefined,
        genre: selectedGenres.join(', ') || 'Other',
        country: country || 'Other',
        status: 'Not Watched',
        createdAt: Date.now(),
        director: director.trim() || undefined,
        actors: actors.trim() || undefined,
        image: image || undefined
      };

      await db.watchlist.add(newItem);
      
      // Reset form
      setTitle('');
      setSelectedGenres([]);
      setCountry("United States of America (USA)");
      setReleaseYear('');
      setDirector('');
      setActors('');
      setImage('');
      setShowAddForm(false);
      
      fetchItems();
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  // Delete item - trigger confirmation modal
  const handleDeleteItem = (item: WatchlistItem) => {
    setDeletingItem(item);
  };

  // Perform actual deletion
  const confirmDeleteItem = async () => {
    if (!deletingItem || !deletingItem.id) return;
    try {
      await db.watchlist.delete(deletingItem.id);
      setDeletingItem(null);
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  // Toggle or open watched flow
  const handleToggleStatus = async (item: WatchlistItem) => {
    if (item.status === 'Not Watched') {
      // Open Watched detailed flow
      setRating(item.rating || 0);
      setVerdict(item.verdict || 'Must Watch');
      setReview(item.review || '');
      setReviewingItem(item);
    } else {
      // Warn when toggling back to Not Watched (destructive step)
      setWarningItem(item);
    }
  };

  // Proceed with turning into Not Watched and clearing reviews
  const confirmToggleToNotWatched = async () => {
    if (!warningItem || !warningItem.id) return;

    try {
      const updated: WatchlistItem = {
        ...warningItem,
        status: 'Not Watched',
        rating: undefined,
        verdict: undefined,
        review: undefined
      };
      await db.watchlist.put(updated);
      setWarningItem(null);
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  // Save the rating and reviews back to DB
  const handleSaveReview = async () => {
    if (!reviewingItem || !reviewingItem.id) return;

    if (rating === 0) {
      alert("Please select a star rating (1 to 5) before saving your review.");
      return;
    }

    try {
      const updated: WatchlistItem = {
        ...reviewingItem,
        status: 'Watched',
        rating: rating,
        verdict: verdict,
        review: review.trim()
      };

      await db.watchlist.put(updated);
      setReviewingItem(null);
      fetchItems();
    } catch (err) {
      console.error('Error saving review:', err);
    }
  };

  // Star Rating Helper
  const renderStarsSelector = (currentRating: number, onChange: (val: number) => void) => {
    return (
      <div className="flex items-center gap-1.5" id="star-selector-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="group/star text-gray-300 relative transition-all duration-150 p-1 hover:scale-110"
            aria-label={`Select ${star} stars`}
          >
            <Star
              size={24}
              className={`${
                star <= currentRating
                  ? 'fill-amber-400 text-amber-500 opacity-100'
                  : 'fill-gray-200 text-gray-300 opacity-100 group-hover/star:fill-gray-300'
              } transition-colors duration-150`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderStarsStatic = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-500'
                : 'text-gray-300 stroke-[1.5]'
            }`}
          />
        ))}
        <span className="text-xs font-mono text-gray-500 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // Share Card Flow
  const handleOpenShare = (item: WatchlistItem) => {
    setSharingItem(item);
    setCopiedLink(false);
  };

  const handleDownloadImageCard = async () => {
    if (!sharingItem) return;
    setSharingProgress(true);
    try {
      // Find the visual card chunk
      const element = document.getElementById('visual-share-card-canvas-root');
      if (!element) {
        alert('Could not find card container.');
        return;
      }
      const canvas = await safeHtml2Canvas(element, {
        scale: 3, // Premium ultra-crisp resolution
        useCORS: true,
        logging: false,
        backgroundColor: null // transparent or matching container
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${sharingItem.title.replace(/[^a-zA-Z0-9]/g, '_')}_CineCard.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to parse and compile image card:', err);
      alert('Error rendering image card.');
    } finally {
      setSharingProgress(false);
    }
  };

  const handleShareImageCard = async () => {
    if (!sharingItem) return;
    setSharingProgress(true);
    try {
      const element = document.getElementById('visual-share-card-canvas-root');
      if (!element) {
        alert('Could not find card container.');
        return;
      }
      const canvas = await safeHtml2Canvas(element, {
        scale: 2, // Standard distribution size
        useCORS: true,
        logging: false,
        backgroundColor: null
      });
      const imgData = canvas.toDataURL('image/png');
      const response = await fetch(imgData);
      const blob = await response.blob();
      const file = new File([blob], `${sharingItem.title.replace(/[^a-zA-Z0-9]/g, '_')}_CineCard.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `CineWatchlist Review: ${sharingItem.title}`,
          text: `Check out my review of "${sharingItem.title}" saved in my Cozy CineWatchlist database!`
        });
      } else {
        // Fallback to copy share text and download image
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${sharingItem.title.replace(/[^a-zA-Z0-9]/g, '_')}_CineCard.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('Web Share is restricted or unsupported in this browser. We have successfully compiled and downloaded your premium image card directly to your device! ✨');
      }
    } catch (err) {
      console.error('Error sharing image card:', err);
      handleDownloadImageCard();
    } finally {
      setSharingProgress(false);
    }
  };

  const copyShareText = () => {
    if (!sharingItem) return;

    const stars = '★'.repeat(Math.round(sharingItem.rating || 5)) + '☆'.repeat(5 - Math.round(sharingItem.rating || 5));
    const shareText = `🎬 CineWatchlist Review 🎬
🍿 Title: ${sharingItem.title}${sharingItem.releaseYear ? ` (${sharingItem.releaseYear})` : ''}
🎭 Genre: ${sharingItem.genre} • 📍 Country: ${sharingItem.country}
📊 Status: ${sharingItem.status}
${sharingItem.status === 'Watched' ? `⭐ Rating: ${stars} (${sharingItem.rating}/5)\n💬 Verdict: ${sharingItem.verdict || 'No verdict yet'}\n✍️ Review: "${sharingItem.review || ''}"` : '❤️ Keep tracking!'}

Shared from my Cozy Workspace ✨`;

    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWebShare = async () => {
    // Falls back to image sharing directly!
    handleShareImageCard();
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesTab = item.type === activeType;
    const matchesFilter = activeFilter === 'All' 
      ? true 
      : activeFilter === 'Watched' 
        ? item.status === 'Watched' 
        : item.status === 'Not Watched';
    
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6" id="watchlist-module">
      {/* Search & Tool belt */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-[#EFECE6] p-4 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8D8880]" />
          <input
            id="watchlist-search"
            type="text"
            placeholder="Search title, genre, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
          />
        </div>

        {/* Action triggers */}
        <div className="w-full md:w-auto flex justify-end">
          <button
            id="add-watchlist-item-trigger"
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-xs font-medium text-white bg-[#1B4332] hover:bg-[#153427] rounded-xl transition-all duration-150 cursor-pointer shadow-xs whitespace-nowrap w-full sm:w-auto"
          >
            <Plus size={14} />
            <span>{activeType === 'Movie' ? 'Add Movie' : 'Add Series'}</span>
          </button>
        </div>
      </div>

      {/* Add Item Form centered Modal Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <form 
            id="add-watchlist-form"
            onSubmit={handleAddItem}
            className="bg-white border border-[#EFECE6] rounded-3xl w-full max-w-lg p-6 my-auto shadow-xl animate-scale-in space-y-4 relative text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF9F6]">
              <h3 className="font-serif font-semibold text-[#1B4332] text-lg flex items-center gap-2">
                <Film size={20} className="text-[#1B4332]" />
                Add to Watchlist ({activeType})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 text-[#8D8880] hover:text-[#4A443F] rounded-md transition hover:bg-[#FAF9F6]"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title input */}
              <div className="space-y-1.5">
                <label htmlFor="title-inp" className="block text-xs font-semibold text-[#8D8880]">Title</label>
                <input
                  id="title-inp"
                  type="text"
                  required
                  placeholder={activeType === 'Movie' ? 'Spirited Away, Interstellar...' : 'Midnight Diner, Friends...'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Release year */}
                <div className="space-y-1.5">
                  <label htmlFor="year-inp" className="block text-xs font-semibold text-[#8D8880]">Release Year <span className="text-[10px] font-normal text-amber-600">(Optional)</span></label>
                  <input
                    id="year-inp"
                    type="number"
                    min={1880}
                    max={2100}
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g., 2026"
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
                  />
                </div>

                {/* Dropdowns for Country */}
                <div className="space-y-1.5">
                  <label htmlFor="country-select" className="block text-xs font-semibold text-[#8D8880]">Country</label>
                  <select
                    id="country-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F]"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multiselect Genres */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8D8880]">Genres <span className="text-[10px] font-normal text-amber-600">(Multiselect)</span></label>
                <div className="flex flex-wrap gap-1 p-2.5 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl max-h-32 overflow-y-auto">
                  {GENRES.map(g => {
                    const isSelected = selectedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGenres(selectedGenres.filter(x => x !== g));
                          } else {
                            setSelectedGenres([...selectedGenres, g]);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium border transition-all duration-100 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-2xs font-semibold'
                            : 'bg-white text-[#4A443F]/80 border-[#EFECE6] hover:bg-[#1B4332]/5 hover:text-[#1B4332] hover:border-[#1B4332]/20'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional: Director & Actors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="director-inp" className="block text-xs font-semibold text-[#8D8880]">Director <span className="text-[10px] font-normal text-amber-600">(Optional)</span></label>
                  <input
                    id="director-inp"
                    type="text"
                    placeholder="Hayao Miyazaki"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="actors-inp" className="block text-xs font-semibold text-[#8D8880]">Actors / Cast <span className="text-[10px] font-normal text-amber-600">(Optional)</span></label>
                  <input
                    id="actors-inp"
                    type="text"
                    placeholder="Rumi Hiiragi, Miyu Irino"
                    value={actors}
                    onChange={(e) => setActors(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
                  />
                </div>
              </div>

              {/* Poster Image upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#8D8880]">Poster Image <span className="text-[10px] font-normal text-amber-600">(Optional)</span></label>
                <div className="flex items-center gap-4">
                  {image ? (
                    <div className="relative w-12 h-16 shrink-0 border border-[#EFECE6] rounded-lg overflow-hidden bg-gray-50">
                      <img src={image} className="w-full h-full object-cover" alt="Poster thumbnail" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => setImage('')}
                        className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-600 text-white p-0.5 rounded-bl"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => posterInputRef.current?.click()}
                      className="w-12 h-16 shrink-0 border border-dashed border-[#D1CDC7] rounded-lg flex flex-col items-center justify-center text-[#8D8880] hover:text-[#1B4332] hover:bg-[#FAF9F6] transition cursor-pointer"
                    >
                      <ImageIcon size={16} />
                      <span className="text-[8px] font-semibold mt-1">Upload</span>
                    </div>
                  )}
                  <input 
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePosterUpload}
                    className="hidden"
                  />
                  <div className="text-left">
                    <p className="text-[11px] text-[#4A443F] font-medium">Add a movie/show poster</p>
                    <p className="text-[10px] text-[#8D8880]">Select local JPG or PNG image.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#FAF9F6]">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-[#EFECE6] text-[#8D8880] hover:bg-[#FAF9F6] hover:text-[#4A443F] font-medium text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadProgress}
                className="px-4.5 py-2 bg-[#1B4332] hover:bg-[#153427] text-white font-medium text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {uploadProgress ? 'Compressing...' : 'Save Title'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Media Categories */}
      <div className="space-y-4">
        {/* Double-Tab System: Movies vs Series is replaced by our clean, lightweight header filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFECE6] pb-3">
          <h2 className="text-lg font-serif font-semibold text-[#1B4332] flex items-center gap-2">
            {activeType === 'Movie' ? <Film size={18} /> : <Tv size={18} />}
            My Saved {activeType} List
          </h2>

          {/* Secondary Sub-Tabs: filters */}
          <div className="flex gap-1.5 bg-[#FAF9F6] border border-[#EFECE6] p-0.5 rounded-lg text-xs leading-none w-full sm:w-auto justify-between sm:justify-start">
            {['All', 'Watched', 'Not Watched'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as 'All' | 'Watched' | 'Not Watched')}
                className={`flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 font-semibold rounded-md transition cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-white text-[#1B4332] shadow-xs'
                    : 'text-[#8D8880] hover:text-[#4A443F]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* List render */}
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-[#EFECE6] rounded-2xl py-12 px-6 text-center text-[#8D8880] font-sans shadow-2xs">
            <Film size={34} className="mx-auto mb-3 text-[#D1CDC7] stroke-[1.5]" />
            <h4 className="font-semibold text-[#4A443F] text-sm">No workspace items found</h4>
            <p className="text-xs max-w-xs mx-auto mt-1 text-[#8D8880]">Your filters or search didn't yield results. Click "Add Title" to start populating your cozy list!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="watchlist-items-grid">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className="bg-white border border-[#EFECE6] rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition duration-200"
              >
                <div>
                  <div className="flex gap-4">
                    {item.image ? (
                      <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden border border-[#EFECE6] bg-[#FAF9F6] shadow-2xs">
                        <img 
                          src={item.image} 
                          alt={`${item.title} poster`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-24 shrink-0 rounded-lg flex flex-col items-center justify-center border border-[#D8F3DC] bg-[#E8F5E9] shadow-2xs text-[#1B4332]/80">
                        {item.type === 'Movie' ? <Film size={24} /> : <Tv size={24} />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex flex-wrap gap-1 items-center min-w-0">
                          <span className="px-2 py-0.5 bg-[#1B4332]/10 text-[#1B4332] rounded-md text-[10px] uppercase font-bold tracking-wider truncate max-w-[80px]" title={item.genre}>
                            {item.genre}
                          </span>
                          {item.status === 'Watched' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[9px] uppercase tracking-wider shrink-0 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              <Check size={10} className="stroke-[3.5] text-emerald-700" />
                              Watched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg font-bold text-[9px] uppercase tracking-wider shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              Not Watched
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenShare(item)}
                            className="p-1.5 text-[#8D8880] hover:text-[#1B4332] hover:bg-[#FAF9F6] rounded-lg transition"
                            title="Share as premium card"
                          >
                            <Share2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-[#8D8880] hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete title"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-serif font-semibold text-[#1B4332] text-lg mt-2 tracking-tight line-clamp-1">
                        {item.title}
                      </h3>

                      <p className="text-[11px] text-[#8D8880] mt-0.5 font-medium">
                        {item.country}{item.releaseYear ? ` \u2022 ${item.releaseYear}` : ''}
                      </p>

                      {/* Optional fields: Director and Cast/Actors */}
                      {(item.director || item.actors) && (
                        <div className="mt-2 text-[10px] text-[#8D8880] space-y-0.5 border-l border-[#FAF9F6] pl-2">
                          {item.director && (
                            <p className="truncate">
                              <span className="font-semibold text-[#5C564F]">Dir:</span> {item.director}
                            </p>
                          )}
                          {item.actors && (
                            <p className="truncate">
                              <span className="font-semibold text-[#5C564F]">Cast:</span> {item.actors}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watched Status Specific Card parameters */}
                  {item.status === 'Watched' ? (
                    <div className="mt-4 pt-3.5 border-t border-[#FAF9F6] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        {renderStarsStatic(item.rating)}
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px] tracking-wide">
                          {item.verdict}
                        </span>
                      </div>
                      
                      {item.review && (
                        <p className="text-[#4A443F] italic bg-[#FAF9F6] p-2.5 rounded-xl text-[11px] leading-relaxed border border-[#EFECE6]">
                          "{item.review}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-[#FAF9F6] flex justify-between items-center text-xs">
                      <span className="text-[#8D8880] text-[11px]">Not Watched</span>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className="px-3 py-1 bg-[#FAF9F6] text-[#1B4332] hover:bg-[#EFECE6] border border-[#EFECE6] rounded-lg font-medium transition cursor-pointer text-xs"
                      >
                        Mark Watched
                      </button>
                    </div>
                  )}
                </div>

                {/* If watched, provide action to toggle back (with warning check) */}
                {item.status === 'Watched' && (
                  <div className="mt-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className="text-[10px] font-semibold text-gray-400 hover:text-amber-600 transition"
                    >
                      Undo "Watched" Status
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Watched detailed review modal overlay */}
      {reviewingItem && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <div className="bg-white border border-[#EFECE6] rounded-3xl w-full max-w-md p-6 my-auto shadow-xl animate-fade-in space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF9F6]">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Watched Review</span>
                <h3 className="font-semibold text-gray-900 text-sm mt-0.5">Let's record your review for: <span className="text-[#1B4332] font-semibold">{reviewingItem.title}</span></h3>
              </div>
              <button
                onClick={() => setReviewingItem(null)}
                className="p-1 px-1.5 text-gray-400 hover:text-gray-600 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Star selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-400">Your Star Rating</label>
                {rating === 0 && (
                  <span className="text-[10px] text-amber-600 font-medium animate-pulse">Select stars to rate</span>
                )}
              </div>
              {renderStarsSelector(rating, setRating)}
            </div>

            {/* Verdict tags */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400">Quick Verdict</label>
              <div className="flex flex-wrap gap-2">
                {['Must Watch', 'Decent', 'Skip It', 'Cozy Gold', 'Tear Jerker'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setVerdict(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      verdict === tag
                        ? 'bg-amber-100/70 text-amber-800 border-amber-300 shadow-sm'
                        : 'bg-gray-50 text-gray-500 border-[#EFECE6] hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* written reviews */}
            <div className="space-y-2">
              <label htmlFor="review-desc" className="block text-xs font-semibold text-gray-400">Written Review (Thoughts)</label>
              <textarea
                id="review-desc"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your cozy thoughts about the cinematography, characters, or food..."
                rows={4}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-gray-800 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#FAF9F6]">
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="px-4 py-2 border border-[#EFECE6] text-gray-500 hover:bg-[#FAF9F6] rounded-xl font-medium text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReview}
                className="px-4.5 py-2 bg-[#1B4332] text-white hover:bg-[#143225] rounded-xl font-semibold text-xs transition flex items-center gap-1"
              >
                <Check size={14} />
                Save Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning dialog on setting back to Not Watched */}
      {warningItem && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <div className="bg-white border border-[#EFECE6] rounded-2xl w-full max-w-sm p-6 my-auto shadow-xl animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-amber-500 pb-2 border-b border-[#FAF9F6]">
              <AlertTriangle className="shrink-0 stroke-[2.5]" size={22} />
              <h3 className="font-bold text-gray-950 text-sm">Destructive Action Warning</h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed">
               Toggling <strong className="text-gray-900 font-semibold">"{warningItem.title}"</strong> back to <span className="font-semibold text-[#1B4332]">Not Watched</span> will delete its star rating, quick verdict tag, and written reviews indefinitely.
            </p>

            <p className="text-xs text-amber-700 font-semibold bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
              Are you sure you want to proceed and reset your progress? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setWarningItem(null)}
                className="px-4 py-2 border border-[#EFECE6] text-gray-500 hover:bg-[#FAF9F6] rounded-xl font-medium text-xs transition"
              >
                No, Keep My Review
              </button>
              <button
                type="button"
                onClick={confirmToggleToNotWatched}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-xs transition"
              >
                Yes, Clear and Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <div className="bg-white border border-[#EFECE6] rounded-2xl w-full max-w-sm p-6 my-auto shadow-xl animate-fade-in space-y-4 text-left">
            <div className="flex items-center gap-3 text-red-500 pb-2 border-b border-[#FAF9F6]">
              <Trash2 className="shrink-0 stroke-[2.5]" size={20} />
              <h3 className="font-bold text-gray-950 text-sm">Remove from Watchlist?</h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              You are about to delete <strong className="text-gray-900 font-semibold">"{deletingItem.title}"</strong> {deletingItem.releaseYear ? `(${deletingItem.releaseYear})` : ''} from your personal diary workspace.
            </p>

            <p className="text-xs text-red-700 font-semibold bg-red-50/70 p-2.5 rounded-xl border border-red-200">
              This will permanently exclude this selection and erase any associated ratings and reviews. This action cannot be reversed.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 border border-[#EFECE6] text-gray-500 hover:bg-[#FAF9F6] rounded-xl font-medium text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-xs transition cursor-pointer"
              >
                Delete Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polaroid/Movie ticket Sharing card modal */}
      {sharingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-3xl w-full max-w-md p-6 my-auto shadow-xl animate-fade-in space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFECE6]">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Share2 size={16} className="text-[#1B4332]" />
                Share Cinema Card
              </h3>
              <button
                onClick={() => setSharingItem(null)}
                className="p-1 px-1.5 text-gray-400 hover:text-gray-600 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Visual rendering preview representing ticket */}
            <div className="bg-white border border-[#EFECE6] p-2.5 rounded-2xl shadow-xs overflow-hidden">
              <div 
                id="visual-share-card-canvas-root" 
                className="bg-white border border-[#EFECE6] rounded-2xl p-5 flex flex-col justify-between max-w-sm mx-auto select-none space-y-4"
              >
                <div>
                  <div className="flex gap-4 items-start text-left">
                    {sharingItem.image ? (
                      <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden border border-[#EFECE6] bg-[#FAF9F6] shadow-2xs">
                        <img 
                          src={sharingItem.image} 
                          alt={`${sharingItem.title} poster`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-24 shrink-0 rounded-lg flex flex-col items-center justify-center border border-[#D8F3DC] bg-[#E8F5E9] shadow-2xs text-[#1B4332]/80">
                        {sharingItem.type === 'Movie' ? <Film size={24} /> : <Tv size={24} />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-[#1B4332]/10 text-[#1B4332] rounded-md text-[10px] uppercase font-bold tracking-wider truncate max-w-[150px]">
                          {sharingItem.genre}
                        </span>
                      </div>

                      <h3 className="font-serif font-semibold text-[#1B4332] text-lg mt-2 tracking-tight">
                        {sharingItem.title}
                      </h3>

                      <p className="text-[11px] text-[#8D8880] mt-0.5 font-medium">
                        {sharingItem.country} &bull; {sharingItem.releaseYear}
                      </p>

                      {(sharingItem.director || sharingItem.actors) && (
                        <div className="mt-2 text-[10px] text-[#8D8880] space-y-1 border-l border-[#EFECE6] pl-2 pb-1 leading-normal">
                          {sharingItem.director && (
                            <p className="break-words">
                              <span className="font-semibold text-[#5C564F]">Dir:</span> {sharingItem.director}
                            </p>
                          )}
                          {sharingItem.actors && (
                            <p className="break-words">
                              <span className="font-semibold text-[#5C564F]">Cast:</span> {sharingItem.actors}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {sharingItem.status === 'Watched' ? (
                    <div className="mt-4 pt-3.5 border-t border-[#FAF9F6] space-y-2 text-xs text-left">
                      <div className="flex items-center justify-between">
                        {renderStarsStatic(sharingItem.rating)}
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px] tracking-wide">
                          {sharingItem.verdict}
                        </span>
                      </div>
                      
                      {sharingItem.review && (
                        <p className="text-[#4A443F] italic bg-[#FAF9F6] p-2.5 rounded-xl text-[11px] leading-relaxed border border-[#EFECE6]">
                          "{sharingItem.review}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-[#FAF9F6] flex justify-between items-center text-xs text-left">
                      <span className="text-[#8D8880] text-[11px]">Not Watched</span>
                      <span className="text-[10px] font-semibold text-[#1B4332]">On CineWatchlist 🎬</span>
                    </div>
                  )}
                </div>

                {/* Card Footer branding */}
                <div className="pt-3 border-t border-dashed border-[#EFECE6] flex items-center justify-between text-[9px] text-[#8D8880] font-medium text-left">
                  <span>Logged by: {username}</span>
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <Logo size={15} />
                    <span className="font-serif font-semibold text-[#1B4332] text-[9.5px] tracking-tight leading-none">Food & Entertainment</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons inside sharing dialog */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={sharingProgress}
                  onClick={handleDownloadImageCard}
                  className="py-2.5 px-4 bg-white border border-[#EFECE6] hover:bg-[#FAF9F6] text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} className="text-[#1B4332]" />
                  <span>{sharingProgress ? 'Creating...' : 'Download Card'}</span>
                </button>
                <button
                  type="button"
                  disabled={sharingProgress}
                  onClick={handleShareImageCard}
                  className="py-2.5 px-4 bg-[#1B4332] hover:bg-[#143225] text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Share2 size={14} />
                  <span>{sharingProgress ? 'Preparing...' : 'Share Image'}</span>
                </button>
              </div>

              {/* Text Fallback Copy option */}
              <button
                type="button"
                onClick={copyShareText}
                className="w-full py-2 bg-[#FAF9F5] hover:bg-[#FAF9F0] border border-[#EFECE6] text-[#8D8880] hover:text-[#4A443F] font-semibold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check size={12} className="text-emerald-600 animate-scale-in" />
                    <span>Copied text review to clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy review text instead</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
