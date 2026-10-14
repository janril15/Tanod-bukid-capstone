(() => {
  'use strict'

  const pageTitle = document.querySelector('#page-title')
  const pageSubtitle = document.querySelector('#page-subtitle')
  const pageCard = document.querySelector('#page-card')
  const landingApp = document.querySelector('#landing-app')
  const authApp = document.querySelector('#auth-app')
  const state = { route: window.location.hash.slice(1), registration: {} }

  const pages = {
    signin: ['WELCOME', 'Sign in to your TanodBukid account'],
    register: ['CREATE YOUR ACCOUNT', 'Join TanodBukid for free'],
    verify: ['VERIFY YOUR NUMBER', ''],
    reset: ['RESET PASSWORD', 'Enter your mobile number to receive a reset link']
  }

  function field(label, id, placeholder, type = 'text') {
    return `<div class="field"><div class="label">${label}</div><input id="${id}" class="input" type="${type}" placeholder="${placeholder || ''}"></div>`
  }

  function passwordField(id) {
    return `<div class="field"><div class="label">Password</div><div class="password-row"><input id="${id}" class="input" type="password"><button type="button" class="password-toggle" data-password="${id}">Show</button></div></div>`
  }

  function authLayout(content) { landingApp.hidden = true; authApp.hidden = false; pageCard.innerHTML = content; bindEvents(); window.scrollTo(0, 0) }

  function renderSignin() {
    pageTitle.textContent = pages.signin[0]; pageSubtitle.textContent = pages.signin[1]
    authLayout(`${field('Mobile Number', 'signin-mobile', '09XX XXX XXXX')}${passwordField('signin-password')}<div style="text-align:right;margin-bottom:12px"><a href="#reset" class="link">Forgot password?</a></div><button class="primary-btn" data-action="signin">SIGN IN</button><div class="divider">or continue with</div><div style="display:flex;gap:10px"><button class="secondary-btn" style="flex:1">Google</button><button class="secondary-btn" style="flex:1">Facebook</button></div><div class="footer">Don't have an account? <a href="#register" class="link">Register</a></div>`)
  }

  function renderRegister() {
    pageTitle.textContent = pages.register[0]; pageSubtitle.textContent = pages.register[1]
    authLayout(`<div style="display:flex;gap:10px"><div style="flex:1">${field('First Name', 'reg-first')}</div><div style="flex:1">${field('Last Name', 'reg-last')}</div></div>${field('Mobile Number', 'reg-mobile', '09XX XXX XXXX')}${field('Email address', 'reg-email', 'youremail@gmail.com')}${passwordField('reg-password')}<button class="primary-btn" data-action="create-account">CREATE ACCOUNT</button><div class="footer">Already Registered? <a href="#signin" class="link">Sign In</a></div>`)
  }

  function renderVerify() {
    pageTitle.textContent = pages.verify[0]; pageSubtitle.textContent = pages.verify[1]
    const inputs = Array.from({ length: 6 }, (_, index) => `<input id="otp-${index}" class="otp" inputmode="numeric" maxlength="1">`).join('')
    authLayout(`<div style="text-align:center;font-size:14px;color:#333">Enter the 6-digit code sent to 0912 345 6789</div><div class="otp-row">${inputs}</div><div style="text-align:center;margin-top:8px">Didn't receive a code? <span class="link">Resend</span></div><button class="primary-btn" data-action="verify">VERIFY</button><div class="info-box">Code expires in 10 minutes.</div>`)
  }

  function renderReset() {
    pageTitle.textContent = pages.reset[0]; pageSubtitle.textContent = pages.reset[1]
    authLayout(`${field('Mobile Number', 'reset-mobile', '09XX XXX XXXX')}<button class="primary-btn" data-action="send-reset">SEND RESET CODE</button><div class="info-box">A 6-digit reset code will be sent via SMS. Code valid for 15 minutes.</div><div class="footer">Remember password? <a href="#signin" class="link">Sign In</a></div>`)
  }

  function bindEvents() {
    pageCard.querySelectorAll('[data-password]').forEach(button => button.addEventListener('click', () => { const input = document.getElementById(button.dataset.password); input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? 'Show' : 'Hide' }))
    pageCard.querySelector('[data-action="signin"]')?.addEventListener('click', () => alert('Demo: Sign in'))
    pageCard.querySelector('[data-action="send-reset"]')?.addEventListener('click', () => alert('Demo: reset code sent'))
    pageCard.querySelector('[data-action="create-account"]')?.addEventListener('click', saveRegistration)
    pageCard.querySelector('[data-action="verify"]')?.addEventListener('click', () => window.location.hash = 'signin')
    pageCard.querySelectorAll('.otp').forEach((input, index, inputs) => input.addEventListener('input', () => { if (input.value && index < inputs.length - 1) inputs[index + 1].focus() }))
  }

  function saveRegistration() {
    const registration = { first: document.querySelector('#reg-first').value, last: document.querySelector('#reg-last').value, mobile: document.querySelector('#reg-mobile').value, email: document.querySelector('#reg-email').value, password: document.querySelector('#reg-password').value }
    try { const users = JSON.parse(localStorage.getItem('tanodbukid_users') || '[]'); localStorage.setItem('tanodbukid_users', JSON.stringify(users.concat(registration))) } catch (error) { console.warn('Unable to save registration data:', error) }
    window.location.href = 'profile-setup.html'
  }

  function render() {
    if (!state.route) { landingApp.hidden = false; authApp.hidden = true; return }
    ({ signin: renderSignin, register: renderRegister, verify: renderVerify, reset: renderReset }[state.route] || renderSignin)()
  }
  window.addEventListener('hashchange', () => { state.route = window.location.hash.slice(1); render() })
  render()
})()
