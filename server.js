const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');

require('dotenv').config();

const { OpenAI } = require('openai');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const Interaction = require('./models/Interaction');
const EventLog = require('./models/EventLog');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

// Serves static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, rsp) => {
    rsp.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/chat', (req, rsp) => {
    rsp.sendFile(path.join(__dirname, 'public', 'chat.html'))
})

app.post('/chat', async (req, res) => {
  const { history = [],  message, participantID } = req.body;

  if (!participantID) {
    return res.status(400).send('Participant ID is required')
  }

  console.log(`Message: ${message}`);
  try {
    // search results
    const bingResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
      params: { q: message }, // Use the user's input as the search query
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
      }
    });

    console.log(bingResponse);

    const searchResults = bingResponse.data.webPages.value.slice(0, 3).map(result => ({
      title: result.name,
      url: result.url,
      snippet: result.snippet
    }));

    const messages = history.length === 0
      ? [{ role: 'system', content: 'You are a helpful assistant.' }, {
        role: 'user', content: message }]
      : [{ role: 'system', content: 'You are a helpful assistant.' },
        ...history, { role: 'user', content: message }];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Model to use
      messages: messages,
      max_tokens: 512, // Limit response length
    });

    const botResponse = response.choices[0].message.content.trim();
    console.log(`Response: ${botResponse}`);

    const interaction = new Interaction({
      userInput: message,
      botResponse: botResponse,
      participantID: participantID
    });
    await interaction.save();

    res.json({ message, response: botResponse, searchResults });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Server Error');
  }
});


app.post('/history', async (req, res) => {
  const { participantID } = req.body; // Get participant ID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }

  try {
    // Fetch all interactions from the database for the given participantID
    const interactions = await Interaction.find({ participantID }).sort( { timestamp: 1 });
    // Send the conversation history back to the client
    res.json({ interactions });
  } catch (error) {
    console.error('Error fetching conversation history:', error.message);
    res.status(500).send('Server Error');
  }
});

app.post('/log-event', async (req, res) => {
  const { eventType, elementName, timestamp, participantID } = req.body;

  if (!participantID) {
    return res.status(400).send('Participant ID is required')
  }

  try {
    // Log the event to MongoDB
    const event = new EventLog({ eventType, elementName, timestamp, participantID });
    await event.save();
    res.status(200).send('Event logged successfully');
  } catch (error) {
    console.error('Error logging event:', error.message);
    res.status(500).send('Server Error');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
