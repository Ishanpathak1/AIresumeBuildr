require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');
const multer = require('multer');
const mammoth = require('mammoth');
const docx4js = require('docx4js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI with API key from .env
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

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

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
    res.json({ status: 'Server is running correctly' });
});

// Echo endpoint
app.post('/api/echo', (req, res) => {
    console.log('Echo request received:', req.body);
    res.json({ 
        received: req.body,
        timestamp: new Date().toISOString()
    });
});

// API endpoint for document analysis
app.post('/api/analyze', async (req, res) => {
    try {
        console.log('Analyze API called with:', req.body);
        const { content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Document content is empty' });
        }
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert resume reviewer. Analyze the resume and provide specific, actionable feedback to improve it."
                },
                {
                    role: "user",
                    content: content
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        res.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for chat messages
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Chat API called with:', req.body);
        const { message, sectionContent, sectionName } = req.body;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are an expert resume reviewer. The user will provide a job description or question. 
                                Analyze their resume ${sectionName !== 'entire document' ? `section "${sectionName}"` : 'document'} 
                                and provide specific, actionable feedback to improve it for the job they're targeting.`
                },
                {
                    role: "user",
                    content: `Resume ${sectionName !== 'entire document' ? `section "${sectionName}": ${sectionContent}` : `content: ${sectionContent}`}
                                
                                My request: ${message}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        res.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for section optimization
app.post('/api/optimize', async (req, res) => {
    try {
        console.log('Optimize API called with:', req.body);
        const { sectionContent, sectionName, jobDescription } = req.body;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are an expert resume optimizer. You will be given a resume section and a job description.
                                Rewrite the resume section to better match the job description, incorporating relevant keywords
                                and highlighting relevant experience. Keep the same basic information but make it more appealing
                                for the specific job. Return ONLY the optimized text without any explanations.`
                },
                {
                    role: "user",
                    content: `Resume section "${sectionName}": ${sectionContent}
                                
                                Job description: ${jobDescription}
                                
                                Please optimize this resume section for the job description.`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        res.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ error: error.message });
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

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test the server at: http://localhost:${PORT}/api/test`);
});