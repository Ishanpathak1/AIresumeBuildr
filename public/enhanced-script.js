// Global variables
let quill;
let documentSections = [];

// Initialize the editor when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded');
  
  // Initialize Quill editor with a comprehensive toolbar
  quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ]
    },
    placeholder: 'Compose your document...',
    bounds: '#editor'
  });
  
  console.log('Quill initialized');
  
  // Setup section type selector
  const sectionTypeSelect = document.getElementById('section-type');
  const customSectionContainer = document.getElementById('custom-section-container');
  
  if (sectionTypeSelect) {
    sectionTypeSelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        customSectionContainer.style.display = 'block';
      } else {
        customSectionContainer.style.display = 'none';
      }
    });
  }
  
  // Setup file upload
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('docx-upload');
  
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', function() {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      document.getElementById('debug-info').textContent = 'Loading file: ' + file.name;
      
      const reader = new FileReader();
      reader.onload = function(loadEvent) {
        const arrayBuffer = loadEvent.target.result;
        
        mammoth.convertToHtml({arrayBuffer: arrayBuffer})
          .then(function(result) {
            quill.root.innerHTML = result.value;
            document.getElementById('debug-info').textContent = 'File loaded: ' + file.name;
          })
          .catch(function(error) {
            console.error('Error converting DOCX:', error);
            document.getElementById('debug-info').textContent = 'Error loading file: ' + error.message;
          });
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  console.log('Editor initialization complete');
  document.getElementById('debug-info').textContent = 'Editor ready';
});

// Function to save the document
function saveDocument() {
  const content = quill.root.innerHTML;
  const blob = new Blob([content], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.html';
  a.click();
  
  URL.revokeObjectURL(url);
  document.getElementById('debug-info').textContent = 'Document saved as HTML';
}

// Function to load a resume template
function loadTemplate() {
  const template = `
    <h1>Professional Resume</h1>
    <h2>Contact Information</h2>
    <p>Your Name<br>
    Email: your.email@example.com<br>
    Phone: (123) 456-7890<br>
    LinkedIn: linkedin.com/in/yourname</p>
    
    <h2>Professional Summary</h2>
    <p>Experienced professional with a proven track record in [your field]. Skilled in [key skill 1], [key skill 2], and [key skill 3] with a focus on delivering [key outcome].</p>
    
    <h2>Work Experience</h2>
    <h3>Job Title | Company Name | Month Year - Present</h3>
    <ul>
      <li>Accomplishment 1 that demonstrates your skills and impact</li>
      <li>Accomplishment 2 with quantifiable results (e.g., increased efficiency by 20%)</li>
      <li>Accomplishment 3 showing leadership or problem-solving abilities</li>
    </ul>
    
    <h3>Previous Job Title | Previous Company | Month Year - Month Year</h3>
    <ul>
      <li>Key responsibility or achievement</li>
      <li>Another significant contribution</li>
      <li>A problem you solved or improvement you implemented</li>
    </ul>
    
    <h2>Education</h2>
    <p>Degree Name, Major<br>
    University Name<br>
    Graduation Year</p>
    
    <h2>Skills</h2>
    <ul>
      <li>Technical Skill 1</li>
      <li>Technical Skill 2</li>
      <li>Soft Skill 1</li>
      <li>Soft Skill 2</li>
    </ul>
  `;
  
  quill.root.innerHTML = template;
  document.getElementById('debug-info').textContent = 'Resume template loaded';
}

// Function to toggle AI chat
function toggleAIChat() {
  const chatContainer = document.getElementById('ai-chat-container');
  if (chatContainer) {
    chatContainer.classList.toggle('collapsed');
    chatContainer.classList.toggle('expanded');
    
    const toggleBtn = chatContainer.querySelector('.ai-chat-toggle i');
    if (toggleBtn) {
      toggleBtn.classList.toggle('fa-chevron-up');
      toggleBtn.classList.toggle('fa-chevron-down');
    }
  }
}

// Function to send chat message
function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  const message = chatInput.value.trim();
  
  if (!message) return;
  
  // Add user message to chat
  addMessageToChat(message, 'user');
  
  // Clear input
  chatInput.value = '';
  
  // Process message (in a real app, this would call an AI API)
  processUserMessage(message);
}

