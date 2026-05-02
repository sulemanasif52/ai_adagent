import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Wrench } from 'lucide-react'

const initialMessages = [
    { id: 1, text: "Hi! I'm grounded on your real Instagram and campaign data. Ask me things like \"How is my IG doing this week?\", \"What's my best post?\", or \"Show me my latest leads.\"", sender: 'bot' }
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

    const handleSend = async (e) => {
        e.preventDefault()
        const text = inputValue.trim()
        if (!text || isTyping) return

        const userMsg = { id: Date.now(), text, sender: 'user' }
        const botId = Date.now() + 1
        const botMsg = { id: botId, text: '', sender: 'bot', tools: [] }
        setMessages(prev => [...prev, userMsg, botMsg])
        setInputValue('')
        setIsTyping(true)

        // Build the conversation history we send to the server. Include only
        // user/assistant messages with content; skip the initial greeting if
        // we want the model to focus on the new turn (we keep it for context).
        const history = [...messages, userMsg]
            .filter(m => m.text)
            .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))

        try {
            const res = await fetch('/api/chat/completions', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
            })

            if (!res.ok || !res.body) {
                let errMsg = `Chat error (${res.status})`
                try { const data = await res.json(); errMsg = data?.error || errMsg } catch {}
                setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: `⚠ ${errMsg}` } : m))
                setIsTyping(false)
                return
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let accumulated = ''
            let toolsUsed = []

            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || ''
                for (const line of lines) {
                    if (!line.startsWith('data:')) continue
                    const payload = line.slice(5).trim()
                    if (!payload) continue
                    let parsed
                    try { parsed = JSON.parse(payload) } catch { continue }
                    if (parsed.type === 'text') {
                        accumulated += parsed.delta || ''
                        setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: accumulated, tools: toolsUsed } : m))
                    } else if (parsed.type === 'tool_start') {
                        toolsUsed = [...toolsUsed, parsed.name]
                        setMessages(prev => prev.map(m => m.id === botId ? { ...m, tools: toolsUsed } : m))
                    } else if (parsed.type === 'error') {
                        accumulated = (accumulated || '') + `\n⚠ ${parsed.error}`
                        setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: accumulated } : m))
                    }
                }
            }
        } catch (err) {
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: `⚠ ${err.message || 'Connection failed'}` } : m))
        } finally {
            setIsTyping(false)
        }
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
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start', gap: '0.25rem' }}>
                                {msg.sender === 'bot' && msg.tools && msg.tools.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.15rem' }}>
                                        {msg.tools.map((t, i) => (
                                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '999px', background: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA', fontWeight: 600 }}>
                                                <Wrench size={9} /> {t}
                                            </span>
                                        ))}
                                    </div>
                                )}
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
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {msg.text || (isTyping && msg.id === messages[messages.length - 1]?.id ? '…' : '')}
                                </div>
                            </div>
                        ))}
                        {isTyping && messages[messages.length - 1]?.text === '' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '1.25rem', borderBottomLeftRadius: '0' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Thinking…</span>
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
                                placeholder="Ask about your IG, campaigns, leads..."
                                className="chatbot-input"
                                autoComplete="off"
                                spellCheck={false}
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    background: 'transparent',
                                    padding: '0.5rem 1rem',
                                    outline: 'none',
                                    fontSize: '0.875rem',
                                    color: '#ffffff',
                                    WebkitTextFillColor: '#ffffff',
                                    caretColor: '#ffffff',
                                }}
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
                .chatbot-input,
                .chatbot-input:focus,
                .chatbot-input:hover,
                .chatbot-input:active {
                  color: #F8FAFC !important;
                  -webkit-text-fill-color: #F8FAFC !important;
                  caret-color: #F8FAFC;
                }
                .chatbot-input::placeholder { color: #94A3B8 !important; opacity: 0.8 !important; }
                .chatbot-input:-webkit-autofill,
                .chatbot-input:-webkit-autofill:hover,
                .chatbot-input:-webkit-autofill:focus {
                  -webkit-text-fill-color: #F8FAFC !important;
                  -webkit-box-shadow: 0 0 0 1000px var(--bg-primary) inset !important;
                  transition: background-color 9999s ease-in-out 0s;
                }
            `}</style>
        </div>
    )
}

export default Chatbot
