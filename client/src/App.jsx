// radhe radhe

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/home/Home'
import Login from './pages/login/Login'
import Dashboard from './pages/dashbaord/Dashboard'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/dashboard' element={<Dashboard />} />
      </Routes>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          success: {
            style: {
              background: '#059669',
              border: '1px solid #10b981',
            },
          },
          error: {
            style: {
              background: '#dc2626',
              border: '1px solid #ef4444',
            },
          },
        }}
      />
    </>
  )
}

export default App