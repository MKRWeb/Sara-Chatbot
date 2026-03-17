document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Auto-Playing Video Logic ---
    const video = document.getElementById('bg-video');
    
    // Fallback: Some browsers strictly block autoplay. This forces it to play.
    video.play().catch(e => console.log("Waiting for user interaction to play video."));

    // The Animation Loop (Watches the video timeline to trigger text)
    function renderAutoPlay() {
        requestAnimationFrame(renderAutoPlay);

        if (video.duration) {
            // Calculate progress (0.0 at start, 1.0 at the end)
            let progress = video.currentTime / video.duration;
            if (progress > 1.0) progress = 1.0;
            
            updateHTMLUI(progress);
        }
    }
    
    // Start the loop
    renderAutoPlay();

    // --- 2. Text Overlay Timings ---
    const sections = [
        document.getElementById('sec-0'), document.getElementById('sec-1'),
        document.getElementById('sec-2'), document.getElementById('sec-3')
    ];
    
    // Adjust these numbers (0.0 to 1.0) to control WHEN the text appears during the video
    // e.g., 0.50 means it happens exactly halfway through the video
    const sectionTimings = [
        { start: 0.00, peak: 0.10, hold: 0.15, end: 0.25 },
        { start: 0.25, peak: 0.35, hold: 0.40, end: 0.50 },
        { start: 0.50, peak: 0.60, hold: 0.65, end: 0.75 },
        { start: 0.75, peak: 0.85, hold: 1.00, end: 1.00 } // Last section stays until button is clicked
    ];

    function updateHTMLUI(progress) {
        sections.forEach((sec, index) => {
            if(!sec) return;
            const t = sectionTimings[index];
            let opacity = 0; 
            let translateY = 50; // Starts pushed down slightly

            if (progress >= t.start && progress <= t.end) {
                if (progress < t.peak) {
                    // Fading In & Floating Up
                    const p = (progress - t.start) / (t.peak - t.start);
                    opacity = p; 
                    translateY = 50 - (p * 50); 
                } else if (progress <= t.hold) {
                    // Holding steady
                    opacity = 1; 
                    translateY = 0;
                } else if (index !== sections.length - 1) { 
                    // Fading Out & Floating Up further (except the final section)
                    const p = (progress - t.hold) / (t.end - t.hold);
                    opacity = 1 - p; 
                    translateY = 0 - (p * 50); 
                } else {
                    opacity = 1; translateY = 0;
                }
            } else if (index === sections.length - 1 && progress > t.end) {
                // Keep the final section visible at the end of the video
                opacity = 1; translateY = 0;
            }

            sec.style.opacity = Math.max(0, opacity);
            sec.style.transform = `translateY(${translateY}px)`;
            sec.style.pointerEvents = opacity > 0.8 ? 'auto' : 'none';
        });
    }

    // --- 3. Chat Interface Logic ---
    const sayHelloBtn = document.getElementById('say-hello-btn');
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const farewellOverlay = document.getElementById('farewell-overlay');

    if(sayHelloBtn) {
        sayHelloBtn.addEventListener('click', () => {
            history.pushState({ page: 'chat' }, 'Chat with Sara', '#chat');
            chatInterface.classList.remove('hidden'); 
            
            if(chatMessages.children.length === 0) {
                setTimeout(() => appendMessage("bot", "Hi there. You made it to the bottom. I'm ready to listen. 💜"), 800);
            }
        });
    }

    window.addEventListener('popstate', (event) => {
        if (!chatInterface.classList.contains('hidden')) {
            handleExitChat();
        }
    });

    function handleExitChat() {
        chatInterface.classList.add('hidden');
        farewellOverlay.style.opacity = '1';
        farewellOverlay.style.pointerEvents = 'auto';

        setTimeout(() => {
            farewellOverlay.style.opacity = '0';
            farewellOverlay.style.pointerEvents = 'none';
        }, 3000); 
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        chatInput.value = '';
        
        const typingId = "typing-" + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot');
        typingDiv.id = typingId;
        typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const systemPrompt = "You are Sara. You are a romantic, sweet, deeply empathetic, and completely non-judgmental listener.";
            const fullPrompt = `${systemPrompt} The user says: "${text}"`;
            const response = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
            const aiText = await response.text();

            const typingEl = document.getElementById(typingId);
            if(typingEl) typingEl.remove();
            appendMessage('bot', aiText);
        } catch (error) {
            const typingEl = document.getElementById(typingId);
            if(typingEl) typingEl.remove();
            appendMessage('bot', "I'm having a little trouble connecting right now, but I'm still here. 💜");
        }
    }

    if(sendBtn && chatInput) {
        sendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
});
