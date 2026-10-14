import React from 'react'

export default function PrimaryButton({children, onClick}){
  return <button className="primary-btn" onClick={onClick}>{children}</button>
}
