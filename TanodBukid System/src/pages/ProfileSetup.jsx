import React from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'tanodbukid_profile_setup'
const TOTAL_STEPS = 4

function DefaultAvatar() {
  return (
    <svg viewBox="0 0 120 120" className="profile-avatar-svg" aria-hidden="true">
      <circle cx="60" cy="60" r="52" fill="rgba(53,86,62,0.12)" stroke="#2a3f2d" strokeWidth="2.5" />
      <circle cx="60" cy="48" r="18" fill="none" stroke="#2a3f2d" strokeWidth="2.6" />
      <path d="M38 86c4-11 18-18 22-18s18 7 22 18" fill="none" stroke="#2a3f2d" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export default function ProfileSetup() {
  const fileInputRef = React.useRef(null)
  const navigate = useNavigate()
  const [formData, setFormData] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return {
        barangay: saved.barangay || '',
        municipality: saved.municipality || '',
        photo: saved.photo || '',
        farmName: saved.farmName || '',
        farmArea: saved.farmArea || '',
        farmType: saved.farmType || '',
        waterSource: saved.waterSource || '',
        crops: saved.crops || [],
        livestock: saved.livestock || [],
        notifications: {
          climateAlerts: saved.notifications?.climateAlerts ?? true,
          communityAlerts: saved.notifications?.communityAlerts ?? true
        }
      }
    } catch {
      return { barangay: '', municipality: '', photo: '', farmName: '', farmArea: '', farmType: '', waterSource: '', crops: [], livestock: [], notifications: { climateAlerts: true, communityAlerts: true } }
    }
  })
  const [currentStep, setCurrentStep] = React.useState(1)
  const [errors, setErrors] = React.useState({})
  const [otherType, setOtherType] = React.useState(null)
  const [otherValue, setOtherValue] = React.useState('')

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...formData, currentStep }))
    } catch (error) {
      console.warn('Unable to save profile setup state:', error)
    }
  }, [formData, currentStep])

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) return

    const reader = new FileReader()
    reader.onload = () => {
      updateField('photo', reader.result || '')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const validateStepOne = () => {
    const nextErrors = {
      barangay: formData.barangay.trim() ? '' : 'Barangay is required.',
      municipality: formData.municipality.trim() ? '' : 'Municipality is required.'
    }

    setErrors(nextErrors)
    return !nextErrors.barangay && !nextErrors.municipality
  }

  const handleContinue = () => {
    if (currentStep === 1 && validateStepOne()) setCurrentStep(2)
    if (currentStep === 2 && validateStepTwo()) setCurrentStep(3)
    if (currentStep === 3 && validateStepThree()) setCurrentStep(4)
  }

  const validateStepTwo = () => {
    const nextErrors = { farmArea: formData.farmArea.trim() ? '' : 'Farm area is required.', farmType: formData.farmType ? '' : 'Farm type is required.' }
    setErrors(nextErrors)
    return !nextErrors.farmArea && !nextErrors.farmType
  }

  const validateStepThree = () => {
    const nextErrors = { crops: formData.crops.length ? '' : 'Select at least one crop.', livestock: formData.livestock.length ? '' : 'Select at least one livestock type.' }
    setErrors(nextErrors)
    return !nextErrors.crops && !nextErrors.livestock
  }

  const toggleSelection = (field, value) => setFormData(prev => ({ ...prev, [field]: prev[field].includes(value) ? prev[field].filter(item => item !== value) : [...prev[field], value] }))

  const addOther = () => {
    const value = otherValue.trim()
    if (!value || !otherType) return
    setFormData(prev => ({ ...prev, [otherType]: prev[otherType].includes(value) ? prev[otherType] : [...prev[otherType], value] }))
    setOtherValue('')
    setOtherType(null)
  }

  const finishSetup = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...formData, profileSetupCompleted: true, currentStep: 4 }))
    } catch (error) {
      console.warn('Unable to save completed profile:', error)
    }
    navigate('/dashboard')
  }

  const progressWidth = `${(currentStep / TOTAL_STEPS) * 100}%`

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <>
          <div className="profile-photo-wrap">
            <button type="button" className="profile-avatar-button" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              {formData.photo ? <img src={formData.photo} alt="Profile preview" className="profile-avatar-image" /> : <DefaultAvatar />}
            </button>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={handlePhotoChange} />
            <div className="profile-upload-text">Tap to upload photo</div>
          </div>

          <div className="profile-form">
            <label className="profile-field">
              <span className="field-label">Barangay <span className="asterisk">*</span></span>
              <input
                className={`profile-input ${errors.barangay ? 'has-error' : ''}`}
                type="text"
                name="barangay"
                value={formData.barangay}
                onChange={(event) => updateField('barangay', event.target.value)}
                placeholder="Enter your barangay"
              />
              {errors.barangay && <span className="field-error">{errors.barangay}</span>}
            </label>

            <label className="profile-field">
              <span className="field-label">Municipality <span className="asterisk">*</span></span>
              <input
                className={`profile-input ${errors.municipality ? 'has-error' : ''}`}
                type="text"
                name="municipality"
                value={formData.municipality}
                onChange={(event) => updateField('municipality', event.target.value)}
                placeholder="Enter your municipality"
              />
              {errors.municipality && <span className="field-error">{errors.municipality}</span>}
            </label>
          </div>

          <button type="button" className="profile-continue-button" onClick={handleContinue}>CONTINUE</button>
        </>
      )
    }

    if (currentStep === 2) return <FarmDetails formData={formData} updateField={updateField} errors={errors} onContinue={handleContinue} onBack={() => setCurrentStep(1)} />
    if (currentStep === 3) return <CropLivestock formData={formData} toggleSelection={toggleSelection} errors={errors} onContinue={handleContinue} onBack={() => setCurrentStep(2)} onAdd={setOtherType} />
    return <Preferences formData={formData} updateField={updateField} onFinish={finishSetup} onBack={() => setCurrentStep(3)} />
  }

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card">
        <div className="profile-header-row">
          <h1 className="profile-title">SET UP YOUR PROFILE</h1>
          <div className="profile-step-meta">Step {currentStep} of {TOTAL_STEPS}</div>
        </div>

        <div className="profile-progress-divider">
          <span className="profile-progress-fill" style={{ width: progressWidth }} />
        </div>

        {renderStepContent()}
      </div>
      {otherType && <div className="other-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setOtherType(null)}><div className="other-modal" role="dialog" aria-modal="true" aria-labelledby="other-title"><h2 id="other-title">Add another {otherType === 'crops' ? 'crop' : 'livestock'}</h2><input autoFocus className="profile-input" value={otherValue} onChange={event => setOtherValue(event.target.value)} placeholder={`Enter ${otherType === 'crops' ? 'crop' : 'livestock'} type`} onKeyDown={event => event.key === 'Enter' && addOther()} /><div className="modal-actions"><button type="button" className="back-button" onClick={() => setOtherType(null)}>CANCEL</button><button type="button" className="profile-continue-button" onClick={addOther}>ADD</button></div></div></div>}
    </div>
  )
}

