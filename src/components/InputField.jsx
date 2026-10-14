import React from 'react'

export default function InputField({label, type='text', value, onChange, placeholder}){
  return (
    <div className="field">
      {label && <div className="label">{label}</div>}
      <input className="input" type={type} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}
