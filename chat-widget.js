// Cinepax chat widget — shared by every page.
// Include with: <script src="chat-widget.js" defer></script> just before </body>.
// Styles live in style.css (Chat widget section). Talks to /.netlify/functions/chat.
(function () {
  const root = document.createElement('div');
  root.innerHTML = `
    <button id="chatToggle" aria-label="Open chat assistant" aria-expanded="false">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>
    </button>
    <div id="chatPanel" role="dialog" aria-label="Cinepax chat assistant">
      <div id="chatHeader">
        <span>Ask Cinepax</span>
        <button id="chatClose" aria-label="Close chat">✕</button>
      </div>
      <div id="chatMessages">
        <div class="chat-msg bot">Hi! I can help with showtimes, ticket prices, ratings, or general questions about Cinepax. What do you need?</div>
      </div>
      <div id="chatInputRow">
        <textarea id="chatInput" rows="1" placeholder="Type a message..."></textarea>
        <button id="chatSend">Send</button>
      </div>
    </div>`;
  while (root.firstElementChild) document.body.appendChild(root.firstElementChild);

  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');

  const history = []; // { role: 'user' | 'assistant', content: '...' }

  function openChat() { panel.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); input.focus(); }
  function closeChat() { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => (panel.classList.contains('open') ? closeChat() : openChat()));
  closeBtn.addEventListener('click', closeChat);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeChat(); toggle.focus(); } });

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = '';
    sendBtn.disabled = true;
    addMessage('user', text);
    history.push({ role: 'user', content: text });

    const typingEl = addMessage('bot', 'Typing...');
    typingEl.classList.add('typing');

    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await res.json();
      typingEl.remove();
      if (data.reply) {
        addMessage('bot', data.reply);
        history.push({ role: 'assistant', content: data.reply });
      } else {
        history.pop(); // drop the unanswered user turn so the next request stays valid
        addMessage('bot', 'Sorry, something went wrong. Please try again.');
      }
    } catch (err) {
      typingEl.remove();
      history.pop();
      addMessage('bot', "Sorry, I couldn't connect. Please try again in a moment.");
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();
