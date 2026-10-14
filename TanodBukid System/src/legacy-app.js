// Simple vanilla JS navigation for Live Server compatibility
(function(){
  const show = id => {
    ['screen-signin','screen-register','screen-verify','screen-reset'].forEach(s=>{
      const el = document.getElementById(s)
      if(!el) return
      el.style.display = (s===id)?'block':'none'
    })
    window.scrollTo(0,0)
  }

  // links
  document.getElementById('link-register').addEventListener('click',e=>{e.preventDefault(); show('screen-register')})
  document.getElementById('link-signin-from-reg').addEventListener('click',e=>{e.preventDefault(); show('screen-signin')})
  document.getElementById('link-forgot').addEventListener('click',e=>{e.preventDefault(); show('screen-reset')})
  document.getElementById('link-signin-from-reset').addEventListener('click',e=>{e.preventDefault(); show('screen-signin')})
  document.getElementById('btn-create').addEventListener('click',e=>{e.preventDefault(); show('screen-verify')})
  document.getElementById('btn-verify').addEventListener('click',e=>{e.preventDefault(); alert('Demo: Verified'); show('screen-signin')})
  document.getElementById('btn-send-reset').addEventListener('click',e=>{e.preventDefault(); alert('Demo: Reset code sent')})
  document.getElementById('btn-signin').addEventListener('click',e=>{e.preventDefault(); alert('Demo: Signed in')})

  // password toggle
  document.getElementById('signin-toggle').addEventListener('click',()=>{
    const p = document.getElementById('signin-password')
    if(p.type==='password'){p.type='text'; document.getElementById('signin-toggle').textContent='Hide'} else {p.type='password'; document.getElementById('signin-toggle').textContent='Show'}
  })
  document.getElementById('reg-toggle').addEventListener('click',()=>{
    const p = document.getElementById('reg-password')
    if(p.type==='password'){p.type='text'; document.getElementById('reg-toggle').textContent='Hide'} else {p.type='password'; document.getElementById('reg-toggle').textContent='Show'}
  })

  // OTP auto-focus
  for(let i=0;i<6;i++){
    const input = document.getElementById('otp-'+i)
    input.addEventListener('input', (e)=>{
      if(e.inputType==='insertText' || e.data){
        if(i<5) document.getElementById('otp-'+(i+1)).focus();
      }
    })
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Backspace' && !input.value && i>0){ document.getElementById('otp-'+(i-1)).focus() }
    })
  }

  // initial
  show('screen-signin')
})()
