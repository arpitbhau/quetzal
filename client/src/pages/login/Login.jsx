// radhe radhe

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabase/supabaseConfig';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staff_members, setStaffMembers] = useState(null);
  const [students, setStudents] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch staff members and students data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch staff members
        const { data: staffData, error: staffError } = await supabase
          .from('quetzal')
          .select('staff')
          .limit(1);
        
        if (staffError) {
          console.error('Error fetching staff members:', staffError);
          toast.error('Failed to load staff data');
        } else if (staffData && staffData.length > 0) {
          setStaffMembers(staffData[0].staff);
        }

        // Fetch students
        const { data: studentData, error: studentError } = await supabase
          .from('quetzal')
          .select('student')
          .limit(1);
        
        if (studentError) {
          console.error('Error fetching students:', studentError);
          toast.error('Failed to load student data');
        } else if (studentData && studentData.length > 0) {
          setStudents(studentData[0].student);
        }

        // Set data loaded to true if either staff or students data is loaded
        if ((staffData && staffData.length > 0) || (studentData && studentData.length > 0)) {
          setIsDataLoaded(true);
        }
      } catch (error) {
        console.error('Exception fetching data:', error);
        toast.error('Failed to load data');
      }
    };

    fetchData();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Check if username is in staff members array
      const isStaffMember = staff_members && Array.isArray(staff_members) && staff_members.includes(formData.username);
      
      // Check if username is in students array
      const isStudent = students && Array.isArray(students) && students.includes(formData.username);
      
      // Determine which email to use based on user type
      let emailToUse;
      if (isStaffMember) {
        emailToUse = "easstaff60@gmail.com";
      } else if (isStudent) {
        emailToUse = "easstudent60@gmail.com";
      } else {
        emailToUse = formData.username; // Use username as email for regular users
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: formData.password,
      });

      if (error) {
        console.error('Login error:', error);
        toast.error('Invalid username or password. Please try again.');
        // Clear the form
        setFormData({
          username: '',
          password: ''
        });
      } else {
        // Route users based on their type
        if (isStaffMember) {
          toast.success('Login successful! Redirecting to dashboard...');
          // Redirect to dashboard after successful login
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else if (isStudent) {
          toast.success('Login successful! Redirecting to home...');
          // Redirect to home after successful login
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          toast.error('Access denied. Only staff members and students can access the system.');
          // Clear the form
          setFormData({
            username: '',
            password: ''
          });
        }
      }
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
              className={`w-full py-3 px-6 rounded-xl text-white font-medium transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
                isDataLoaded 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 cursor-pointer' 
                  : 'bg-gray-500/50 cursor-not-allowed'
              }`}
              whileHover={isDataLoaded ? { scale: 1.02 } : {}}
              whileTap={isDataLoaded ? { scale: 0.98 } : {}}
              disabled={isLoading || !isDataLoaded}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : !isDataLoaded ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
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
    </div>
  );
};

export default Login;
