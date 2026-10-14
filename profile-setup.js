(() => {
  'use strict'

  const STORAGE_KEY = 'tanodbukid_profile_setup'
  const TOTAL_STEPS = 4
  const defaultNotifications = { climateAlerts: true, communityAlerts: true }
  const cropOptions = ['Plants', 'Vegetable', 'Rice Crops', 'Onion', 'Mais (Corn)', 'Kangkong', 'Tomato', 'Eggplant']
  const farmScaleOptions = ['Small Farm', 'Backyard Garden']
  const livestockOptions = ['Cattle', 'Swine', 'Poultry', 'Goat']
  const notificationOptions = [
    ['climateAlerts', 'Climate Alerts', 'Typhoon, floods, etc.'],
    ['communityAlerts', 'Community Alerts', 'Nearby farm requests']
  ]

  const saved = readSavedProfile()
  const state = {
    step: 1,
    data: {
      barangay: saved.barangay || '', municipality: saved.municipality || '',
      profilePhoto: saved.profilePhoto || saved.photo || '', farmName: saved.farmName || '',
      farmArea: saved.farmArea || '', farmType: saved.farmType || 'Plants', waterSource: saved.waterSource || '',
      crops: Array.isArray(saved.crops) && saved.crops.length ? saved.crops : ['Plants', 'Vegetable', 'Rice Crops', 'Onion'],
      farmScale: saved.farmScale || 'Small Farm',
      livestock: Array.isArray(saved.livestock) && saved.livestock.length ? saved.livestock : ['Poultry'],
      notifications: { ...defaultNotifications, ...(saved.notifications || {}) }
    },
    errors: {}, otherType: null
  }

  const content = document.querySelector('#step-content')
  const title = document.querySelector('#profile-title')
  const subtitle = document.querySelector('.profile-subtitle')
  const meta = document.querySelector('#step-meta')
  const progress = document.querySelector('#progress-fill')
  const modalRoot = document.querySelector('#other-modal-root')

  function readSavedProfile() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  }

  function persist(completed) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state.data, profileSetupCompleted: Boolean(completed), currentStep: state.step })) } catch (error) { console.warn('Unable to save profile setup state:', error) }
  }

  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]) }
  function errorFor(field) { return state.errors[field] ? `<span class="field-error">${state.errors[field]}</span>` : '' }
  function fieldClass(field) { return state.errors[field] ? 'profile-input has-error' : 'profile-input' }
  function setField(field, value) { state.data[field] = value; delete state.errors[field]; render() }
  function inputField(label, field, placeholder, type = 'text', required = false) { return `<label class="profile-field"><span class="field-label">${label}${required ? ' <span class="asterisk">*</span>' : ''}</span><input class="${fieldClass(field)}" type="${type}" data-field="${field}" value="${escapeHtml(state.data[field])}" placeholder="${placeholder}">${errorFor(field)}</label>` }
  function locationField(label, field, placeholder, icon) { return `<label class="profile-field location-field"><span class="field-label"><span class="location-icon" aria-hidden="true">${icon}</span>${label} <span class="asterisk">*</span></span><span class="profile-input-wrap"><input class="${fieldClass(field)}" type="text" data-field="${field}" value="${escapeHtml(state.data[field])}" placeholder="${placeholder}"><span class="profile-select-chevron" aria-hidden="true">⌄</span></span>${errorFor(field)}</label>` }
  function iconInputField(label, field, placeholder, icon, type = 'text', required = false) { return `<label class="profile-field step-two-field"><span class="field-label">${label}${required ? ' <span class="asterisk">*</span>' : ''}</span><span class="profile-input-wrap"><span class="step-two-field-icon" aria-hidden="true">${icon}</span><input class="${fieldClass(field)}" type="${type}" data-field="${field}" value="${escapeHtml(state.data[field])}" placeholder="${placeholder}" ${type === 'number' ? 'min="0" step="0.1" inputmode="decimal"' : ''}></span>${errorFor(field)}</label>` }
  function waterSourceField() { const options = ['Rainwater', 'Irrigation', 'Well', 'River or stream', 'Other']; return `<label class="profile-field step-two-field"><span class="field-label">Primary Water Source <span class="asterisk">*</span></span><span class="profile-input-wrap"><span class="step-two-field-icon" aria-hidden="true">♧</span><select class="${fieldClass('waterSource')} step-two-select" data-field="waterSource"><option value="">Select water source</option>${options.map(option => `<option value="${option}" ${state.data.waterSource === option ? 'selected' : ''}>${option}</option>`).join('')}</select><span class="profile-select-chevron" aria-hidden="true">⌄</span></span>${errorFor('waterSource')}</label>` }

  function avatar() { return state.data.profilePhoto ? `<img src="${state.data.profilePhoto}" alt="Profile preview" class="profile-avatar-image">` : '<svg viewBox="0 0 120 120" class="profile-avatar-svg" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="rgba(53,86,62,0.12)" stroke="#2a3f2d" stroke-width="2.5"/><circle cx="60" cy="48" r="18" fill="none" stroke="#2a3f2d" stroke-width="2.6"/><path d="M38 86c4-11 18-18 22-18s18 7 22 18" fill="none" stroke="#2a3f2d" stroke-width="2.6" stroke-linecap="round"/></svg>' }
  function button(text, action, className = 'profile-continue-button') { return `<button type="button" class="${className}" data-action="${action}">${text}</button>` }
  function choices(field, options) { const fieldValue = state.data[field]; const selectedValues = Array.isArray(fieldValue) ? fieldValue : [fieldValue]; const extraOptions = Array.isArray(fieldValue) ? fieldValue.filter(item => !options.includes(item)) : fieldValue && !options.includes(fieldValue) ? [fieldValue] : []; const action = ['farmType', 'farmScale'].includes(field) ? 'data-select' : 'data-toggle'; return options.concat(extraOptions).map(item => `<button type="button" class="selection-pill ${selectedValues.includes(item) ? 'selected' : ''}" ${action}="${field}" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('') }

  function renderStepOne() { return `<div class="profile-photo-wrap"><button type="button" class="profile-avatar-button" data-action="choose-photo" aria-label="Upload profile photo">${avatar()}<span class="profile-camera-badge" aria-hidden="true">▣</span></button><input id="photo-input" type="file" accept="image/*" hidden><div class="profile-upload-text">Tap to upload photo</div><div class="profile-upload-hint">JPG, PNG · Max 5MB</div></div><div class="profile-form">${locationField('Barangay', 'barangay', 'e.g. San Jose', '♦')}${locationField('Municipality', 'municipality', 'e.g. Santa Maria', '▤')}</div>${button('CONTINUE <span class="button-arrow" aria-hidden="true">→</span>', 'continue')}` }
  function renderStepTwo() { return `<div class="profile-step-content step-two-content">${iconInputField('Farm Name (optional)', 'farmName', 'e.g. Santos Family Farm', '♧')}${iconInputField('Total Farm Area (hectares)', 'farmArea', 'e.g. 3', '⬚', 'number', true)}<div class="profile-field step-two-field"><span class="field-label">Farm Type <span class="asterisk">*</span></span><div class="selection-grid farm-type-grid">${choices('farmType', ['Plants', 'Vegetable', 'Crop Farming'])}</div>${errorFor('farmType')}</div>${waterSourceField()}<div class="step-actions">${button('BACK', 'back', 'back-button')}${button('CONTINUE <span class="button-arrow" aria-hidden="true">→</span>', 'continue')}</div></div>` }
  function selectionGroup(label, field, options) { const gridClass = field === 'crops' ? 'crop-grid' : field === 'farmScale' ? 'farm-scale-grid' : 'livestock-grid'; return `<div class="profile-field selection-section"><span class="field-label">${label} <span class="asterisk">*</span></span><div class="selection-grid ${gridClass}">${choices(field, options)}</div><button type="button" class="add-other-button" data-other="${field}">+ Add other</button>${errorFor(field)}</div>` }
  function renderStepThree() { return `<div class="profile-step-content step-three-content">${selectionGroup('Select all crops you grow', 'crops', cropOptions)}${selectionGroup('Select your farm type', 'farmScale', farmScaleOptions)}<div class="step-actions">${button('BACK', 'back', 'back-button')}${button('CONTINUE <span class="button-arrow" aria-hidden="true">→</span>', 'continue')}</div></div>` }
  function renderStepFour() { return `<div class="profile-step-content"><div class="notification-section"><div class="field-label">Notification Preferences</div>${notificationOptions.map(([key, title, description]) => `<div class="notification-row"><div><strong>${title}</strong><small>${description}</small></div><button type="button" aria-label="Toggle ${title}" class="toggle ${state.data.notifications[key] ? 'enabled' : ''}" data-notification="${key}"><span></span></button></div>`).join('')}</div><div class="step-actions">${button('BACK', 'back', 'back-button')}${button('FINISH SETUP', 'finish')}</div></div>` }

  function render() {
    title.textContent = state.step === 2 ? 'Create Account' : 'Set Up Your Profile'
    subtitle.textContent = state.step === 2
      ? 'Join Tanod Bukid and be part of a smarter and healthier farming community.'
      : state.step === 3
        ? 'Tell us about your farm and what you’re growing. This helps us give you better and more relevant insights.'
        : 'Let’s get to know you. This helps us provide a better and more personalized experience.'
    meta.textContent = `Step ${state.step} of ${TOTAL_STEPS}`
    progress.style.width = `${state.step / TOTAL_STEPS * 100}%`
    content.innerHTML = [renderStepOne, renderStepTwo, renderStepThree, renderStepFour][state.step - 1]()
    bindStepEvents()
    renderModal()
    persist(false)
  }

  function validate() {
    state.errors = {}
    if (state.step === 1) { if (!state.data.barangay.trim()) state.errors.barangay = 'Barangay is required.'; if (!state.data.municipality.trim()) state.errors.municipality = 'Municipality is required.' }
    if (state.step === 2) { if (!String(state.data.farmArea).trim()) state.errors.farmArea = 'Farm area is required.'; if (!state.data.farmType) state.errors.farmType = 'Farm type is required.'; if (!state.data.waterSource) state.errors.waterSource = 'Select a primary water source.' }
    if (state.step === 3) { if (!state.data.crops.length) state.errors.crops = 'Select at least one crop.'; if (!state.data.farmScale) state.errors.farmScale = 'Select your farm type.' }
    return !Object.keys(state.errors).length
  }

  function bindStepEvents() {
    content.querySelectorAll('[data-field]').forEach(element => { element.addEventListener('input', event => { const field = event.target.dataset.field; state.data[field] = event.target.value; delete state.errors[field]; event.target.classList.remove('has-error'); event.target.parentElement.querySelector('.field-error')?.remove(); persist(false) }) })
    content.querySelectorAll('select[data-field]').forEach(element => element.addEventListener('change', event => { const field = event.target.dataset.field; state.data[field] = event.target.value; delete state.errors[field]; event.target.classList.remove('has-error'); event.target.closest('.profile-field').querySelector('.field-error')?.remove(); persist(false) }))
    content.querySelectorAll('[data-toggle]').forEach(element => element.addEventListener('click', () => { const field = element.dataset.toggle; const { value } = element.dataset; state.data[field] = state.data[field].includes(value) ? state.data[field].filter(item => item !== value) : state.data[field].concat(value); delete state.errors[field]; render() }))
    content.querySelectorAll('[data-select]').forEach(element => element.addEventListener('click', () => setField(element.dataset.select, element.dataset.value)))
    content.querySelectorAll('[data-notification]').forEach(element => element.addEventListener('click', () => { const key = element.dataset.notification; state.data.notifications[key] = !state.data.notifications[key]; render() }))
    content.querySelectorAll('[data-other]').forEach(element => element.addEventListener('click', () => { state.otherType = element.dataset.other; renderModal() }))
    const photoInput = content.querySelector('#photo-input'); if (photoInput) { content.querySelector('[data-action="choose-photo"]').addEventListener('click', () => photoInput.click()); photoInput.addEventListener('change', handlePhoto) }
    content.querySelectorAll('[data-action="continue"]').forEach(element => element.addEventListener('click', () => { if (validate()) { state.step += 1; render() } else render() }))
    content.querySelectorAll('[data-action="back"]').forEach(element => element.addEventListener('click', () => { state.step -= 1; state.errors = {}; render() }))
    content.querySelectorAll('[data-action="finish"]').forEach(element => element.addEventListener('click', finish))
  }

  function handlePhoto(event) { const file = event.target.files && event.target.files[0]; if (!file || !file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = () => { state.data.profilePhoto = reader.result || ''; render() }; reader.readAsDataURL(file) }
  function finish() { persist(true); window.location.href = 'Tanod Bukid Dash Board (1)/index (1).html' }
  function renderModal() { if (!state.otherType) { modalRoot.innerHTML = ''; return }; const noun = state.otherType === 'crops' ? 'crop' : state.otherType === 'farmScale' ? 'farm type' : 'livestock'; modalRoot.innerHTML = `<div class="other-modal-backdrop" data-close-modal><div class="other-modal" role="dialog" aria-modal="true" aria-labelledby="other-title"><h2 id="other-title">Add another ${noun}</h2><input id="other-value" autofocus class="profile-input" placeholder="Enter ${noun} type"><div class="modal-actions">${button('CANCEL', 'cancel-other', 'back-button')}${button('ADD', 'add-other')}</div></div></div>`; const value = modalRoot.querySelector('#other-value'); modalRoot.querySelector('[data-action="cancel-other"]').addEventListener('click', () => { state.otherType = null; renderModal() }); modalRoot.querySelector('[data-action="add-other"]').addEventListener('click', () => addOther(value.value)); value.addEventListener('keydown', event => { if (event.key === 'Enter') addOther(value.value) }); modalRoot.querySelector('[data-close-modal]').addEventListener('mousedown', event => { if (event.target === event.currentTarget) { state.otherType = null; renderModal() } }) }
  function addOther(value) { const cleanValue = value.trim(); if (!cleanValue || !state.otherType) return; if (Array.isArray(state.data[state.otherType])) { if (!state.data[state.otherType].includes(cleanValue)) state.data[state.otherType].push(cleanValue) } else state.data[state.otherType] = cleanValue; state.otherType = null; render() }

  function renderDashboard() { const profile = state.data; document.querySelector('.profile-setup-page').innerHTML = `<section class="dashboard-content"><p class="dashboard-kicker">TANOD BUKID</p><h1>Welcome${profile.barangay ? `, ${escapeHtml(profile.barangay)}` : ''}.</h1><p>Your farm profile is ready. Keep your farm information and alerts close at hand.</p><div class="dashboard-overview"><div><span>Farm type</span><strong>${escapeHtml(profile.farmType || 'Not set')}</strong></div><div><span>Farm area</span><strong>${profile.farmArea ? `${escapeHtml(profile.farmArea)} ha` : 'Not set'}</strong></div></div></section>` }

  document.querySelector('[data-profile-back]').addEventListener('click', () => {
    if (state.step > 1) { state.step -= 1; state.errors = {}; render() }
    else window.location.href = 'index.html#register'
  })

  if (window.location.hash === '#dashboard') renderDashboard()
  else render()
})()