function StepButton({ children, selected, onClick }) { return <button type="button" className={`selection-pill ${selected ? 'selected' : ''}`} onClick={onClick}>{children}</button> }

function FarmDetails({ formData, updateField, errors, onContinue, onBack }) {
  const types = ['Crop Farming', 'Livestock', 'Aquaculture', 'Mixed Farm']
  return <div className="profile-step-content">
    <label className="profile-field"><span className="field-label">Farm Name (optional)</span><input className="profile-input" value={formData.farmName} onChange={e => updateField('farmName', e.target.value)} placeholder="Enter farm name" /></label>
    <label className="profile-field"><span className="field-label">Total Farm Area (hectares) <span className="asterisk">*</span></span><input className={`profile-input ${errors.farmArea ? 'has-error' : ''}`} type="number" min="0" value={formData.farmArea} onChange={e => updateField('farmArea', e.target.value)} placeholder="Enter total farm area" />{errors.farmArea && <span className="field-error">{errors.farmArea}</span>}</label>
    <div className="profile-field"><span className="field-label">Farm Type <span className="asterisk">*</span></span><div className="selection-grid">{types.map(type => <StepButton key={type} selected={formData.farmType === type} onClick={() => updateField('farmType', type)}>{type}</StepButton>)}</div>{errors.farmType && <span className="field-error">{errors.farmType}</span>}</div>
    <label className="profile-field"><span className="field-label">Primary Water Source</span><input className="profile-input" value={formData.waterSource} onChange={e => updateField('waterSource', e.target.value)} placeholder="Enter primary water source" /></label>
    <div className="step-actions"><button type="button" className="back-button" onClick={onBack}>BACK</button><button type="button" className="profile-continue-button" onClick={onContinue}>CONTINUE</button></div>
  </div>
}

function CropLivestock({ formData, toggleSelection, errors, onContinue, onBack, onAdd }) {
  const cropOptions = ['Palay (Rice)', 'Onion', 'Mais (Corn)', 'Kangkong', 'Tomato', 'Eggplant']
  const livestockOptions = ['Cattle', 'Swine', 'Poultry', 'Goat']
  const group = (label, field, options, error) => <div className="profile-field selection-section"><span className="field-label">{label} <span className="asterisk">*</span></span><div className="selection-grid">{[...options, ...formData[field].filter(item => !options.includes(item))].map(item => <StepButton key={item} selected={formData[field].includes(item)} onClick={() => toggleSelection(field, item)}>{item}</StepButton>)}</div><button type="button" className="add-other-button" onClick={() => onAdd(field)}>+ Add other</button>{error && <span className="field-error">{error}</span>}</div>
  return <div className="profile-step-content">{group('Select all crops you grow', 'crops', cropOptions, errors.crops)}{group('Select livestock you raise', 'livestock', livestockOptions, errors.livestock)}<div className="step-actions"><button type="button" className="back-button" onClick={onBack}>BACK</button><button type="button" className="profile-continue-button" onClick={onContinue}>CONTINUE</button></div></div>
}

function Preferences({ formData, updateField, onFinish, onBack }) {
  const preferences = [['climateAlerts', 'Climate Alerts', 'Typhoon, floods, etc.'], ['communityAlerts', 'Community Alerts', 'Nearby farm requests']]
  return <div className="profile-step-content"><div className="notification-section"><div className="field-label">Notification Preferences</div>{preferences.map(([key, title, description]) => <div className="notification-row" key={key}><div><strong>{title}</strong><small>{description}</small></div><button type="button" aria-label={`Toggle ${title}`} className={`toggle ${formData.notifications[key] ? 'enabled' : ''}`} onClick={() => setFormDataValue(formData, updateField, key)}><span /></button></div>)}</div><div className="step-actions"><button type="button" className="back-button" onClick={onBack}>BACK</button><button type="button" className="profile-continue-button" onClick={onFinish}>FINISH SETUP</button></div></div>
}

function setFormDataValue(formData, updateField, key) { updateField('notifications', { ...formData.notifications, [key]: !formData.notifications[key] }) }
