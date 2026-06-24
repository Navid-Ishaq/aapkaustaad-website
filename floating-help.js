document.addEventListener("DOMContentLoaded", function () {


    // Create container
    const container = document.createElement("div");
    container.id = "alnoor-help-container";

    // Button
    const button = document.createElement("div");
    button.id = "alnoor-help-button";
    button.innerHTML = "✨ Click Me";

    // Message Panel
    const panel = document.createElement("div");
    panel.id = "alnoor-help-panel";

    panel.innerHTML = `
        <div class="alnoor-message">
            🤖 For any query, please click the
            <strong>Hola</strong> button available at the
            bottom-right corner.
            <br><br>
            AL-NOOR AI Assistant is ready to help you.
        </div>
    `;

    container.appendChild(button);
    container.appendChild(panel);
    document.body.appendChild(container);
    });

    // Toggle
    button.addEventListener("click", () => {
        panel.classList.toggle("show");
    });

    // CSS
    const style = document.createElement("style");
    style.innerHTML = `

    #alnoor-help-container{
        position:fixed;
        top:90px;
        left:20px;
        z-index:999999;
        display:flex;
        align-items:center;
        gap:12px;
        font-family:Arial, sans-serif;
    }

    /* BUTTON */

    #alnoor-help-button{
        cursor:pointer;
        padding:14px 22px;
        border-radius:50px;
        font-weight:bold;
        font-size:18px;
        color:#003366;

        background:linear-gradient(
            135deg,
            #ffff66,
            #ffeb3b,
            #00ff99,
            #00e5ff
        );

        background-size:300% 300%;

        box-shadow:
            0 0 10px #ffff66,
            0 0 20px #00ff99,
            0 0 40px #00e5ff;

        animation:
            alnoorPulse 1.5s infinite,
            alnoorGradient 4s ease infinite;

        user-select:none;
        white-space:nowrap;
    }

    /* MESSAGE PANEL */

    #alnoor-help-panel{
        max-width:0;
        overflow:hidden;

        transition:
            max-width .5s ease,
            padding .5s ease;

        border-radius:18px;

        background:linear-gradient(
            135deg,
            #ffffff,
            #e8fff5,
            #d8f8ff
        );

        box-shadow:
            0 0 15px rgba(0,255,150,.5),
            0 0 30px rgba(0,200,255,.4);

        color:#003366;
        font-size:16px;
        line-height:1.6;

        padding:0;
    }

    #alnoor-help-panel.show{
        max-width:420px;
        padding:18px 24px;
    }

    .alnoor-message{
        min-width:350px;
    }

    /* Pulse Animation */

    @keyframes alnoorPulse{

        0%{
            transform:scale(1);
            box-shadow:
            0 0 10px #ffff66,
            0 0 20px #00ff99;
        }

        50%{
            transform:scale(1.08);
            box-shadow:
            0 0 20px #ffff66,
            0 0 40px #00ff99,
            0 0 60px #00e5ff;
        }

        100%{
            transform:scale(1);
            box-shadow:
            0 0 10px #ffff66,
            0 0 20px #00ff99;
        }
    }

    /* Moving Gradient */

    @keyframes alnoorGradient{
        0%{
            background-position:0% 50%;
        }
        50%{
            background-position:100% 50%;
        }
        100%{
            background-position:0% 50%;
        }
    }

    /* Mobile */

    @media(max-width:768px){

        #alnoor-help-container{
            top:80px;
            left:10px;
        }

        #alnoor-help-button{
            font-size:14px;
            padding:10px 16px;
        }

        #alnoor-help-panel.show{
            max-width:260px;
            padding:12px 16px;
        }

        .alnoor-message{
            min-width:auto;
            font-size:14px;
        }
    }

    `;
    document.head.appendChild(style);

})();
