import React from 'react'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import PasswordInput from '../components/PasswordInput'
import PrimaryButton from '../components/PrimaryButton'
import { Link, useNavigate } from 'react-router-dom'

export default function SignIn(){
  const [mobile, setMobile] = React.useState('')
  const [password, setPassword] = React.useState('')
  const nav = useNavigate()
  return (
    <AuthLayout title="WELCOME" subtitle="Sign in to your TanodBukid account">
      <InputField label="Mobile Number" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09XX XXX XXXX" />
      <PasswordInput label="Password" value={password} setValue={setPassword} />
      <div style={{textAlign:'right', marginBottom:12}}><Link to="/reset" className="link">Forgot password?</Link></div>
      <PrimaryButton onClick={()=>alert('Demo: Sign in')}>SIGN IN</PrimaryButton>
      <div className="divider">or continue with</div>
      <div style={{display:'flex',gap:10}}>
        <button className="secondary-btn" style={{flex:1}}>Google</button>
        <button className="secondary-btn" style={{flex:1}}>Facebook</button>
      </div>
      <div className="footer">Don't have an account? <Link to="/register" className="link">Register</Link></div>
    </AuthLayout>
  )
}
