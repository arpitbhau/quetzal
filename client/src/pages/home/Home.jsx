// radhe radhe

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabase/supabaseConfig';
import { getPapers, subscribeToChanges, initializePapers } from '../../data/papersData';
import toast from 'react-hot-toast';

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (typeof date === 'object' && date.day && date.month && date.year) {
    return `${date.day.toString().padStart(2, '0')}-${date.month.toString().padStart(2, '0')}-${date.year}`;
  }
  return '';
}

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filters, setFilters] = useState({
    all: true,
    jee: false,
    neet: false,
    board: false,
    std11: false,
    std12: false,
    mhtcet: {
      all: false,
      pcm: false,
      pcb: false,
      pcmb: false
    }
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  // Check authentication status
  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Auth error:', error);
        setIsAuthenticated(false);
        navigate('/login');
        return;
      }
      
      if (!user) {
        setIsAuthenticated(false);
        navigate('/login');
        return;
      }
      
      // Allow any authenticated user to access home page
      setIsAuthenticated(true);
    } catch (error) {
      console.error('❌ Auth check exception:', error);
      setIsAuthenticated(false);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth on component mount and listen for auth changes
  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session?.user)) {
        setIsAuthenticated(false);
        navigate('/login');
      } else if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        setIsLoading(false);
      }
    });
    
    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Initialize papers data when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializePapers();
    }
  }, [isAuthenticated]);

  // GSAP animations
  useEffect(() => {
    gsap.fromTo('.logo', 
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, duration: 1, ease: 'power2.out' }
    );
    
    gsap.fromTo('.search-container', 
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'power2.out' }
    );
    
    gsap.fromTo('.filter-sidebar', 
      { opacity: 0, x: -100 },
      { opacity: 1, x: 0, duration: 1, delay: 0.6, ease: 'power2.out' }
    );
  }, []);

  // Dynamic search and filter
  useEffect(() => {
    performSearch();
  }, [searchQuery]);
  
  // Separate effect for filters to ensure it triggers properly
  useEffect(() => {
    performSearch();
  }, [filters.all, filters.jee, filters.neet, filters.board, filters.std11, filters.std12, filters.mhtcet.all, filters.mhtcet.pcm, filters.mhtcet.pcb, filters.mhtcet.pcmb]);

  // Real-time search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search to avoid too many requests

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters]);

  // Subscribe to shared data changes
  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      performSearch();
    });
    
    return unsubscribe;
  }, []);

  // Get papers from shared data
  const getPapersData = () => getPapers();

  const performSearch = () => {
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      let filtered = getPapersData();
      
      // First, filter by search query if there is one
      if (searchQuery.trim()) {
        filtered = filtered.filter(result => {
          return result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 formatDate(result.date).includes(searchQuery) ||
                 result.paperID.toLowerCase().includes(searchQuery.toLowerCase());
        });
      }
      
      // Then, apply category filters to the search results
      if (!filters.all) {
        filtered = filtered.filter(result => {
          if (filters.jee && result.category === 'jee') return true;
          if (filters.neet && result.category === 'neet') return true;
          if (filters.board && result.category === 'board') return true;
          if (filters.std11 && result.std === 11) return true;
          if (filters.std12 && result.std === 12) return true;
          if (result.category === 'mhtcet') {
            // MHT-CET logic
            if (filters.mhtcet.all) return true;
            // PCM/PCB subfilters (only one can be selected at a time)
            const isPCM = /pcm/i.test(result.title);
            const isPCB = /pcb/i.test(result.title);
            if (filters.mhtcet.pcm && isPCM) return true;
            if (filters.mhtcet.pcb && isPCB) return true;
            return false;
          }
          return false;
        });
      }
      
      setSearchResults(filtered);
      setIsSearching(false);
    }, 300); // Reduced delay for real-time feel
  };

  const handleSearch = () => {
    performSearch();
  };

  const handleFilterChange = (filterType, subFilter = null) => {
    setFilters(prev => {
      // If 'all' is being toggled
      if (filterType === 'all') {
        const newAll = !prev.all;
        // If turning 'all' on, turn off all other filters
        if (newAll) {
                  return {
          all: true,
          jee: false,
          neet: false,
          board: false,
          std11: false,
          std12: false,
          mhtcet: {
            all: false,
            pcm: false,
            pcb: false
          }
        };
        } else {
          // If turning 'all' off, keep other filters as is
          return {
            ...prev,
            all: false
          };
        }
      }

      // If any other filter is being toggled, untick 'all'
      let newFilters = { ...prev, all: false };
      if (filterType === 'mhtcet' && subFilter) {
        // PCM/PCB logic: only one can be selected at a time, and mhtcet.all must be unticked
        newFilters.mhtcet = {
          ...prev.mhtcet,
          all: false,
          pcm: false,
          pcb: false,
          [subFilter]: !prev.mhtcet[subFilter]
        };
        // If user ticks PCM, untick PCB and mhtcet.all; if user ticks PCB, untick PCM and mhtcet.all
        if (subFilter === 'pcm' && !prev.mhtcet.pcm) {
          newFilters.mhtcet.pcb = false;
        }
        if (subFilter === 'pcb' && !prev.mhtcet.pcb) {
          newFilters.mhtcet.pcm = false;
        }
      } else if (filterType === 'std11' || filterType === 'std12') {
        // Standard flip logic: if one is ticked, untick the other
        if (filterType === 'std11') {
          newFilters.std11 = !prev.std11;
          newFilters.std12 = false; // Untick 12th when 11th is selected
        } else {
          newFilters.std12 = !prev.std12;
          newFilters.std11 = false; // Untick 11th when 12th is selected
        }
      } else if (subFilter) {
        newFilters[filterType] = {
          ...prev[filterType],
          [subFilter]: !prev[filterType][subFilter]
        };
      } else {
        newFilters[filterType] = !prev[filterType];
      }

      // If all specific filters are now unticked, tick 'all' again
      const isAnySpecificChecked =
        newFilters.jee ||
        newFilters.neet ||
        newFilters.board ||
        newFilters.std11 ||
        newFilters.std12 ||
        newFilters.mhtcet.all ||
        newFilters.mhtcet.pcm ||
        newFilters.mhtcet.pcb;
      if (!isAnySpecificChecked) {
        newFilters.all = true;
      }
      return newFilters;
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleControlRoom = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const loadingToast = toast.loading('Logging out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Logout error:', error);
        toast.error('Logout failed. Please try again.', { id: loadingToast });
      } else {
        toast.success('Logged out successfully! Redirecting to login...', { id: loadingToast });
        // Immediately set auth state to false
        setIsAuthenticated(false);
        // Redirect to login page after logout
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Logout exception:', error);
      toast.error('An error occurred during logout. Please try again.', { id: loadingToast });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDownload = (url, filename) => {
    if (!url) return;
    
    // Simple approach - let the server handle the download headers
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter component for reuse
  const FilterOptions = () => (
    <div className="space-y-3">
      {/* All Papers */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 cursor-pointer ${
          filters.all 
            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 shadow-lg' 
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }`}
        onClick={() => handleFilterChange('all')}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            filters.all 
              ? 'border-purple-400 bg-purple-400' 
              : 'border-white/30 bg-transparent'
          }`}>
            {filters.all && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={`font-medium transition-colors duration-300 ${
            filters.all ? 'text-white' : 'text-gray-300'
          }`}>
            All Papers
          </span>
        </div>
        {filters.all && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl"></div>
        )}
      </motion.div>

      {/* JEE */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 cursor-pointer ${
          filters.jee 
            ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 shadow-lg' 
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }`}
        onClick={() => handleFilterChange('jee')}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            filters.jee 
              ? 'border-blue-400 bg-blue-400' 
              : 'border-white/30 bg-transparent'
          }`}>
            {filters.jee && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={`font-medium transition-colors duration-300 ${
            filters.jee ? 'text-white' : 'text-gray-300'
          }`}>
            JEE
          </span>
        </div>
        {filters.jee && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl"></div>
        )}
      </motion.div>

      {/* NEET */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 cursor-pointer ${
          filters.neet 
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 shadow-lg' 
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }`}
        onClick={() => handleFilterChange('neet')}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            filters.neet 
              ? 'border-green-400 bg-green-400' 
              : 'border-white/30 bg-transparent'
          }`}>
            {filters.neet && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={`font-medium transition-colors duration-300 ${
            filters.neet ? 'text-white' : 'text-gray-300'
          }`}>
            NEET
          </span>
        </div>
        {filters.neet && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl"></div>
        )}
      </motion.div>

      {/* Board */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 cursor-pointer ${
          filters.board 
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 shadow-lg' 
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }`}
        onClick={() => handleFilterChange('board')}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            filters.board 
              ? 'border-yellow-400 bg-yellow-400' 
              : 'border-white/30 bg-transparent'
          }`}>
            {filters.board && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={`font-medium transition-colors duration-300 ${
            filters.board ? 'text-white' : 'text-gray-300'
          }`}>
            Board
          </span>
        </div>
        {filters.board && (
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl"></div>
        )}
      </motion.div>

      {/* 11th Standard */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 cursor-pointer ${
          filters.std11 
            ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-400/30 shadow-lg' 
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }`}
        onClick={() => handleFilterChange('std11')}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            filters.std11 
              ? 'border-teal-400 bg-teal-400' 
              : 'border-white/30 bg-transparent'
          }`}>
            {filters.std11 && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={`font-medium transition-colors duration-300 ${
            filters.std11 ? 'text-white' : 'text-gray-300'
          }`}>
            11th Standard
          </span>
        </div>
        {filters.std11 && (
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-xl"></div>
        )}
      </motion.div>

      {/* 12th Standard */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 cursor-pointer ${
          filters.std12 
            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 shadow-lg' 
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }`}
        onClick={() => handleFilterChange('std12')}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            filters.std12 
              ? 'border-emerald-400 bg-emerald-400' 
              : 'border-white/30 bg-transparent'
          }`}>
            {filters.std12 && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={`font-medium transition-colors duration-300 ${
            filters.std12 ? 'text-white' : 'text-gray-300'
          }`}>
            12th Standard
          </span>
        </div>
        {filters.std12 && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl"></div>
        )}
      </motion.div>

      {/* MHT-CET */}
      <div className="space-y-2">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 cursor-pointer ${
            filters.mhtcet.all 
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 shadow-lg' 
              : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
          onClick={() => handleFilterChange('mhtcet', 'all')}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              filters.mhtcet.all 
                ? 'border-indigo-400 bg-indigo-400' 
                : 'border-white/30 bg-transparent'
            }`}>
              {filters.mhtcet.all && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`font-semibold transition-colors duration-300 ${
              filters.mhtcet.all ? 'text-white' : 'text-gray-300'
            }`}>
              MHT-CET
            </span>
          </div>
          {filters.mhtcet.all && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl"></div>
          )}
        </motion.div>
        
        <div className="ml-6 space-y-2">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`relative overflow-hidden rounded-lg p-2 transition-all duration-300 cursor-pointer ${
              filters.mhtcet.pcm 
                ? 'bg-gradient-to-r from-indigo-400/15 to-purple-400/15 border border-indigo-300/20' 
                : 'bg-white/3 border border-white/5 hover:bg-white/8 hover:border-white/10'
            }`}
            onClick={() => handleFilterChange('mhtcet', 'pcm')}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                filters.mhtcet.pcm 
                  ? 'border-indigo-300 bg-indigo-300' 
                  : 'border-white/20 bg-transparent'
              }`}>
                {filters.mhtcet.pcm && (
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className={`text-sm transition-colors duration-300 ${
                filters.mhtcet.pcm ? 'text-indigo-200' : 'text-gray-400'
              }`}>
                PCM
              </span>
            </div>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`relative overflow-hidden rounded-lg p-2 transition-all duration-300 cursor-pointer ${
              filters.mhtcet.pcb 
                ? 'bg-gradient-to-r from-indigo-400/15 to-purple-400/15 border border-indigo-300/20' 
                : 'bg-white/3 border border-white/5 hover:bg-white/8 hover:border-white/10'
            }`}
            onClick={() => handleFilterChange('mhtcet', 'pcb')}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                filters.mhtcet.pcb 
                  ? 'border-indigo-300 bg-indigo-300' 
                  : 'border-white/20 bg-transparent'
              }`}>
                {filters.mhtcet.pcb && (
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className={`text-sm transition-colors duration-300 ${
                filters.mhtcet.pcb ? 'text-indigo-200' : 'text-gray-400'
              }`}>
                PCB
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen dark-neon-bg neon-blur text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render home if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen dark-neon-bg neon-blur text-white select-none">
      {/* Bouncing neon circles */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-400 to-green-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 neon-glow bounce-circle-1"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 neon-glow bounce-circle-2"></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-gradient-to-r from-pink-400 to-red-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 neon-glow bounce-circle-3"></div>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-gradient-to-r from-purple-300 to-indigo-300 rounded-full mix-blend-screen filter blur-3xl opacity-15 neon-glow bounce-circle-4"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full mix-blend-screen filter blur-3xl opacity-15 neon-glow bounce-circle-5"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 md:p-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-4">
            {/* Top Row - Logo and User Info */}
            <div className="flex items-center justify-between">
              {/* Logo */}
              <motion.div 
                className="logo flex items-center space-x-2 cursor-pointer"
                whileHover={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img 
                  src="/logo.png" 
                  alt="Quetzal Logo" 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-2xl"
                />
                <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: 'Quick' }}>
                  Quetzal
                </span>
              </motion.div>

              {/* Control Room Button, Logout Button and User Info */}
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={handleControlRoom}
                  className="px-3 py-1.5 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-lg text-purple-300 font-medium cursor-pointer hover:bg-purple-500/30 hover:border-purple-400/50 hover:backdrop-blur-md transition-all duration-300 text-xs"
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Control Room
                </motion.button>
                <motion.button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`px-3 py-1.5 backdrop-blur-sm border rounded-lg font-medium transition-all duration-300 text-xs ${
                    isLoggingOut 
                      ? 'bg-gray-500/20 border-gray-400/30 text-gray-300 cursor-not-allowed' 
                      : 'bg-red-500/20 border-red-400/30 text-red-300 cursor-pointer hover:bg-red-500/30 hover:border-red-400/50 hover:backdrop-blur-md'
                  }`}
                  whileHover={isLoggingOut ? {} : { scale: 0.98 }}
                  whileTap={isLoggingOut ? {} : { scale: 0.95 }}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-3 h-3 border-2 border-red-300 border-t-transparent rounded-full animate-spin inline-block mr-1"></div>
                      <span>Logging out...</span>
                    </>
                  ) : (
                    'Logout'
                  )}
                </motion.button>
                <motion.a 
                  href="https://github.com/arpitbhau"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 cursor-pointer"
                  whileHover={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-1.5 shadow-lg">
                    <img 
                      src="https://avatars.githubusercontent.com/u/149021988?v=4" 
                      alt="GitHub Avatar" 
                      className="w-6 h-6 rounded-full"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Created by</span>
                    <span className="text-xs text-white font-medium">arpitbhau</span>
                  </div>
                </motion.a>
              </div>
            </div>

            {/* Search Bar */}
            <motion.div 
              className="search-container w-full"
              whileHover={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search papers..."
                  className="w-full px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 shadow-2xl text-sm"
                />
                {isSearching ? (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    onClick={handleSearch}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              </div>
            </motion.div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              className="logo flex items-center space-x-3 cursor-pointer"
              whileHover={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img 
                src="/logo.png" 
                alt="Quetzal Logo" 
                className="w-12 h-12 rounded-xl shadow-2xl"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: 'Quick' }}>
                Quetzal
              </span>
            </motion.div>

            {/* Search Bar */}
            <motion.div 
              className="search-container flex-1 max-w-2xl mx-8"
              whileHover={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Format: dd-mm-yyyy or keywords like 'galaxy'"
                  className="w-full px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 shadow-2xl"
                />
                {isSearching ? (
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="absolute right-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400 cursor-pointer hover:text-white transition-colors duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    onClick={handleSearch}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              </div>
            </motion.div>

            {/* Control Room Button, Logout Button and User Info */}
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={handleControlRoom}
                className="px-4 py-2 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-xl text-purple-300 font-medium cursor-pointer hover:bg-purple-500/30 hover:border-purple-400/50 hover:backdrop-blur-md transition-all duration-300"
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
              >
                Control Room
              </motion.button>
              <motion.button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`px-4 py-2 backdrop-blur-sm border rounded-xl font-medium transition-all duration-300 ${
                  isLoggingOut 
                    ? 'bg-gray-500/20 border-gray-400/30 text-gray-300 cursor-not-allowed' 
                    : 'bg-red-500/20 border-red-400/30 text-red-300 cursor-pointer hover:bg-red-500/30 hover:border-red-400/50 hover:backdrop-blur-md'
                }`}
                whileHover={isLoggingOut ? {} : { scale: 0.98 }}
                whileTap={isLoggingOut ? {} : { scale: 0.95 }}
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                    <span>Logging out...</span>
                  </>
                ) : (
                  'Logout'
                )}
              </motion.button>
              <motion.a 
                href="https://github.com/arpitbhau"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 cursor-pointer"
                whileHover={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-2 shadow-lg">
                  <img 
                    src="https://avatars.githubusercontent.com/u/149021988?v=4" 
                    alt="GitHub Avatar" 
                    className="w-8 h-8 rounded-full"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Created by</span>
                  <span className="text-sm text-white font-medium">arpitbhau</span>
                </div>
              </motion.a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-x-hidden">
        {/* Filter Sidebar */}
        <motion.aside 
          className="filter-sidebar w-full lg:w-80 p-4 lg:p-6 hidden lg:block"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Filters
            </h3>
            <FilterOptions />
          </div>
        </motion.aside>

        {/* Search Results */}
        <motion.section 
          className="flex-1 p-4 lg:p-6 overflow-x-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="max-w-6xl mx-auto">
            {searchResults.length === 0 && !isSearching && searchQuery.trim() === '' ? (
              <motion.div 
                className="text-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-24 h-24 mx-auto mb-6 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-300 mb-2">Search for Papers</h3>
                <p className="text-gray-500">Enter a date (dd-mm-yyyy) or keywords to find research papers</p>
              </motion.div>
            ) : searchResults.length === 0 && !isSearching && searchQuery.trim() !== '' ? (
              <motion.div 
                className="text-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-24 h-24 mx-auto mb-6 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M24 6.253v13m0-13C10.965 1.152 3.944 7.51 3.944 15.253c0 4.14 2.52 7.8 6.4 9.3 3.88 1.5 8.4 1.5 12.28 0 3.88-1.5 6.4-5.16 6.4-9.3 0-7.743-7.021-14.101-20.056-14.101z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-300 mb-2">No Results Found</h3>
                <p className="text-gray-500">Try different keywords or check your filters</p>
                <motion.button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-6 py-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white font-medium cursor-pointer hover:bg-black/50 hover:border-white/20 hover:backdrop-blur-md transition-all duration-300"
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear Search
                </motion.button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <AnimatePresence>
                  {searchResults.map((result, index) => (
                    <motion.div
                      key={result.paperID}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 0.98 }}
                      className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-white/10 shadow-2xl hover:bg-black/50 hover:border-white/20 hover:backdrop-blur-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-full min-h-[260px]"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3 lg:mb-4">
                          <div className="flex items-center space-x-1 lg:space-x-2">
                            <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                              result.category === 'jee' ? 'bg-blue-500/20 text-blue-300' :
                              result.category === 'neet' ? 'bg-green-500/20 text-green-300' :
                              result.category === 'board' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {result.category.toUpperCase()}
                            </span>
                            <span className="px-1.5 lg:px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300">
                              Std {result.std}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(result.date)}</span>
                        </div>
                        <h3 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 line-clamp-2">{result.title}</h3>
                      </div>
                      <div className="flex-1"></div>
                      {/* Download Buttons at the bottom */}
                      <div className="flex flex-col space-y-2 lg:space-y-3 mt-auto pt-2">
                        <motion.div
                          whileHover={{ scale: 0.98 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <button
                            onClick={() => handleDownload(result.queLink, `${result.title}_question_paper.pdf`)}
                            disabled={!result.queLink}
                            className={`w-full block py-2.5 lg:py-3 px-3 lg:px-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white font-medium transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 text-sm lg:text-base ${!result.queLink ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10 hover:border-white/20 hover:backdrop-blur-md'}`}
                          >
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="hidden sm:inline">Download Question Paper</span>
                            <span className="sm:hidden">Q Paper</span>
                          </button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 0.98 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <button
                            onClick={() => handleDownload(result.solLink, `${result.title}_answer_key.pdf`)}
                            disabled={!result.solLink}
                            className={`w-full block py-2.5 lg:py-3 px-3 lg:px-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white font-medium transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 text-sm lg:text-base ${!result.solLink ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10 hover:border-white/20 hover:backdrop-blur-md'}`}
                          >
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="hidden sm:inline">Download Answer Key</span>
                            <span className="sm:hidden">Answer Key</span>
                          </button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.section>
      </main>

      {/* Mobile Filter Button */}
      <motion.button
        className="lg:hidden fixed bottom-4 right-4 w-12 h-12 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full shadow-2xl flex items-center justify-center z-50 cursor-pointer hover:bg-black/50 hover:border-white/20 hover:backdrop-blur-md transition-all duration-300"
        whileHover={{ scale: 0.95 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowMobileFilters(true)}
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </motion.button>

      {/* Mobile Filter Modal */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileFilters(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            {/* Modal */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-4 lg:p-6 max-h-[80vh] overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Filters
                </h3>
                <motion.button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-8 h-8 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/50 hover:border-white/20 hover:backdrop-blur-md transition-all duration-300"
                  whileHover={{ scale: 0.95 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
              
              <div className="max-h-60 lg:max-h-96 overflow-y-auto pb-4">
                <FilterOptions />
              </div>
              
              <motion.button
                onClick={() => setShowMobileFilters(false)}
                className="w-full mt-4 lg:mt-6 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white font-medium cursor-pointer hover:bg-black/50 hover:border-white/20 hover:backdrop-blur-md transition-all duration-300"
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
              >
                Apply Filters
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;

