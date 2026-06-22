(function () {
  const bubble = document.createElement("div");
  bubble.innerHTML = "💬";
  bubble.style.position = "fixed";
  bubble.style.bottom = "20px";
  bubble.style.right = "20px";
  bubble.style.width = "60px";
  bubble.style.height = "60px";
  bubble.style.borderRadius = "50%";
  bubble.style.background = "#2563eb";
  bubble.style.color = "white";
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.fontSize = "28px";
  bubble.style.cursor = "pointer";
  bubble.style.zIndex = "9999";
  bubble.style.boxShadow = "0 4px 12px rgba(0,0,0,.2)";

  const panel = document.createElement("div");
  panel.style.position = "fixed";
  panel.style.bottom = "90px";
  panel.style.right = "20px";
  panel.style.width = "320px";
  panel.style.height = "420px";
  panel.style.background = "#fff";
  panel.style.border = "1px solid #ddd";
  panel.style.borderRadius = "12px";
  panel.style.display = "none";
  panel.style.zIndex = "9999";
  panel.style.boxShadow = "0 4px 20px rgba(0,0,0,.2)";

  panel.innerHTML = `
    <div style="background:#2563eb;color:white;padding:12px;font-weight:bold;">
      AL-NOOR Assistant
    </div>

    <div style="padding:15px;">
      <p>👋 Welcome to AL-NOOR.</p>
      <p>Future AI Assistant will answer:</p>
      <ul>
        <li>Course Fees</li>
        <li>Class Timing</li>
        <li>Installments</li>
        <li>Online Classes</li>
      </ul>
    </div>
  `;

  bubble.onclick = () => {
    panel.style.display =
      panel.style.display === "none" ? "block" : "none";
  };

  document.body.appendChild(bubble);
  document.body.appendChild(panel);
})();
