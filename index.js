require('dotenv').config();
const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
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

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function getOpenAIResponse(question) {
  // ... your OpenAI API call and response handling ...
}

io.on('connection', (socket) => {
  // ... your socket.io event handling ...
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
