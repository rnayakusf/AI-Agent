const inputField = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const messageContainer = document.getElementById("messages");
let conversationHistory = [];
// participant id
const participantID = localStorage.getItem('participantID');
if (!participantID) {
  alert('Please enter a participant ID.')
  window.location.href = '/';
}

async function loadConversationHistory() {
  const target = '/history'
  const response = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantID }) // Send participantID to the server
  });
  const data = await response.json();
  if (data.interactions && data.interactions.length > 0) {
    data.interactions.forEach(interaction => {
      messageContainer.insertAdjacentHTML('beforeend', `<p class="message">You: ${interaction.userInput}</p>`);
      messageContainer.insertAdjacentHTML('beforeend', `<p class="response">Bot: ${interaction.botResponse}</p>`);
      // Add to conversation history
      conversationHistory.push({ role: 'user', content: interaction.userInput });
      conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
    });
  }
}

// Load history when agent loads
window.onload = loadConversationHistory;

async function sendMessage() {
  const input = inputField.value;
  if (input == "") {
    alert("No message to send");
  } else {
      messageContainer.insertAdjacentHTML('beforeend', `<p class="message">User: ${input}</p>`);
      inputField.value = "";

      const payload = conversationHistory.length === 0
        ? { message: input, participantID } // First submission, send only input
	: { history: conversationHistory, message: input, participantID };

      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(data);

    messageContainer.insertAdjacentHTML('beforeend', `<p class="response">Bot: ${data.response}</p>`);

    // add user input and bot response to the conversation history
    conversationHistory.push({ role: 'user', content: input });
    conversationHistory.push({ role: 'assistant', content: data.response });

    if (data.searchResults && data.searchResults.length > 0) {
      const searchResultsDiv = document.createElement('div');
      data.searchResults.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `<a href="${result.url}" target="_blank">${result.title}</a><p>${result.snippet}</p>`;
        searchResultsDiv.appendChild(resultDiv);
      });
      messageContainer.appendChild(searchResultsDiv);
    }
  }
}

sendBtn.addEventListener('click', () => {
  sendMessage();
  logEvent('click', 'Send Button');
});

inputField.addEventListener('keydown', (keyEvent) => {
  if (keyEvent.key == 'Enter') {
    sendMessage();
  }
});

inputField.addEventListener('mouseover', () => {
  logEvent('hover', 'User Input');
});

inputField.addEventListener('focus', () => {
  logEvent('focus', 'User Input');
});

function logEvent(type, element) {
  fetch('/log-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      eventType: type,
      elementName: element,
      timestamp: new Date(),
      participantID
    })
  });
}
