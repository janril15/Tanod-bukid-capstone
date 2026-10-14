import React from 'react'
import { Routes, Route } from 'react-router-dom'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import Verify from './pages/Verify'
import Reset from './pages/Reset'
import ProfileSetup from './pages/ProfileSetup'
import Dashboard from './pages/Dashboard'

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<SignIn/>} />
      <Route path="/register" element={<Register/>} />
      <Route path="/verify" element={<Verify/>} />
      <Route path="/reset" element={<Reset/>} />
      <Route path="/profile-setup" element={<ProfileSetup/>} />
      <Route path="/dashboard" element={<Dashboard/>} />
    </Routes>
  )
}
