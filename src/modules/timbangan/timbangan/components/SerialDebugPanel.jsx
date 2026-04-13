import { useState, useEffect, useRef, useCallback } from "react";

// ─── Standalone debug panel — tidak butuh hook apapun ────────────────────────
// Paste komponen ini di halaman manapun untuk diagnosa penuh WebSerial

const LS_SCALE = "internal_serial_port_scale";
const LS_RFID  = "internal_serial_port_rfid";

function hex(n, pad = 4) { return "0x" + n.toString(16).toUpperCase().padStart(pad, "0"); }
function ts() {
  const d = new Date();
  return d.toTimeString().slice(0, 8) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

export default function SerialDebugPanel() {
  const [logs,    setLogs]    = useState([]);
  const [ports,   setPorts]   = useState([]);
  const [browser, setBrowser] = useState({});
  const [ls,      setLs]      = useState({});
  const [loading, setLoading] = useState(false);
  const logRef = useRef([]);

  const addLog = useCallback((level, section, msg) => {
    const entry = { id: Date.now() + Math.random(), ts: ts(), level, section, msg };
    logRef.current = [entry, ...logRef.current.slice(0, 499)];
    setLogs([...logRef.current]);
  }, []);

  // ─── Browser environment check ──────────────────────────────────────────
  const checkBrowser = useCallback(() => {
    const ua = navigator.userAgent;
    const info = {
      userAgent:    ua,
      isChrome:     /Chrome\/(\d+)/.test(ua),
      chromeVer:    (ua.match(/Chrome\/(\d+)/) || [])[1] || "?",
      isEdge:       /Edg\//.test(ua),
      isFirefox:    /Firefox/.test(ua),
      isSafari:     /Safari/.test(ua) && !/Chrome/.test(ua),
      isHTTPS:      location.protocol === "https:",
      isLocalhost:  ["localhost", "127.0.0.1"].includes(location.hostname),
      serialInNav:  "serial" in navigator,
      secureCtx:    window.isSecureContext,
      platform:     navigator.platform,
      os:           /Win/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown",
    };
    setBrowser(info);

    addLog("info", "BROWSER", `Platform: ${info.os} | ${info.platform}`);
    addLog("info", "BROWSER", `UA: ${ua.slice(0, 120)}`);
    addLog(info.serialInNav ? "ok" : "error", "BROWSER",
      `navigator.serial: ${info.serialInNav ? "✅ ADA" : "❌ TIDAK ADA"}`);
    addLog(info.secureCtx ? "ok" : "error", "BROWSER",
      `Secure Context: ${info.secureCtx ? "✅ YA (https/localhost)" : "❌ TIDAK — WebSerial butuh HTTPS!"}`);
    addLog(info.isChrome || info.isEdge ? "ok" : "warn", "BROWSER",
      `Browser: ${info.isChrome ? `Chrome ${info.chromeVer}` : info.isEdge ? "Edge" : info.isFirefox ? "Firefox ❌" : info.isSafari ? "Safari ❌" : "Unknown"}`);

    if (info.serialInNav) addLog("ok", "BROWSER", "WebSerial API tersedia ✅");
    else addLog("error", "BROWSER", "WebSerial API TIDAK tersedia — gunakan Chrome/Edge 89+ via HTTPS");

    return info;
  }, [addLog]);

  // ─── localStorage check ─────────────────────────────────────────────────
  const checkLocalStorage = useCallback(() => {
    const scaleKey = localStorage.getItem(LS_SCALE);
    const rfidKey  = localStorage.getItem(LS_RFID);
    setLs({ scale: scaleKey, rfid: rfidKey });

    addLog("info", "LOCALSTORAGE", `Scale key tersimpan: ${scaleKey ? `"${scaleKey}"` : "❌ kosong"}`);
    addLog("info", "LOCALSTORAGE", `RFID key tersimpan:  ${rfidKey  ? `"${rfidKey}"` : "❌ kosong"}`);

    if (!scaleKey && !rfidKey)
      addLog("warn", "LOCALSTORAGE", "Tidak ada port tersimpan → auto-connect TIDAK akan jalan → user harus klik Connect dulu");
  }, [addLog]);

  // ─── getPorts() check ───────────────────────────────────────────────────
  const checkGrantedPorts = useCallback(async () => {
    if (!navigator.serial) { addLog("error", "PORTS", "navigator.serial tidak tersedia"); return []; }

    addLog("info", "PORTS", "Memanggil navigator.serial.getPorts()...");
    try {
      const grantedPorts = await navigator.serial.getPorts();
      addLog(grantedPorts.length > 0 ? "ok" : "warn", "PORTS",
        `Jumlah port granted: ${grantedPorts.length} ${grantedPorts.length === 0 ? "← INI PENYEBABNYA! User belum pernah pilih port via dialog" : ""}`);

      const portData = [];
      for (let i = 0; i < grantedPorts.length; i++) {
        const p    = grantedPorts[i];
        const info = p.getInfo?.() ?? {};
        const key  = `${info.usbVendorId ?? 0}:${info.usbProductId ?? 0}:${i}`;
        const isOpen = p.readable !== null || p.writable !== null;

        addLog("info", "PORTS", `[${i}] VID=${hex(info.usbVendorId ?? 0)} PID=${hex(info.usbProductId ?? 0)} key="${key}" open=${isOpen}`);

        // Cocokkan dengan localStorage
        const savedScale = localStorage.getItem(LS_SCALE);
        const savedRfid  = localStorage.getItem(LS_RFID);
        const matchScale = savedScale === key;
        const matchRfid  = savedRfid  === key;
        if (matchScale) addLog("ok",   "PORTS", `  → ✅ Ini adalah port SCALE yang tersimpan`);
        if (matchRfid)  addLog("ok",   "PORTS", `  → ✅ Ini adalah port RFID yang tersimpan`);
        if (!matchScale && !matchRfid) addLog("warn", "PORTS", `  → ⚠️ Port ini tidak cocok dengan key scale maupun rfid`);

        portData.push({ index: i, info, key, isOpen, matchScale, matchRfid });
      }

      setPorts(portData);

      if (grantedPorts.length === 0) {
        addLog("error", "PORTS", "═══ ROOT CAUSE: Tidak ada port yang pernah di-grant ═══");
        addLog("error", "PORTS", "Solusi: Klik tombol [Request Port Dialog] di bawah, pilih port scale dari dialog browser");
        addLog("info",  "PORTS", "Setelah pilih → port ter-grant → auto-connect akan bekerja di session berikutnya");
      }

      return portData;
    } catch (e) {
      addLog("error", "PORTS", `getPorts() error: ${e.name} — ${e.message}`);
      return [];
    }
  }, [addLog]);

  // ─── requestPort() test ─────────────────────────────────────────────────
  const testRequestPort = useCallback(async () => {
    if (!navigator.serial) { addLog("error", "REQUEST", "navigator.serial tidak tersedia"); return; }
    addLog("info", "REQUEST", "Membuka dialog requestPort() — pilih port dari dialog browser...");
    try {
      const port = await navigator.serial.requestPort();
      const info = port.getInfo?.() ?? {};
      addLog("ok", "REQUEST", `Port dipilih: VID=${hex(info.usbVendorId ?? 0)} PID=${hex(info.usbProductId ?? 0)}`);
      addLog("info", "REQUEST", "Port sekarang ter-grant. Coba lagi checkGrantedPorts() untuk verifikasi.");
      await checkGrantedPorts();
    } catch (e) {
      if (e.name === "NotFoundError") addLog("warn", "REQUEST", "User menutup dialog tanpa pilih port");
      else addLog("error", "REQUEST", `requestPort() error: ${e.name} — ${e.message}`);
    }
  }, [addLog, checkGrantedPorts]);

  // ─── Try open port test ─────────────────────────────────────────────────
  const testOpenPort = useCallback(async (portData, role) => {
    if (!navigator.serial) return;
    const allPorts = await navigator.serial.getPorts();
    const port = allPorts[portData.index];
    if (!port) { addLog("error", "OPEN_TEST", "Port tidak ditemukan"); return; }

    addLog("info", "OPEN_TEST", `Mencoba buka port[${portData.index}] sebagai ${role}...`);
    const cfg = role === "scale"
      ? { baudRate: 2400, dataBits: 7, stopBits: 1, parity: "even", bufferSize: 1024 }
      : { baudRate: 57600, dataBits: 8, stopBits: 1, parity: "none", bufferSize: 2048 };

    addLog("info", "OPEN_TEST", `Config: ${JSON.stringify(cfg)}`);

    try {
      await port.open(cfg);
      addLog("ok", "OPEN_TEST", `✅ Port berhasil dibuka! readable=${!!port.readable} writable=${!!port.writable}`);

      // Baca beberapa byte
      addLog("info", "OPEN_TEST", "Membaca 3 detik data...");
      const reader = port.readable.getReader();
      const deadline = Date.now() + 3000;
      let byteCount = 0;
      try {
        while (Date.now() < deadline) {
          const timeout = new Promise(r => setTimeout(r, deadline - Date.now(), { done: true, value: null }));
          const { done, value } = await Promise.race([reader.read(), timeout]);
          if (done) break;
          if (value) {
            byteCount += value.length;
            const hex = Array.from(value).map(b => b.toString(16).padStart(2,"0").toUpperCase()).join(" ");
            const txt = new TextDecoder("utf-8", {fatal:false}).decode(value);
            addLog("ok", "OPEN_TEST", `RX [${value.length}B]: HEX=${hex.slice(0,80)} | TXT=${txt.replace(/\n/g,"↵").replace(/\r/g,"⏎").slice(0,60)}`);
          }
        }
      } catch(e) {
        addLog("warn", "OPEN_TEST", `Read error: ${e.name} — ${e.message}`);
      } finally {
        try { reader.cancel(); reader.releaseLock(); } catch(_) {}
      }

      addLog("info", "OPEN_TEST", `Total byte diterima: ${byteCount} dalam 3 detik`);
      if (byteCount === 0) addLog("warn", "OPEN_TEST", "Tidak ada data — cek baud rate atau kabel");

      // Tutup
      await port.close();
      addLog("ok", "OPEN_TEST", "Port ditutup");
    } catch(e) {
      addLog("error", "OPEN_TEST", `open() gagal: ${e.name} — ${e.message}`);
      if (e.name === "NetworkError") {
        addLog("error", "OPEN_TEST", "→ Port sudah terbuka di tempat lain (app lain, tab lain, atau hook belum closed)");
      }
    }
  }, [addLog]);

  // ─── Clear localStorage ─────────────────────────────────────────────────
  const clearSaved = useCallback(() => {
    localStorage.removeItem(LS_SCALE);
    localStorage.removeItem(LS_RFID);
    setLs({ scale: null, rfid: null });
    addLog("warn", "LOCALSTORAGE", "Semua saved port dihapus. Auto-connect tidak akan jalan sampai Connect manual lagi.");
  }, [addLog]);

  // ─── Full diagnostic ────────────────────────────────────────────────────
  const runFullDiagnostic = useCallback(async () => {
    setLoading(true);
    logRef.current = [];
    setLogs([]);
    addLog("info", "START", "════════ FULL DIAGNOSTIC START ════════");
    addLog("info", "START", `Waktu: ${new Date().toLocaleString()}`);

    checkBrowser();
    checkLocalStorage();
    await checkGrantedPorts();

    addLog("info", "END", "════════ DIAGNOSTIC SELESAI ════════");
    setLoading(false);
  }, [checkBrowser, checkLocalStorage, checkGrantedPorts, addLog]);

  useEffect(() => { runFullDiagnostic(); }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const levelColor = {
    ok:    "#4ade80",
    info:  "#93c5fd",
    warn:  "#fbbf24",
    error: "#f87171",
  };
  const levelBg = {
    ok:    "#052e1620",
    info:  "#1e3a5f20",
    warn:  "#3f2a0020",
    error: "#3f0a0a30",
  };

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      background: "#0a0e1a",
      color: "#e2e8f0",
      minHeight: "100vh",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1f35 0%, #0f1629 100%)",
        borderBottom: "1px solid #2a3050",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.05em" }}>
            🔌 WebSerial Debug Panel
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            Diagnosa lengkap: browser, granted ports, localStorage, open test
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={runFullDiagnostic} disabled={loading} color="#3b82f6">
            {loading ? "⏳ Running..." : "🔄 Full Diagnostic"}
          </Btn>
          <Btn onClick={checkGrantedPorts} color="#8b5cf6">📋 Check Ports</Btn>
          <Btn onClick={testRequestPort} color="#10b981">🔌 Request Port Dialog</Btn>
          <Btn onClick={clearSaved} color="#ef4444">🗑 Clear Saved</Btn>
          <Btn onClick={() => { logRef.current=[]; setLogs([]); }} color="#475569">Clear Log</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "calc(100vh - 72px)" }}>
        {/* Left panel: Status cards */}
        <div style={{
          borderRight: "1px solid #1e2a40",
          padding: 16,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {/* Browser info */}
          <Card title="🌐 Browser">
            <Row label="WebSerial" val={browser.serialInNav ? "✅ ADA" : "❌ TIDAK ADA"} ok={browser.serialInNav} />
            <Row label="Secure Ctx" val={browser.secureCtx ? "✅ YA" : "❌ TIDAK"} ok={browser.secureCtx} />
            <Row label="Browser" val={browser.isChrome ? `Chrome ${browser.chromeVer}` : browser.isEdge ? "Edge" : "Other"} ok={browser.isChrome||browser.isEdge} />
            <Row label="OS" val={browser.os} />
            <Row label="Protocol" val={location.protocol} ok={browser.isHTTPS || browser.isLocalhost} />
          </Card>

          {/* LocalStorage */}
          <Card title="💾 Saved Ports (localStorage)">
            <Row label="Scale key" val={ls.scale || "—"} ok={!!ls.scale} />
            <Row label="RFID key"  val={ls.rfid  || "—"} ok={!!ls.rfid} />
            {!ls.scale && !ls.rfid && (
              <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 6, lineHeight: 1.5 }}>
                ⚠️ Kosong → auto-connect tidak akan jalan.<br />
                Klik "Request Port Dialog" untuk grant port.
              </div>
            )}
          </Card>

          {/* Granted ports */}
          <Card title={`🔌 Granted Ports (${ports.length})`}>
            {ports.length === 0 && (
              <div style={{ fontSize: 10, color: "#f87171", lineHeight: 1.6 }}>
                ❌ KOSONG — ini root cause!<br /><br />
                Browser tidak pernah menerima<br />
                permission untuk port manapun.<br /><br />
                <strong style={{ color: "#fbbf24" }}>→ Klik "Request Port Dialog"<br />
                → pilih port scale/RFID<br />
                → port akan ter-grant</strong>
              </div>
            )}
            {ports.map(p => (
              <div key={p.index} style={{
                background: "#0f172a",
                border: "1px solid #1e3a5f",
                borderRadius: 6,
                padding: "8px 10px",
                marginBottom: 8,
                fontSize: 11,
              }}>
                <div style={{ color: "#60a5fa", marginBottom: 4 }}>Port [{p.index}]</div>
                <Row label="VID" val={hex(p.info.usbVendorId ?? 0)} />
                <Row label="PID" val={hex(p.info.usbProductId ?? 0)} />
                <Row label="Key" val={p.key} />
                <Row label="Open?" val={p.isOpen ? "Ya" : "Tidak"} ok={!p.isOpen} />
                <Row label="= Scale?" val={p.matchScale ? "✅ YA" : "Tidak"} ok={p.matchScale} />
                <Row label="= RFID?"  val={p.matchRfid  ? "✅ YA" : "Tidak"} ok={p.matchRfid} />
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  <SmallBtn onClick={() => testOpenPort(p, "scale")}>▶ Test Scale</SmallBtn>
                  <SmallBtn onClick={() => testOpenPort(p, "rfid")}>▶ Test RFID</SmallBtn>
                </div>
              </div>
            ))}
          </Card>

          {/* Panduan */}
          <Card title="📖 Panduan Cepat">
            <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.7 }}>
              <div style={{ color: "#60a5fa", marginBottom: 4 }}>Flow normal:</div>
              1. Colok USB scale/RFID<br />
              2. Klik "Request Port Dialog"<br />
              3. Pilih COM port dari popup<br />
              4. Port ter-grant ke browser<br />
              5. Refresh → auto-connect jalan<br /><br />
              <div style={{ color: "#fbbf24" }}>Kenapa harus request dulu?</div>
              Keamanan browser — WebSerial tidak boleh akses USB tanpa izin eksplisit user.
            </div>
          </Card>
        </div>

        {/* Right panel: Log */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            padding: "8px 16px",
            background: "#0d1117",
            borderBottom: "1px solid #1e2a40",
            fontSize: 11,
            color: "#475569",
            display: "flex",
            gap: 16,
          }}>
            <span>📊 {logs.length} entries</span>
            {["ok","info","warn","error"].map(l => (
              <span key={l} style={{ color: levelColor[l] }}>
                {l}: {logs.filter(x=>x.level===l).length}
              </span>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {logs.map(log => (
              <div key={log.id} style={{
                display: "grid",
                gridTemplateColumns: "90px 110px 1fr",
                gap: 0,
                padding: "3px 16px",
                background: levelBg[log.level] || "transparent",
                borderLeft: `3px solid ${levelColor[log.level] || "#334155"}`,
                marginBottom: 1,
                fontSize: 11,
                lineHeight: 1.5,
              }}>
                <span style={{ color: "#475569" }}>{log.ts}</span>
                <span style={{
                  color: levelColor[log.level],
                  fontWeight: 600,
                  fontSize: 10,
                  paddingRight: 8,
                }}>
                  [{log.section}]
                </span>
                <span style={{ color: "#cbd5e1", wordBreak: "break-all" }}>{log.msg}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ color: "#334155", textAlign: "center", marginTop: 48, fontSize: 13 }}>
                Klik "Full Diagnostic" untuk mulai
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div style={{
      background: "#0f1629",
      border: "1px solid #1e2a40",
      borderRadius: 8,
      padding: "12px 14px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, letterSpacing: "0.08em" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, val, ok }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{
        color: ok === true ? "#4ade80" : ok === false ? "#f87171" : "#94a3b8",
        maxWidth: 170,
        textAlign: "right",
        wordBreak: "break-all",
      }}>{String(val)}</span>
    </div>
  );
}

function Btn({ onClick, disabled, color, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#1e2a40" : color + "22",
      color: disabled ? "#334155" : color,
      border: `1px solid ${disabled ? "#1e2a40" : color + "55"}`,
      borderRadius: 6,
      padding: "6px 12px",
      fontSize: 12,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit",
      fontWeight: 600,
      transition: "all 0.15s",
    }}>{children}</button>
  );
}

function SmallBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: "#1e2a40",
      color: "#60a5fa",
      border: "1px solid #2a3a5e",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 10,
      cursor: "pointer",
      fontFamily: "inherit",
    }}>{children}</button>
  );
}