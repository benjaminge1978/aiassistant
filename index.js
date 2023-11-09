import dotenv from 'dotenv';
import express from 'express';
import { createReadStream } from 'fs';
import http from 'http';
import { join } from 'path';
import { Server } from 'socket.io';
import pdf from 'pdf-parse';
import OpenAI from 'openai';

// Initialize dotenv to use environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or specify your Netlify URL for security
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

const pdfPath = 'docs/kjopsguide.pdf';
let pdfText = '';
let dataBuffer = createReadStream(pdfPath);

pdf(dataBuffer).then(function(data) {
  pdfText = data.text;
}).catch(err => {
  console.error('Error reading PDF:', err);
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // This can be omitted if you've set OPENAI_API_KEY in your environment variables
});

async function getOpenAIResponse(question) {
  const prompt = `The following is a question from a user:\n"${question}"\n\nThe context from the PDF is as follows:\n${pdfText}\n\nThe answer is:`;

  try {
    const response = await openai.completions.create({
      model: "text-davinci-003", // Replace with your model of choice
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
