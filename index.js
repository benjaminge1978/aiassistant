require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const pdf = require('pdf-parse');
const fs = require('fs');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // or specify your Netlify URL for security
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const pdfPath = 'docs/kjopsguide.pdf';
let pdfText = '';
let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
  pdfText = data.text;
}).catch(err => {
  console.error('Error reading PDF:', err);
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getOpenAIResponse(question) {
  const prompt = `The following is a question from a user:\n"${question}"\n\nThe context from the PDF is as follows:\n${pdfText}\n\nThe answer is:`;

  try {
    const response = await openai.completions.create({
      model: "gpt-4-1106-preview", // Replace with your model of choice
      prompt: prompt,
      max_tokens: 150
    });

    return response.choices[0].text.trim();
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return "I'm sorry, I encountered an error while fetching the response.";
  }
}

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  socket.on('chat message', async (msg) => {
    const answer = await getOpenAIResponse(msg);
    socket.emit('chat message', { question: msg, answer });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
