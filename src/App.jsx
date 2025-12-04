import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Monitor, Zap, Video, StopCircle, Trash2, Database, Settings, Play, ArrowLeft, Loader2, Cpu, Layout, FileText, X, Send } from 'lucide-react';

// --- STYLES ---
const styles = {
  app: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#09090b',
    color: '#e4e4e7',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box'
  },
  sidebar: {
    width: '90px',
    backgroundColor: '#18181b',
    borderRight: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 0',
    gap: '30px',
    zIndex: 50,
    flexShrink: 0
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000'
  },
  header: {
    height: '70px',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    justifyContent: 'space-between',
    backgroundColor: '#09090b',
    flexShrink: 0
  },
  content: {
    flex: 1,
    display: 'flex',
    padding: '24px',
    gap: '24px',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  colLeft: {
    flex: 3,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#000',
    borderRadius: '16px',
    border: '1px solid #27272a',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  colRight: {
    flex: 1,
    minWidth: '350px',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#18181b',
    borderRadius: '16px',
    border: '1px solid #27272a',
    overflow: 'hidden',
  },
  navBtn: (isActive) => ({
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: isActive ? '#2563eb' : 'transparent',
    border: 'none',
    outline: 'none',
    transition: 'all 0.2s ease',
  }),
  button: (variant = 'primary') => ({
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '600',
    fontSize: '14px',
    background: variant === 'danger' ? '#dc2626' : variant === 'secondary' ? '#27272a' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#fff',
    transition: 'transform 0.1s, box-shadow 0.2s',
    boxShadow: variant === 'primary' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
  }),
  chatBubble: (role) => ({
    padding: '14px 18px',
    borderRadius: '14px',
    marginBottom: '14px',
    fontSize: '14px',
    lineHeight: '1.6',
    backgroundColor: role === 'user' ? '#1d4ed8' : '#27272a',
    color: '#fff',
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    marginLeft: role === 'user' ? 'auto' : '0',
    marginRight: role === 'user' ? '0' : 'auto',
    borderBottomRightRadius: role === 'user' ? '2px' : '14px',
    borderTopLeftRadius: role === 'ai' ? '2px' : '14px',
  }),
  inputContainer: {
    padding: '20px', 
    borderTop: '1px solid #27272a', 
    backgroundColor: '#18181b',
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    padding: '14px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  }
};

// --- DATABASE HELPERS ---
const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open('ScreenAppDB', 1);
  req.onupgradeneeded = (e) => e.target.result.createObjectStore('sessions', { keyPath: 'id' });
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror = (e) => reject(e);
});

const dbOp = async (mode, fn) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', mode);
    const req = fn(tx.objectStore('sessions'));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// --- ROBUST VIDEO PLAYER ---
const VideoPlayer = ({ blob }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (videoRef.current && blob) {
      // Create a fresh URL for every new blob
      const url = URL.createObjectURL(blob);
      videoRef.current.src = url;
      videoRef.current.load(); // Force browser to acknowledge new source
      videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));

      // Cleanup
      return () => URL.revokeObjectURL(url);
    }
  }, [blob]);

  return (
    <video 
      ref={videoRef}
      controls 
      style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }} 
    />
  );
};

