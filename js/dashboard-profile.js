(() => {
  'use strict'

  const projectBaseUrl = new URL('/', window.location.origin)
  const profileUrl = new URL('api/profile.php', projectBaseUrl)
  const loginUrl = new URL('index.html#signin', projectBaseUrl)
  const greeting = document.querySelector('.welcome .eyebrow')
  const greetingName = document.querySelector('.welcome h1')
  const profileName = document.querySelector('#profile-screen .profile-head h1')
  const profileDetails = document.querySelector('#profile-screen .profile-head p')
  const avatar = document.querySelector('header .avatar')
  const profileAvatar = document.querySelector('#profile-screen .profile-avatar')
  const communityAvatar = document.querySelector('.community-avatar')
  const profilePicturePattern = /^uploads\/profile\/[a-f0-9]{32}\.(?:jpg|png|webp)$/i
  const pictureInput = document.createElement('input')
  pictureInput.type = 'file'
  pictureInput.accept = 'image/jpeg,image/png,image/webp'
  pictureInput.hidden = true
  pictureInput.setAttribute('aria-label', 'Choose a profile picture')
  document.body.append(pictureInput)
  let uploadingPicture = false
  let profileDetailsText = profileDetails.textContent
  const profileDetailsColor = profileDetails.style.color
  let feedbackTimer = null

  profileDetails.setAttribute('role', 'status')
  profileDetails.setAttribute('aria-live', 'polite')

  function setGreeting() {
    const hour = new Date().getHours()
    const timeOfDay = hour >= 5 && hour < 12
      ? 'morning'
      : hour >= 12 && hour < 18
        ? 'afternoon'
        : 'evening'
    greeting.textContent = `Good ${timeOfDay},`
  }

  function initialsFor(fullName) {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase()
  }

  function setAvatar(element, initials, path) {
    if (!profilePicturePattern.test(path || '')) {
      element.textContent = initials
      return
    }

    const imageUrl = new URL(path, projectBaseUrl)
    imageUrl.searchParams.set('v', Date.now().toString())
    const image = document.createElement('img')
    image.alt = 'Profile picture'
    image.src = imageUrl.href
    image.style.width = '100%'
    image.style.height = '100%'
    image.style.objectFit = 'cover'
    image.style.borderRadius = 'inherit'
    image.addEventListener('error', () => {
      if (image.isConnected && element.contains(image)) element.textContent = initials
    }, { once: true })
    element.replaceChildren(image)
  }

  function showPictureFeedback(message, isError = false) {
    window.clearTimeout(feedbackTimer)
    profileDetails.textContent = message
    profileDetails.dataset.kind = isError ? 'error' : 'success'
    profileDetails.setAttribute('role', isError ? 'alert' : 'status')
    profileDetails.style.color = isError ? '#b42318' : '#20563c'
    feedbackTimer = window.setTimeout(() => {
      profileDetails.textContent = profileDetailsText
      profileDetails.style.color = profileDetailsColor
      delete profileDetails.dataset.kind
      profileDetails.setAttribute('role', 'status')
    }, 4000)
  }

  function setUserAvatars(initials, path) {
    setAvatar(avatar, initials, path)
    setAvatar(profileAvatar, initials, path)
    setAvatar(communityAvatar, initials, path)
  }

  function registrationYear(createdAt) {
    if (typeof createdAt !== 'string') return null
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(createdAt)
    if (!match) return null
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${match[1]}-${match[2]}-${match[3]}`) {
      return null
    }
    return match[1]
  }

  function showUnavailable(message) {
    greetingName.textContent = 'Account unavailable'
    profileName.textContent = 'Account unavailable'
    profileDetails.textContent = message
    setUserAvatars('?', null)
  }

  function openPicturePicker() {
    if (uploadingPicture) return
    pictureInput.click()
  }

  async function uploadProfilePicture() {
    const file = pictureInput.files && pictureInput.files[0]
    pictureInput.value = ''
    if (!file || uploadingPicture) return

    uploadingPicture = true
    pictureInput.disabled = true
    const formData = new FormData()
    formData.append('profile_picture', file)
    try {
      const response = await fetch(profileUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        body: formData,
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.replace(loginUrl)
        return
      }
      if (!response.ok || !result.success || !profilePicturePattern.test(result.profile_picture || '')) {
        throw new Error(result.message || 'Unable to upload the profile picture.')
      }
      const initials = initialsFor(profileName.textContent) || '?'
      setUserAvatars(initials, result.profile_picture)
      showPictureFeedback('Profile picture updated successfully.')
    } catch (error) {
      console.error('Unable to update the profile picture:', error)
      showPictureFeedback(error.message || 'Unable to upload the profile picture. Please try again.', true)
    } finally {
      uploadingPicture = false
      pictureInput.disabled = false
    }
  }

  profileAvatar.setAttribute('role', 'button')
  profileAvatar.setAttribute('tabindex', '0')
  profileAvatar.setAttribute('aria-label', 'Change profile picture')
  profileAvatar.addEventListener('click', openPicturePicker)
  profileAvatar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicturePicker()
    }
  })
  pictureInput.addEventListener('change', uploadProfilePicture)

  async function loadProfile() {
    setGreeting()

    try {
      const response = await fetch(profileUrl, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const result = await response.json()

      if (response.status === 401) {
        window.location.replace(loginUrl)
        return
      }
      if (!response.ok || !result.success || !result.profile) {
        throw new Error(result.message || 'Unable to load your account information.')
      }

      const { full_name: fullName, location, created_at: createdAt, profile_picture: profilePicture } = result.profile
      if (typeof fullName !== 'string' || !fullName.trim()) {
        throw new Error('Your account does not have a valid name.')
      }

      const initials = initialsFor(fullName) || '?'
      greetingName.replaceChildren(document.createTextNode(`${fullName} `), greetingName.querySelector('.wave'))
      profileName.textContent = fullName
      setUserAvatars(initials, profilePicture)

      const details = []
      details.push(typeof location === 'string' && location.trim() ? location.trim() : 'Location not set')
      const year = registrationYear(createdAt)
      if (year) details.push(`Farmer since ${year}`)
      profileDetailsText = details.join(' · ')
      profileDetails.textContent = profileDetailsText
    } catch (error) {
      console.error('Unable to load the signed-in user profile:', error)
      showUnavailable('Unable to load account information.')
    }
  }

  loadProfile()
})()