// Function to add message to chat
function addMessageToChat(message, sender) {
  const chatMessages = document.querySelector('.ai-chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = sender === 'user' ? 'user-message' : 'ai-message';
  messageDiv.textContent = message;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to process user message
function processUserMessage(message) {
  // Simulate AI response
  setTimeout(() => {
    const response = "I've analyzed your message. To improve your resume for this job description, consider highlighting your relevant skills and experience more prominently.";
    addMessageToChat(response, 'ai');
    
    // Show suggestions
    showSuggestions();
  }, 1000);
}

// Function to show suggestions
function showSuggestions() {
  const suggestionContainer = document.getElementById('suggestion-container');
  const suggestionsList = document.getElementById('suggestions-list');
  
  if (suggestionContainer && suggestionsList) {
    // Clear previous suggestions
    suggestionsList.innerHTML = '';
    
    // Add a sample suggestion
    const suggestion = document.createElement('div');
    suggestion.className = 'suggestion-item';
    suggestion.innerHTML = `
      <h4>Professional Summary Improvement</h4>
      <p>Your current summary is generic. Consider tailoring it to match the job requirements by mentioning specific skills like "data analysis" and "project management".</p>
      <div class="suggestion-actions">
        <button onclick="applyProposedChanges(documentSections[0], 'Experienced professional with 5+ years in data analysis and project management. Proven track record of delivering projects on time and under budget with a focus on quality and client satisfaction.')">Apply</button>
        <button class="reject" onclick="closeSuggestions()">Dismiss</button>
      </div>
    `;
    
    suggestionsList.appendChild(suggestion);
    suggestionContainer.style.display = 'block';
  }
}

// Function to close suggestions
function closeSuggestions() {
  const suggestionContainer = document.getElementById('suggestion-container');
  if (suggestionContainer) {
    suggestionContainer.style.display = 'none';
  }
}

// Function to mark a section
function markSection() {
  const sectionPopup = document.getElementById('section-popup');
  if (sectionPopup) {
    sectionPopup.style.display = 'flex';
  }
}

// Function to hide section popup
function hideSectionPopup() {
  const sectionPopup = document.getElementById('section-popup');
  if (sectionPopup) {
    sectionPopup.style.display = 'none';
  }
}

// Function to apply section
function applySection() {
  const sectionType = document.getElementById('section-type').value;
  const customSectionName = document.getElementById('custom-section-name').value;
  
  let sectionName = sectionType;
  if (sectionType === 'custom') {
    if (!customSectionName.trim()) {
      alert('Please enter a custom section name');
      return;
    }
    sectionName = customSectionName;
  } else if (!sectionType) {
    alert('Please select a section type');
    return;
  }
  
  // Get selected text range
  const range = quill.getSelection();
  if (!range || range.length === 0) {
    alert('Please select some text to mark as a section');
    return;
  }
  
  // Get the content of the selected text
  const content = quill.getText(range.index, range.length);
  
  // Add section to documentSections
  documentSections.push({
    name: sectionName,
    type: sectionType === 'custom' ? 'custom' : sectionType,
    content: content,
    range: range
  });
  
  // Update section selector in AI chat
  updateSectionSelector();
  
  // Hide popup
  hideSectionPopup();
  
  // Show confirmation
  document.getElementById('debug-info').textContent = `Marked selected text as "${sectionName}" section`;
}

// Function to update section selector
function updateSectionSelector() {
  const sectionSelector = document.getElementById('section-selector');
  if (sectionSelector) {
    // Clear existing options except the first one
    while (sectionSelector.options.length > 1) {
      sectionSelector.remove(1);
    }
    
    // Add options for each section
    documentSections.forEach((section, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = section.name;
      sectionSelector.appendChild(option);
    });
  }
}

// Function to analyze document
function analyzeDocument() {
  // In a real app, this would send the document to an AI API for analysis
  document.getElementById('debug-info').textContent = 'Analyzing document...';
  
  setTimeout(() => {
    document.getElementById('debug-info').textContent = 'Analysis complete. Check the AI Assistant for suggestions.';
    
    // Add a message to the chat
    addMessageToChat("I've analyzed your document. Here are some suggestions to improve your resume:", 'ai');
    
    // Show suggestions
    showSuggestions();
    
    // Expand the chat if it's collapsed
    const chatContainer = document.getElementById('ai-chat-container');
    if (chatContainer && chatContainer.classList.contains('collapsed')) {
      toggleAIChat();
    }
  }, 1500);
}

// Function to apply proposed changes
function applyProposedChanges(section, optimizedContent) {
  // Replace the section content with the optimized version
  const range = section.range;
  quill.deleteText(range.index, range.length);
  quill.insertText(range.index, optimizedContent);
  
  // Update the section content
  section.content = optimizedContent;
  
  // Hide the suggestion container
  const suggestionContainer = document.getElementById('suggestion-container');
  if (suggestionContainer) {
    suggestionContainer.style.display = 'none';
  }
  
  // Show success message
  document.getElementById('debug-info').textContent = `"${section.name}" section optimized successfully!`;
  
  // Add a message to the chat
  addMessageToChat(`I've applied the optimized version of your "${section.name}" section with relevant keywords for ATS.`, 'ai');
}