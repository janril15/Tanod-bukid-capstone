(() => {
  'use strict'

  const signOutRow = document.querySelector('#profile-screen .profile-row.signout')
  if (!signOutRow) return

  signOutRow.addEventListener('click', async (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()

    if (!window.confirm('Sign out of Tanod Bukid?')) return

    try {
      const response = await fetch(new URL('../api/logout.php', window.location.href), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to sign out.')
      }
      window.location.assign(new URL('../index.html#signin', window.location.href))
    } catch {
      window.alert('Unable to sign out right now. Check that the PHP server is running and try again.')
    }
  }, true)
})()
