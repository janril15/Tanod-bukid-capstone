import React from 'react'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import PrimaryButton from '../components/PrimaryButton'
import { Link } from 'react-router-dom'

export default function Reset(){
  const [mobile, setMobile] = React.useState('')
  return (
    <AuthLayout title="RESET PASSWORD" subtitle="Enter your mobile number to receive a reset link">
      <InputField label="Mobile Number" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09XX XXX XXXX" />
      <PrimaryButton onClick={()=>alert('Demo: reset code sent')}>SEND RESET CODE</PrimaryButton>
      <div className="info-box">A 6-digit reset code will be sent via SMS. Code valid for 15 minutes.</div>
      <div className="footer">Remember password? <Link to="/" className="link">Sign In</Link></div>
    </AuthLayout>
  )
}
