import { useState, useEffect, useRef } from "react";

const RELATIONS = ["causes", "requires", "contradicts", "is_type_of", "precedes", "supports", "refutes", "relates_to"];

const CONCEPT_REGISTRY = {
  "quantum_computing": { label: "Quantum Computing", domain: "physics.quantum" },
  "error_correction": { label: "Error Correction", domain: "physics.quantum" },
  "machine_learning": { label: "Machine Learning", domain: "ai.ml" },
  "neural_network": { label: "Neural Network", domain: "ai.ml" },
  "transformer": { label: "Transformer Architecture", domain: "ai.ml" },
  "attention_mechanism": { label: "Attention Mechanism", domain: "ai.ml" },
  "semantic_search": { label: "Semantic Search", domain: "ai.search" },
  "vector_embedding": { label: "Vector Embedding", domain: "ai.search" },
  "knowledge_graph": { label: "Knowledge Graph", domain: "data.graph" },
  "agent": { label: "AI Agent", domain: "ai.agents" },
  "protocol": { label: "Communication Protocol", domain: "systems.network" },
  "inference": { label: "Model Inference", domain: "ai.ml" },
};

function generateMsgId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function extractConcepts(text) {
  const words = text.toLowerCase().split(/\s+/);
  const found = [];
  for (const [key, val] of Object.entries(CONCEPT_REGISTRY)) {
    const keyWords = key.split('_');
    if (keyWords.every(w => text.toLowerCase().includes(w)) ||
        val.label.toLowerCase().split(' ').some(w => words.includes(w))) {
      found.push({ id: `c${String(found.length + 1).padStart(3, '0')}`, ref: key, weight: +(0.7 + Math.random() * 0.3).toFixed(2) });
    }
  }
  if (found.length === 0) {
    const topWords = words.filter(w => w.length > 4).slice(0, 2);
    topWords.forEach((w, i) => found.push({ id: `c${String(i + 1).padStart(3, '0')}`, ref: w, weight: +(0.5 + Math.random() * 0.3).toFixed(2) }));
  }
  return found.slice(0, 4);
}

function inferRelations(concepts) {
  if (concepts.length < 2) return [];
  const relations = [];
  for (let i = 0; i < Math.min(concepts.length - 1, 3); i++) {
    const rel = RELATIONS[Math.floor(Math.random() * RELATIONS.length)];
    relations.push({
      from: concepts[i].id,
      to: concepts[i + 1].id,
      type: rel,
      strength: +(0.6 + Math.random() * 0.4).toFixed(2)
    });
  }
  return relations;
}

function inferIntent(text) {
  const t = text.toLowerCase();
  if (t.includes('?') || t.startsWith('what') || t.startsWith('how') || t.startsWith('why') || t.startsWith('when')) return 'query';
  if (t.includes('wrong') || t.includes('incorrect') || t.includes('false')) return 'refute';
  if (t.includes('need') || t.includes('want') || t.includes('get')) return 'request';
  if (t.includes('yes') || t.includes('correct') || t.includes('agree')) return 'assert';
  return 'assert';
}

function buildSTPMessage(text, agentId = "agent_london_001") {
  const concepts = extractConcepts(text);
  const relations = inferRelations(concepts);
  const intent = inferIntent(text);
  return {
    stp: "0.1",
    msg_id: generateMsgId(),
    timestamp: Math.floor(Date.now() / 1000),
    from: agentId,
    to: "stp_network",
    intent,
    payload: {
      concepts,
      relations,
      context: {
        recency: "90d",
        confidence_floor: 0.75,
        domain: concepts[0] ? CONCEPT_REGISTRY[concepts[0].ref]?.domain || "general" : "general",
        response_density: "high"
      }
    },
    provenance: {
      source: "user_input",
      observed: new Date().toISOString().split('T')[0],
      confidence: +(0.75 + Math.random() * 0.2).toFixed(2)
    }
  };
}

