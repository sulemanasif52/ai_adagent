import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'

const initialMessages = [
    { id: 1, text: "Hi there! 👋 I'm your AI Market Pro assistant. Need help setting up your campaign or choosing the right platforms?", sender: 'bot' }
]

const Chatbot = ({ mode = 'floating', isOpenTrigger = false }) => {
    // If embedded, it is forced open
    const [isOpen, setIsOpen] = useState(mode === 'embedded')
    const [messages, setMessages] = useState(initialMessages)
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const isFloating = mode === 'floating'

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    useEffect(() => {
        if (!isFloating) setIsOpen(true)
    }, [isFloating])

    useEffect(() => {
        if (isOpenTrigger && isFloating) setIsOpen(true)
    }, [isOpenTrigger, isFloating])

    const handleSend = (e) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        // 1. Add user message
        const newUserMsg = { id: Date.now(), text: inputValue, sender: 'user' }
        setMessages(prev => [...prev, newUserMsg])
        setInputValue('')
        setIsTyping(true)

        // 2. Mock Bot Response based on context
        setTimeout(() => {
            const botResponseText = generateBotResponse(newUserMsg.text.toLowerCase())
            const newBotMsg = { id: Date.now() + 1, text: botResponseText, sender: 'bot' }
            setMessages(prev => [...prev, newBotMsg])
            setIsTyping(false)
            scrollToBottom()
        }, 1200)
    }

    const generateBotResponse = (prompt) => {
        if (prompt.includes('budget') || prompt.includes('spend')) return 'We recommend a minimum daily budget of $20 per platform to give our AI enough data to optimize efficiently.'
        if (prompt.includes('image') || prompt.includes('video') || prompt.includes('size')) return 'For best results, upload standard feed sizes: 1080x1080 (1:1) for FB/Insta images, or 1080x1920 (9:16) for TikToks and Reels.'
        if (prompt.includes('target') || prompt.includes('location')) return 'If you choose "AI Location", we will automatically target regions with historically high engagement for your industry. Or, you can manually select a specific city and set a radius!'
        if (prompt.includes('simple')) return 'In Simple Mode, you just give us your product image, and our AI automatically handles all the targeting and network placements behind the scenes!'
        if (prompt.includes('creative') || prompt.includes('ad')) return 'Our system will digest your product description and automatically generate 3-5 variations of engaging copy, plus create stunning visual mockups!'
        return "I can definitely help with that! If you need specific instructions on setting up your ad, try asking me about budgets, locations, or asset sizes."
    }

    const containerStyle = isFloating ? {
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000
    } : {
        height: '100%', display: 'flex', flexDirection: 'column'
    }

    const windowStyle = isFloating ? {
        width: '350px',
        height: '500px',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        borderRadius: 'var(--radius-xl)'
    } : {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)'
    }

    return (
        <div style={containerStyle}>

            {/* The Chat Window */}
            {isOpen && (
                <div className="card shadow-lg" style={windowStyle}>
                    {/* Header */}
                    <div style={{ background: 'linear-gradient(135deg, #38BDF8, #A78BFA)', padding: '1.25rem', color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.4rem', borderRadius: '50%' }}>
                                <Bot size={20} color="white" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Campaign Assistant</h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>AI Market Pro Support</p>
                            </div>
                        </div>
                        {isFloating && (
                            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}>
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)' }}>
                        {messages.map(msg => (
                            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '0.85rem 1rem',
                                    borderRadius: '1.25rem',
                                    borderBottomRightRadius: msg.sender === 'user' ? '0' : '1.25rem',
                                    borderBottomLeftRadius: msg.sender === 'bot' ? '0' : '1.25rem',
                                    background: msg.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                    color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.5
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '1.25rem', borderBottomLeftRadius: '0' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>AI is typing...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                placeholder="Ask about targeting, sizes..."
                                style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.5rem 1rem', outline: 'none', fontSize: '0.875rem' }}
                            />
                            <button type="submit" disabled={isTyping} style={{ background: isTyping ? 'var(--text-secondary)' : 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isTyping ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                                <Send size={16} style={{ marginLeft: '2px' }} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bubble Button (Only if floating and closed) */}
            {isFloating && !isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '30px',
                        background: 'linear-gradient(135deg, #38BDF8, #A78BFA)',
                        color: '#0F172A',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <MessageCircle size={28} />
                </button>
            )}

            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}

export default Chatbot
