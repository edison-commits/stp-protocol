import { useState, useEffect, useRef, useCallback } from "react";

// ─── STP CORE ───────────────────────────────────────────────────────────────

const RELATIONS = ["causes","requires","contradicts","is_type_of","precedes","supports","refutes","relates_to"];

const CONCEPT_REGISTRY = {
  quantum_computing:    { label: "Quantum Computing",       domain: "physics.quantum" },
  error_correction:     { label: "Error Correction",        domain: "physics.quantum" },
  machine_learning:     { label: "Machine Learning",        domain: "ai.ml" },
  neural_network:       { label: "Neural Network",          domain: "ai.ml" },
  transformer:          { label: "Transformer Architecture",domain: "ai.ml" },
  attention_mechanism:  { label: "Attention Mechanism",     domain: "ai.ml" },
  semantic_search:      { label: "Semantic Search",         domain: "ai.search" },
  vector_embedding:     { label: "Vector Embedding",        domain: "ai.search" },
  knowledge_graph:      { label: "Knowledge Graph",         domain: "data.graph" },
  agent:                { label: "AI Agent",                domain: "ai.agents" },
  protocol:             { label: "Communication Protocol",  domain: "systems.network" },
  inference:            { label: "Model Inference",         domain: "ai.ml" },
  reasoning:            { label: "Chain of Thought",        domain: "ai.ml" },
  memory:               { label: "Agent Memory",            domain: "ai.agents" },
  retrieval:            { label: "Retrieval System",        domain: "ai.search" },
};

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16)});

function extractConcepts(text) {
  const found = [];
  for (const [key, val] of Object.entries(CONCEPT_REGISTRY)) {
    const keyWords = key.split('_');
    if (keyWords.every(w => text.toLowerCase().includes(w)) ||
        val.label.toLowerCase().split(' ').some(w => text.toLowerCase().includes(w))) {
      found.push({ id: `c${String(found.length+1).padStart(3,'0')}`, ref: key, weight: +(0.7+Math.random()*0.3).toFixed(2) });
    }
  }
  if (found.length === 0) {
    const words = text.toLowerCase().split(/\s+/).filter(w=>w.length>4);
    const keys = Object.keys(CONCEPT_REGISTRY);
    const pick = keys[Math.floor(Math.random()*keys.length)];
    found.push({ id: 'c001', ref: pick, weight: +(0.5+Math.random()*0.3).toFixed(2) });
  }
  return found.slice(0,4);
}

function inferRelations(concepts) {
  const rels = [];
  for (let i=0;i<Math.min(concepts.length-1,3);i++) {
    rels.push({ from:concepts[i].id, to:concepts[i+1].id, type:RELATIONS[Math.floor(Math.random()*RELATIONS.length)], strength:+(0.65+Math.random()*0.35).toFixed(2) });
  }
  return rels;
}

function buildPacket(from, to, intent, text, replyTo = null) {
  const concepts = extractConcepts(text);
  return {
    stp: "0.1",
    msg_id: uuid(),
    reply_to: replyTo,
    timestamp: Date.now(),
    from,
    to,
    intent,
    payload: {
      concepts,
      relations: inferRelations(concepts),
      context: {
        recency: "90d",
        confidence_floor: 0.75,
        domain: CONCEPT_REGISTRY[concepts[0]?.ref]?.domain || "general",
      }
    },
    provenance: {
      source: from,
      observed: new Date().toISOString().split('T')[0],
      confidence: +(0.75+Math.random()*0.2).toFixed(2)
    }
  };
}

function renderHuman(packet) {
  const conceptLabels = packet.payload.concepts.map(c => CONCEPT_REGISTRY[c.ref]?.label || c.ref);
  const intentMap = { query:"querying", assert:"asserting", refute:"refuting", request:"requesting", respond:"responding with" };
  const rels = packet.payload.relations.map(r => {
    const f = packet.payload.concepts.find(c=>c.id===r.from);
    const t = packet.payload.concepts.find(c=>c.id===r.to);
    return `${CONCEPT_REGISTRY[f?.ref]?.label||f?.ref} ${r.type.replace(/_/g,' ')} ${CONCEPT_REGISTRY[t?.ref]?.label||t?.ref}`;
  });
  return `Agent ${packet.from} is ${intentMap[packet.intent]||packet.intent}: ${conceptLabels.join(', ')}${rels.length?'. '+rels.join('; '):''}. Confidence: ${Math.round(packet.provenance.confidence*100)}%.`;
}

// ─── AGENT BRAIN ─────────────────────────────────────────────────────────────

const AGENT_A_TOPICS = [
  "How does attention mechanism work in transformer models?",
  "Vector embeddings enable semantic search through meaning space",
  "Agent memory requires efficient retrieval systems",
  "Reasoning chains support knowledge graph construction",
  "Machine learning inference needs error correction protocols",
];

const AGENT_B_RESPONSES = {
  query:   ["transformer requires attention mechanism","attention mechanism causes vector embedding","neural network supports reasoning"],
  assert:  ["machine learning relates_to inference","knowledge graph supports retrieval","agent requires memory"],
  refute:  ["protocol contradicts assumption","reasoning refutes prior claim","inference requires validation"],
  request: ["retrieval supports semantic search","memory requires indexing","agent relates_to protocol"],
  respond: ["knowledge graph causes inference","transformer supports reasoning","vector embedding enables retrieval"],
};

function agentBReply(incomingPacket) {
  const responses = AGENT_B_RESPONSES[incomingPacket.intent] || AGENT_B_RESPONSES.respond;
  const picked = responses[Math.floor(Math.random()*responses.length)];
  const replyIntent = incomingPacket.intent === 'query' ? 'respond' :
                      incomingPacket.intent === 'assert' ? 'assert' :
                      incomingPacket.intent === 'refute' ? 'refute' : 'respond';
  return buildPacket("AGENT_B", "AGENT_A", replyIntent, picked, incomingPacket.msg_id);
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const INTENT_COLORS = {
  query:'#00d4ff', assert:'#00ff9d', refute:'#ff4466',
  request:'#ffaa00', respond:'#aa88ff'
};

const AgentTag = ({id, active}) => (
  <div style={{
    display:'flex', alignItems:'center', gap:8,
    padding:'6px 14px',
    background: active ? 'rgba(0,212,255,0.08)' : 'rgba(0,10,20,0.4)',
    border:`1px solid ${active ? '#00d4ff33' : '#0d2035'}`,
    borderRadius:6, fontSize:11, letterSpacing:'0.12em',
    transition:'all 0.3s'
  }}>
    <div style={{
      width:7,height:7,borderRadius:'50%',
      background: active ? '#00ff9d' : '#1a3a4a',
      boxShadow: active ? '0 0 6px #00ff9d' : 'none',
      transition:'all 0.3s'
    }}/>
    <span style={{color: active ? '#8ae8c8' : '#2a4a6a', fontWeight:700}}>{id}</span>
  </div>
);

function PacketBubble({packet, side, humanView, onClick, selected}) {
  const isLeft = side === 'left';
  const color = INTENT_COLORS[packet.intent] || '#ffffff';

  return (
    <div
      onClick={onClick}
      style={{
        display:'flex',
        flexDirection:'column',
        alignItems: isLeft ? 'flex-start' : 'flex-end',
        cursor:'pointer',
        padding:'4px 0'
      }}
    >
      <div style={{
        maxWidth:'75%',
        background: selected ? 'rgba(0,20,50,0.7)' : 'rgba(0,10,25,0.5)',
        border:`1px solid ${selected ? color+'44' : '#0d2035'}`,
        borderRadius: isLeft ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
        padding:'10px 14px',
        transition:'all 0.2s',
        position:'relative'
      }}>
        {/* Intent */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          marginBottom:8
        }}>
          <div style={{
            background:`${color}18`, border:`1px solid ${color}33`,
            color, padding:'1px 7px', borderRadius:3,
            fontSize:9, letterSpacing:'0.15em', fontWeight:700
          }}>
            {packet.intent.toUpperCase()}
          </div>
          {packet.reply_to && (
            <div style={{fontSize:9, color:'#1a3a5a', letterSpacing:'0.08em'}}>
              ↩ REPLY
            </div>
          )}
        </div>

        {humanView ? (
          <div style={{fontSize:11, color:'#7ab8d8', lineHeight:1.7, fontFamily:'Georgia,serif'}}>
            {renderHuman(packet)}
          </div>
        ) : (
          <>
            {/* Concepts */}
            <div style={{display:'flex', flexWrap:'wrap', gap:5, marginBottom:6}}>
              {packet.payload.concepts.map((c,i)=>(
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:5,
                  background:'rgba(0,30,60,0.5)', border:'1px solid #0d2540',
                  borderRadius:3, padding:'2px 8px', fontSize:10
                }}>
                  <span style={{color:'#00d4ff', opacity:0.4, fontSize:9}}>{c.id}</span>
                  <span style={{color:'#8ac8e8'}}>{c.ref}</span>
                  <div style={{
                    width:24,height:2,
                    background:`linear-gradient(to right,${color} ${c.weight*100}%,#0d2035 0)`,
                    borderRadius:1
                  }}/>
                </div>
              ))}
            </div>

            {/* Relations */}
            {packet.payload.relations.length > 0 && (
              <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                {packet.payload.relations.map((r,i)=>(
                  <div key={i} style={{
                    fontSize:9, color:'#2a6a4a',
                    border:'1px solid #0d2a1a', borderRadius:3,
                    padding:'1px 6px', letterSpacing:'0.05em'
                  }}>
                    {r.from} <span style={{color:'#00ff9d',opacity:0.6}}>{r.type}</span> {r.to}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{
          marginTop:6, fontSize:9, color:'#1a3a5a',
          display:'flex', gap:10, justifyContent: isLeft ? 'flex-start' : 'flex-end'
        }}>
          <span>{packet.from}</span>
          <span>↑{Math.round(packet.provenance.confidence*100)}%</span>
          <span>{packet.payload.context.domain}</span>
        </div>
      </div>
    </div>
  );
}

export default function STPAgents() {
  const [packets, setPackets] = useState([]);
  const [running, setRunning] = useState(false);
  const [humanView, setHumanView] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeAgent, setActiveAgent] = useState(null);
  const [speed, setSpeed] = useState(1800);
  const [topicIdx, setTopicIdx] = useState(0);
  const [stats, setStats] = useState({total:0, queries:0, asserts:0, refutes:0, responds:0});
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);
  const pendingRef = useRef(null);
  const packetsRef = useRef([]);

  useEffect(()=>{
    packetsRef.current = packets;
  },[packets]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:'smooth'});
  },[packets]);

  const fireNext = useCallback(()=>{
    const current = packetsRef.current;
    const last = current[current.length - 1];

    let newPacket;

    if (!last || last.from === 'AGENT_B') {
      // Agent A initiates
      const topic = AGENT_A_TOPICS[topicIdx % AGENT_A_TOPICS.length];
      const intent = ['query','assert','request'][Math.floor(Math.random()*3)];
      newPacket = buildPacket("AGENT_A","AGENT_B", intent, topic);
      setTopicIdx(i=>i+1);
      setActiveAgent('A');
    } else {
      // Agent B replies
      newPacket = agentBReply(last);
      setActiveAgent('B');
    }

    setPackets(prev=>[...prev, newPacket]);
    setStats(prev=>({
      total: prev.total+1,
      queries: prev.queries + (newPacket.intent==='query'?1:0),
      asserts: prev.asserts + (newPacket.intent==='assert'?1:0),
      refutes: prev.refutes + (newPacket.intent==='refute'?1:0),
      responds: prev.responds + (newPacket.intent==='respond'?1:0),
    }));

    setTimeout(()=>setActiveAgent(null), 400);
  },[topicIdx]);

  useEffect(()=>{
    if (running) {
      fireNext();
      intervalRef.current = setInterval(fireNext, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return ()=>clearInterval(intervalRef.current);
  },[running, speed]);

  const reset = () => {
    setRunning(false);
    setPackets([]);
    setSelected(null);
    setStats({total:0,queries:0,asserts:0,refutes:0,responds:0});
    setTopicIdx(0);
    clearInterval(intervalRef.current);
  };

  return (
    <div style={{
      fontFamily:"'JetBrains Mono','Fira Code',monospace",
      background:'#050810',
      minHeight:'100vh',
      color:'#c8d8e8',
      display:'flex',
      flexDirection:'column',
      overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{
        borderBottom:'1px solid #0d2035',
        padding:'12px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(0,15,30,0.9)',
        backdropFilter:'blur(10px)',
        position:'sticky', top:0, zIndex:10
      }}>
        <div style={{display:'flex', alignItems:'center', gap:16}}>
          <span style={{fontSize:12, letterSpacing:'0.15em', color:'#00d4ff', fontWeight:700}}>STP/0.1</span>
          <span style={{fontSize:10, color:'#1a3a5a', letterSpacing:'0.1em'}}>AGENT NETWORK · 2 NODES</span>
          <div style={{
            width:6,height:6,borderRadius:'50%',
            background: running ? '#00ff9d' : '#1a3a5a',
            boxShadow: running ? '0 0 8px #00ff9d' : 'none',
            transition:'all 0.3s'
          }}/>
        </div>

        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          {/* Speed */}
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#1a4a6a'}}>
            <span>SPEED</span>
            {[2400,1400,800].map(s=>(
              <button key={s} onClick={()=>setSpeed(s)} style={{
                background: speed===s ? 'rgba(0,212,255,0.12)' : 'transparent',
                border:`1px solid ${speed===s ? '#00d4ff44' : '#0d2035'}`,
                color: speed===s ? '#00d4ff' : '#1a3a5a',
                padding:'3px 8px', borderRadius:3,
                cursor:'pointer', fontSize:9, letterSpacing:'0.1em',
                fontFamily:'inherit'
              }}>{s===2400?'SLOW':s===1400?'MED':'FAST'}</button>
            ))}
          </div>

          <button onClick={()=>setHumanView(v=>!v)} style={{
            background: humanView ? 'rgba(0,212,255,0.1)' : 'transparent',
            border:`1px solid ${humanView?'#00d4ff44':'#0d2035'}`,
            color: humanView ? '#00d4ff' : '#1a3a5a',
            padding:'4px 10px', borderRadius:4,
            cursor:'pointer', fontSize:10, letterSpacing:'0.1em', fontFamily:'inherit'
          }}>HUMAN LAYER {humanView?'ON':'OFF'}</button>

          <button onClick={reset} style={{
            background:'transparent', border:'1px solid #1a2a3a',
            color:'#2a4a6a', padding:'4px 10px', borderRadius:4,
            cursor:'pointer', fontSize:10, letterSpacing:'0.1em', fontFamily:'inherit'
          }}>RESET</button>

          <button onClick={()=>setRunning(v=>!v)} style={{
            background: running ? 'rgba(255,68,102,0.1)' : 'rgba(0,255,157,0.1)',
            border:`1px solid ${running?'#ff446633':'#00ff9d33'}`,
            color: running ? '#ff4466' : '#00ff9d',
            padding:'5px 16px', borderRadius:4,
            cursor:'pointer', fontSize:11, letterSpacing:'0.12em',
            fontFamily:'inherit', fontWeight:700
          }}>{running?'■ STOP':'▶ START'}</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        padding:'8px 20px',
        display:'flex', gap:20,
        borderBottom:'1px solid #050f1a',
        background:'rgba(0,8,16,0.5)',
        fontSize:10, color:'#1a3a5a', letterSpacing:'0.1em'
      }}>
        <span>PACKETS <span style={{color:'#3a6a8a'}}>{stats.total}</span></span>
        {Object.entries({QUERY:stats.queries,ASSERT:stats.asserts,REFUTE:stats.refutes,RESPOND:stats.responds}).map(([k,v])=>(
          <span key={k}>{k} <span style={{color:INTENT_COLORS[k.toLowerCase()]||'#3a6a8a', opacity:0.7}}>{v}</span></span>
        ))}
        {stats.total > 0 && (
          <span style={{marginLeft:'auto'}}>
            AVG CONFIDENCE <span style={{color:'#3a8a6a'}}>
              {Math.round(packets.reduce((a,p)=>a+p.provenance.confidence,0)/packets.length*100)}%
            </span>
          </span>
        )}
      </div>

      <div style={{display:'flex', flex:1, overflow:'hidden', minHeight:0}}>
        {/* Agent A column header */}
        <div style={{display:'flex', flexDirection:'column', flex:1, overflow:'hidden'}}>

          {/* Agent labels */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 60px 1fr',
            padding:'10px 16px', borderBottom:'1px solid #050f1a',
            background:'rgba(0,5,12,0.4)'
          }}>
            <AgentTag id="AGENT_A" active={activeAgent==='A'}/>
            <div style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div style={{fontSize:14, color:'#0d2540'}}>⇄</div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <AgentTag id="AGENT_B" active={activeAgent==='B'}/>
            </div>
          </div>

          {/* Message stream */}
          <div style={{
            flex:1, overflowY:'auto',
            padding:'16px',
            display:'flex', flexDirection:'column', gap:4
          }}>
            {packets.length === 0 && (
              <div style={{
                flex:1, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                color:'#0d2035', fontSize:12, letterSpacing:'0.1em',
                gap:12
              }}>
                <div style={{fontSize:28, opacity:0.3}}>⬡ ⬡</div>
                <div>TWO AGENTS · ZERO NATURAL LANGUAGE</div>
                <div style={{fontSize:10, color:'#0a1a2a'}}>press START to initiate STP exchange</div>
              </div>
            )}

            {packets.map((p,i)=>(
              <PacketBubble
                key={p.msg_id}
                packet={p}
                side={p.from==='AGENT_A'?'left':'right'}
                humanView={humanView}
                onClick={()=>setSelected(selected?.msg_id===p.msg_id?null:p)}
                selected={selected?.msg_id===p.msg_id}
              />
            ))}
            <div ref={bottomRef}/>
          </div>
        </div>

        {/* Inspector panel */}
        {selected && (
          <div style={{
            width:300, borderLeft:'1px solid #0d2035',
            background:'rgba(0,6,15,0.6)',
            overflowY:'auto', padding:14,
            fontSize:10, lineHeight:1.7
          }}>
            <div style={{
              color:'#1a4a6a', letterSpacing:'0.15em',
              marginBottom:10, fontSize:9,
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <span>RAW PACKET</span>
              <button onClick={()=>setSelected(null)} style={{
                background:'transparent', border:'none',
                color:'#1a3a5a', cursor:'pointer', fontSize:12, fontFamily:'inherit'
              }}>✕</button>
            </div>

            {/* Parsed view */}
            <div style={{marginBottom:12}}>
              {[
                ['FROM', selected.from, '#00d4ff'],
                ['TO', selected.to, '#8ac8e8'],
                ['INTENT', selected.intent.toUpperCase(), INTENT_COLORS[selected.intent]],
                ['DOMAIN', selected.payload.context.domain, '#3a8a5a'],
                ['CONFIDENCE', `${Math.round(selected.provenance.confidence*100)}%`, '#00ff9d'],
                ['MSG ID', selected.msg_id.slice(0,12)+'…', '#1a4a6a'],
              ].map(([k,v,c])=>(
                <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'2px 0', borderBottom:'1px solid #050f1a'}}>
                  <span style={{color:'#1a3a5a'}}>{k}</span>
                  <span style={{color:c}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{color:'#1a4a6a', letterSpacing:'0.12em', marginBottom:6, fontSize:9}}>CONCEPTS</div>
            {selected.payload.concepts.map((c,i)=>(
              <div key={i} style={{
                padding:'4px 8px', marginBottom:4,
                background:'rgba(0,15,30,0.5)', borderRadius:3,
                border:'1px solid #0d2035'
              }}>
                <div style={{color:'#8ac8e8', fontSize:10}}>{c.ref}</div>
                <div style={{
                  height:2, marginTop:4,
                  background:`linear-gradient(to right,#00d4ff ${c.weight*100}%,#0d2035 0)`,
                  borderRadius:1
                }}/>
                <div style={{color:'#1a3a5a', fontSize:9, marginTop:2}}>{(c.weight*100).toFixed(0)}% relevance</div>
              </div>
            ))}

            {selected.payload.relations.length > 0 && (
              <>
                <div style={{color:'#1a4a6a', letterSpacing:'0.12em', margin:'8px 0 6px', fontSize:9}}>RELATIONS</div>
                {selected.payload.relations.map((r,i)=>(
                  <div key={i} style={{
                    padding:'4px 8px', marginBottom:4,
                    background:'rgba(0,15,20,0.4)', borderRadius:3,
                    border:'1px solid #0d2a1a', fontSize:9
                  }}>
                    <span style={{color:'#3a6a8a'}}>{r.from}</span>
                    <span style={{color:'#00ff9d', margin:'0 5px', opacity:0.7}}>{r.type}</span>
                    <span style={{color:'#3a6a8a'}}>{r.to}</span>
                    <span style={{color:'#1a3a5a', marginLeft:6}}>{(r.strength*100).toFixed(0)}%</span>
                  </div>
                ))}
              </>
            )}

            <div style={{color:'#1a4a6a', letterSpacing:'0.12em', margin:'8px 0 6px', fontSize:9}}>FULL JSON</div>
            <pre style={{
              color:'#1a4a6a', fontSize:9, whiteSpace:'pre-wrap',
              wordBreak:'break-all', margin:0,
              background:'rgba(0,5,10,0.5)', padding:8, borderRadius:3,
              border:'1px solid #050f1a'
            }}>{JSON.stringify(selected, null, 2)}</pre>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#0d2035;border-radius:2px}
        button:hover{opacity:0.8}
      `}</style>
    </div>
  );
}