function renderHuman(msg) {
  const conceptLabels = msg.payload.concepts.map(c =>
    CONCEPT_REGISTRY[c.ref]?.label || c.ref
  );
  const relStrings = msg.payload.relations.map(r => {
    const from = msg.payload.concepts.find(c => c.id === r.from);
    const to = msg.payload.concepts.find(c => c.id === r.to);
    const fromLabel = from ? (CONCEPT_REGISTRY[from.ref]?.label || from.ref) : r.from;
    const toLabel = to ? (CONCEPT_REGISTRY[to.ref]?.label || to.ref) : r.to;
    return `${fromLabel} ${r.type.replace(/_/g, ' ')} ${toLabel} (${Math.round(r.strength * 100)}% confidence)`;
  });

  const intentMap = {
    query: "Querying for information about",
    assert: "Asserting that",
    refute: "Refuting claims about",
    request: "Requesting",
    respond: "Responding with"
  };

  return `[${msg.intent.toUpperCase()}] ${intentMap[msg.intent] || 'Communicating about'}: ${conceptLabels.join(', ')}.${relStrings.length > 0 ? ' Relationships: ' + relStrings.join('; ') + '.' : ''} Domain: ${msg.payload.context.domain}. Confidence floor: ${Math.round(msg.payload.context.confidence_floor * 100)}%. Source: ${msg.provenance.source} (${msg.provenance.observed}).`;
}

const SAMPLE_QUERIES = [
  "How does attention mechanism work in transformers?",
  "What does quantum computing require for error correction?",
  "AI agents need vector embeddings for semantic search",
  "Does machine learning contradict symbolic AI?",
];

