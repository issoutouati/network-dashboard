window.addEventListener("DOMContentLoaded", () => {

  // ============ SAFE ELEMENT GET ============
  const $ = (id) => document.getElementById(id);

  const alertBox = $("alertBox");
  const alertText = $("alertText");

  const banner = $("systemBanner");
  const bannerText = $("bannerText");

  const heroPingEl = $("heroPing");
  const heroScoreEl = $("heroScore");

  const ipEl = $("ip");
  const statusEl = $("status");
  const pingEl = $("ping");
  const locationEl = $("location");
  const scoreEl = $("networkScore");

  const canvas = document.getElementById("pingChart");
  const ctx = canvas.getContext("2d");

  // ============ STATE ============
  let monitoring = false;
  let interval = null;

  let pingHistory = [];
  let points = [];

  // ===== Canvas fix =====
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = 220;
  }
  resizeCanvas();

  // ============ BUTTONS ============
  window.checkNetwork = updateNetwork;

  window.toggleTheme = () => {
    document.body.classList.toggle("dark");
  };

  window.toggleMonitoring = () => {

    if (monitoring) {
      clearInterval(interval);
      monitoring = false;
      return;
    }

    monitoring = true;
    updateNetwork();
    interval = setInterval(updateNetwork, 2000);
  };

  // ============ MAIN ============
  function updateNetwork() {

    try {

      statusEl.innerText = "Checking... ⏳";
      ipEl.innerText = "Loading...";
      pingEl.innerText = "--";
      locationEl.innerText = "--";

      fetch("https://api.ipify.org?format=json")
        .then(res => res.json())
        .then(ipData => {

          ipEl.innerText = ipData.ip;

          const ping = Math.floor(Math.random() * 120 + 20);

          pingHistory.push(ping);
          if (pingHistory.length > 10) pingHistory.shift();

          points.push(ping);
          if (points.length > 30) points.shift();

          drawChartSafe();

          const result = analyzeConnection(ping);

          pingEl.innerText = ping + " ms";
          heroPingEl.innerText = ping + " ms";

          const score = calculateScore(ping);
          scoreEl.innerText = score + "/100";
          heroScoreEl.innerText = score;

          statusEl.innerText = result.text;
          statusEl.className = result.level;

          updateStats();

          return fetch("https://ipwho.is/?output=json");

        })
        .then(res => res.json())
        .then(locData => {

          locationEl.innerText =
            `${locData.city || "--"}, ${locData.country || "--"}`;

        })
        .catch(err => {
          console.log("API error:", err);

          statusEl.innerText = "Disconnected 🔴";
          statusEl.className = "bad";

          ipEl.innerText = "--";
          pingEl.innerText = "--";
          locationEl.innerText = "--";
        });

    } catch (e) {
      console.log("JS crash:", e);
    }
  }

  // ============ LOGIC ============
  function analyzeConnection(ping) {
    if (ping < 60) return { text: "Good 🟢", level: "good" };
    if (ping < 120) return { text: "Weak 🟡", level: "weak" };
    return { text: "Bad 🔴", level: "bad" };
  }

  function calculateScore(ping) {
    if (ping < 50) return 95;
    if (ping < 80) return 82;
    if (ping < 120) return 65;
    return 35;
  }

  // ============ STATS ============
  function avg() {
    if (!pingHistory.length) return 0;
    return Math.floor(pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length);
  }

  function max() {
    return pingHistory.length ? Math.max(...pingHistory) : 0;
  }

  function min() {
    return pingHistory.length ? Math.min(...pingHistory) : 0;
  }

  function updateStats() {
    $("avgPing").innerText = avg() + " ms";
    $("maxPing").innerText = max() + " ms";
    $("minPing").innerText = min() + " ms";
  }

  // ============ GRAPH ============
 // ============ GRAPH (PRO VERSION) ============
  function drawChartSafe() {
    if (!ctx || !canvas) return;

    // تنظيف ساحة الرسم
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // ===== GRID LINES & LABELS =====
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = "11px Inter, Segoe UI, sans-serif";

    const yLabels = [150, 100, 50, 0];
    for (let i = 0; i < yLabels.length; i++) {
      let y = padding + i * (chartHeight / (yLabels.length - 1));
      
      // رسم خط الشبكة الأفقي
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // نصوص المحور الصادي Y
      ctx.fillText(yLabels[i] + " ms", 8, y + 4);
    }

    // نصوص المحور السيني X
    for (let i = 0; i < 5; i++) {
      let x = padding + i * (chartWidth / 4);
      ctx.fillText((i + 1) + "s", x - 5, canvas.height - 10);
    }

    if (points.length < 2) return;

    // ===== تحويل البيانات إلى إحداثيات (X, Y) =====
    const coords = points.map((ping, i) => {
      const x = padding + (i / 30) * chartWidth;
      // قصر قيمة البينج على 150 كحد أقصى للرسم منعاً لخروجه من الإطار
      const clampedPing = Math.min(ping, 150);
      const y = canvas.height - padding - (clampedPing / 150) * chartHeight;
      return { x, y };
    });

    // ===== إنشاء تدرج لوني ممتد للمنحنى بالكامل =====
    const lineGradient = ctx.createLinearGradient(padding, 0, canvas.width - padding, 0);
    lineGradient.addColorStop(0, "#10b981");   // أخضر زمردي للبداية المستقرة
    lineGradient.addColorStop(0.5, "#f59e0b"); // أصفر دافئ للمنطقة المتوسطة
    lineGradient.addColorStop(1, "#ef4444");   // أحمر نيون للارتفاعات المفاجئة

    // ===== 1. رسم المساحة المظلمة تحت المنحنى (AREA FILL) =====
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, canvas.height - padding);
    ctx.lineTo(coords[0].x, coords[0].y);

    // رسم المنحنى الانسيابي للمساحة
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, p1.x, p1.y);
    }
    
    ctx.lineTo(coords[coords.length - 1].x, canvas.height - padding);
    ctx.closePath();

    // تدرج عمودي للمساحة (ملون من الأعلى، شفاف تماماً في الأسفل)
    const areaGradient = ctx.createLinearGradient(0, padding, 0, canvas.height - padding);
    areaGradient.addColorStop(0, "rgba(16, 185, 129, 0.25)");
    areaGradient.addColorStop(0.6, "rgba(245, 158, 11, 0.05)");
    areaGradient.addColorStop(1, "rgba(239, 68, 68, 0)");
    
    ctx.fillStyle = areaGradient;
    ctx.fill();
    ctx.restore();

    // ===== 2. رسم خط المنحنى المتوهج (NEON LINE) =====
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, p1.x, p1.y);
    }

    // إعدادات الخط الاحترافي والتوهج
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // تأثير إضاءة النيون الخلفية خلف الخط
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
    
    ctx.stroke();
    ctx.restore();

    // ===== 3. رسم النقطة الأخيرة الحالية فقط (CURRENT PIN) =====
    // بدلاً من ملء الشاشة بنقاط بيضاء مزدحمة، نضع نقطة مميزة ومضيئة على آخر قيمة تم رصدها
    const lastPoint = coords[coords.length - 1];
    
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; // الحلقة الخارجية الشفافة
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff"; // النواة البيضاء المركزية
    ctx.fill();
  }
  // START
  updateNetwork();

});