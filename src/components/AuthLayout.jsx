import React from 'react'

export default function AuthLayout({title, subtitle, children}){
  return (
    <div className="mobile-mock">
      <div className="hero">
        <div className="hero-inner">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="card">
        {children}
      </div>
    </div>
  )
}