const ScreenAssistant = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  
  const messagesRef = useRef([]); 
  const videoRef = useRef(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const messagesEndRef = useRef(null);

  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [sessions, setSessions] = useState([]);
  const [playbackSession, setPlaybackSession] = useState(null);

  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadLibrary();
  }, []);

  useEffect(() => {
    if (stream && videoRef.current && activeTab === 'home') {
      videoRef.current.srcObject = stream;
    }
  }, [stream, activeTab]);

  const loadLibrary = () => {
    dbOp('readonly', store => store.getAll()).then(res => setSessions(res.reverse()));
  };

  const startShare = async () => {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
      setStream(s);
      s.getVideoTracks()[0].onended = stopShare;
    } catch (e) { console.error("Share cancelled"); }
  };

  const stopShare = () => {
    if (isRecording) stopRecording();
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const startRecording = () => {
    if (!stream) return;
    chunks.current = [];
    // More robust MIME type checking
    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    let type = '';
    for (const t of mimeTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
            type = t;
            break;
        }
    }
    
    const recorder = new MediaRecorder(stream, { mimeType: type });
    
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
    
    recorder.onstop = async () => {
      const blob = new Blob(chunks.current, { type: type || 'video/webm' });
      const finalChat = [...messagesRef.current];
      
      const session = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        blob: blob,
        chat: finalChat
      };
      
      await dbOp('readwrite', store => store.add(session));
      loadLibrary();
      alert(`Recording saved! ${finalChat.length} messages captured.`);
      setIsRecording(false);
    };

    recorder.start();
    setIsRecording(true);
    mediaRecorder.current = recorder;
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) mediaRecorder.current.stop();
  };

  const analyzeScreen = async () => {
    if (!apiKey) return alert("Please set API Key in Settings");
    if (!stream) return alert("Please start screen share");
    
    setLoading(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

      const userMsg = { role: 'user', text: prompt || "Analyze this screen.", time: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, userMsg]);
      setPrompt('');

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMsg.text }, { inlineData: { mimeType: "image/jpeg", data: base64 } }] }]
        })
      });

      const data = await res.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error reading screen.";
      
      setMessages(prev => [...prev, { role: 'ai', text: aiText, time: new Date().toLocaleTimeString() }]);

    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error: " + e.message, time: new Date().toLocaleTimeString() }]);
    }
    setLoading(false);
  };

  // --- VIEWS ---

  const renderHome = () => (
    <div style={styles.content}>
      {/* Video Canvas */}
      <div style={styles.colLeft}>
        {!stream ? (
          <div style={{ textAlign: 'center', color: '#52525b' }}>
            <Monitor size={80} color="#52525b" style={{ marginBottom: '20px' }} />
            <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '10px' }}>Ready to Analyze</h2>
            <p style={{ marginBottom: '30px' }}>Share your screen to begin tracking and analysis.</p>
            <button style={styles.button('primary')} onClick={startShare}>
              <Monitor size={20} color="#fff" /> Start Sharing
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            
            {/* Overlay Controls */}
            <div style={{ position: 'absolute', bottom: '32px', display: 'flex', gap: '12px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid #27272a' }}>
              <button style={styles.button(isRecording ? 'danger' : 'secondary')} onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? <StopCircle size={18} color="#fff"/> : <Video size={18} color="#fff"/>}
                {isRecording ? "Stop Recording" : "Record Session"}
              </button>
              <button style={styles.button('secondary')} onClick={stopShare}>
                <X size={18} color="#fff" /> Stop Share
              </button>
            </div>
          </>
        )}
        
        {loading && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', backdropFilter: 'blur(2px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Loader2 size={48} className="animate-spin" color="#3b82f6" />
              <span style={{ fontWeight: '600', color: '#fff' }}>Analyzing Visual Data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div style={styles.colRight}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18181b' }}>
          <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <Zap size={16} fill="#eab308" color="#eab308" /> Live Analysis
          </span>
          <button onClick={() => setMessages([])} title="Clear" style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}><Trash2 size={16} color="#71717a" /></button>
        </div>

        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#52525b', marginTop: '60px' }}>
              <Cpu size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} color="#71717a" />
              <p>No analysis yet.</p>
              <p style={{ fontSize: '12px' }}>Click "Analyze" to read the screen.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={styles.chatBubble(m.role)}>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {m.role === 'ai' ? 'AI Assistant' : 'You'} • {m.time}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <input 
            style={styles.input}
            placeholder="Ask about the screen..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyzeScreen()}
          />
          <button style={{ ...styles.button('primary'), padding: '12px 16px' }} onClick={analyzeScreen} disabled={loading}>
            {loading ? <Loader2 size={20} className="animate-spin" color="#fff"/> : <Send size={20} color="#fff" />}
          </button>
        </div>
      </div>
    </div>
  );

  const renderLibrary = () => (
    <div style={{ padding: '32px', height: '100%', overflowY: 'auto', backgroundColor: '#09090b' }}>
      {playbackSession ? (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button onClick={() => setPlaybackSession(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: 0 }}>
            <ArrowLeft size={16} color="#a1a1aa" /> Back to Library
          </button>
          
          <div style={{ flex: 1, display: 'flex', gap: '24px', overflow: 'hidden' }}>
            <div style={{ flex: 2, backgroundColor: '#000', borderRadius: '16px', border: '1px solid #27272a', overflow: 'hidden' }}>
              <VideoPlayer blob={playbackSession.blob} />
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: '300px' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #27272a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <FileText size={16} color="#3b82f6" /> Recorded Chat
              </div>
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                {playbackSession.chat.length === 0 ? (
                  <p style={{ color: '#52525b', textAlign: 'center', marginTop: '20px' }}>No chat recorded in this session.</p>
                ) : (
                  playbackSession.chat.map((m, i) => (
                    <div key={i} style={styles.chatBubble(m.role)}>
                      <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>{m.role.toUpperCase()}</div>
                      <div>{m.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
            <Database size={24} color="#3b82f6" /> Recorded Sessions
          </h2>
          
          {sessions.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center', border: '2px dashed #27272a', borderRadius: '16px', color: '#52525b' }}>
              <Video size={48} style={{ opacity: 0.5, marginBottom: '16px' }} color="#52525b" />
              <p>No recordings yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {sessions.map(s => (
                <div key={s.id} onClick={() => setPlaybackSession(s)} style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}>
                  <div style={{ height: '160px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={48} color="#ffffff40" />
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{s.date}</div>
                    <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>{s.chat.length} messages</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); dbOp('readwrite', store => store.delete(s.id)).then(loadLibrary); }}
                      style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '8px', padding: '8px', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={{ width: '56px', height: '56px', backgroundColor: '#2563eb', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '20px' }}>
          <Cpu size={32} color="#fff" />
        </div>
        
        {/* ICONS WITH EXPLICIT COLOR PROPS TO FORCE VISIBILITY */}
        <button style={styles.navBtn(activeTab === 'home')} onClick={() => setActiveTab('home')} title="Workspace">
          <Layout size={32} color={activeTab === 'home' ? '#fff' : '#71717a'} />
        </button>
        <button style={styles.navBtn(activeTab === 'library')} onClick={() => { setActiveTab('library'); loadLibrary(); }} title="Library">
          <Database size={32} color={activeTab === 'library' ? '#fff' : '#71717a'} />
        </button>
        <button style={styles.navBtn(activeTab === 'settings')} onClick={() => setActiveTab('settings')} title="Settings">
          <Settings size={32} color={activeTab === 'settings' ? '#fff' : '#71717a'} />
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <div style={styles.header}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '0.5px' }}>
            {activeTab === 'home' ? 'LIVE WORKSPACE' : activeTab === 'library' ? 'LIBRARY' : 'SETTINGS'}
          </h2>
          {isRecording && (
            <div style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#dc262620', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #dc262650' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }} className="animate-pulse" />
              RECORDING
            </div>
          )}
        </div>

        {activeTab === 'home' && renderHome()}
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'settings' && (
          <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>System Configuration</h3>
            <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '16px', border: '1px solid #27272a' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#a1a1aa' }}>Gemini API Key</label>
              <input 
                type="password" 
                style={{ ...styles.input, width: '100%', marginBottom: '24px', boxSizing: 'border-box' }} 
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); localStorage.setItem('gemini_api_key', e.target.value); }}
                placeholder="Paste your key here..."
              />
              <button style={{ ...styles.button('primary'), width: '100%', justifyContent: 'center' }} onClick={() => setActiveTab('home')}>
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenAssistant;