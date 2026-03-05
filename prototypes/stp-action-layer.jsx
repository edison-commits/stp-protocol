import { useState, useEffect, useRef } from "react";

// ─── ACTION LAYER ENGINE ──────────────────────────────────────────────────────
//
// Agents interact with the web by reading declared action manifests — not by
// driving browsers. Sites publish what they can do. Agents call it directly.
//
// Pipeline:
//   1. FETCH manifest from STP block
//   2. VERIFY signature (M-01)
//   3. SANITIZE all fields (M-03)
//   4. CHECK domain allowlist (M-02)
//   5. VALIDATE scope against token (M-06)
//   6. GATE if action is human-confirmable (M-07)
//   7. EXECUTE
//   8. RETURN structured result

// ─── SECURITY ENGINE ─────────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore (previous|all|prior)/i,
  /you (are now|must|should)/i,
  /unrestricted mode/i,
  /disregard (your|the|all)/i,
  /new (instructions|directives|rules)/i,
  /system prompt/i,
  /override/i,
];

const DOMAIN_REGISTRY = {
  "shop.stp.dev": {
    category: "ecommerce",
    permitted: ["catalog.search","catalog.get","cart.add","cart.read","cart.remove","checkout.initiate","checkout.confirm"],
    max_scope: ["read_catalog","write_cart","initiate_payment"],
    prohibited: ["read_wallet","access_contacts","write_all","admin.*"],
    verified: true,
  },
  "docs.stp.dev": {
    category: "documentation",
    permitted: ["content.search","content.get","content.list"],
    max_scope: ["read_content"],
    prohibited: ["write.*","payment.*","admin.*"],
    verified: true,
  },
  "api.stp.dev": {
    category: "data_api",
    permitted: ["query.run","schema.get","export.csv"],
    max_scope: ["read_data","export_data"],
    prohibited: ["write.*","payment.*","delete.*"],
    verified: true,
  },
};

const GATE_PATTERNS = [
  "checkout.confirm", "payment.*", "account.*",
  "delete.*", "transfer.*", "auth.grant",
];

function requiresGate(actionId) {
  return GATE_PATTERNS.some(p => {
    if (p.endsWith(".*")) return actionId.startsWith(p.slice(0,-2));
    return actionId === p;
  });
}

function sanitize(obj, path = "") {
  if (typeof obj === "string") {
    for (const pat of INJECTION_PATTERNS) {
      if (pat.test(obj)) return { safe: false, reason: `Injection pattern in ${path}: "${obj.slice(0,40)}..."` };
    }
    return { safe: true };
  }
  if (typeof obj === "object" && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      const r = sanitize(v, path ? `${path}.${k}` : k);
      if (!r.safe) return r;
    }
  }
  return { safe: true };
}

function verifySignature(manifest) {
  // Simulated Ed25519 verification
  if (!manifest.signature) return { valid: false, reason: "No signature present — block is read-only" };
  if (!manifest.signature.key_id) return { valid: false, reason: "Missing key_id in signature" };
  const age = Date.now() - new Date(manifest.timestamp).getTime();
  if (age > 5 * 60 * 1000) return { valid: false, reason: "Block expired (>5 min old)" };
  if (!manifest.nonce || manifest.nonce.length < 12) return { valid: false, reason: "Invalid nonce" };
  return { valid: true };
}

function checkDomainAllowlist(domain, actionId) {
  const reg = DOMAIN_REGISTRY[domain];
  if (!reg) return { allowed: false, reason: `Domain ${domain} not in registry` };
  if (!reg.permitted.some(p => p === actionId || (p.endsWith(".*") && actionId.startsWith(p.slice(0,-2))))) {
    return { allowed: false, reason: `Action ${actionId} not permitted for ${domain}` };
  }
  return { allowed: true, category: reg.category };
}

function runSecurityPipeline(manifest, action) {
  const steps = [];

  // Step 1: Signature verification
  const sigResult = verifySignature(manifest);
  steps.push({
    id: "SIG",
    label: "Signature Verify",
    pass: sigResult.valid,
    detail: sigResult.valid ? `Ed25519 verified · key_id: ${manifest.signature?.key_id}` : sigResult.reason,
  });

  // Step 2: Sanitize
  const sanitizeResult = sanitize({ ...manifest, action_params: action?.params });
  steps.push({
    id: "SAN",
    label: "Injection Scan",
    pass: sanitizeResult.safe,
    detail: sanitizeResult.safe ? "All fields clean — no injection patterns detected" : sanitizeResult.reason,
  });

  // Step 3: Domain allowlist
  const domainResult = checkDomainAllowlist(manifest.domain, action?.id || "");
  steps.push({
    id: "DOM",
    label: "Domain Allowlist",
    pass: domainResult.allowed,
    detail: domainResult.allowed
      ? `${manifest.domain} verified · category: ${domainResult.category}`
      : domainResult.reason,
  });

  // Step 4: Scope
  const domReg = DOMAIN_REGISTRY[manifest.domain];
  const scopeOk = !action?.required_scope || (domReg && action.required_scope.every(s =>
    domReg.max_scope.some(ms => ms === s || (ms.endsWith(".*") && s.startsWith(ms.slice(0,-2))))
  ));
  steps.push({
    id: "SCP",
    label: "Scope Validation",
    pass: scopeOk,
    detail: scopeOk
      ? `Scope [${(action?.required_scope || []).join(", ") || "none"}] within domain max`
      : `Scope exceeds domain max_scope`,
  });

  // Step 5: Gate check
  const gated = action ? requiresGate(action.id) : false;
  steps.push({
    id: "GATE",
    label: "Human Gate",
    pass: true, // gate doesn't fail — it pauses
    gated,
    detail: gated ? "⚠ GATE REQUIRED — awaiting human confirmation" : "No gate required for this action",
  });

  const allPassed = steps.filter(s => s.id !== "GATE").every(s => s.pass);
  return { steps, allPassed, gated: gated && allPassed };
}

// ─── MANIFESTS ───────────────────────────────────────────────────────────────

const MANIFESTS = {
  "shop.stp.dev": {
    domain: "shop.stp.dev",
    manifest_version: "1.0",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    nonce: "a3f9b2c1d8e4ff",
    signature: { algorithm: "Ed25519", value: "simulated_sig_ok", key_id: "stp-2026-03" },
    concepts: [
      { id: "stp:commerce.001", ref: "product_catalog", weight: 0.95 },
      { id: "stp:commerce.002", ref: "shopping_cart",   weight: 0.92 },
    ],
    actions: [
      {
        id: "catalog.search",
        label: "Search Catalog",
        method: "GET",
        endpoint: "/api/stp/catalog/search",
        description: "Search products by query string with filters.",
        required_scope: ["read_catalog"],
        params: [
          { name: "q",        type: "string",  required: true,  description: "Search query" },
          { name: "max",      type: "integer", required: false, description: "Max results (default 10)" },
          { name: "category", type: "string",  required: false, description: "Filter by category" },
        ],
        returns: { type: "product_list", schema: "stp:commerce.product_list_v1" },
        gate: false,
        example_params: { q: "running shoes", max: 5, category: "footwear" },
      },
      {
        id: "cart.add",
        label: "Add to Cart",
        method: "POST",
        endpoint: "/api/stp/cart/add",
        description: "Add a product variant to the agent's cart session.",
        required_scope: ["write_cart"],
        params: [
          { name: "product_id", type: "string",  required: true, description: "Product ID from catalog" },
          { name: "variant_id", type: "string",  required: true, description: "Selected variant" },
          { name: "quantity",   type: "integer", required: true, description: "Units to add" },
        ],
        returns: { type: "cart_state", schema: "stp:commerce.cart_v1" },
        gate: false,
        example_params: { product_id: "prod_001", variant_id: "var_blue_10", quantity: 1 },
      },
      {
        id: "cart.read",
        label: "Read Cart",
        method: "GET",
        endpoint: "/api/stp/cart",
        description: "Retrieve current cart state including items, subtotal, and available checkout methods.",
        required_scope: ["read_catalog"],
        params: [],
        returns: { type: "cart_state", schema: "stp:commerce.cart_v1" },
        gate: false,
        example_params: {},
      },
      {
        id: "checkout.initiate",
        label: "Initiate Checkout",
        method: "POST",
        endpoint: "/api/stp/checkout/initiate",
        description: "Create a checkout session from current cart. Returns session ID and available payment methods.",
        required_scope: ["initiate_payment"],
        params: [
          { name: "shipping_address_id", type: "string", required: true, description: "Saved address ID" },
        ],
        returns: { type: "checkout_session", schema: "stp:commerce.checkout_v1" },
        gate: false,
        example_params: { shipping_address_id: "addr_home" },
      },
      {
        id: "checkout.confirm",
        label: "Confirm Purchase",
        method: "POST",
        endpoint: "/api/stp/checkout/confirm",
        description: "Complete purchase using checkout session. REQUIRES HUMAN GATE.",
        required_scope: ["initiate_payment"],
        params: [
          { name: "session_id",        type: "string", required: true, description: "Checkout session from initiate" },
          { name: "payment_method_id", type: "string", required: true, description: "Saved payment method ID (never raw card data)" },
        ],
        returns: { type: "order_confirmation", schema: "stp:commerce.order_v1" },
        gate: true,
        example_params: { session_id: "sess_abc123", payment_method_id: "pm_visa_4242" },
      },
    ],
  },

  "docs.stp.dev": {
    domain: "docs.stp.dev",
    manifest_version: "1.0",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    nonce: "c7d1e9a2b4f8cc",
    signature: { algorithm: "Ed25519", value: "simulated_sig_ok", key_id: "stp-2026-02" },
    concepts: [
      { id: "stp:ai.ml.006", ref: "large_language_model", weight: 0.98 },
      { id: "stp:ai.agents.001", ref: "agent", weight: 0.95 },
    ],
    actions: [
      {
        id: "content.search",
        label: "Search Docs",
        method: "GET",
        endpoint: "/api/stp/content/search",
        description: "Semantic search across documentation corpus.",
        required_scope: ["read_content"],
        params: [
          { name: "q",            type: "string",  required: true,  description: "Search query" },
          { name: "section",      type: "string",  required: false, description: "Limit to section" },
          { name: "semantic",     type: "boolean", required: false, description: "Use semantic search (default true)" },
        ],
        returns: { type: "content_list", schema: "stp:docs.content_list_v1" },
        gate: false,
        example_params: { q: "how to configure agents", section: "getting-started" },
      },
      {
        id: "content.get",
        label: "Get Content",
        method: "GET",
        endpoint: "/api/stp/content/:id",
        description: "Retrieve a specific documentation page as structured STP content.",
        required_scope: ["read_content"],
        params: [
          { name: "id",     type: "string",  required: true,  description: "Content ID" },
          { name: "format", type: "string",  required: false, description: "stp | markdown | text (default: stp)" },
        ],
        returns: { type: "content_page", schema: "stp:docs.page_v1" },
        gate: false,
        example_params: { id: "doc_quickstart", format: "stp" },
      },
    ],
  },
};

// Simulated API responses
function simulateAction(domain, actionId, params) {
  const responses = {
    "catalog.search": {
      results: [
        { id: "prod_001", name: "Ultralight Runner X9", price: 129.99, rating: 4.8, variants: 6, in_stock: true },
        { id: "prod_002", name: "Trail Blazer Pro",     price: 149.99, rating: 4.6, variants: 4, in_stock: true },
        { id: "prod_003", name: "Speed Demon Elite",    price: 89.99,  rating: 4.3, variants: 8, in_stock: false },
      ],
      total: 3, query: params.q,
    },
    "cart.add": {
      cart_id: "cart_a1b2c3",
      items: [{ product_id: params.product_id, variant_id: params.variant_id, quantity: params.quantity, price: 129.99 }],
      subtotal: 129.99, item_count: 1,
    },
    "cart.read": {
      cart_id: "cart_a1b2c3",
      items: [{ product_id: "prod_001", name: "Ultralight Runner X9", variant: "Blue / Size 10", quantity: 1, price: 129.99 }],
      subtotal: 129.99, estimated_tax: 10.92, item_count: 1,
    },
    "checkout.initiate": {
      session_id: "sess_xyz789",
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      shipping_address: "123 Main St, Cerritos CA 90703",
      order_total: 140.91,
      available_payment_methods: ["pm_visa_4242"],
    },
    "checkout.confirm": {
      order_id: "ord_00441",
      status: "confirmed",
      total: 140.91,
      estimated_delivery: "2026-03-08",
    },
    "content.search": {
      results: [
        { id: "doc_quickstart", title: "Quick Start Guide", relevance: 0.97, section: "getting-started" },
        { id: "doc_agents",     title: "Agent Configuration", relevance: 0.89, section: "advanced" },
      ],
      total: 2,
    },
    "content.get": {
      id: params.id || "doc_quickstart",
      title: "Quick Start Guide",
      stp_concepts: ["agent","tool_use","reasoning"],
      word_count: 847,
      sections: ["Installation","Configuration","First Agent","Troubleshooting"],
    },
  };
  return responses[actionId] || { error: "No simulated response for this action" };
}

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#05050b",
  surface: "#08080f",
  card:    "#0b0b15",
  border:  "#12121d",
  text:    "#6060a0",
  bright:  "#c0c0e0",
  muted:   "#2a2a45",
  green:   "#34d399",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
  orange:  "#fb923c",
  red:     "#f43f5e",
  yellow:  "#facc15",
  GET:     "#34d399",
  POST:    "#60a5fa",
};

function Badge({ label, color, size = "sm" }) {
  const fs = size === "sm" ? 8 : 9;
  return (
    <span style={{
      fontSize: fs, padding: size === "sm" ? "1px 6px" : "2px 8px",
      background: color + "15", border: `1px solid ${color}30`,
      borderRadius: 3, color, letterSpacing: "0.1em",
      fontFamily: "inherit", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function SecurityStep({ step, index, visible }) {
  const c = step.gated ? C.yellow : step.pass ? C.green : C.red;
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-8px)",
      transition: `all 0.3s ease ${index * 100}ms`,
      padding: "5px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: c + "18", border: `1px solid ${c}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
        fontSize: 8, color: c,
      }}>
        {step.gated ? "!" : step.pass ? "✓" : "✗"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center", marginBottom: 2,
        }}>
          <span style={{ fontSize: 9, color: C.muted }}>{step.id}</span>
          <span style={{ fontSize: 10, color: C.bright, fontWeight: 700 }}>{step.label}</span>
        </div>
        <div style={{ fontSize: 9, color: step.gated ? C.yellow : step.pass ? C.text : C.red }}>
          {step.detail}
        </div>
      </div>
    </div>
  );
}

function ParamInput({ param, value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: "flex", gap: 6, alignItems: "center", marginBottom: 3,
      }}>
        <span style={{ fontSize: 9, color: C.blue }}>{param.name}</span>
        <Badge label={param.type} color={C.purple} />
        {param.required && <Badge label="required" color={C.orange} />}
      </div>
      <div style={{ fontSize: 8, color: C.muted, marginBottom 4: true, marginBottom: 4 }}>
        {param.description}
      </div>
      <input
        value={value ?? ""}
        onChange={e => onChange(param.name, e.target.value)}
        placeholder={`${param.type}...`}
        style={{
          width: "100%", background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 4,
          color: C.bright, padding: "5px 8px",
          fontSize: 10, fontFamily: "inherit",
          outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export default function ActionLayer() {
  const [selectedDomain, setSelectedDomain] = useState("shop.stp.dev");
  const [selectedAction, setSelectedAction] = useState(null);
  const [params, setParams] = useState({});
  const [pipeline, setPipeline] = useState(null);
  const [pipelineVisible, setPipelineVisible] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [gateConfirmed, setGateConfirmed] = useState(false);
  const [tab, setTab] = useState("execute"); // execute | manifest | flow

  const manifest = MANIFESTS[selectedDomain];
  const action = manifest?.actions.find(a => a.id === selectedAction);

  const selectAction = (actionId) => {
    setSelectedAction(actionId);
    const a = manifest?.actions.find(x => x.id === actionId);
    setParams(a?.example_params || {});
    setPipeline(null);
    setPipelineVisible(false);
    setResult(null);
    setGateConfirmed(false);
  };

  const runPipeline = () => {
    if (!action) return;
    setPipelineVisible(false);
    const res = runSecurityPipeline(manifest, action);
    setPipeline(res);
    setTimeout(() => setPipelineVisible(true), 50);
    setResult(null);
    setGateConfirmed(false);
  };

  const executeAction = async () => {
    if (!pipeline?.allPassed) return;
    if (pipeline.gated && !gateConfirmed) return;
    setExecuting(true);
    await new Promise(r => setTimeout(r, 700));
    const res = simulateAction(selectedDomain, selectedAction, params);
    setResult(res);
    setExecuting(false);
  };

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(3,3,9,0.97)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: "0.2em",
            color: "#d0d0f0", fontFamily: "'Syne', sans-serif",
          }}>STP</span>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em" }}>
            ACTION LAYER / v0.1
          </span>
          <Badge label="ALPHA" color={C.orange} />
          <Badge label="SECURITY GATED" color={C.green} />
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {["execute", "manifest", "flow"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "rgba(96,165,250,0.1)" : "transparent",
              border: `1px solid ${tab === t ? C.blue + "40" : C.border}`,
              color: tab === t ? C.blue : C.muted,
              padding: "4px 12px", borderRadius: 4, cursor: "pointer",
              fontSize: 10, letterSpacing: "0.1em", fontFamily: "inherit",
            }}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* Sidebar — domain + action selector */}
        <div style={{
          width: 230, borderRight: `1px solid ${C.border}`,
          overflowY: "auto", padding: "14px 10px",
          background: "rgba(3,3,8,0.7)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {Object.entries(MANIFESTS).map(([domain, m]) => {
            const isActive = domain === selectedDomain;
            return (
              <div key={domain}>
                <div
                  onClick={() => { setSelectedDomain(domain); selectAction(null); }}
                  style={{
                    padding: "8px 10px", borderRadius: 5, cursor: "pointer",
                    background: isActive ? C.surface : "transparent",
                    border: `1px solid ${isActive ? C.border : "transparent"}`,
                    marginBottom: 2,
                  }}
                >
                  <div style={{ fontSize: 10, color: isActive ? C.bright : C.text }}>{domain}</div>
                  <div style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>
                    {m.actions.length} actions
                  </div>
                </div>

                {isActive && m.actions.map(a => {
                  const isSelected = selectedAction === a.id;
                  const mc = C[a.method] || C.blue;
                  return (
                    <div
                      key={a.id}
                      onClick={() => selectAction(a.id)}
                      style={{
                        padding: "7px 10px 7px 18px", borderRadius: 4,
                        cursor: "pointer", marginBottom: 1,
                        background: isSelected ? C.card : "transparent",
                        border: `1px solid ${isSelected ? mc + "25" : "transparent"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{
                          fontSize: 7, color: mc, minWidth: 22,
                          letterSpacing: "0.05em",
                        }}>{a.method}</span>
                        <span style={{ fontSize: 9, color: isSelected ? C.bright : C.text }}>
                          {a.id}
                        </span>
                        {a.gate && <span style={{ fontSize: 8, color: C.yellow }}>⚠</span>}
                      </div>
                    </div>
                  );
                })}
                <div style={{ height: 8 }} />
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>

          {!selectedAction && (
            <div style={{
              padding: "60px 20px", textAlign: "center",
              color: C.muted, fontSize: 11, letterSpacing: "0.1em",
            }}>
              SELECT A DOMAIN AND ACTION FROM THE LEFT
            </div>
          )}

          {selectedAction && action && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Action header */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "14px 18px",
              }}>
                <div style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  justifyContent: "space-between", marginBottom: 8,
                }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                      <Badge label={action.method} color={C[action.method]} size="md" />
                      <span style={{
                        fontSize: 11, fontFamily: "'DM Mono', monospace",
                        color: C.muted,
                      }}>{action.endpoint}</span>
                      {action.gate && <Badge label="GATE REQUIRED" color={C.yellow} size="md" />}
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 800, color: C.bright,
                      fontFamily: "'Syne', sans-serif",
                    }}>{action.label}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {action.required_scope.map(s => (
                      <Badge key={s} label={s} color={C.purple} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: 10, color: C.text, lineHeight: 1.6, margin: 0 }}>
                  {action.description}
                </p>
              </div>

              {/* ── EXECUTE TAB ── */}
              {tab === "execute" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Left — params + run */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Params */}
                    <div style={{
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: "14px",
                    }}>
                      <div style={{
                        fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 10,
                      }}>PARAMETERS</div>
                      {action.params.length === 0 ? (
                        <div style={{ fontSize: 9, color: C.muted }}>No parameters required</div>
                      ) : (
                        action.params.map(p => (
                          <ParamInput
                            key={p.name}
                            param={p}
                            value={params[p.name]}
                            onChange={(name, val) => setParams(prev => ({ ...prev, [name]: val }))}
                          />
                        ))
                      )}
                    </div>

                    {/* Security pipeline trigger */}
                    <button
                      onClick={runPipeline}
                      style={{
                        background: "rgba(96,165,250,0.1)",
                        border: `1px solid ${C.blue}40`,
                        color: C.blue, padding: "10px",
                        borderRadius: 5, cursor: "pointer",
                        fontSize: 10, letterSpacing: "0.15em",
                        fontFamily: "inherit", transition: "all 0.2s",
                      }}
                    >
                      ▶ RUN SECURITY PIPELINE
                    </button>

                    {/* Gate confirmation */}
                    {pipeline?.gated && !gateConfirmed && (
                      <div style={{
                        background: C.yellow + "0a",
                        border: `1px solid ${C.yellow}30`,
                        borderRadius: 6, padding: "12px 14px",
                      }}>
                        <div style={{
                          fontSize: 10, color: C.yellow, fontWeight: 700,
                          marginBottom: 6, letterSpacing: "0.08em",
                        }}>⚠ HUMAN CONFIRMATION REQUIRED</div>
                        <div style={{ fontSize: 9, color: C.text, marginBottom: 10, lineHeight: 1.6 }}>
                          Action: <span style={{ color: C.bright }}>{action.label}</span><br />
                          Domain: <span style={{ color: C.blue }}>{selectedDomain}</span><br />
                          This action is irreversible and requires explicit approval.
                        </div>
                        <button
                          onClick={() => setGateConfirmed(true)}
                          style={{
                            background: C.yellow + "15",
                            border: `1px solid ${C.yellow}40`,
                            color: C.yellow, padding: "7px 14px",
                            borderRadius: 4, cursor: "pointer",
                            fontSize: 9, letterSpacing: "0.12em",
                            fontFamily: "inherit",
                          }}
                        >
                          CONFIRM — PROCEED WITH ACTION
                        </button>
                      </div>
                    )}

                    {gateConfirmed && (
                      <div style={{
                        fontSize: 9, color: C.green,
                        background: C.green + "0a",
                        border: `1px solid ${C.green}25`,
                        borderRadius: 4, padding: "6px 10px",
                      }}>
                        ✓ Gate confirmed by human operator
                      </div>
                    )}

                    {/* Execute */}
                    {pipeline?.allPassed && (!pipeline.gated || gateConfirmed) && (
                      <button
                        onClick={executeAction}
                        disabled={executing}
                        style={{
                          background: executing ? "rgba(52,211,153,0.05)" : "rgba(52,211,153,0.12)",
                          border: `1px solid ${C.green}${executing ? "20" : "50"}`,
                          color: executing ? C.muted : C.green,
                          padding: "10px",
                          borderRadius: 5, cursor: executing ? "default" : "pointer",
                          fontSize: 10, letterSpacing: "0.15em",
                          fontFamily: "inherit", transition: "all 0.2s",
                        }}
                      >
                        {executing ? "EXECUTING..." : "⚡ EXECUTE ACTION"}
                      </button>
                    )}
                  </div>

                  {/* Right — pipeline + result */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Security pipeline */}
                    {pipeline && (
                      <div style={{
                        background: C.surface, border: `1px solid ${C.border}`,
                        borderRadius: 6, padding: "14px",
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 10,
                        }}>
                          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted }}>
                            SECURITY PIPELINE
                          </div>
                          <Badge
                            label={pipeline.allPassed ? "PASSED" : "BLOCKED"}
                            color={pipeline.allPassed ? C.green : C.red}
                          />
                        </div>
                        {pipeline.steps.map((step, i) => (
                          <SecurityStep
                            key={step.id}
                            step={step}
                            index={i}
                            visible={pipelineVisible}
                          />
                        ))}
                      </div>
                    )}

                    {/* Result */}
                    {result && (
                      <div style={{
                        background: "#040408",
                        border: `1px solid ${C.green}25`,
                        borderRadius: 6, padding: "14px",
                      }}>
                        <div style={{
                          fontSize: 8, letterSpacing: "0.2em", color: C.green, marginBottom: 10,
                        }}>
                          ✓ RESPONSE · {action.returns.type}
                        </div>
                        <pre style={{
                          fontSize: 9, color: C.green,
                          fontFamily: "'DM Mono', monospace",
                          lineHeight: 1.7, margin: 0,
                          whiteSpace: "pre-wrap", wordBreak: "break-all",
                        }}>
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── MANIFEST TAB ── */}
              {tab === "manifest" && (
                <div style={{
                  background: "#040408", border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "16px",
                }}>
                  <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 10 }}>
                    RAW STP ACTION MANIFEST · {selectedDomain}
                  </div>
                  <pre style={{
                    fontSize: 9, color: C.blue,
                    fontFamily: "'DM Mono', monospace",
                    lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap",
                  }}>
                    {JSON.stringify(manifest, null, 2)}
                  </pre>
                </div>
              )}

              {/* ── FLOW TAB ── */}
              {tab === "flow" && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "18px",
                }}>
                  <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 16 }}>
                    EXECUTION FLOW · AGENT PERSPECTIVE
                  </div>
                  {[
                    { n: "01", label: "Agent reads webpage", detail: "Finds <script type=\"application/stp+json\"> tag. Parses action manifest. Zero DOM interaction.", color: C.blue },
                    { n: "02", label: "Signature verification", detail: "Ed25519 signature checked against domain's public key at /.well-known/stp-keys.json. Fails → read-only mode.", color: C.purple },
                    { n: "03", label: "Injection scan", detail: "All string fields checked against injection pattern list. Any match → block rejected, error logged.", color: C.orange },
                    { n: "04", label: "Domain allowlist check", detail: `${selectedDomain} looked up in STP registry. Action ${selectedAction} verified against permitted list.`, color: C.blue },
                    { n: "05", label: "Scope validation", detail: `Required scope [${action.required_scope.join(", ")}] checked against domain max_scope. Excess scope → rejected.`, color: C.purple },
                    { n: "06", label: action.gate ? "Human gate (REQUIRED)" : "Human gate check", detail: action.gate ? "⚠ Action paused. Summary presented to human operator. Agent waits for explicit confirmation." : "Action is non-gated. Proceed automatically.", color: action.gate ? C.yellow : C.green },
                    { n: "07", label: "Direct API call", detail: `${action.method} ${action.endpoint} — no browser, no DOM, no rendering. Structured params, structured response.`, color: C.green },
                    { n: "08", label: "Structured result", detail: `Response schema: ${action.returns.schema}. Typed, validated, ready for agent reasoning. No NLP needed.`, color: C.green },
                  ].map((step, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 14, marginBottom: 14,
                    }}>
                      <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: step.color + "15",
                          border: `1px solid ${step.color}35`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, color: step.color,
                        }}>{step.n}</div>
                        {i < 7 && <div style={{ width: 1, flex: 1, background: C.border, margin: "3px 0" }} />}
                      </div>
                      <div style={{ paddingTop: 4 }}>
                        <div style={{ fontSize: 11, color: C.bright, fontWeight: 700, marginBottom: 3 }}>
                          {step.label}
                        </div>
                        <div style={{ fontSize: 9, color: C.text, lineHeight: 1.6 }}>
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #15152a; border-radius: 2px; }
        button:hover:not(:disabled) { opacity: 0.82; }
        input:focus { border-color: #60a5fa !important; }
      `}</style>
    </div>
  );
}
