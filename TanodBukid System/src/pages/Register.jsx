import React from 'react'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import PasswordInput from '../components/PasswordInput'
import PrimaryButton from '../components/PrimaryButton'
import { Link, useNavigate } from 'react-router-dom'

export default function Register(){
  const [first, setFirst] = React.useState('')
  const [last, setLast] = React.useState('')
  const [mobile, setMobile] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const nav = useNavigate()

  const handleRegister = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('tanodbukid_users') || '[]')
      const newUser = { first, last, mobile, email, password }
      const nextUsers = [...existing, newUser]
      localStorage.setItem('tanodbukid_users', JSON.stringify(nextUsers))
    } catch (error) {
      console.warn('Unable to save registration data:', error)
    }

    nav('/profile-setup')
  }

  return (
    <AuthLayout title="CREATE YOUR ACCOUNT" subtitle="Join TanodBukid for free">
      <div style={{display:'flex',gap:10}}>
        <div style={{flex:1}}><InputField label="First Name" value={first} onChange={e=>setFirst(e.target.value)} /></div>
        <div style={{flex:1}}><InputField label="Last Name" value={last} onChange={e=>setLast(e.target.value)} /></div>
      </div>
      <InputField label="Mobile Number" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09XX XXX XXXX" />
      <InputField label="Email address" value={email} onChange={e=>setEmail(e.target.value)} placeholder="youremail@gmail.com" />
      <PasswordInput label="Password" value={password} setValue={setPassword} />
      <PrimaryButton onClick={handleRegister}>CREATE ACCOUNT</PrimaryButton>
      <div className="footer">Already Registered? <Link to="/" className="link">Sign In</Link></div>
    </AuthLayout>
  )
}
