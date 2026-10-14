import React from 'react'

export default function PasswordInput({label, value, setValue}){
  const [show, setShow] = React.useState(false)
  return (
    <div className="field">
      {label && <div className="label">{label}</div>}
      <div className="password-row">
        <input className="input" type={show? 'text' : 'password'} value={value} onChange={e=>setValue(e.target.value)} />
        <button className="password-toggle" onClick={()=>setShow(s=>!s)}>{show? 'Hide' : 'Show'}</button>
      </div>
    </div>
  )
}
