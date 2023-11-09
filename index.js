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
const io = socketIO(server);

app.use(express.static('public')); // Serve static files from the public directory

// Serve index.html at the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Read PDF file and store text
const pdfPath = 'docs/kjopsguide.pdf'; // Replace with your PDF file path
let pdfText = '';
let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    pdfText = data.text;
}).catch(err => {
    console.error('Error reading PDF:', err);
});

// Instantiate OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to query OpenAI API
async function getOpenAIResponse(question) {
    try {
        // Truncate the context if it's too long
        const MAX_PROMPT_LENGTH = 2048; // Adjusted for OpenAI's maximum context length
        let truncatedPdfText = pdfText.slice(0, MAX_PROMPT_LENGTH) + (pdfText.length > MAX_PROMPT_LENGTH ? '...' : '');

        const prompt = `Question: ${question}\n\nPDF Context: ${truncatedPdfText}\n\nAnswer:`;
        const completion = await openai.completions.create({
            model: 'text-davinci-003', // or the model of your choice
            prompt: prompt,
            max_tokens: 150, // Adjust if needed
            temperature: 0.7
        });
        return completion.choices[0].text.trim();
    } catch (error) {
        // Enhanced error logging
        if (error instanceof OpenAI.APIError) {
            console.error('OpenAI APIError status:', error.status);
            console.error('OpenAI APIError message:', error.message);
            console.error('OpenAI APIError code:', error.code);
            console.error('OpenAI APIError type:', error.type);
        } else {
            console.error('Error calling OpenAI API:', error);
        }
        return "I'm sorry, I encountered an error while fetching the response.";
    }
}

// Socket.io event handling
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('A user disconnected');
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
