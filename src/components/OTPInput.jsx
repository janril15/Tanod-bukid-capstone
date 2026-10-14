import React from 'react'

export default function OTPInput({length=6, onComplete}){
  const [vals, setVals] = React.useState(Array(length).fill(''))
  const inputs = []
  const handleChange = (i, v) =>{
    if(v.length>1) v = v.slice(-1)
    const copy = [...vals]
    copy[i]=v
    setVals(copy)
    if(v && i<length-1){
      const next = document.getElementById(`otp-${i+1}`)
      next && next.focus()
    }
    if(copy.every(ch=>ch!=='')) onComplete && onComplete(copy.join(''))
  }
  for(let i=0;i<length;i++){
    inputs.push(<input id={`otp-${i}`} key={i} className="otp" value={vals[i]} onChange={e=>handleChange(i,e.target.value)} />)
  }
  return <div className="otp-row">{inputs}</div>
}
