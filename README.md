# AI-Powered Resume Editor

## Overview

The AI-Powered Resume Editor is a web-based application designed to help job seekers create, edit, and optimize their resumes with AI assistance. The tool provides a rich text editor with formatting options, DOCX import/export capabilities, and AI-powered suggestions to improve resume content based on job descriptions.

![AI-Powered Resume Editor](https://placeholder-for-screenshot.com)

## Features

### Document Editing
- **Rich Text Editor**: Full-featured editor with formatting options (bold, italic, lists, headings, etc.)
- **DOCX Import**: Upload existing DOCX resume files
- **DOCX Export**: Download your resume in DOCX format, preserving all formatting
- **Resume Templates**: Start with pre-designed resume templates

### AI Assistance
- **Document Analysis**: AI analysis of your resume to identify improvement areas
- **Section Marking**: Mark different sections of your resume (experience, education, skills, etc.)
- **AI Chat Assistant**: Get personalized suggestions to improve your resume
- **ATS Optimization**: Receive suggestions to make your resume more ATS-friendly

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ai-resume-editor.git
   ```

2. Navigate to the project directory:
   ```
   cd ai-resume-editor
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Usage

1. **Create a New Resume**:
   - Click "Start Editing Now" on the homepage
   - Use the rich text editor to create your resume
   - Or click "Resume Template" to start with a template

2. **Import Existing Resume**:
   - Click "Upload DOCX" to import an existing resume
   - Your document will be loaded into the editor

3. **Edit Your Resume**:
   - Use the toolbar to format text (bold, italic, lists, etc.)
   - Add or modify content as needed

4. **Mark Sections**:
   - Select text you want to mark as a section
   - Click "Mark Section"
   - Choose a section type (e.g., Experience, Education, Skills)

5. **Get AI Assistance**:
   - Click "Analyze Document" for general suggestions
   - Click "AI Assistant" to chat with the AI
   - Paste job descriptions to get tailored suggestions

6. **Export Your Resume**:
   - Click "Download DOCX" to save your resume as a DOCX file
   - Click "Save HTML" to save your resume as an HTML file

## Technologies Used

- **Frontend**:
  - HTML5, CSS3, JavaScript
  - Quill.js (rich text editor)
  - Font Awesome (icons)

- **Document Processing**:
  - Mammoth.js (DOCX import)
  - docx.js (DOCX export)

- **AI Integration**:
  - OpenAI API (for AI assistance)

## Project Structure

```
ai-resume-editor/
├── public/
│   ├── index.html           # Homepage
│   ├── upload-test.html     # Editor page
│   ├── enhanced-styles.css  # Styles for the application
│   ├── enhanced-script.js   # Main JavaScript functionality
│   └── favicon.ico          # Website favicon
├── README.md                # Project documentation
└── package.json             # Project dependencies
```

## Implementation Details

### DOCX Import/Export
The application uses Mammoth.js to convert uploaded DOCX files to HTML for editing in the Quill editor. For exporting, it uses docx.js to convert the HTML content back to DOCX format, preserving formatting such as bold, italic, lists, and headings.

### AI Assistance
The AI assistance features are implemented using a combination of:
- Section marking to identify different parts of the resume
- AI analysis to provide suggestions for improvement
- Chat interface for interactive assistance

### User Interface
The UI is designed to be clean and intuitive, with:
- A homepage that explains the tool's features
- An editor page with a full-featured text editor
- A toolbar for document actions and AI tools
- A chat panel for AI assistance

## Future Enhancements

- **Real-time Collaboration**: Allow multiple users to edit the same resume
- **PDF Export**: Add support for exporting resumes as PDF files
- **More Templates**: Add additional resume templates for different industries
- **Advanced AI Features**: Implement more sophisticated AI analysis and suggestions
- **User Accounts**: Add user authentication and resume storage

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Quill.js for the rich text editor
- Mammoth.js for DOCX import functionality
- docx.js for DOCX export functionality
- OpenAI for AI assistance capabilities

---

For questions or support, please open an issue on the GitHub repository.
