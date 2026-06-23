panel.innerHTML = `
<div style="
  background:#2563eb;
  color:white;
  padding:12px;
  font-weight:bold;
  font-size:16px;
">
  AL-NOOR AI Assistant
</div>

<div id="chatMessages"
     style="
      height:280px;
      padding:12px;
      overflow-y:auto;
      font-size:14px;
      line-height:1.6;
     ">

  <div style="
      background:#f5f7ff;
      padding:10px;
      border-radius:8px;
      margin-bottom:10px;
  ">

    👋 Welcome to AL-NOOR Educational Centre.

    <br><br>

    🌍 You can ask questions in:

    <ul>
      <li>English</li>
      <li>Español</li>
      <li>Urdu</li>
      <li>Roman Urdu</li>
    </ul>

    📚 Ask about:

    <ul>
      <li>Course Information</li>
      <li>Course Fees</li>
      <li>Class Timings</li>
      <li>Driving Licence Courses</li>
      <li>Taxi Courses</li>
      <li>VTC Courses</li>
      <li>DELE A2 / B1</li>
      <li>CCSE Preparation</li>
      <li>Registration Process</li>
      <li>Online & Presential Classes</li>
    </ul>

    💡 Examples:

    <ul>
      <li>What is the fee for Taxi Madrid?</li>
      <li>How can I register?</li>
      <li>Permiso B course fee?</li>
      <li>¿Cuál es el precio de DELE A2?</li>
      <li>CCSE ki fee kitni hai?</li>
    </ul>

  </div>

</div>

<div style="
    padding:10px;
    border-top:1px solid #ddd;
">
  <input
    id="chatInput"
    type="text"
    placeholder="Ask your question..."
    style="
      width:70%;
      padding:8px;
      border:1px solid #ccc;
      border-radius:6px;
    "
  />

  <button
    id="sendBtn"
    style="
      padding:8px 12px;
      background:#2563eb;
      color:white;
      border:none;
      border-radius:6px;
      cursor:pointer;
    ">
    Send
  </button>
</div>
`;

setTimeout(() => {

const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

sendBtn.onclick = async () => {

    const question = chatInput.value;

    if(!question) return;

    chatMessages.innerHTML += `
      <div style="margin-top:10px;">
        <b>You:</b> ${question}
      </div>
    `;

    chatInput.value = "";

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/chat",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            message:question
          })
        }
      );

      const data = await response.json();

      chatMessages.innerHTML += `
        <div style="
          margin-top:10px;
          padding:8px;
          background:#f7f7f7;
          border-radius:8px;
        ">
          <b>AL-NOOR:</b><br>
          ${data.answer}
        </div>
      `;

      chatMessages.scrollTop =
      chatMessages.scrollHeight;

    } catch(err){

      chatMessages.innerHTML += `
        <div style="
          color:red;
          margin-top:10px;
        ">
          Unable to connect to AI server.
        </div>
      `;
    }

};

chatInput.addEventListener("keypress", function(e){

  if(e.key === "Enter"){
      sendBtn.click();
  }

});

},500);
