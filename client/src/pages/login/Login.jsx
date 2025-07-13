// radhe radhe

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabase/supabaseConfig';
import toast from 'react-hot-toast';

// Function to create SHA256 hash
const createSHA256Hash = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password change popup states
  const [showPasswordChangePopup, setShowPasswordChangePopup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  // GSAP animations
  useEffect(() => {
    gsap.fromTo('.login-container', 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }
    );
    
    gsap.fromTo('.logo', 
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 1, delay: 0.3, ease: 'power2.out' }
    );
    
    gsap.fromTo('.form-fields', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.6, ease: 'power2.out' }
    );
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to check if username hash matches password hash
  const checkUsernamePasswordMatch = async (username, userType, combination) => {
    try {
      // Create hash of username
      const usernameHash = await createSHA256Hash(username);
      
      // Extract the password hash from the combination (after the colon)
      const parts = combination.split(':');
      if (parts.length !== 2) return false;
      
      const storedPasswordHash = parts[1];
      
      // Compare username hash with stored password hash
      return usernameHash === storedPasswordHash;
    } catch (error) {
      console.error('Error checking username/password match:', error);
      return false;
    }
  };

  // Function to update password in database
  const updatePasswordInDatabase = async (username, newPassword, userType) => {
    try {
      const newPasswordHash = await createSHA256Hash(newPassword);
      const newCombination = `${username}:${newPasswordHash}`;
      
      // Update the database record
      const { error } = await supabase
        .from('quetzal_users')
        .update({ [userType]: newCombination })
        .eq(userType, `${username}:${await createSHA256Hash(formData.password)}`);
      
      if (error) {
        console.error('Error updating password:', error);
        throw new Error('Failed to update password');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  // Function to handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long!');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const loadingToast = toast.loading('Updating password...');
      
      await updatePasswordInDatabase(
        currentUserData.username, 
        newPassword, 
        currentUserData.userType
      );
      
      toast.success('Password updated successfully!', { id: loadingToast });
      setShowPasswordChangePopup(false);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentUserData(null);
      
    } catch (error) {
      toast.error('Failed to update password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Show logging in toast
      const loadingToast = toast.loading('Logging in...');
      
      // Step 1: Create SHA256 hash of password
      const passwordHash = await createSHA256Hash(formData.password);
      
      // Step 2: Combine username and password hash
      const combination = `${formData.username}:${passwordHash}`;
      
      // Step 3: Check if combination exists in staff column
      const { data: staffData, error: staffError } = await supabase
        .from('quetzal_users')
        .select('staff');
      
      if (staffError) {
        console.error('Error checking staff:', staffError);
        toast.error('Authentication error. Please try again.');
        toast.dismiss(loadingToast);
        return;
      }
      
      // Check if combination exists in any staff array
      const foundInStaff = staffData && staffData.some(row => 
        row.staff && row.staff === combination
      );
      
      // If found in staff column
      if (foundInStaff) {
        // Check if username hash matches password hash
        const needsPasswordChange = await checkUsernamePasswordMatch(formData.username, 'staff', combination);
        
        if (needsPasswordChange) {
          // Store current user data for password change
          setCurrentUserData({
            username: formData.username,
            userType: 'staff'
          });
          setShowPasswordChangePopup(true);
          toast.dismiss(loadingToast);
          return;
        }
        
        // Login with staff credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: import.meta.env.VITE_STAFF_EMAIL,
          password: import.meta.env.VITE_STAFF_PASSWORD,
        });

        if (error) {
          console.error('Staff login error:', error);
          toast.error('Authentication failed. Please try again.');
          toast.dismiss(loadingToast);
        } else {
          toast.success('Login successful! Redirecting to dashboard...', { id: 'login-success' });
          toast.dismiss(loadingToast);
          navigate('/dashboard');
        }
        return;
      }
      
      // Step 4: Check if combination exists in students column
      const { data: studentData, error: studentError } = await supabase
        .from('quetzal_users')
        .select('students');
      
      if (studentError) {
        console.error('Error checking students:', studentError);
        toast.error('Authentication error. Please try again.');
        toast.dismiss(loadingToast);
        return;
      }
      
      // Check if combination exists in any students array
      const foundInStudents = studentData && studentData.some(row => 
        row.students && row.students === combination
      );
      
      // If found in students column
      if (foundInStudents) {
        // Check if username hash matches password hash
        const needsPasswordChange = await checkUsernamePasswordMatch(formData.username, 'students', combination);
        
        if (needsPasswordChange) {
          // Store current user data for password change
          setCurrentUserData({
            username: formData.username,
            userType: 'students'
          });
          setShowPasswordChangePopup(true);
          toast.dismiss(loadingToast);
          return;
        }
        
        // Login with student credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: import.meta.env.VITE_STUDENT_EMAIL,
          password: import.meta.env.VITE_STUDENT_PASSWORD,
        });

        if (error) {
          console.error('Student login error:', error);
          toast.error('Authentication failed. Please try again.');
          toast.dismiss(loadingToast);
        } else {
          toast.success('Login successful! Redirecting to home...', { id: loadingToast });
          setTimeout(() => {
            navigate('/');
          }, 1500);
        }
        return;
      }
      
      // Step 5: If not found in either column, show error
      toast.error('Invalid username or password. Please try again.', { id: loadingToast });
      
      // Clear the form
      setFormData({
        username: '',
        password: ''
      });
      
    } catch (error) {
      console.error('Login exception:', error);
      toast.error('An error occurred during login. Please try again.');
      // Clear the form
      setFormData({
        username: '',
        password: ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark-neon-bg neon-blur text-white overflow-x-hidden relative select-none">
      {/* Bouncing neon circles */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-400 to-green-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 neon-glow bounce-circle-1"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 neon-glow bounce-circle-2"></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-gradient-to-r from-pink-400 to-red-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 neon-glow bounce-circle-3"></div>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-gradient-to-r from-purple-300 to-indigo-300 rounded-full mix-blend-screen filter blur-3xl opacity-15 neon-glow bounce-circle-4"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full mix-blend-screen filter blur-3xl opacity-15 neon-glow bounce-circle-5"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div 
          className="login-container w-full max-w-md"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo */}
          <motion.div 
            className="logo text-center mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div 
              className="flex items-center justify-center space-x-3 mb-4 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img 
                src="/logo.png" 
                alt="Quetzal Logo" 
                className="w-16 h-16 rounded-2xl shadow-2xl"
              />
              <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: 'Quick' }}>
                Quetzal
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to access your account</p>
          </motion.div>

          {/* Login Form */}
          <motion.form 
            className="form-fields neon-glass rounded-3xl p-8 shadow-2xl mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            onSubmit={handleSubmit}
          >
            {/* Username Field */}
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your username"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-8">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <motion.button
              type="submit"
              className="w-full py-3 px-6 rounded-xl text-white font-medium transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign In</span>
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Created by (inside the glassy container, with margin) */}
          <motion.a 
            className="text-center cursor-pointer mt-16 block"
            href="https://github.com/arpitbhau"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            whileHover={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center space-x-2 cursor-pointer">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-1.5 shadow-lg cursor-pointer">
                <img 
                  src="https://avatars.githubusercontent.com/u/149021988?v=4" 
                  alt="GitHub Avatar" 
                  className="w-6 h-6 rounded-full"
                />
              </div>
              <div className="flex flex-col cursor-pointer">
                <span className="text-xs text-gray-400">Created by</span>
                <span className="text-xs text-white font-medium">arpitbhau</span>
              </div>
            </div>
          </motion.a>
        </motion.div>
      </div>

      {/* Password Change Popup */}
      {showPasswordChangePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            className="neon-glass rounded-3xl p-8 shadow-2xl w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Change Password</h2>
              <p className="text-gray-400">Your username hash matches your password hash. Please change your password for security.</p>
            </div>

            <form onSubmit={handlePasswordChange}>
              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <motion.button
                  type="button"
                  onClick={() => {
                    setShowPasswordChangePopup(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setCurrentUserData(null);
                  }}
                  className="flex-1 py-3 px-6 rounded-xl text-white font-medium transition-all duration-300 shadow-lg bg-gray-600 hover:bg-gray-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isChangingPassword}
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="submit"
                  className="flex-1 py-3 px-6 rounded-xl text-white font-medium transition-all duration-300 shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </>
                  ) : (
                    'Update Password'
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Login;
