(() => {
  'use strict'

  const existingWidget = window.__tanodBukidChatbotWidget
  if (existingWidget && existingWidget.panel && existingWidget.launcher) {
    window.initAuthenticatedChatbot?.()
    return
  }

  const state = {
    open: false,
    panel: null,
    launcher: null,
    appContainer: null,
    dragPointerId: null,
    startPointerX: 0,
    startPointerY: 0,
    startLeft: 0,
    startTop: 0,
    launcherScreenLeft: null,
    launcherScreenTop: null,
    pointerMoved: false,
    suppressClick: false,
  }

  function isAuthenticatedHomeVisible() {
    const dashboardApp = document.querySelector('#dashboard-app')
    const dashboardShell = document.querySelector('.dashboard-page')
    const dashboardNav = document.querySelector('.new-bottom-nav')
    const pathIsDashboard = /dashboard\.html/i.test(window.location.pathname || '') || /#dashboard/i.test(window.location.hash || '')
    return Boolean((dashboardApp && !dashboardApp.hidden) || (dashboardShell && !dashboardShell.hidden) || dashboardNav || pathIsDashboard)
  }

  function getAppContainer() {
    const container = document.querySelector('#dashboard-app') || document.querySelector('.dashboard-page.app-shell') || document.querySelector('.dashboard-page') || document.querySelector('.app-shell') || document.body
    if (container && container !== document.body) {
      container.style.position = container.style.position || 'relative'
      container.style.overflow = container.style.overflow || 'visible'
    }
    return container
  }

  function setLauncherScreenPosition(left, top) {
    if (!state.launcher || !state.appContainer) return
    const containerRect = state.appContainer.getBoundingClientRect()
    state.launcherScreenLeft = left
    state.launcherScreenTop = top
    state.launcher.style.left = `${left - containerRect.left + state.appContainer.scrollLeft}px`
    state.launcher.style.top = `${top - containerRect.top + state.appContainer.scrollTop}px`
  }

  function syncLauncherToScreenPosition() {
    if (state.launcherScreenLeft === null || state.launcherScreenTop === null) return
    setLauncherScreenPosition(state.launcherScreenLeft, state.launcherScreenTop)
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  function updateLauncherBounds() {
    if (!state.launcher || !state.appContainer) return
    const containerRect = state.appContainer.getBoundingClientRect()
    const launcherRect = state.launcher.getBoundingClientRect()
    const minX = Math.max(0, containerRect.left)
    const minY = Math.max(0, containerRect.top)
    const maxX = Math.max(minX, Math.min(window.innerWidth, containerRect.right) - launcherRect.width)
    const maxY = Math.max(minY, Math.min(window.innerHeight, containerRect.bottom) - launcherRect.height)
    setLauncherScreenPosition(clamp(launcherRect.left, minX, maxX), clamp(launcherRect.top, minY, maxY))
  }

  function positionLauncherAtDefault() {
    if (!state.launcher || !state.appContainer) return
    const containerRect = state.appContainer.getBoundingClientRect()
    const launcherWidth = state.launcher.offsetWidth || 52
    const launcherHeight = state.launcher.offsetHeight || 52
    const padding = 16
    const minX = Math.max(0, containerRect.left)
    const minY = Math.max(0, containerRect.top)
    const maxX = Math.max(minX, Math.min(window.innerWidth, containerRect.right) - launcherWidth)
    const maxY = Math.max(minY, Math.min(window.innerHeight, containerRect.bottom) - launcherHeight)
    const defaultLeft = clamp(containerRect.right - launcherWidth - padding, minX, maxX)
    const defaultTop = clamp(containerRect.bottom - launcherHeight - 88, minY, maxY)
    setLauncherScreenPosition(defaultLeft, defaultTop)
  }

  function openChatbot() {
    if (!state.panel || !state.launcher) return
    state.open = true
    state.panel.hidden = false
    state.panel.style.display = 'flex'
    state.launcher.hidden = false
    state.launcher.setAttribute('aria-expanded', 'true')
    state.launcher.style.display = 'grid'
  }

  function closeChatbot() {
    if (!state.panel || !state.launcher) return
    state.open = false
    state.panel.hidden = true
    state.panel.style.display = 'none'
    state.launcher.hidden = false
    state.launcher.setAttribute('aria-expanded', 'false')
    state.launcher.style.display = 'grid'
  }

  function toggleChatbot() {
    setChatOpen(!state.open)
  }

  function setChatOpen(open) {
    if (open) openChatbot()
    else closeChatbot()
  }

  function attachDragBehavior() {
    if (!state.launcher || state.launcher.dataset.dragBound === 'true') return
    state.launcher.dataset.dragBound = 'true'

    state.launcher.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return
      state.dragPointerId = event.pointerId
      state.pointerMoved = false
      state.suppressClick = false
      state.startPointerX = event.clientX
      state.startPointerY = event.clientY
      const launcherRect = state.launcher.getBoundingClientRect()
      state.startLeft = launcherRect.left
      state.startTop = launcherRect.top
      state.launcher.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    })

    state.launcher.addEventListener('pointermove', (event) => {
      if (state.dragPointerId !== event.pointerId) return
      const deltaX = event.clientX - state.startPointerX
      const deltaY = event.clientY - state.startPointerY
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        state.pointerMoved = true
        state.suppressClick = true
      }
      const containerRect = state.appContainer.getBoundingClientRect()
      const width = state.launcher.offsetWidth || 52
      const height = state.launcher.offsetHeight || 52
      const minLeft = Math.max(0, containerRect.left)
      const minTop = Math.max(0, containerRect.top)
      const maxLeft = Math.max(minLeft, Math.min(window.innerWidth, containerRect.right) - width)
      const maxTop = Math.max(minTop, Math.min(window.innerHeight, containerRect.bottom) - height)
      const nextLeft = clamp(state.startLeft + deltaX, minLeft, maxLeft)
      const nextTop = clamp(state.startTop + deltaY, minTop, maxTop)
      setLauncherScreenPosition(nextLeft, nextTop)
      event.preventDefault()
    })

    state.launcher.addEventListener('pointerup', (event) => {
      if (state.dragPointerId !== event.pointerId) return
      state.dragPointerId = null
      if (state.pointerMoved) {
        state.suppressClick = true
        setTimeout(() => { state.suppressClick = false }, 0)
      }
      state.launcher.releasePointerCapture?.(event.pointerId)
    })

    state.launcher.addEventListener('pointercancel', () => {
      state.dragPointerId = null
      state.pointerMoved = false
      state.suppressClick = false
    })

    state.launcher.addEventListener('click', (event) => {
      if (state.suppressClick) {
        state.suppressClick = false
        event.preventDefault()
        event.stopPropagation()
        return
      }
      event.preventDefault()
      event.stopPropagation()
      toggleChatbot()
    })
  }

  function createChatbot() {
    if (!isAuthenticatedHomeVisible()) return null

    const existingPanel = document.querySelector('#ai-chat')
    const existingLauncher = document.querySelector('#chat-launcher')
    if (existingPanel && existingLauncher) {
      state.panel = existingPanel
      state.launcher = existingLauncher
      state.appContainer = getAppContainer()
      existingPanel.hidden = !state.open
      existingLauncher.hidden = false
      existingLauncher.setAttribute('aria-expanded', String(state.open))
      attachDragBehavior()
      return state.panel
    }

    const assistantAvatar = new URL('../TANOD BUKID/images/ai profile pic.png', import.meta.url).href
    const panel = document.createElement('section')
    panel.id = 'ai-chat'
    panel.className = 'ai-chat'
    panel.hidden = true
    panel.setAttribute('aria-label', 'Tanod Bukid AI chat')
    panel.setAttribute('role', 'dialog')
    panel.innerHTML = `
      <header class="chat-header">
        <button id="close-chat-back" type="button" aria-label="Back to scanner">‹</button>
        <img class="chat-avatar" src="${assistantAvatar}" alt="Tanod Bukid AI">
        <span><strong>Tanod Bukid AI</strong><small>Your farming assistant</small></span>
        <button id="close-chat" type="button" aria-label="Close chat">×</button>
      </header>
      <div id="chat-content" class="chat-content">
        <div class="chat-welcome">
          <img class="welcome-avatar" src="${assistantAvatar}" alt="Tanod Bukid AI">
          <div>
            <strong>Hi! I’m Tanod Bukid AI <span>🌱</span></strong>
            <p>I can help you with plant health, soil conditions, crop recommendations, and more. Ask me anything about your farm!</p>
          </div>
        </div>
        <div class="chat-topics">
          <button type="button" data-question="Is my rice plant healthy?">🌿 Plant Health</button>
          <button type="button" data-question="What soil pH is best for pechay?">⚗ Soil Advice</button>
          <button type="button" data-question="What crops can I plant in this soil?">🌱 Crop Recommend</button>
        </div>
        <div id="chat-empty" class="chat-empty"><span>♧</span><strong>Start a conversation</strong><p>Ask about your crops, soil, or any farming concerns. I’m here to help!</p></div>
        <div id="suggested-questions" class="suggested-questions"><div><strong>✦ &nbsp;Try asking</strong><span>See all ›</span></div><button type="button" data-question="Is my rice plant healthy?">🌿 <span>Is my rice plant healthy?</span>›</button><button type="button" data-question="What soil pH is best for pechay?">🌿 <span>What soil pH is best for pechay?</span>›</button><button type="button" data-question="What crops can I plant in this soil?">🌿 <span>What crops can I plant in this soil?</span>›</button><button type="button" data-question="How can I prevent rice blast disease?">🌿 <span>How can I prevent rice blast disease?</span>›</button></div>
      </div>
      <div id="image-preview" class="image-preview" hidden><img id="image-preview-photo" alt="Selected plant preview"><span id="image-preview-name"></span><button id="remove-image" type="button" aria-label="Remove selected image">×</button></div>
      <div id="image-action-sheet" class="image-action-sheet" hidden><strong>What would you like to do?</strong><button id="send-picture-action" type="button"><span>▧</span><b>Send a picture</b><small>Share a plant photo in the chat</small></button><button id="scan-plant-action" type="button"><span>⌾</span><b>Scan plant</b><small>Send the photo and get an AI health result</small></button></div>
      <div id="scan-camera-view" class="scan-camera-view" hidden><button id="scan-camera-back" class="scan-camera-back" type="button">‹ Back to chat</button><div class="scan-camera-frame"><video id="scan-camera-video" autoplay playsinline muted aria-label="Scan plant camera"></video><img id="captured-photo" alt="Captured plant" hidden></div><button id="capture-photo" class="capture-photo-button" type="button">Take photo</button><button id="send-photo" class="send-photo-button" type="button" hidden>Send photo</button></div>
      <form id="chat-composer" class="chat-composer"><input id="image-input" class="image-input" type="file" accept="image/*"><button id="attach-image" type="button" aria-label="Attach plant picture">+</button><input id="chat-input" placeholder="Type your question..." aria-label="Type your question"><button type="submit" aria-label="Send question">➤</button><button id="scan-image" class="scan-image-button" type="button" hidden>Scan image</button></form>
    </section>`

    const launcher = document.createElement('button')
    launcher.id = 'chat-launcher'
    launcher.className = 'chat-launcher'
    launcher.type = 'button'
    launcher.title = 'Open farming assistant'
    launcher.setAttribute('aria-label', 'Open farming assistant')
    launcher.setAttribute('aria-controls', 'ai-chat')
    launcher.setAttribute('aria-expanded', 'false')
    launcher.innerHTML = '<span aria-hidden="true">◌</span>'

    state.panel = panel
    state.launcher = launcher
    state.appContainer = getAppContainer()
    const container = state.appContainer || document.body
    container.append(launcher, panel)
    attachDragBehavior()

    const chatContent = panel.querySelector('#chat-content')
    const chatInput = panel.querySelector('#chat-input')
    const chatEmpty = panel.querySelector('#chat-empty')
    const suggestedQuestions = panel.querySelector('#suggested-questions')
    const imageInput = panel.querySelector('#image-input')
    const imagePreview = panel.querySelector('#image-preview')
    const imagePreviewPhoto = panel.querySelector('#image-preview-photo')
    const imagePreviewName = panel.querySelector('#image-preview-name')
    const scanImage = panel.querySelector('#scan-image')
    const imageActionSheet = panel.querySelector('#image-action-sheet')
    const scanCameraView = panel.querySelector('#scan-camera-view')
    const scanCameraVideo = panel.querySelector('#scan-camera-video')
    const capturedPhoto = panel.querySelector('#captured-photo')
    const capturePhoto = panel.querySelector('#capture-photo')
    const sendPhoto = panel.querySelector('#send-photo')
    const closeButton = panel.querySelector('#close-chat')
    const closeBackButton = panel.querySelector('#close-chat-back')

    const answers = {
      healthy: 'Based on your latest scan, your rice plant is generally healthy. I noticed a slight increase in leaf discoloration compared with the previous scan. It could be an early sign of nutrient stress or possible rice blast disease.',
      soil: 'Pechay grows well in slightly acidic to neutral soil, with a pH range of 6.0–7.0. Keep the soil moist but well-drained and add compost before planting.',
      crop: 'Based on your current soil reading, suitable crops include rice, pechay, kangkong, and tomato. Start with crops that match your water supply and sunlight.',
      disease: 'Check for brown or gray spots on the leaves, improve field drainage, avoid overwatering, and monitor the plant again in 2–3 days.'
    }

    let scanStream = null
    let capturedPhotoData = ''
    let imageAction = 'send'
    let selectedImage = null

    function appendMessage(kind, text) {
      const message = document.createElement('div')
      message.className = `chat-message ${kind}`
      if (kind === 'assistant') {
        const avatar = document.createElement('img')
        avatar.className = 'message-avatar'
        avatar.src = assistantAvatar
        avatar.alt = 'Tanod Bukid AI'
        message.append(avatar)
      }
      const paragraph = document.createElement('p')
      paragraph.textContent = text
      message.append(paragraph)
      chatContent.append(message)
      chatContent.scrollTop = chatContent.scrollHeight
    }

    function askAi(question) {
      const prompt = question.trim()
      if (!prompt) return
      const lower = prompt.toLowerCase()
      let answer = 'I can help you check plant health, soil conditions, crop recommendations, and common diseases. Tell me what you are seeing in your farm.'
      if (lower.includes('healthy') || lower.includes('rice')) answer = answers.healthy
      else if (lower.includes('soil') || lower.includes('pechay')) answer = answers.soil
      else if (lower.includes('crop') || lower.includes('plant')) answer = answers.crop
      else if (lower.includes('blast') || lower.includes('disease')) answer = answers.disease
      chatEmpty.hidden = true
      suggestedQuestions.hidden = true
      appendMessage('user', prompt)
      appendMessage('assistant', answer)
      chatInput.value = ''
    }

    function clearSelectedImage() {
      selectedImage = null
      imagePreview.hidden = true
      scanImage.hidden = true
      imagePreviewPhoto.removeAttribute('src')
      imagePreviewName.textContent = ''
      imageInput.value = ''
    }

    function sendPicture(image) {
      chatEmpty.hidden = true
      suggestedQuestions.hidden = true
      const message = document.createElement('div')
      message.className = 'chat-message image'
      const photo = document.createElement('img')
      photo.className = 'sent-plant-image'
      photo.src = image.url
      photo.alt = `Uploaded plant: ${image.name}`
      message.append(photo)
      chatContent.append(message)
      chatContent.scrollTop = chatContent.scrollHeight
    }

    function closeScanCamera() {
      scanStream?.getTracks().forEach((track) => track.stop())
      scanStream = null
      scanCameraView.hidden = true
      capturedPhoto.hidden = true
      scanCameraVideo.hidden = false
      capturePhoto.hidden = false
      sendPhoto.hidden = true
      capturedPhotoData = ''
    }

    function setChatOpen(open) {
      if (open) openChatbot()
      else closeChatbot()
      if (!open) closeScanCamera()
    }

    closeButton?.addEventListener('click', () => setChatOpen(false))
    closeBackButton?.addEventListener('click', () => setChatOpen(false))
    panel.querySelector('#chat-composer')?.addEventListener('submit', (event) => {
      event.preventDefault()
      askAi(chatInput.value)
    })
    panel.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => askAi(button.dataset.question)))
    imageInput.addEventListener('change', () => {
      const file = imageInput.files?.[0]
      if (!file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        selectedImage = { name: file.name, url: reader.result }
        imageActionSheet.hidden = true
        if (imageAction === 'scan') {
          sendPicture(selectedImage)
          appendMessage('assistant', 'I scanned your plant image. The leaves look generally healthy, but I noticed mild discoloration. Check for brown spots, keep the soil well-drained, and scan again in 2–3 days.')
          clearSelectedImage()
        } else {
          sendPicture(selectedImage)
          clearSelectedImage()
        }
      }
      reader.readAsDataURL(file)
    })

    panel.querySelector('#remove-image').addEventListener('click', clearSelectedImage)
    scanImage.addEventListener('click', () => {
      if (!selectedImage) return
      sendPicture(selectedImage)
      appendMessage('assistant', 'I scanned your plant image. The leaves look generally healthy, but I noticed mild discoloration. Check for brown spots, keep the soil well-drained, and scan again in 2–3 days to monitor changes.')
      clearSelectedImage()
    })
    panel.querySelector('#attach-image').addEventListener('click', () => { imageActionSheet.hidden = !imageActionSheet.hidden })
    panel.querySelector('#send-picture-action').addEventListener('click', () => { imageAction = 'send'; imageInput.click() })
    panel.querySelector('#scan-plant-action').addEventListener('click', async () => {
      imageActionSheet.hidden = true
      scanCameraView.hidden = false
      try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        scanCameraVideo.srcObject = scanStream
      } catch {
        scanCameraView.hidden = true
        alert('Camera access is off. Allow permission to scan your plant.')
      }
    })
    capturePhoto.addEventListener('click', () => {
      if (!scanCameraVideo.videoWidth) return
      const canvas = document.createElement('canvas')
      canvas.width = scanCameraVideo.videoWidth
      canvas.height = scanCameraVideo.videoHeight
      canvas.getContext('2d').drawImage(scanCameraVideo, 0, 0, canvas.width, canvas.height)
      capturedPhotoData = canvas.toDataURL('image/jpeg', 0.88)
      capturedPhoto.src = capturedPhotoData
      capturedPhoto.hidden = false
      scanCameraVideo.hidden = true
      capturePhoto.hidden = true
      sendPhoto.hidden = false
      scanStream?.getTracks().forEach((track) => track.stop())
    })
    sendPhoto.addEventListener('click', () => {
      if (!capturedPhotoData) return
      sendPicture({ name: 'scanned-plant.jpg', url: capturedPhotoData })
      appendMessage('assistant', 'I scanned your plant image. The leaves look generally healthy, but I noticed mild discoloration. Check for brown spots, keep the soil well-drained, and scan again in 2–3 days.')
      closeScanCamera()
    })
    panel.querySelector('#scan-camera-back').addEventListener('click', closeScanCamera)

    document.querySelector('#ask-ai-button')?.addEventListener('click', () => setChatOpen(true))
    window.addEventListener('pagehide', closeScanCamera, { once: true })

    positionLauncherAtDefault()
    return panel
  }

  function initAuthenticatedChatbot() {
    if (!isAuthenticatedHomeVisible()) {
      const panel = document.querySelector('#ai-chat')
      const launcher = document.querySelector('#chat-launcher')
      if (panel) {
        panel.hidden = true
        panel.style.display = 'none'
      }
      if (launcher) {
        launcher.hidden = false
        launcher.style.display = 'grid'
      }
      return null
    }

    const panel = document.querySelector('#ai-chat') || state.panel || createChatbot()
    const launcher = document.querySelector('#chat-launcher') || state.launcher
    if (!panel || !launcher) return null

    const container = getAppContainer()
    if (container && container !== document.body && !container.contains(panel)) container.append(panel)
    if (container && container !== document.body && !container.contains(launcher)) container.append(launcher)

    state.panel = panel
    state.launcher = launcher
    state.appContainer = container
    panel.hidden = !state.open
    panel.style.display = state.open ? 'flex' : 'none'
    launcher.hidden = false
    launcher.style.display = 'grid'
    launcher.style.opacity = '1'
    launcher.style.visibility = 'visible'
    launcher.setAttribute('aria-expanded', String(state.open))
    if (!state.open) positionLauncherAtDefault()
    return panel
  }

  if (!isAuthenticatedHomeVisible()) return

  createChatbot()
  window.__tanodBukidChatbotWidget = {
    openChatbot,
    closeChatbot,
    toggleChatbot,
    setChatOpen,
    launcher: state.launcher,
    panel: state.panel,
    appContainer: state.appContainer,
    initialized: true,
  }
  window.initAuthenticatedChatbot = initAuthenticatedChatbot
  window.openChatbot = openChatbot
  window.closeChatbot = closeChatbot
  window.toggleChatbot = toggleChatbot
  window.setChatOpen = setChatOpen
  window.addEventListener('resize', updateLauncherBounds)
  window.addEventListener('scroll', syncLauncherToScreenPosition, { capture: true, passive: true })
  window.addEventListener('orientationchange', updateLauncherBounds)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.panel && !state.panel.hidden) closeChatbot()
  })
})()