import React, { useState, useEffect, useRef } from 'react';
import { safeHtml2Canvas } from '../utils';
import { db } from '../db';
import { RestaurantItem } from '../types';
import Logo from './Logo';
import { 
  Utensils, Star, Edit3, Trash2, Plus, Share2, Download,
  Sparkles, Check, AlertTriangle, X, Image as ImageIcon, Search, CheckSquare, Copy
} from 'lucide-react';

interface RestaurantModuleProps {
  username: string;
}

export default function RestaurantModule({ username }: RestaurantModuleProps) {
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Visited' | 'Not Visited'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [type, setType] = useState('Local Spot');
  const [addFormImage, setAddFormImage] = useState<string>('');
  const [addFormProgress, setAddFormProgress] = useState<boolean>(false);
  const addImageInputRef = useRef<HTMLInputElement>(null);

  // Visited Review Dialog
  const [reviewingRest, setReviewingRest] = useState<RestaurantItem | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [verdict, setVerdict] = useState<string>('Amazing');
  const [remarks, setRemarks] = useState('');
  const [image, setImage] = useState<string>(''); // base64 representation
  const [uploadProgress, setUploadProgress] = useState(false);

  // Warning state on undo visited
  const [warningRest, setWarningRest] = useState<RestaurantItem | null>(null);

  // Sharing states
  const [sharingRest, setSharingRest] = useState<RestaurantItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharingProgress, setSharingProgress] = useState(false);

  // File picker reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dining spots
  const fetchRestaurants = async () => {
    try {
      const data = await db.restaurants.orderBy('createdAt').reverse().toArray();
      setRestaurants(data);
    } catch (err) {
      console.error('Failed to load restaurants:', err);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleAddImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAddFormProgress(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 455;
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
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          setAddFormImage(compressedBase64);
        } else {
          setAddFormImage(event.target?.result as string);
        }
        setAddFormProgress(false);
      };
      img.onerror = () => {
        setAddFormProgress(false);
        alert('Could not decode local image.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setAddFormProgress(false);
      alert('Failed reading file.');
    };
    reader.readAsDataURL(file);
  };

  // Add Restaurant Spot
  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newItem: RestaurantItem = {
        name: name.trim(),
        cuisine: cuisine.trim() || 'General Style',
        type: type,
        visited: false,
        image: addFormImage || undefined,
        createdAt: Date.now()
      };

      await db.restaurants.add(newItem);
      
      setName('');
      setCuisine('');
      setType('Local Spot');
      setAddFormImage('');
      setShowAddForm(false);
      
      fetchRestaurants();
    } catch (err) {
      console.error('Error adding restaurant:', err);
    }
  };

  // Delete Restaurant Spot
  const handleDeleteRestaurant = async (id?: number) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this dining spot from your diary?')) {
      await db.restaurants.delete(id);
      fetchRestaurants();
    }
  };

  // Visited flow click
  const handleToggleVisited = (rest: RestaurantItem) => {
    if (!rest.visited) {
      setRating(rest.rating || 5);
      setVerdict(rest.verdict || 'Amazing');
      setRemarks(rest.remarks || '');
      setImage(rest.image || '');
      setReviewingRest(rest);
    } else {
      // Warn when undoing visited
      setWarningRest(rest);
    }
  };

  // Turn back to Not Visited and clear reviews
  const confirmToggleToNotVisited = async () => {
    if (!warningRest || !warningRest.id) return;

    try {
      const updated: RestaurantItem = {
        ...warningRest,
        visited: false,
        rating: undefined,
        verdict: undefined,
        remarks: undefined,
        image: undefined
      };
      await db.restaurants.put(updated);
      setWarningRest(null);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  // Compress and save optional image file as Base64 JPEG
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Save reviewed details
  const handleSaveReview = async () => {
    if (!reviewingRest || !reviewingRest.id) return;

    try {
      const updated: RestaurantItem = {
        ...reviewingRest,
        visited: true,
        rating: rating,
        verdict: verdict,
        remarks: remarks.trim(),
        image: image || undefined
      };

      await db.restaurants.put(updated);
      setReviewingRest(null);
      fetchRestaurants();
    } catch (err) {
      console.error('Error saving restaurant review:', err);
    }
  };

  // Star Ratings Display and Selector
  const renderStarsSelector = (currentRating: number, onChange: (val: number) => void) => {
    return (
      <div className="flex items-center gap-1.5" id="restaurant-star-selector">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="group/star text-gray-300 relative transition-all duration-150 p-1 hover:scale-110 cursor-pointer"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              size={24}
              className={`${
                star <= currentRating
                  ? 'fill-amber-400 text-amber-500 opacity-100'
                  : 'text-gray-400 opacity-40 group-hover/star:opacity-80'
              }`}
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
            size={13}
            className={`${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-500'
                : 'text-gray-300 stroke-[1.5]'
            }`}
          />
        ))}
        <span className="text-[10px] font-mono text-gray-500 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // Share Individual Restaurant Card
  const handleOpenShare = (rest: RestaurantItem) => {
    setSharingRest(rest);
    setCopiedLink(false);
  };

  const handleDownloadImageCard = async () => {
    if (!sharingRest) return;
    setSharingProgress(true);
    try {
      const element = document.getElementById('visual-rest-card-canvas-root');
      if (!element) {
        alert('Could not find card container.');
        return;
      }
      const canvas = await safeHtml2Canvas(element, {
        scale: 3, // High DPI resolution matching
        useCORS: true,
        logging: false,
        backgroundColor: null
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${sharingRest.name.replace(/[^a-zA-Z0-9]/g, '_')}_RestaurantCard.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download restaurant image card:', err);
      alert('Error rendering restaurant card.');
    } finally {
      setSharingProgress(false);
    }
  };

  const handleShareImageCard = async () => {
    if (!sharingRest) return;
    setSharingProgress(true);
    try {
      const element = document.getElementById('visual-rest-card-canvas-root');
      if (!element) {
        alert('Could not find card container.');
        return;
      }
      const canvas = await safeHtml2Canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null
      });
      const imgData = canvas.toDataURL('image/png');
      const response = await fetch(imgData);
      const blob = await response.blob();
      const file = new File([blob], `${sharingRest.name.replace(/[^a-zA-Z0-9]/g, '_')}_RestaurantCard.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Dining Memory: ${sharingRest.name}`,
          text: `Check out this culinary memory of "${sharingRest.name}" logged on my cozy tracking app!`
        });
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${sharingRest.name.replace(/[^a-zA-Z0-9]/g, '_')}_RestaurantCard.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('Web Share is restricted or unsupported in this browser. We have successfully compiled and downloaded your premium image card directly to your device! ✨');
      }
    } catch (err) {
      console.error('Failed to share restaurant image card:', err);
      handleDownloadImageCard();
    } finally {
      setSharingProgress(false);
    }
  };

  const copyShareText = () => {
    if (!sharingRest) return;
    const stars = '★'.repeat(Math.round(sharingRest.rating || 5)) + '☆'.repeat(5 - Math.round(sharingRest.rating || 5));
    const shareText = `🍽️ Cozy Restaurant Diary Review 🍽️
🏡 Restaurant: ${sharingRest.name}
🍲 Best Cuisine: ${sharingRest.cuisine} • 🏷️ Style: ${sharingRest.type}
📊 Status: ${sharingRest.visited ? 'Visited' : 'Want to visit'}
${sharingRest.visited ? `⭐ Rating: ${stars} (${sharingRest.rating}/5)\n💬 Verdict: ${sharingRest.verdict || ''}\n📝 Note: "${sharingRest.remarks || ''}"` : '❤️ Adding to my culinary bucketlist!'}

Shared from my Cozy Workspace ✨`;

    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWebShare = async () => {
    handleShareImageCard();
  };

  // Filter spots
  const filteredRestaurants = restaurants.filter(rest => {
    const matchesFilter = activeFilter === 'All' 
      ? true 
      : activeFilter === 'Visited' 
        ? rest.visited === true 
        : rest.visited === false;
    
    const matchesSearch = rest.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rest.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rest.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6" id="restaurant-diary-module">
      {/* Search & Tool belt */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-[#EFECE6] p-4 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8D8880]" />
          <input
            id="restaurant-search"
            type="text"
            placeholder="Search name, cuisine, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
          />
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            id="add-restaurant-trigger"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#153427] rounded-xl transition-all duration-150 cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            Add Restaurant
          </button>
        </div>
      </div>

      {/* Add Spot Form centering Modal overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <form 
            id="add-restaurant-form"
            onSubmit={handleAddRestaurant}
            className="bg-white border border-[#EFECE6] rounded-3xl w-full max-w-lg p-6 my-auto shadow-xl animate-scale-in space-y-4 relative text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF9F6]">
              <h3 className="font-serif font-semibold text-[#1B4332] text-lg flex items-center gap-2">
                <Utensils size={20} className="text-[#1B4332]" />
                Track New Dining Spot
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
              <div className="space-y-1.5">
                <label htmlFor="rest-name" className="block text-xs font-semibold text-[#8D8880]">Restaurant Name</label>
                <input
                  id="rest-name"
                  type="text"
                  required
                  placeholder="Matcha Parlour, Green Bistro..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="rest-cuisine" className="block text-xs font-semibold text-[#8D8880]">Best Cuisine / Style</label>
                  <input
                    id="rest-cuisine"
                    type="text"
                    placeholder="Ramen, Coffee, French Haute..."
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F] placeholder:text-[#8D8880]/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="rest-type" className="block text-xs font-semibold text-[#8D8880]">Restaurant Type</label>
                  <select
                    id="rest-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-[#4A443F]"
                  >
                    <option value="Local Spot">Local Spot</option>
                    <option value="Fine Dining">Fine Dining</option>
                    <option value="Street Food Stand">Street Food Stand</option>
                    <option value="Bakery & Cafe">Bakery & Cafe</option>
                    <option value="Tavern / Bar">Tavern / Bar</option>
                  </select>
                </div>
              </div>

              {/* Restaurant Image/Poster upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#8D8880]">Restaurant Photo / Poster <span className="text-[10px] font-normal text-amber-600">(Optional)</span></label>
                <div className="flex items-center gap-4">
                  {addFormImage ? (
                    <div className="relative w-16 h-12 shrink-0 border border-[#EFECE6] rounded-lg overflow-hidden bg-gray-50">
                      <img src={addFormImage} className="w-full h-full object-cover" alt="Restaurant thumbnail" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => setAddFormImage('')}
                        className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-600 text-white p-0.5 rounded-bl"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => addImageInputRef.current?.click()}
                      className="w-16 h-12 shrink-0 border border-dashed border-[#D1CDC7] rounded-lg flex flex-col items-center justify-center text-[#8D8880] hover:text-[#1B4332] hover:bg-[#FAF9F6] transition cursor-pointer"
                    >
                      <ImageIcon size={16} />
                      <span className="text-[8px] font-semibold mt-1">Upload</span>
                    </div>
                  )}
                  <input 
                    ref={addImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAddImageUpload}
                    className="hidden"
                  />
                  <div className="text-left">
                    <p className="text-[11px] text-[#4A443F] font-medium">Add a restaurant picture or storefront</p>
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
                disabled={addFormProgress}
                className="px-4.5 py-2 bg-[#1B4332] text-white hover:bg-[#153427] font-semibold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {addFormProgress ? 'Compressing...' : 'Add Spot'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Primary classification filters list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8D8880]">Dining Spots</h4>
          </div>

          <div className="flex gap-1.5 bg-[#FAF9F6] border border-[#EFECE6] p-0.5 rounded-lg text-xs leading-none">
            {['All', 'Visited', 'Not Visited'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as 'All' | 'Visited' | 'Not Visited')}
                className={`px-3 py-1.5 font-semibold rounded-md transition cursor-pointer ${
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

        {/* Restaurants matching cards lists */}
        {filteredRestaurants.length === 0 ? (
          <div className="bg-white border border-[#EFECE6] rounded-2xl py-12 px-6 text-center text-[#8D8880] font-sans shadow-2xs">
            <Utensils size={34} className="mx-auto mb-3 text-[#D1CDC7] stroke-[1.5]" />
            <h4 className="font-semibold text-[#4A443F] text-sm">No dining spots recorded</h4>
            <p className="text-xs max-w-xs mx-auto mt-1 text-[#8D8880]">Your filters or search didn't matches any restaurant spot. Add your favorite local eatery now!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="restaurant-items-grid">
            {filteredRestaurants.map((item) => (
              <div 
                key={item.id}
                className="bg-white border border-[#EFECE6] rounded-2xl p-4 flex gap-4 hover:shadow-md transition duration-200"
              >
                {/* Left side Image/Photo */}
                {item.image ? (
                  <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden border border-[#EFECE6] bg-[#FAF9F6] shadow-2xs my-auto">
                    <img 
                      src={item.image} 
                      alt={`${item.name} cover`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-20 shrink-0 rounded-lg flex flex-col items-center justify-center border border-[#D8F3DC] bg-[#E8F5E9] shadow-2xs my-auto text-[#1B4332]/80">
                    <Utensils size={24} />
                  </div>
                )}

                {/* Main Content Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 bg-[#1B4332]/10 text-[#1B4332] rounded-md text-[9px] uppercase font-bold tracking-wider truncate">
                        {item.type}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleOpenShare(item)}
                          className="p-1 text-[#8D8880] hover:text-[#1B4332] rounded-md transition"
                          title="Share Diary Entry"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(item.id)}
                          className="p-1 text-[#8D8880] hover:text-red-600 rounded-md transition"
                          title="Delete dining diary"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-serif font-semibold text-[#1B4332] text-lg mt-1.5 tracking-tight truncate">
                       {item.name}
                    </h3>
                    <p className="text-[11px] text-[#4A443F] font-semibold mt-0.5 truncate">
                      <span className="text-[#8D8880] font-normal text-[10px]">Best Cuisine:</span> {item.cuisine}
                    </p>

                    {/* Visited parameters inside */}
                    {item.visited ? (
                      <div className="mt-3 pt-2.5 border-t border-[#FAF9F6] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          {renderStarsStatic(item.rating)}
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-semibold rounded-full text-[9px] tracking-wide uppercase">
                            {item.verdict}
                          </span>
                        </div>
                        {item.remarks && (
                          <p className="text-[#4A443F] italic bg-[#FAF9F6] border border-[#EFECE6] p-2 rounded-xl text-[11px] leading-relaxed line-clamp-2">
                            "{item.remarks}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-[#FAF9F6] flex justify-between items-center text-xs">
                        <span className="text-[#8D8880] text-[10px] font-medium">Not Visited yet</span>
                        <button
                          onClick={() => handleToggleVisited(item)}
                          className="px-2.5 py-0.5 bg-[#FAF9F6] text-[#1B4332] hover:bg-[#EFECE6] border border-[#EFECE6] rounded-lg font-medium transition cursor-pointer text-xs"
                        >
                          Mark Visited
                        </button>
                      </div>
                    )}
                  </div>

                  {item.visited && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => handleToggleVisited(item)}
                        className="text-[9px] font-semibold text-gray-400 hover:text-amber-600 transition"
                      >
                        Undo Visited Status
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visited interactive review modal */}
      {reviewingRest && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <div className="bg-white border border-[#EFECE6] rounded-3xl w-full max-w-md p-6 my-auto shadow-xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF9F6]">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Visited Dairy</span>
                <h3 className="font-semibold text-gray-900 text-sm mt-0.5">Let's log your visit for: <span className="text-[#1B4332] font-semibold">{reviewingRest.name}</span></h3>
              </div>
              <button
                onClick={() => setReviewingRest(null)}
                className="p-1 px-1.5 text-gray-400 hover:text-gray-600 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stars rating selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400">Rating (1 to 5 Stars)</label>
              {renderStarsSelector(rating, setRating)}
            </div>

            {/* Verdict tags */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400">Culinary Verdict</label>
              <div className="flex flex-wrap gap-2">
                {['Amazing', 'Average', 'Never Again', 'Hidden Gem', 'Great Service', 'Stellar Eats'].map((tag) => (
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

            {/* Private remarks */}
            <div className="space-y-1.5">
              <label htmlFor="remarks-text" className="block text-xs font-semibold text-gray-400">Remarks & Private notes</label>
              <textarea
                id="remarks-text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Delicious dishes, sitting area, signature drinks or prices..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] focus:border-[#1B4332] rounded-xl text-xs outline-none transition-colors duration-150 text-gray-800 resize-none"
              />
            </div>

            {/* Image attachment file selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400">Image Attachment (Store in Database)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 border border-dashed border-gray-300 hover:border-[#1B4332] text-gray-500 hover:text-gray-700 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  <ImageIcon size={14} />
                  {image ? 'Change Photo' : 'Attach Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {uploadProgress && <div className="text-xs text-gray-400">Compressing...</div>}
                
                {image && (
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-[#EFECE6]">
                    <img src={image} className="w-full h-full object-cover" alt="Selected dish preview" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white p-[1px] rounded-bl-md transition"
                      aria-label="Remove image"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#FAF9F6]">
              <button
                type="button"
                onClick={() => setReviewingRest(null)}
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
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Dialog for turning visited back to bucketlist */}
      {warningRest && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <div className="bg-white border border-[#EFECE6] rounded-2xl w-full max-w-sm p-6 my-auto shadow-xl animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-amber-500 pb-2 border-b border-[#FAF9F6]">
              <AlertTriangle className="shrink-0 stroke-[2.5]" size={22} />
              <h3 className="font-bold text-gray-950 text-sm">Destructive Action Warning</h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              Toggling <strong className="text-gray-900 font-semibold">"{warningRest.name}"</strong> back to <span className="font-semibold text-gray-700">Not Visited</span> will delete its star rating, quick verdict tag, review notes, and attached images indefinitely.
            </p>

            <p className="text-xs text-amber-700 font-semibold bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
              Are you sure you want to proceed and reset your progress? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setWarningRest(null)}
                className="px-4 py-2 border border-[#EFECE6] text-gray-500 hover:bg-[#FAF9F6] rounded-xl font-medium text-xs transition"
              >
                No, Keep My Review
              </button>
              <button
                type="button"
                onClick={confirmToggleToNotVisited}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-xs transition"
              >
                Yes, Clear and Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Restaurant Sharing popup */}
      {sharingRest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 overflow-y-auto flex items-start justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-3xl w-full max-w-md p-6 my-auto shadow-xl animate-fade-in space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFECE6]">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Share2 size={16} className="text-[#1B4332]" />
                Share Dining Card
              </h3>
              <button
                onClick={() => setSharingRest(null)}
                className="p-1 px-1.5 text-gray-400 hover:text-gray-600 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Visual rendering preview representing card */}
            <div className="bg-white border border-[#EFECE6] p-2.5 rounded-2xl shadow-xs overflow-hidden">
              <div 
                id="visual-rest-card-canvas-root" 
                className="bg-white border border-[#EFECE6] rounded-2xl p-5 flex flex-col justify-between max-w-sm mx-auto select-none space-y-4"
              >
                <div>
                  <div className="flex gap-4 items-start text-left">
                    {sharingRest.image ? (
                      <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden border border-[#EFECE6] bg-[#FAF9F6] shadow-2xs">
                        <img 
                          src={sharingRest.image} 
                          alt={`${sharingRest.name} photo`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-24 shrink-0 rounded-lg flex flex-col items-center justify-center border border-[#D8F3DC] bg-[#E8F5E9] shadow-2xs text-[#1B4332]/80">
                        <Utensils size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-[#1B4332]/10 text-[#1B4332] rounded-md text-[10px] uppercase font-bold tracking-wider truncate max-w-[150px]">
                          {sharingRest.cuisine}
                        </span>
                      </div>

                      <h3 className="font-serif font-semibold text-[#1B4332] text-lg mt-2 tracking-tight">
                        {sharingRest.name}
                      </h3>

                      <p className="text-[11px] text-[#8D8880] mt-0.5 font-medium">
                        🏷️ {sharingRest.type}
                      </p>
                    </div>
                  </div>

                  {sharingRest.visited ? (
                    <div className="mt-4 pt-3.5 border-t border-[#FAF9F6] space-y-2 text-xs text-left">
                      <div className="flex items-center justify-between">
                        {renderStarsStatic(sharingRest.rating)}
                        {sharingRest.verdict && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px] tracking-wide">
                            {sharingRest.verdict}
                          </span>
                        )}
                      </div>
                      
                      {sharingRest.remarks && (
                        <p className="text-[#4A443F] italic bg-[#FAF9F6] p-2.5 rounded-xl text-[11px] leading-relaxed border border-[#EFECE6]">
                          "{sharingRest.remarks}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-[#FAF9F6] flex justify-between items-center text-xs text-left">
                      <span className="text-[#8D8880] text-[11px]">Culinary Bucketlist</span>
                      <span className="text-[10px] font-semibold text-[#1B4332]">Restaurant Diary 🍽️</span>
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
