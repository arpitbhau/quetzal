// radhe radhe

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabase/supabaseConfig';
import { getPapers, setPapers, deletePaper, updatePaper, resetPapers, subscribeToChanges, initializePapers } from '../../data/papersData';
import toast from 'react-hot-toast';
import axios from 'axios';

// Add this helper at the top (after imports)
function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (typeof date === 'object' && date.day && date.month && date.year) {
    return `${date.day.toString().padStart(2, '0')}-${date.month.toString().padStart(2, '0')}-${date.year}`;
  }
  return '';
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [papers, setPapersState] = useState(getPapers());
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
  const [editingPaper, setEditingPaper] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [newPaper, setNewPaper] = useState({
    title: '',
    date: {
      day: '',
      month: '',
      year: ''
    },
    std: 11,
    category: 'jee',
    mhtcetType: 'pcm',
    questionFile: null,
    answerFile: null
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [backend_server, setBackendServer] = useState("127.0.0.1");
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
        // Force redirect as fallback
        setTimeout(() => {
          if (window.location.pathname === '/dashboard') {
            window.location.href = '/login';
          }
        }, 100);
        return;
      }
      
      if (!user) {
        setIsAuthenticated(false);
        navigate('/login');
        // Force redirect as fallback
        setTimeout(() => {
          if (window.location.pathname === '/dashboard') {
            window.location.href = '/login';
          }
        }, 100);
        return;
      }
      
      // Check if user is staff (has the correct email)
      if (user.email !== import.meta.env.VITE_STAFF_EMAIL) {
        setIsAuthenticated(false);
        navigate('/login');
        // Force redirect as fallback
        setTimeout(() => {
          if (window.location.pathname === '/dashboard') {
            window.location.href = '/login';
          }
        }, 100);
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('❌ Auth check exception:', error);
      setIsAuthenticated(false);
      navigate('/');
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
        // Force redirect as fallback
        setTimeout(() => {
          if (window.location.pathname === '/dashboard') {
            window.location.href = '/login';
          }
        }, 100);
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
      setPapersState(getPapers());
    });
    
    return unsubscribe;
  }, []);

  // Refresh search results when papers state changes
  useEffect(() => {
    performSearch();
  }, [papers]);

  const performSearch = () => {
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      let filtered = getPapers(); // Always get fresh data
      
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
            if (filters.mhtcet.pcm && result.mhtcetType === 'pcm') return true;
            if (filters.mhtcet.pcb && result.mhtcetType === 'pcb') return true;
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

  const handleEdit = (paperID) => {
    const paperToEdit = getPapers().find(paper => paper.paperID === paperID);
    if (paperToEdit) {
      // Handle both string and object date formats
      let parsedDate;
      if (typeof paperToEdit.date === 'string') {
        // Parse the date string into day, month, year
        const dateParts = paperToEdit.date.split('-');
        parsedDate = {
          day: dateParts[0] || '',
          month: dateParts[1] || '',
          year: dateParts[2] || ''
        };
      } else if (typeof paperToEdit.date === 'object' && paperToEdit.date.day && paperToEdit.date.month && paperToEdit.date.year) {
        // Date is already an object
        parsedDate = {
          day: paperToEdit.date.day.toString(),
          month: paperToEdit.date.month.toString(),
          year: paperToEdit.date.year.toString()
        };
      } else {
        // Fallback for invalid date format
        parsedDate = {
          day: '',
          month: '',
          year: ''
        };
      }
      
      const editingPaperWithParsedDate = {
        ...paperToEdit,
        date: parsedDate
      };
      setEditingPaper(editingPaperWithParsedDate);
      setShowEditModal(true);
    }
  };

  const handleDelete = async (paperID) => {
    if (window.confirm('Are you sure you want to delete this paper?')) {
      try {
        // Make API request to delete the paper
        const response = await axios.post('/api/del', {
          paperID: paperID
        });

        if (response.data.success) {
          // If API deletion is successful, also delete from local state
          await deletePaper(paperID);
          toast.success('Paper deleted successfully!');
        } else {
          toast.error(response.data.message || 'Failed to delete paper');
        }
      } catch (error) {
        console.error('Error in handleDelete:', error);
        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error('Failed to delete paper. Please try again.');
        }
      }
    }
  };

  const handleSaveEdit = async () => {
    if (editingPaper) {
      const { day, month, year } = editingPaper.date;
      const formattedDate = formatDateForDisplay(day, month, year);
      
      if (!editingPaper.title || !day || !month || !year) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (!validateDate(day, month, year)) {
        toast.error('Please enter a valid date');
        return;
      }

      setIsEditing(true);
      try {
        // First, upload files if any are selected
        let fileUploadSuccess = true;
        if (editingPaper.questionFile || editingPaper.answerFile) {
          fileUploadSuccess = await uploadFilesToServer(
            editingPaper.paperID,
            editingPaper.questionFile,
            editingPaper.answerFile
          );
        }

        // Update file links if files were uploaded
        let updatedQueLink = editingPaper.queLink;
        let updatedSolLink = editingPaper.solLink;
        
        if (editingPaper.questionFile) {
          updatedQueLink = `http://${backend_server}:3000/download/${editingPaper.paperID}/question_paper.pdf`;
        }
        
        if (editingPaper.answerFile) {
          updatedSolLink = `http://${backend_server}:3000/download/${editingPaper.paperID}/ans_key.pdf`;
        }

        // Update paper data regardless of file upload status
        const paperToUpdate = {
          ...editingPaper,
          date: formattedDate,
          queLink: updatedQueLink,
          solLink: updatedSolLink
        };
        await updatePaper(editingPaper.paperID, paperToUpdate);
        
        setShowEditModal(false);
        setEditingPaper(null);
        
        if (fileUploadSuccess) {
          toast.success('Paper updated successfully!');
        }
      } catch (error) {
        console.error('Error in handleSaveEdit:', error);
        toast.error('Failed to update paper. Please try again.');
      } finally {
        setIsEditing(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingPaper(null);
  };

  const handleEditChange = (field, value) => {
    setEditingPaper(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-focus for date fields in edit modal
    if (field === 'date' && typeof value === 'object') {
      const { day, month, year } = value;
      
      // Auto-focus to next field when current field is complete
      if (day && day.length === 2 && !month) {
        // Move to month field in edit modal
        const monthInput = document.querySelector('.edit-modal input[placeholder="MM"]');
        if (monthInput) monthInput.focus();
      } else if (month && month.length === 2 && !year) {
        // Move to year field in edit modal
        const yearInput = document.querySelector('.edit-modal input[placeholder="YYYY"]');
        if (yearInput) yearInput.focus();
      }
    }
  };

  const handleNewPaperChange = (field, value) => {
    setNewPaper(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (part, value) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '');
    
    setNewPaper(prev => ({
      ...prev,
      date: {
        ...prev.date,
        [part]: numericValue
      }
    }));

    // Auto-focus to next field when current field is complete
    if (numericValue.length === 2 && part === 'day') {
      // Move to month field
      const monthInput = document.querySelector('input[placeholder="MM"]');
      if (monthInput) monthInput.focus();
    } else if (numericValue.length === 2 && part === 'month') {
      // Move to year field
      const yearInput = document.querySelector('input[placeholder="YYYY"]');
      if (yearInput) yearInput.focus();
    }
  };

  const validateDate = (day, month, year) => {
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (dayNum < 1 || dayNum > 31) return false;
    if (monthNum < 1 || monthNum > 12) return false;
    if (yearNum < 1900 || yearNum > 2100) return false;
    
    // Check for valid date (accounting for leap years, etc.)
    const date = new Date(yearNum, monthNum - 1, dayNum);
    return date.getDate() === dayNum && 
           date.getMonth() === monthNum - 1 && 
           date.getFullYear() === yearNum;
  };

  const formatDateForDisplay = (day, month, year) => {
    if (!day || !month || !year) return '';
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  };

  const handleFileChange = (field, file) => {
    setNewPaper(prev => ({
      ...prev,
      [field]: file
    }));
  };

  // Function to upload files to server
  const uploadFilesToServer = async (paperID, questionFile, answerFile) => {
    try {
      const formData = new FormData();
      formData.append('paperID', paperID);
      
      if (questionFile) {
        formData.append('quePaperFile', questionFile);
      }
      
      if (answerFile) {
        formData.append('ansKeyFile', answerFile);
      }

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Files uploaded successfully!');
        return true;
      } else {
        toast.error(response.data.message || 'File upload failed');
        return false;
      }
    } catch (error) {
      console.error('File upload error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to upload files. Please try again.');
      }
      return false;
    }
  };

  const handleUpload = () => {
    setShowUploadModal(true);
  };

  const handleSaveUpload = async () => {
    const { day, month, year } = newPaper.date;
    const formattedDate = formatDateForDisplay(day, month, year);
    
    if (!newPaper.title || !day || !month || !year) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validateDate(day, month, year)) {
      toast.error('Please enter a valid date');
      return;
    }

    setIsUploading(true);
    try {
      // Generate a unique paper ID
      const paperID = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // First, upload files if any are selected
      let fileUploadSuccess = true;
      if (newPaper.questionFile || newPaper.answerFile) {
        fileUploadSuccess = await uploadFilesToServer(
          paperID,
          newPaper.questionFile,
          newPaper.answerFile
        );
      }
      
      // Handle file links
      let questionLink = '';
      let solutionLink = '';
      
      if (newPaper.questionFile) {
        questionLink = `http://127.0.0.1:3000/download/${paperID}/question_paper.pdf`;
      }
      
      if (newPaper.answerFile) {
        solutionLink = `http://127.0.0.1:3000/download/${paperID}/ans_key.pdf`;
      }
      
      const paperToAdd = {
        ...newPaper,
        paperID,
        date: formattedDate,
        standard: newPaper.std === 11 ? '11th' : '12th',
        queLink: questionLink,
        solLink: solutionLink,
        mhtcetType: newPaper.category === 'mhtcet' ? newPaper.mhtcetType : null
      };

      // Get current papers and add the new one
      const currentPapers = getPapers();
      const updatedPapers = [...currentPapers, paperToAdd];
      
      // Update the papers data
      await setPapers(updatedPapers);
      
      // Reset form and close modal
      setNewPaper({
        title: '',
        date: {
          day: '',
          month: '',
          year: ''
        },
        std: 11,
        category: 'jee',
        mhtcetType: 'pcm',
        questionFile: null,
        answerFile: null
      });
      setShowUploadModal(false);
      
      if (fileUploadSuccess) {
        toast.success('Paper uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading paper:', error);
      toast.error('Failed to upload paper. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setShowUploadModal(false);
    setNewPaper({
      title: '',
      date: {
        day: '',
        month: '',
        year: ''
      },
      std: 11,
      category: 'jee',
      mhtcetType: 'pcm',
      questionFile: null,
      answerFile: null
    });
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data to initial state?')) {
      resetPapers();
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Logout error:', error);
        toast.error('Logout failed. Please try again.');
      } else {
        toast.success('Logged out successfully! Redirecting to home...');
        // Immediately set auth state to false
        setIsAuthenticated(false);
        // Redirect to home page after logout
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Logout exception:', error);
      toast.error('An error occurred during logout. Please try again.');
    }
  };

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

  // Don't render dashboard if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen select-none dark-neon-bg neon-blur text-white">
      <style jsx>{`
        select option {
          background-color: #000000 !important;
          color: #ffffff !important;
          padding: 8px 12px !important;
          border: none !important;
        }
        select option:hover {
          background-color: #1a1a1a !important;
        }
        select option:checked {
          background-color: #2d1b69 !important;
        }
      `}</style>
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
                  onClick={() => navigate('/')}
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

                              {/* User Info, Upload and Logout */}
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={handleUpload}
                  className="px-3 py-1.5 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-lg text-green-300 font-medium cursor-pointer hover:bg-green-500/30 hover:border-green-400/50 hover:backdrop-blur-md transition-all duration-300 text-xs"
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Upload
                </motion.button>
                <motion.button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg text-red-300 font-medium cursor-pointer hover:bg-red-500/30 hover:border-red-400/50 hover:backdrop-blur-md transition-all duration-300 text-xs"
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Logout
                </motion.button>
                <motion.a 
                  href="https://github.com/arpitbhau"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 cursor-pointer"
                  whileHover={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowCreatorModal(true);
                  }}
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
              onClick={() => navigate('/')}
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

            {/* User Info, Upload and Logout Button */}
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={handleUpload}
                className="px-4 py-2 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl text-green-300 font-medium cursor-pointer hover:bg-green-500/30 hover:border-green-400/50 hover:backdrop-blur-md transition-all duration-300"
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
              >
                Upload
              </motion.button>
              <motion.button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl text-red-300 font-medium cursor-pointer hover:bg-red-500/30 hover:border-red-400/50 hover:backdrop-blur-md transition-all duration-300"
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
              >
                Logout
              </motion.button>
              <motion.a 
                href="https://github.com/arpitbhau"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 cursor-pointer"
                whileHover={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
                onClick={(e) => {
                  e.preventDefault();
                  setShowCreatorModal(true);
                }}
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
        {/* Filter Sidebar - Desktop */}
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
                      key={`${result.paperID}-${result.title}-${result.date}-${result.std}-${result.category}`}
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
                            {result.category === 'mhtcet' && (
                              <span className="px-1.5 lg:px-2 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300">
                                {result.mhtcetType.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(result.date)}</span>
                        </div>
                        <h3 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 line-clamp-2">{result.title}</h3>
                      </div>
                      <div className="flex-1"></div>
                      {/* Edit and Delete Buttons at the bottom */}
                      <div className="flex flex-col space-y-2 lg:space-y-3 mt-auto pt-2">
                        <motion.div
                          whileHover={{ scale: 0.98 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <button
                            onClick={() => handleEdit(result.paperID)}
                            className="w-full block py-2.5 lg:py-3 px-3 lg:px-4 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-xl text-blue-300 font-medium transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 text-sm lg:text-base cursor-pointer hover:bg-blue-500/30 hover:border-blue-400/50 hover:backdrop-blur-md"
                          >
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit Paper</span>
                          </button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 0.98 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <button
                            onClick={() => handleDelete(result.paperID)}
                            className="w-full block py-2.5 lg:py-3 px-3 lg:px-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl text-red-300 font-medium transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 text-sm lg:text-base cursor-pointer hover:bg-red-500/30 hover:border-red-400/50 hover:backdrop-blur-md"
                          >
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete Paper</span>
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
        className="lg:hidden fixed bottom-2 sm:bottom-3 md:bottom-4 right-2 sm:right-3 md:right-4 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full shadow-2xl flex items-center justify-center z-50 cursor-pointer hover:bg-black/50 hover:border-white/20 hover:backdrop-blur-md transition-all duration-300"
        whileHover={{ scale: 0.95 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowMobileFilters(true)}
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-xl border-t border-white/10 rounded-t-2xl sm:rounded-t-3xl p-3 sm:p-4 lg:p-6 max-h-[80vh] sm:max-h-[85vh] overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Filters
                </h3>
                <motion.button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 hover:border-white/30 hover:backdrop-blur-md transition-all duration-300"
                  whileHover={{ scale: 0.95 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
              
              <div className="max-h-40 sm:max-h-48 md:max-h-60 lg:max-h-96 overflow-y-auto pb-3 sm:pb-4">
                <FilterOptions />
              </div>
              
              <motion.button
                onClick={() => setShowMobileFilters(false)}
                className="w-full mt-3 sm:mt-4 lg:mt-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl text-white font-medium cursor-pointer hover:bg-white/20 hover:border-white/30 hover:backdrop-blur-md transition-all duration-300 text-sm sm:text-base"
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
              >
                Apply Filters
              </motion.button>
            </motion.div>
          </motion.div>
                 )}
       </AnimatePresence>

       {/* Edit Modal */}
       <AnimatePresence>
         {showEditModal && editingPaper && (
           <motion.div
             className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
           >
             {/* Backdrop */}
             <motion.div
               className="absolute inset-0 bg-black/50 backdrop-blur-sm"
               onClick={handleCancelEdit}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
             />
             
             {/* Modal */}
             <motion.div
               className="edit-modal relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
             >
               <div className="flex items-center justify-between mb-4 sm:mb-6">
                 <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                   Edit Paper
                 </h3>
                 <motion.button
                   onClick={handleCancelEdit}
                   className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 hover:border-white/30 hover:backdrop-blur-md transition-all duration-300"
                   whileHover={{ scale: 0.95 }}
                   whileTap={{ scale: 0.9 }}
                 >
                   <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </motion.button>
               </div>
               
               <div className="space-y-3 sm:space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Title</label>
                   <input
                     type="text"
                     value={editingPaper.title}
                     onChange={(e) => handleEditChange('title', e.target.value)}
                     className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Date</label>
                   <div className="flex space-x-2 justify-center">
                     <input
                       type="text"
                       value={editingPaper.date.day}
                       onChange={(e) => handleEditChange('date', { ...editingPaper.date, day: e.target.value.replace(/\D/g, '') })}
                       placeholder="DD"
                       maxLength={2}
                       className="w-16 sm:w-20 px-2 sm:px-3 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base text-center"
                     />
                     <span className="flex items-center text-white text-lg">-</span>
                     <input
                       type="text"
                       value={editingPaper.date.month}
                       onChange={(e) => handleEditChange('date', { ...editingPaper.date, month: e.target.value.replace(/\D/g, '') })}
                       placeholder="MM"
                       maxLength={2}
                       className="w-16 sm:w-20 px-2 sm:px-3 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-center"
                     />
                     <span className="flex items-center text-white text-lg">-</span>
                     <input
                       type="text"
                       value={editingPaper.date.year}
                       onChange={(e) => handleEditChange('date', { ...editingPaper.date, year: e.target.value.replace(/\D/g, '') })}
                       placeholder="YYYY"
                       maxLength={4}
                       className="w-20 sm:w-24 px-2 sm:px-3 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base text-center"
                     />
                   </div>
                   {editingPaper.date.day && editingPaper.date.month && editingPaper.date.year && !validateDate(editingPaper.date.day, editingPaper.date.month, editingPaper.date.year) && (
                     <p className="text-red-400 text-xs mt-1">Please enter a valid date</p>
                   )}
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Standard</label>
                   <div className="relative">
                     <select
                       value={editingPaper.std}
                       onChange={(e) => handleEditChange('std', parseInt(e.target.value))}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                       style={{
                         backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                         backgroundPosition: 'right 0.75rem center',
                         backgroundRepeat: 'no-repeat',
                         backgroundSize: '1.5em 1.5em',
                         paddingRight: '2.5rem'
                       }}
                     >
                       <option value={11}>11th</option>
                       <option value={12}>12th</option>
                     </select>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Category</label>
                   <div className="relative">
                     <select
                       value={editingPaper.category}
                       onChange={(e) => handleEditChange('category', e.target.value)}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                       style={{
                         backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                         backgroundPosition: 'right 0.75rem center',
                         backgroundRepeat: 'no-repeat',
                         backgroundSize: '1.5em 1.5em',
                         paddingRight: '2.5rem'
                       }}
                     >
                       <option value="jee">JEE</option>
                       <option value="neet">NEET</option>
                       <option value="board">Board</option>
                       <option value="mhtcet">MHT-CET</option>
                     </select>
                   </div>
                 </div>

                 {editingPaper.category === 'mhtcet' && (
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">MHT-CET Type</label>
                     <div className="relative">
                       <select
                         value={editingPaper.mhtcetType || 'pcm'}
                         onChange={(e) => handleEditChange('mhtcetType', e.target.value)}
                         className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                         style={{
                           backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                           backgroundPosition: 'right 0.75rem center',
                           backgroundRepeat: 'no-repeat',
                           backgroundSize: '1.5em 1.5em',
                           paddingRight: '2.5rem'
                         }}
                       >
                         <option value="pcm">PCM</option>
                         <option value="pcb">PCB</option>
                       </select>
                     </div>
                   </div>
                 )}

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Question Paper (PDF)</label>
                   <div className="relative">
                     <input
                       type="file"
                       accept=".pdf"
                       onChange={(e) => handleEditChange('questionFile', e.target.files[0])}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 file:cursor-pointer"
                     />
                     {editingPaper.questionFile && (
                       <div className="mt-2 text-xs text-purple-300">
                         Selected: {editingPaper.questionFile.name}
                       </div>
                     )}
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Answer Key (PDF)</label>
                   <div className="relative">
                     <input
                       type="file"
                       accept=".pdf"
                       onChange={(e) => handleEditChange('answerFile', e.target.files[0])}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 file:cursor-pointer"
                     />
                     {editingPaper.answerFile && (
                       <div className="mt-2 text-xs text-purple-300">
                         Selected: {editingPaper.answerFile.name}
                       </div>
                     )}
                   </div>
                 </div>
               </div>
               
               <div className="flex space-x-2 sm:space-x-3 mt-4 sm:mt-6">
                 <motion.button
                   onClick={handleCancelEdit}
                   className="flex-1 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl text-white font-medium cursor-pointer hover:bg-white/20 hover:border-white/30 hover:backdrop-blur-md transition-all duration-300 text-sm sm:text-base"
                   whileHover={{ scale: 0.98 }}
                   whileTap={{ scale: 0.95 }}
                 >
                   Cancel
                 </motion.button>
                 <motion.button
                   onClick={handleSaveEdit}
                   disabled={isEditing}
                   className={`flex-1 py-2.5 sm:py-3 backdrop-blur-sm border rounded-lg sm:rounded-xl font-medium cursor-pointer transition-all duration-300 text-sm sm:text-base flex items-center justify-center space-x-2 ${
                     isEditing 
                       ? 'bg-gray-500/20 border-gray-400/30 text-gray-300 cursor-not-allowed' 
                       : 'bg-purple-500/20 border-purple-400/30 text-purple-300 hover:bg-purple-500/30 hover:border-purple-400/50 hover:backdrop-blur-md'
                   }`}
                   whileHover={isEditing ? {} : { scale: 0.98 }}
                   whileTap={isEditing ? {} : { scale: 0.95 }}
                 >
                   {isEditing ? (
                     <>
                       <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                       <span>Saving...</span>
                     </>
                   ) : (
                     'Save Changes'
                   )}
                 </motion.button>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Upload Modal */}
       <AnimatePresence>
         {showUploadModal && (
           <motion.div
             className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
           >
             {/* Backdrop */}
             <motion.div
               className="absolute inset-0 bg-black/50 backdrop-blur-sm"
               onClick={handleCancelUpload}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
             />
             
             {/* Modal */}
             <motion.div
               className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
             >
               <div className="flex items-center justify-between mb-4 sm:mb-6">
                 <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                   Upload New Paper
                 </h3>
                 <motion.button
                   onClick={handleCancelUpload}
                   className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 hover:border-white/30 hover:backdrop-blur-md transition-all duration-300"
                   whileHover={{ scale: 0.95 }}
                   whileTap={{ scale: 0.9 }}
                 >
                   <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </motion.button>
               </div>
               
               <div className="space-y-3 sm:space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Title *</label>
                   <input
                     type="text"
                     value={newPaper.title}
                     onChange={(e) => handleNewPaperChange('title', e.target.value)}
                     placeholder="Enter paper title"
                     className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Date *</label>
                   <div className="flex space-x-2 justify-center">
                     <input
                       type="text"
                       value={newPaper.date.day}
                       onChange={(e) => handleDateChange('day', e.target.value)}
                       placeholder="DD"
                       maxLength={2}
                       className="w-16 sm:w-20 px-2 sm:px-3 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base text-center"
                     />
                     <span className="flex items-center text-white text-lg">-</span>
                     <input
                       type="text"
                       value={newPaper.date.month}
                       onChange={(e) => handleDateChange('month', e.target.value)}
                       placeholder="MM"
                       maxLength={2}
                       className="w-16 sm:w-20 px-2 sm:px-3 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base text-center"
                     />
                     <span className="flex items-center text-white text-lg">-</span>
                     <input
                       type="text"
                       value={newPaper.date.year}
                       onChange={(e) => handleDateChange('year', e.target.value)}
                       placeholder="YYYY"
                       maxLength={4}
                       className="w-20 sm:w-24 px-2 sm:px-3 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base text-center"
                     />
                   </div>
                   {newPaper.date.day && newPaper.date.month && newPaper.date.year && !validateDate(newPaper.date.day, newPaper.date.month, newPaper.date.year) && (
                     <p className="text-red-400 text-xs mt-1">Please enter a valid date</p>
                   )}
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Standard</label>
                   <div className="relative">
                     <select
                       value={newPaper.std}
                       onChange={(e) => handleNewPaperChange('std', parseInt(e.target.value))}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                       style={{
                         backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                         backgroundPosition: 'right 0.75rem center',
                         backgroundRepeat: 'no-repeat',
                         backgroundSize: '1.5em 1.5em',
                         paddingRight: '2.5rem'
                       }}
                     >
                       <option value={11}>11th</option>
                       <option value={12}>12th</option>
                     </select>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Category</label>
                   <div className="relative">
                     <select
                       value={newPaper.category}
                       onChange={(e) => handleNewPaperChange('category', e.target.value)}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                       style={{
                         backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                         backgroundPosition: 'right 0.75rem center',
                         backgroundRepeat: 'no-repeat',
                         backgroundSize: '1.5em 1.5em',
                         paddingRight: '2.5rem'
                       }}
                     >
                       <option value="jee">JEE</option>
                       <option value="neet">NEET</option>
                       <option value="board">Board</option>
                       <option value="mhtcet">MHT-CET</option>
                     </select>
                   </div>
                 </div>

                 {newPaper.category === 'mhtcet' && (
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">MHT-CET Type</label>
                     <div className="relative">
                       <select
                         value={newPaper.mhtcetType}
                         onChange={(e) => handleNewPaperChange('mhtcetType', e.target.value)}
                         className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                         style={{
                           backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                           backgroundPosition: 'right 0.75rem center',
                           backgroundRepeat: 'no-repeat',
                           backgroundSize: '1.5em 1.5em',
                           paddingRight: '2.5rem'
                         }}
                       >
                         <option value="pcm">PCM</option>
                         <option value="pcb">PCB</option>
                       </select>
                     </div>
                   </div>
                 )}

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Question Paper (PDF)</label>
                   <div className="relative">
                     <input
                       type="file"
                       accept=".pdf"
                       onChange={(e) => handleFileChange('questionFile', e.target.files[0])}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-500/20 file:text-green-300 hover:file:bg-green-500/30 file:cursor-pointer"
                     />
                     {newPaper.questionFile && (
                       <div className="mt-2 text-xs text-green-300">
                         Selected: {newPaper.questionFile.name}
                       </div>
                     )}
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Answer Key (PDF)</label>
                   <div className="relative">
                     <input
                       type="file"
                       accept=".pdf"
                       onChange={(e) => handleFileChange('answerFile', e.target.files[0])}
                       className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-500/20 file:text-green-300 hover:file:bg-green-500/30 file:cursor-pointer"
                     />
                     {newPaper.answerFile && (
                       <div className="mt-2 text-xs text-green-300">
                         Selected: {newPaper.answerFile.name}
                       </div>
                     )}
                   </div>
                 </div>
               </div>
               
               <div className="flex space-x-2 sm:space-x-3 mt-4 sm:mt-6">
                 <motion.button
                   onClick={handleCancelUpload}
                   className="flex-1 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl text-white font-medium cursor-pointer hover:bg-white/20 hover:border-white/30 hover:backdrop-blur-md transition-all duration-300 text-sm sm:text-base"
                   whileHover={{ scale: 0.98 }}
                   whileTap={{ scale: 0.95 }}
                 >
                   Cancel
                 </motion.button>
                 <motion.button
                   onClick={handleSaveUpload}
                   disabled={isUploading}
                   className={`flex-1 py-2.5 sm:py-3 backdrop-blur-sm border rounded-lg sm:rounded-xl font-medium cursor-pointer transition-all duration-300 text-sm sm:text-base flex items-center justify-center space-x-2 ${
                     isUploading 
                       ? 'bg-gray-500/20 border-gray-400/30 text-gray-300 cursor-not-allowed' 
                       : 'bg-green-500/20 border-green-400/30 text-green-300 hover:bg-green-500/30 hover:border-green-400/50 hover:backdrop-blur-md'
                   }`}
                   whileHover={isUploading ? {} : { scale: 0.98 }}
                   whileTap={isUploading ? {} : { scale: 0.95 }}
                 >
                   {isUploading ? (
                     <>
                       <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin"></div>
                       <span>Uploading...</span>
                     </>
                   ) : (
                     'Upload Paper'
                   )}
                 </motion.button>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Creator Modal */}
       <AnimatePresence>
         {showCreatorModal && (
           <motion.div
             className="fixed inset-0 z-50 flex items-center justify-center p-4"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
           >
             {/* Backdrop */}
             <motion.div
               className="absolute inset-0 bg-black/50 backdrop-blur-sm"
               onClick={() => setShowCreatorModal(false)}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
             />
             
             {/* Modal */}
             <motion.div
               className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
             >
               <div className="text-center">
                 <div className="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center">
                   <img 
                     src="https://avatars.githubusercontent.com/u/149021988?v=4" 
                     alt="Creator Avatar" 
                     className="w-12 h-12 rounded-full"
                   />
                 </div>
                 <h3 className="text-lg font-bold text-white mb-2">arpitbhau</h3>
                 <p className="text-gray-300 mb-6">It's the creator of this app</p>
                 
                 <div className="space-y-3">
                   <motion.button
                     onClick={() => {
                       setShowCreatorModal(false);
                       window.open('https://github.com/arpitbhau', '_blank');
                     }}
                     className="w-full py-3 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-xl text-purple-300 font-medium cursor-pointer hover:bg-purple-500/30 hover:border-purple-400/50 hover:backdrop-blur-md transition-all duration-300"
                     whileHover={{ scale: 0.98 }}
                     whileTap={{ scale: 0.95 }}
                   >
                     See God's Profile
                   </motion.button>
                   <motion.button
                     onClick={() => setShowCreatorModal(false)}
                     className="w-full py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium cursor-pointer hover:bg-white/20 hover:border-white/30 hover:backdrop-blur-md transition-all duration-300"
                     whileHover={{ scale: 0.98 }}
                     whileTap={{ scale: 0.95 }}
                   >
                     Stay Here for Now
                   </motion.button>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 };

export default Dashboard;

