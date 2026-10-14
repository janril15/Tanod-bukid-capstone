import React from 'react'
import AuthLayout from '../components/AuthLayout'
import OTPInput from '../components/OTPInput'
import PrimaryButton from '../components/PrimaryButton'
import { Link, useNavigate } from 'react-router-dom'

export default function Verify(){
  const nav = useNavigate()
  const handleComplete = (code)=>{
    // simple demo validation
    if(code && code.length===6) nav('/')
  }
  return (
    <AuthLayout title="VERIFY YOUR NUMBER" subtitle="">
      <div style={{textAlign:'center',fontSize:14,color:'#333'}}>Enter the 6-digit code sent to 0912 345 6789</div>
      <OTPInput onComplete={handleComplete} />
      <div style={{textAlign:'center',marginTop:8}}>Didn't receive a code? <span className="link">Resend</span></div>
      <PrimaryButton onClick={()=>nav('/')}>VERIFY</PrimaryButton>
      <div className="info-box">Code expires in 10 minutes.</div>
    </AuthLayout>
  )
}