export default function STPExplorer() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [humanView, setHumanView] = useState(false);
  const [activeMsg, setActiveMsg] = useState(null);
  const [typing, setTyping] = useState(false);
  const [efficiency, setEfficiency] = useState({ raw: 0, stp: 0 });
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setTyping(true);
    setTimeout(() => {
      const msg = buildSTPMessage(text);
      const rawBytes = new TextEncoder().encode(text).length;
      const stpBytes = new TextEncoder().encode(JSON.stringify(msg.payload)).length;
      setEfficiency({ raw: rawBytes, stp: stpBytes });
      setMessages(prev => [...prev, { msg, original: text, human: renderHuman(msg) }]);
      setActiveMsg(msg);
      setTyping(false);
    }, 600);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const getIntentColor = (intent) => {
    const colors = {
      query: '#00d4ff',
      assert: '#00ff9d',
      refute: '#ff4466',
      request: '#ffaa00',
      respond: '#aa88ff'
    };
    return colors[intent] || '#ffffff';
  };

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      background: '#050810',
      minHeight: '100vh',
      color: '#c8d8e8',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #0d2035',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,20,40,0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#00ff9d',
            boxShadow: '0 0 8px #00ff9d',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: 13, letterSpacing: '0.15em', color: '#00d4ff', fontWeight: 700 }}>STP / 0.1</span>
          <span style={{ fontSize: 11, color: '#3a5a7a', letterSpacing: '0.1em' }}>SEMANTIC TRANSFER PROTOCOL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {efficiency.raw > 0 && (
            <div style={{ fontSize: 11, color: '#3a6a4a' }}>
              <span style={{ color: '#ff6666' }}>{efficiency.raw}b</span>
              <span style={{ color: '#3a5a7a', margin: '0 6px' }}>→</span>
              <span style={{ color: '#00ff9d' }}>{efficiency.stp}b</span>
              <span style={{ color: '#3a5a7a', marginLeft: 4 }}>semantic payload</span>
            </div>
          )}
          <button
            onClick={() => setHumanView(!humanView)}
            style={{
              background: humanView ? 'rgba(0,212,255,0.15)' : 'transparent',
              border: `1px solid ${humanView ? '#00d4ff' : '#0d2035'}`,
              color: humanView ? '#00d4ff' : '#3a5a7a',
              padding: '5px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              letterSpacing: '0.1em',
              transition: 'all 0.2s'
            }}
          >
            {humanView ? 'HUMAN LAYER ON' : 'HUMAN LAYER OFF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Main message stream */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#1a3a5a' }}>
              <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.4 }}>⬡</div>
              <div style={{ fontSize: 13, letterSpacing: '0.1em', marginBottom: 24 }}>AWAITING AGENT INPUT</div>
              <div style={{ fontSize: 11, color: '#0d2035', marginBottom: 16 }}>TRY A SAMPLE:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SAMPLE_QUERIES.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)} style={{
                    background: 'rgba(0,20,40,0.6)',
                    border: '1px solid #0d2035',
                    color: '#3a6a8a',
                    padding: '6px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                    maxWidth: 280,
                    textAlign: 'left'
                  }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((item, i) => (
            <div key={i} onClick={() => setActiveMsg(item.msg)} style={{
              cursor: 'pointer',
              border: `1px solid ${activeMsg?.msg_id === item.msg.msg_id ? '#0d3055' : '#050f1a'}`,
              borderRadius: 6,
              background: activeMsg?.msg_id === item.msg.msg_id ? 'rgba(0,20,50,0.5)' : 'rgba(0,10,20,0.3)',
              padding: '12px 16px',
              transition: 'all 0.2s'
            }}>
              {/* Original input */}
              <div style={{ fontSize: 11, color: '#1a4a6a', marginBottom: 8, letterSpacing: '0.05em' }}>
                RAW INPUT → <span style={{ color: '#3a6a8a' }}>{item.original}</span>
              </div>

              {humanView ? (
                <div style={{ fontSize: 12, color: '#7ab8d8', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>
                  {item.human}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Intent badge */}
                  <div style={{
                    border: `1px solid ${getIntentColor(item.msg.intent)}22`,
                    background: `${getIntentColor(item.msg.intent)}11`,
                    color: getIntentColor(item.msg.intent),
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {item.msg.intent.toUpperCase()}
                  </div>

                  {/* Concepts */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {item.msg.payload.concepts.map((c, ci) => (
                      <div key={ci} style={{
                        background: 'rgba(0,30,60,0.4)',
                        border: '1px solid #0d2540',
                        borderRadius: 3,
                        padding: '2px 8px',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span style={{ color: '#00d4ff', opacity: 0.5, fontSize: 9 }}>{c.id}</span>
                        <span style={{ color: '#8ac8e8' }}>{c.ref}</span>
                        <span style={{
                          width: 30, height: 3,
                          background: `linear-gradient(to right, #00d4ff ${c.weight * 100}%, #0d2035 0)`,
                          borderRadius: 2,
                          display: 'inline-block'
                        }} />
                      </div>
                    ))}
                  </div>

                  {/* Relations */}
                  {item.msg.payload.relations.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {item.msg.payload.relations.map((r, ri) => (
                        <div key={ri} style={{
                          fontSize: 10,
                          color: '#3a7a5a',
                          border: '1px solid #0d2a1a',
                          borderRadius: 3,
                          padding: '2px 7px',
                          letterSpacing: '0.05em'
                        }}>
                          {r.from} <span style={{ color: '#00ff9d', opacity: 0.7 }}>{r.type}</span> {r.to}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confidence */}
                  <div style={{ fontSize: 10, color: '#1a4a3a', marginLeft: 'auto', flexShrink: 0 }}>
                    ↑{Math.round(item.msg.provenance.confidence * 100)}%
                  </div>
                </div>
              )}
            </div>
          ))}

          {typing && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 16px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#00d4ff',
                  animation: `bounce 1s ${i * 0.2}s infinite`,
                  opacity: 0.5
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Detail panel */}
        {activeMsg && (
          <div style={{
            width: 320,
            borderLeft: '1px solid #0d2035',
            background: 'rgba(0,10,20,0.4)',
            overflowY: 'auto',
            padding: '16px',
            fontSize: 11
          }}>
            <div style={{ color: '#1a4a6a', letterSpacing: '0.15em', marginBottom: 12, fontSize: 10 }}>
              PACKET INSPECTOR
            </div>
            <pre style={{
              color: '#3a6a8a',
              fontSize: 10,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
              fontFamily: 'inherit'
            }}>
              {JSON.stringify(activeMsg, null, 2)
                .replace(/"([^"]+)":/g, (_, k) => `"<span style="color:#00d4ff">${k}</span>":`)
              }
            </pre>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid #0d2035',
        padding: '16px 24px',
        background: 'rgba(0,10,20,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#00d4ff', fontSize: 12, opacity: 0.5, pointerEvents: 'none'
            }}>›</div>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="enter natural language — watch it become STP..."
              style={{
                width: '100%',
                background: 'rgba(0,20,40,0.5)',
                border: '1px solid #0d2540',
                borderRadius: 6,
                padding: '10px 12px 10px 28px',
                color: '#8ac8e8',
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none',
                letterSpacing: '0.05em',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? 'rgba(0,212,255,0.15)' : 'transparent',
              border: `1px solid ${input.trim() ? '#00d4ff' : '#0d2035'}`,
              color: input.trim() ? '#00d4ff' : '#1a3a5a',
              padding: '10px 16px',
              borderRadius: 6,
              cursor: input.trim() ? 'pointer' : 'default',
              fontSize: 11,
              letterSpacing: '0.1em',
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            TRANSMIT
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#0d2035', marginTop: 8, letterSpacing: '0.08em' }}>
          ENTER to transmit · toggle HUMAN LAYER to see translation · click any message to inspect raw packet
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #0d2035; border-radius: 2px; }
        input::placeholder { color: #1a3a5a; }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  );
}
