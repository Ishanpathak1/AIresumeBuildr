const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config();
const multer = require('multer');
const mammoth = require('mammoth');
const docx4js = require('docx4js');
const fs = require('fs');

const app = express();
const port = 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve test.html at /test
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Test endpoint - make sure this comes after static middleware
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// Echo endpoint
app.post('/api/echo', (req, res) => {
    console.log('Echo request received:', req.body);
    res.json({ 
        received: req.body,
        timestamp: new Date().toISOString()
    });
});

// OpenAI endpoint
app.post('/api/openai', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000
        });

        res.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ 
            error: 'Failed to process OpenAI request',
            details: error.message 
        });
    }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        console.log('Processing file:', req.file.path);
        
        // Convert DOCX to HTML
        const result = await mammoth.convertToHtml({ path: req.file.path });
        
        console.log('Conversion successful');
        
        // Send the HTML content
        res.json({ 
            content: result.value,
            messages: result.messages
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// Helper function to transform paragraphs
function transformParagraph(paragraph) {
    // Keep paragraph styles
    return paragraph;
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
});