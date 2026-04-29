import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, UploadCloud, Globe, MapPin, Search, Facebook, Instagram, Youtube, Twitter, Linkedin, MonitorPlay, Sparkles, Download, Loader2, PartyPopper, Wand2, Settings2, Image as ImageIcon, Copy, MessageSquare, Film, Zap } from 'lucide-react'
import Chatbot from '../components/Chatbot'
import { uploadFile, aiAnalyze, aiGenerateImage, createCampaign, generateVideoAd, mlPredictRoi } from '../lib/server'

const platformsList = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E1306C', bg: 'rgba(225, 48, 108, 0.1)' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', bg: 'rgba(24, 119, 242, 0.1)' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', bg: 'rgba(255, 0, 0, 0.1)' },
    { id: 'tiktok', name: 'TikTok', icon: MonitorPlay, color: '#000000', bg: 'rgba(0, 0, 0, 0.05)' },
    { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#1DA1F2', bg: 'rgba(29, 161, 242, 0.1)' },
    { id: 'google', name: 'Google Search', icon: Search, color: '#4285F4', bg: 'rgba(66, 133, 244, 0.1)' },
]

const CreateAd = () => {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [mode, setMode] = useState('simple') // 'simple' or 'advanced'
    const [showChatbot, setShowChatbot] = useState(false)

    // Form state
    const [productDesc, setProductDesc] = useState('')
    const [productName, setProductName] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram', 'facebook'])
    const [aiLocation, setAiLocation] = useState(true)
    const [locationTarget, setLocationTarget] = useState('Worldwide')
    const [radius, setRadius] = useState(25)

    const [budgetType, setBudgetType] = useState('daily')
    const [budgetAmount, setBudgetAmount] = useState(40)
    const [autoOptimize, setAutoOptimize] = useState(true)
    const [isLaunching, setIsLaunching] = useState(false)
    const [launchError, setLaunchError] = useState('')

    // Uploads
    const imageInputRef = useRef(null)
    const videoInputRef = useRef(null)
    const [uploadedImages, setUploadedImages] = useState([])
    const [uploadedVideo, setUploadedVideo] = useState(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadingVideo, setUploadingVideo] = useState(false)
    const [uploadError, setUploadError] = useState('')

    // AI generation
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState(null)   // { audience, targeting, imagePrompt, copy }
    const [analyzeError, setAnalyzeError] = useState('')
    const [generatedImageUrl, setGeneratedImageUrl] = useState('')
    const [genImgLoading, setGenImgLoading] = useState(false)

    // Video gen
    const [videoResult, setVideoResult] = useState(null)
    const [videoLoading, setVideoLoading] = useState(false)
    const [videoError, setVideoError] = useState('')

    // ROI predictor
    const [roiPrediction, setRoiPrediction] = useState(null)
    const [roiLoading, setRoiLoading] = useState(false)

    // Derived values
    const platformCount = selectedPlatforms.length || 1
    const splitAmount = (budgetAmount / platformCount).toFixed(2)

    const nextStep = () => {
        if (mode === 'simple' && step === 1) setStep(5)
        else setStep(s => Math.min(5, s + 1))
    }
    const prevStep = () => {
        if (mode === 'simple' && step === 5) setStep(1)
        else setStep(s => Math.max(1, s - 1))
    }

    const handleLaunch = async () => {
        setIsLaunching(true)
        setLaunchError('')
        try {
            const platformsToUse = mode === 'simple' ? ['instagram', 'facebook', 'google'] : selectedPlatforms
            await createCampaign({
                name: productName || (productDesc ? productDesc.slice(0, 60) : `Campaign ${new Date().toLocaleDateString()}`),
                product: productName || null,
                description: productDesc || null,
                status: 'active',
                platforms: platformsToUse,
                dailyBudget: budgetType === 'daily' ? Number(budgetAmount) : null,
                lifetimeCap: budgetType === 'total' ? Number(budgetAmount) : null,
                targeting: {
                    location: aiLocation ? { mode: 'ai' } : { mode: 'manual', target: locationTarget, radiusMiles: Number(radius) },
                    autoOptimize,
                },
                copy: analysis?.copy || null,
                imageUrls: [
                    ...uploadedImages.map(u => u.url),
                    ...(generatedImageUrl ? [generatedImageUrl] : []),
                ],
                videoUrl: uploadedVideo?.url || videoResult?.voiceoverUrl || null,
            })
            setStep(6)
        } catch (err) {
            setLaunchError(err.message || 'Failed to save campaign.')
        } finally {
            setIsLaunching(false)
        }
    }

    const handleFileUpload = async (e, kind) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadError('')
        if (kind === 'image') setUploadingImage(true); else setUploadingVideo(true)
        try {
            const out = await uploadFile(file)
            if (kind === 'image') setUploadedImages(prev => [...prev, out])
            else setUploadedVideo(out)
        } catch (err) {
            setUploadError(err.message || 'Upload failed.')
        } finally {
            if (kind === 'image') setUploadingImage(false); else setUploadingVideo(false)
            e.target.value = ''  // allow re-uploading same file
        }
    }

    const handleAnalyze = async () => {
        if (!productDesc.trim() && uploadedImages.length === 0) return
        setAnalyzing(true)
        setAnalyzeError('')
        try {
            const result = await aiAnalyze({
                description: productDesc || `${uploadedImages.length} image(s) provided`,
                productName: productName || undefined,
                mediaUrls: uploadedImages.map(u => u.url),
            })
            setAnalysis(result)
            // Kick off image generation in the background using the AI's suggested prompt.
            if (result.imagePrompt) {
                setGenImgLoading(true)
                aiGenerateImage({ prompt: result.imagePrompt })
                    .then(r => setGeneratedImageUrl(r.url))
                    .catch(() => {})
                    .finally(() => setGenImgLoading(false))
            }
        } catch (err) {
            setAnalyzeError(err.message || 'AI analysis failed.')
        } finally {
            setAnalyzing(false)
        }
    }

    const handleGenerateVideo = async () => {
        if (!productDesc.trim()) return
        setVideoLoading(true)
        setVideoError('')
        setVideoResult(null)
        try {
            const result = await generateVideoAd({
                product: productName || productDesc.slice(0, 60),
                description: productDesc,
                durationSec: 30,
            })
            setVideoResult(result)
        } catch (err) {
            setVideoError(err.message || 'Video generation failed.')
        } finally {
            setVideoLoading(false)
        }
    }

    // Debounced ROI prediction whenever budget/days changes on step 4.
    useEffect(() => {
        if (step !== 4) return
        const t = setTimeout(() => {
            setRoiLoading(true)
            mlPredictRoi({ dailyBudget: Number(budgetAmount) || 0, days: 7, estRevenue: 50 })
                .then(setRoiPrediction)
                .catch(() => setRoiPrediction(null))
                .finally(() => setRoiLoading(false))
        }, 350)
        return () => clearTimeout(t)
    }, [step, budgetAmount])

    const togglePlatform = (id) => {
        if (selectedPlatforms.includes(id)) {
            if (selectedPlatforms.length > 1) setSelectedPlatforms(selectedPlatforms.filter(p => p !== id))
        } else {
            setSelectedPlatforms([...selectedPlatforms, id])
        }
    }

    return (
        <div style={{ maxWidth: step === 5 ? '1000px' : '800px', margin: '0 auto', paddingBottom: '4rem', transition: 'max-width 0.3s ease', position: 'relative' }}>
                {/* Header & Progress */}
                {step < 6 && (
                    <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <h1 style={{ fontSize: '1.875rem', margin: 0 }}>Create New Campaign</h1>
                        
                        {/* Mode Toggle visible only on step 1 */}
                        {step === 1 && (
                            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
                                <button 
                                    onClick={() => setMode('simple')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: 'none', background: mode === 'simple' ? 'var(--bg-primary)' : 'transparent', color: mode === 'simple' ? 'var(--accent-primary)' : 'var(--text-secondary)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: mode === 'simple' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}
                                >
                                    <Wand2 size={16} /> Simple
                                </button>
                                <button 
                                    onClick={() => setMode('advanced')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: 'none', background: mode === 'advanced' ? 'var(--bg-primary)' : 'transparent', color: mode === 'advanced' ? 'var(--accent-primary)' : 'var(--text-secondary)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: mode === 'advanced' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}
                                >
                                    <Settings2 size={16} /> Advanced
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <span>Step {mode === 'simple' ? (step === 1 ? '1' : '2') : step} of {mode === 'simple' ? '2' : '5'}</span>
                        <span>{['Product Details', 'Platforms', 'Targeting', 'Budget', 'Review'][step-1]}</span>
                    </div>
                    <div className="progress-container" style={{ background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div className="progress-bar" style={{ 
                            width: mode === 'simple' ? (step === 1 ? '50%' : '100%') : `${(step / 5) * 100}%`, 
                            background: 'linear-gradient(90deg, #38BDF8, #A78BFA)',
                            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}></div>
                    </div>
                </div>
            )}

            <div className="card shadow-lg" style={{ padding: step === 6 ? '4rem 2rem' : '2.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column', borderTop: step === 6 ? '4px solid var(--accent-success)' : '4px solid var(--accent-primary)' }}>
                
                <div style={{ flex: 1 }}>
                    {/* STEP 1: Product Input */}
                    {step === 1 && (
                        <div className="fade-in">
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>What are you promoting?</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{mode === 'simple' ? "Give us the asset, we'll auto-optimize targeting and budget." : "Upload assets and we'll refine the strategy."}</p>
                            
                            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={e => handleFileUpload(e, 'image')} />
                            <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={e => handleFileUpload(e, 'video')} />

                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div onClick={() => imageInputRef.current?.click()} style={{ flex: 1, border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--bg-secondary)' }}
                                     onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                                     onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                                    {uploadingImage ? <Loader2 size={36} color="var(--accent-primary)" className="spin" style={{ margin: '0 auto 1rem' }} /> : <UploadCloud size={36} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />}
                                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Upload Image</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{uploadedImages.length ? `${uploadedImages.length} uploaded` : 'PNG, JPG up to 50MB'}</p>
                                </div>
                                <div onClick={() => videoInputRef.current?.click()} style={{ flex: 1, border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--bg-secondary)' }}
                                     onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                                     onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                                    {uploadingVideo ? <Loader2 size={36} color="#EC4899" className="spin" style={{ margin: '0 auto 1rem' }} /> : <UploadCloud size={36} color="#EC4899" style={{ margin: '0 auto 1rem' }} />}
                                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Upload Video</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{uploadedVideo ? '1 uploaded ✓' : 'MP4, MOV up to 50MB'}</p>
                                </div>
                            </div>
                            {uploadError && (
                                <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#fca5a5' }}>{uploadError}</p>
                            )}
                            {uploadedImages.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    {uploadedImages.map((u, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                            <img src={u.url} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 600 }}>OR DESCRIBE IT</span>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Product Name (optional)</label>
                                <input
                                    className="input-base"
                                    placeholder="e.g. Acme Yoga Mat"
                                    value={productName}
                                    onChange={e => setProductName(e.target.value)}
                                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Product Description</label>
                                <textarea
                                    className="input-base"
                                    rows={4}
                                    placeholder="Describe your product, service, or what makes it special... Our AI will generate the ad copy."
                                    value={productDesc}
                                    onChange={e => setProductDesc(e.target.value)}
                                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                                <button
                                    className="btn-primary"
                                    disabled={analyzing || (!productDesc.trim() && uploadedImages.length === 0)}
                                    onClick={handleAnalyze}
                                    style={{ flex: 1, minWidth: '200px', padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(90deg, #38BDF8, #A78BFA)', opacity: analyzing ? 0.7 : 1 }}
                                >
                                    {analyzing ? <><Loader2 size={18} className="spin" /> Analyzing…</> : <><Sparkles size={18} /> Analyze & Generate Ad</>}
                                </button>
                                <button
                                    className="btn-secondary"
                                    disabled={videoLoading || !productDesc.trim()}
                                    onClick={handleGenerateVideo}
                                    style={{ minWidth: '180px', padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {videoLoading ? <><Loader2 size={18} className="spin" /> Generating…</> : <><Film size={18} /> Generate Video Ad</>}
                                </button>
                            </div>
                            {analyzeError && <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: '#fca5a5' }}>{analyzeError}</p>}
                            {videoError && <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: '#fca5a5' }}>{videoError}</p>}

                            {analysis && (
                                <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-lg)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.5rem' }}>AI Analysis</div>
                                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}><strong>Audience:</strong> {analysis.audience}</p>
                                    {analysis.copy?.headlines?.length > 0 && (
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <strong style={{ fontSize: '0.85rem' }}>Headlines:</strong>
                                            <ul style={{ margin: '0.25rem 0 0 1.25rem', paddingLeft: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {analysis.copy.headlines.map((h, i) => <li key={i}>{h}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {analysis.copy?.body && <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Body:</strong> {analysis.copy.body}</p>}
                                    {analysis.copy?.cta && <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>CTA:</strong> {analysis.copy.cta}</p>}
                                    {(genImgLoading || generatedImageUrl) && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <strong style={{ fontSize: '0.85rem' }}>Generated image:</strong>
                                            <div style={{ marginTop: '0.5rem' }}>
                                                {genImgLoading && <Loader2 size={20} className="spin" />}
                                                {generatedImageUrl && <img src={generatedImageUrl} alt="" style={{ maxWidth: '300px', borderRadius: 'var(--radius-md)' }} />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {videoResult && (
                                <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(167, 139, 250, 0.05)', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: 'var(--radius-lg)' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.5rem' }}>Video Ad Storyboard</div>
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{videoResult.hook}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        {videoResult.scenes?.map((s, i) => (
                                            <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                                <img src={s.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                                                <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.voiceoverLine}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {videoResult.voiceoverUrl && (
                                        <audio controls src={videoResult.voiceoverUrl} style={{ width: '100%', marginTop: '0.5rem' }} />
                                    )}
                                    {videoResult.voiceoverError && <p style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', margin: '0.5rem 0 0' }}>Voiceover unavailable: {videoResult.voiceoverError}</p>}
                                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>CTA: {videoResult.cta}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Platforms Selection (Advanced Only) */}
                    {step === 2 && (
                        <div className="fade-in">
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Select Ad Platforms</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Choose where you want your ad to run. We'll format it perfectly for each.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {platformsList.map(platform => {
                                    const isSelected = selectedPlatforms.includes(platform.id)
                                    const Icon = platform.icon
                                    return (
                                        <div 
                                            key={platform.id}
                                            onClick={() => togglePlatform(platform.id)}
                                            style={{ 
                                                border: `2px solid ${isSelected ? platform.color : 'var(--border-color)'}`, 
                                                borderRadius: 'var(--radius-lg)', 
                                                padding: '1.5rem', 
                                                cursor: 'pointer', 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center', 
                                                gap: '1rem',
                                                background: isSelected ? platform.bg : 'var(--bg-secondary)',
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? `0 4px 12px ${platform.bg}` : 'none'
                                            }}
                                        >
                                            <div style={{ padding: '1rem', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                <Icon size={32} color={platform.color} />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>{platform.name}</h4>
                                            </div>
                                            <div style={{ 
                                                width: '24px', height: '24px', borderRadius: '50%', 
                                                background: isSelected ? platform.color : 'var(--bg-tertiary)', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', marginTop: 'auto'
                                            }}>
                                                {isSelected && <Check size={14} strokeWidth={3} />}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Location (Advanced Only) */}
                    {step === 3 && (
                        <div className="fade-in">
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Who should see this?</h2>
                            
                            <div style={{ background: 'linear-gradient(145deg, var(--bg-secondary), rgba(79, 70, 229, 0.05))', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.1)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Sparkles size={18} color="var(--accent-primary)" /> Let AI choose best location
                                        </h4>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>We'll automatically target regions with the highest conversion probability.</p>
                                    </div>
                                    <div onClick={() => setAiLocation(!aiLocation)} style={{ width: '48px', height: '26px', borderRadius: '13px', background: aiLocation ? 'linear-gradient(90deg, #38BDF8, #A78BFA)' : 'var(--bg-tertiary)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: aiLocation ? '25px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                                    </div>
                                </label>
                            </div>

                            {!aiLocation && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'block', fontWeight: 600 }}>Manual Targeting Setup</label>
                                    
                                    <div style={{ position: 'relative' }}>
                                        <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input type="text" className="input-base" 
                                            value={locationTarget} onChange={e => setLocationTarget(e.target.value)}
                                            placeholder="Enter country, city, or zip code..." style={{ paddingLeft: '2.5rem', background: 'var(--bg-primary)' }} />
                                    </div>
                                    
                                    {locationTarget && locationTarget !== 'Worldwide' && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Radius targeting</span>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>+{radius} miles</span>
                                            </div>
                                            <input type="range" min="1" max="50" value={radius} onChange={e => setRadius(e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 500 }}>
                                            {locationTarget} <Check size={14} />
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: Budget (Advanced Only) */}
                    {step === 4 && (
                        <div className="fade-in">
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Set your budget</h2>
                            
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                <button className={budgetType === 'daily' ? 'btn-primary' : 'btn-secondary'} onClick={() => setBudgetType('daily')} style={{ flex: 1, padding: '1rem', fontSize: '1rem' }}>Daily Spend</button>
                                <button className={budgetType === 'total' ? 'btn-primary' : 'btn-secondary'} onClick={() => setBudgetType('total')} style={{ flex: 1, padding: '1rem', fontSize: '1rem', background: budgetType !== 'total' ? 'var(--bg-secondary)' : undefined }}>Lifetime Cap</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px solid var(--accent-primary)', paddingBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>$</span>
                                    <input 
                                        type="number" 
                                        value={budgetAmount} 
                                        onChange={e => setBudgetAmount(e.target.value)}
                                        style={{ fontSize: '4rem', fontWeight: 800, border: 'none', width: '160px', textAlign: 'center', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                
                                {/* Budget Distribution Tool */}
                                <div style={{ width: '100%', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Suggested Distribution ({platformCount} active platforms)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${platformCount}, 1fr)`, gap: '1rem' }}>
                                        {selectedPlatforms.map(id => {
                                            const plat = platformsList.find(p => p.id === id)
                                            return (
                                                <div key={id} style={{ background: 'var(--bg-primary)', border: `1px solid ${plat.color}40`, padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                    <plat.icon size={20} color={plat.color} style={{ margin: '0 auto 0.5rem' }} />
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{plat.name}</p>
                                                    <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>${splitAmount}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ROI predictor */}
                            <div style={{ background: 'linear-gradient(145deg, rgba(167, 139, 250, 0.06), rgba(56, 189, 248, 0.06))', border: '1px solid rgba(167, 139, 250, 0.25)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <Zap size={16} color="#A78BFA" />
                                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Predicted 7-day ROI</h4>
                                    {roiLoading && <Loader2 size={14} className="spin" style={{ color: 'var(--text-tertiary)' }} />}
                                </div>
                                {roiPrediction ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Projected Spend</p>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>${(roiPrediction.projectedSpend || 0).toFixed(0)}</p>
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Projected Revenue</p>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-success)' }}>${(roiPrediction.projectedRevenue || 0).toFixed(0)}</p>
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ROI</p>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: roiPrediction.projectedRoi > 0 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>{roiPrediction.projectedRoi != null ? `${(roiPrediction.projectedRoi * 100).toFixed(0)}%` : '—'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Adjust budget — predictions update automatically based on your past campaigns.</p>
                                )}
                                {roiPrediction?.heuristic && (
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>⚠ Estimate (no campaign history yet — predictions improve over time).</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Review & Preview */}
                    {step === 5 && (
                        <div className="fade-in">
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Approve & Launch</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>Review the AI-generated strategy and mockups.</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
                                
                                {/* Configuration Summary */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            Strategy Setup
                                        </h3>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div>
                                                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Targeting & Location</p>
                                                <p style={{ margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <MapPin size={16} color="var(--accent-primary)" />
                                                    {mode === 'simple' || aiLocation ? 'AI Optimized (Best Performing)' : `${locationTarget} (+${radius}mi)`}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Daily Budget Allocation</p>
                                                <p style={{ margin: 0, fontWeight: 500, fontSize: '1.125rem' }}>${budgetAmount} / <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>daily</span></p>
                                            </div>
                                            <div>
                                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active Networks</p>
                                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    {(mode === 'simple' ? ['instagram', 'facebook', 'google'] : selectedPlatforms).map(id => {
                                                        const plat = platformsList.find(p => p.id === id)
                                                        if (!plat) return null
                                                        const Icon = plat.icon
                                                        return (
                                                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: plat.bg, color: plat.color, borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.875rem' }}>
                                                                <Icon size={14} /> {plat.name}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: 'linear-gradient(to right, rgba(16, 185, 129, 0.1), transparent)', borderLeft: '4px solid var(--accent-success)', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', padding: '1.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--text-primary)' }}>AI Auto-Optimization</h4>
                                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Shifts budget towards best creatives daily.</p>
                                            </div>
                                            <div onClick={() => setAutoOptimize(!autoOptimize)} style={{ width: '48px', height: '26px', borderRadius: '13px', background: autoOptimize ? 'var(--accent-success)' : 'var(--bg-tertiary)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: autoOptimize ? '25px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Mock Ad Preview */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Sparkles size={16} color="var(--accent-primary)" />
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>AI Generated Preview</span>
                                        </div>
                                        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #38BDF8, #A78BFA)' }}></div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Your Brand Name</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sponsored</p>
                                                </div>
                                            </div>
                                            
                                            <p style={{ fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                                                Check out our incredible newest release! Designed specifically to help you stand out. 🚀🔥
                                                {productDesc && <span style={{ color: 'var(--text-secondary)' }}> Mentioning: {productDesc.substring(0, 50)}...</span>}
                                            </p>

                                            <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', minHeight: '180px', marginBottom: '1rem' }}>
                                                <ImageIcon size={48} color="var(--text-tertiary)" opacity={0.5} />
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>NEW ARRIVAL</p>
                                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Shop the Premium Collection</p>
                                                </div>
                                                <button onClick={() => window.open('/ad?product=summer-collection', '_blank')} style={{ padding: '0.5rem 1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-primary)' }}>Shop Now</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ad Download & Copy Buttons */}
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <a
                                            href={generatedImageUrl || uploadedImages[0]?.url || '#'}
                                            download={!!(generatedImageUrl || uploadedImages[0])}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-secondary"
                                            style={{
                                                flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.75rem', fontSize: '0.875rem', textDecoration: 'none',
                                                pointerEvents: (generatedImageUrl || uploadedImages[0]) ? 'auto' : 'none',
                                                opacity: (generatedImageUrl || uploadedImages[0]) ? 1 : 0.5,
                                            }}
                                        >
                                            <Download size={16} /> Download Creative
                                        </a>
                                        <button
                                            className="btn-secondary"
                                            onClick={() => {
                                                const text = analysis?.copy
                                                    ? `${analysis.copy.headlines?.[0] || ''}\n\n${analysis.copy.body || ''}\n\n${analysis.copy.cta || ''}`.trim()
                                                    : 'Check out our incredible newest release! Designed specifically to help you stand out. 🚀🔥'
                                                navigator.clipboard.writeText(text)
                                            }}
                                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', fontSize: '0.875rem' }}
                                        >
                                            <Copy size={16} /> Copy Ad Copy
                                        </button>
                                    </div>
                                    {launchError && (
                                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#fca5a5', textAlign: 'center' }}>{launchError}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: Success & Download */}
                    {step === 6 && (
                        <div className="fade-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem 0' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <PartyPopper size={40} />
                            </div>
                            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Campaign Launched!</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '500px', margin: '0 auto 3rem' }}>
                                Your ads have been successfully generated and queued for publishing across {mode === 'simple' ? 3 : selectedPlatforms.length} networks. 
                            </p>

                            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', padding: '2rem', width: '100%', maxWidth: '500px' }}>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Generated Ad Assets</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>You can download the raw AI-generated assets (images, videos, copy) to review or use elsewhere.</p>
                                
                                <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '1rem', fontSize: '1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)' }}>
                                    <Download size={20} style={{ marginRight: '0.5rem' }} /> Download All Assets (.zip)
                                </button>

                                <button 
                                    className="btn-secondary" 
                                    onClick={() => { navigator.clipboard.writeText('Check out our incredible newest release! Designed specifically to help you stand out. 🚀🔥 Shop the Premium Collection now!'); }}
                                    style={{ width: '100%', marginTop: '0.75rem', display: 'flex', justifyContent: 'center', padding: '1rem', fontSize: '1rem', gap: '0.5rem' }}
                                >
                                    <Copy size={18} /> Copy Ad Copy Text
                                </button>
                                
                                <button className="btn-secondary" onClick={() => setStep(1)} style={{ width: '100%', marginTop: '0.75rem', display: 'flex', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}>
                                    Create Another Campaign
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {step < 6 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                        <button 
                            className="btn-secondary" 
                            onClick={prevStep} 
                            style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
                            disabled={isLaunching}
                        >
                            <ChevronLeft size={18} style={{ marginRight: '0.25rem', marginLeft: '-0.25rem' }} /> Back
                        </button>
                        
                        {step < 5 ? (
                            <button className="btn-primary" onClick={nextStep} style={{ background: 'linear-gradient(90deg, #38BDF8, #A78BFA)' }}>
                                Next Step <ChevronRight size={18} style={{ marginLeft: '0.25rem', marginRight: '-0.25rem' }} />
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    className="btn-secondary" 
                                    onClick={prevStep}
                                    disabled={isLaunching}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <MessageSquare size={16} /> Request Changes
                                </button>
                                <button 
                                    className="btn-primary" 
                                    onClick={handleLaunch}
                                    disabled={isLaunching}
                                    style={{ 
                                        paddingLeft: '2rem', 
                                        paddingRight: '2rem', 
                                        background: isLaunching ? '#6EE7B7' : '#10B981', 
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                        opacity: isLaunching ? 0.8 : 1,
                                        cursor: isLaunching ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isLaunching ? (
                                        <><Loader2 size={18} className="spin" style={{ marginRight: '0.5rem' }} /> Launching...</>
                                    ) : (
                                        <><Check size={18} style={{ marginRight: '0.5rem', strokeWidth: 3 }} /> Approve & Launch</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Floating AI Chatbot Assistant triggered by interaction */}
            <Chatbot mode="floating" isOpenTrigger={showChatbot} />
            
            <style>{`
                .fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); } 
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default CreateAd
