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
  // Updated Button Styles for Better UI
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
    // Gradient for primary button
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
    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    const type = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
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
            <div style={{ position: 'absolute', bottom: '30px', display: 'flex', gap: '15px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid #333' }}>
              <button style={styles.button(isRecording ? 'danger' : 'secondary')} onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? <StopCircle size={20} color="#fff"/> : <Video size={20} color="#fff"/>}
                {isRecording ? "Stop Rec" : "Record"}
              </button>
              <button style={styles.button('secondary')} onClick={stopShare}>
                <X size={20} color="#fff" /> Stop Share
              </button>
            </div>
          </>
        )}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', zIndex: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <Loader2 size={50} className="animate-spin" color="#3b82f6" />
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>Analyzing...</span>
            </div>
          </div>
        )}
      </div>

      <div style={styles.colRight}>
        <div style={{ padding: '20px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18181b' }}>
          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} fill="#eab308" color="#eab308" /> Live Assistant
          </span>
          <button onClick={() => setMessages([])} title="Clear Chat" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} color="#71717a"/></button>
        </div>

        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#52525b', marginTop: '50px' }}>
              <Cpu size={50} style={{ opacity: 0.3, margin: '0 auto 20px' }} color="#71717a" />
              <p>No analysis yet.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={styles.chatBubble(m.role)}>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '6px', textTransform: 'uppercase' }}>
                {m.role === 'ai' ? 'AI Assistant' : 'You'} • {m.time}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* UPDATED INPUT AREA */}
        <div style={styles.inputContainer}>
          <input 
            style={styles.input}
            placeholder="Ask about the screen..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyzeScreen()}
          />
          <button style={{ ...styles.button('primary'), padding: '14px 20px', borderRadius: '12px' }} onClick={analyzeScreen} disabled={loading}>
            {loading ? <Loader2 size={20} className="animate-spin" color="#fff"/> : <Send size={20} color="#fff" />}
          </button>
        </div>
      </div>
    </div>
  );

  const renderLibrary = () => (
    <div style={{ padding: '40px', height: '100%', overflowY: 'auto', backgroundColor: '#09090b' }}>
      {playbackSession ? (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => setPlaybackSession(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', padding: 0 }}>
            <ArrowLeft size={20} color="#a1a1aa" /> Back to Library
          </button>
          
          <div style={{ flex: 1, display: 'flex', gap: '30px', overflow: 'hidden' }}>
            <div style={{ flex: 2, backgroundColor: '#000', borderRadius: '16px', border: '1px solid #27272a', overflow: 'hidden' }}>
              {/* Force re-render with key */}
              <VideoPlayer key={playbackSession.id} blob={playbackSession.blob} />
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: '350px' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #27272a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '16px' }}>
                <FileText size={20} color="#3b82f6" /> Recorded Chat Log
              </div>
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                {playbackSession.chat.length === 0 ? (
                  <p style={{ color: '#52525b', textAlign: 'center', marginTop: '30px' }}>No chat recorded in this session.</p>
                ) : (
                  playbackSession.chat.map((m, i) => (
                    <div key={i} style={styles.chatBubble(m.role)}>
                      <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '6px' }}>{m.role.toUpperCase()}</div>
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
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '15px', color: '#fff' }}>
            <Database size={32} color="#3b82f6" /> Recorded Sessions
          </h2>
          
          {sessions.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', border: '2px dashed #27272a', borderRadius: '20px', color: '#52525b' }}>
              <Video size={60} style={{ opacity: 0.5, marginBottom: '20px' }} color="#52525b" />
              <p style={{ fontSize: '18px' }}>Your recorded sessions will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
              {sessions.map(s => (
                <div key={s.id} onClick={() => setPlaybackSession(s)} style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}>
                  <div style={{ height: '180px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={60} color="#ffffff40" />
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{s.date}</div>
                    <div style={{ fontSize: '14px', color: '#a1a1aa', marginTop: '6px' }}>{s.chat.length} chat messages</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); dbOp('readwrite', store => store.delete(s.id)).then(loadLibrary); }}
                      style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}
                    >
                      <Trash2 size={20} color="#ef4444" />
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
      <div style={styles.sidebar}>
        <div style={{ width: '56px', height: '56px', backgroundColor: '#2563eb', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '20px' }}>
          <Cpu size={32} color="#fff" />
        </div>
        
        <button style={styles.navBtn(activeTab === 'home')} onClick={() => setActiveTab('home')} title="Workspace">
          <Layout size={32} color={activeTab === 'home' ? '#fff' : '#a1a1aa'} />
        </button>
        <button style={styles.navBtn(activeTab === 'library')} onClick={() => { setActiveTab('library'); loadLibrary(); }} title="Library">
          <Database size={32} color={activeTab === 'library' ? '#fff' : '#a1a1aa'} />
        </button>
        <button style={styles.navBtn(activeTab === 'settings')} onClick={() => setActiveTab('settings')} title="Settings">
          <Settings size={32} color={activeTab === 'settings' ? '#fff' : '#a1a1aa'} />
        </button>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '0.5px' }}>
            {activeTab === 'home' ? 'LIVE WORKSPACE' : activeTab === 'library' ? 'LIBRARY' : 'SETTINGS'}
          </h2>
          {isRecording && (
            <div style={{ padding: '8px 16px', borderRadius: '30px', backgroundColor: '#dc262620', color: '#ef4444', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #dc262650' }}>
              <div style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%' }} className="animate-pulse" />
              RECORDING
            </div>
          )}
        </div>

        {activeTab === 'home' && renderHome()}
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'settings' && (
          <div style={{ padding: '50px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '24px', marginBottom: '30px', fontWeight: 'bold' }}>System Configuration</h3>
            <div style={{ backgroundColor: '#18181b', padding: '30px', borderRadius: '20px', border: '1px solid #27272a' }}>
              <label style={{ display: 'block', marginBottom: '15px', fontSize: '15px', color: '#a1a1aa' }}>Gemini API Key</label>
              <input 
                type="password" 
                style={{ ...styles.input, width: '100%', marginBottom: '30px', boxSizing: 'border-box' }} 
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); localStorage.setItem('gemini_api_key', e.target.value); }}
                placeholder="Paste your key here..."
              />
              <button style={{ ...styles.button('primary'), width: '100%', justifyContent: 'center', fontSize: '16px', padding: '14px' }} onClick={() => setActiveTab('home')}>
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