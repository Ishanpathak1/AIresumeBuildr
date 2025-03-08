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

// Function to save the document as HTML
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

// Function to save as DOCX
function saveAsDocx() {
  document.getElementById('debug-info').textContent = 'Preparing DOCX file...';
  
  try {
    // Store the current ranges with highlights
    const highlightedRanges = [];
    documentSections.forEach(section => {
      if (section.range) {
        highlightedRanges.push({
          index: section.range.index,
          length: section.range.length
        });
      }
    });
    
    // Remove all highlights
    highlightedRanges.forEach(range => {
      quill.formatText(range.index, range.length, {
        'background': false
      });
    });
    
    // Get all the formatted content
    const delta = quill.getContents();
    const docElements = [];
    
    // Convert Delta format to DOCX elements
    delta.ops.forEach(op => {
      const text = op.insert;
      if (typeof text === 'string' && text.trim()) {
        const attributes = op.attributes || {};
        const textRun = new docx.TextRun({
          text: text,
          bold: attributes.bold,
          italic: attributes.italic,
          underline: attributes.underline,
          size: attributes.size ? parseInt(attributes.size) * 2 : 24, // Convert to half-points or use default 12pt
          font: attributes.font || "Arial",
          color: attributes.color ? attributes.color.replace('#', '') : undefined
        });
        
        docElements.push(
          new docx.Paragraph({
            children: [textRun],
            spacing: {
              after: 200 // Add some spacing between paragraphs
            },
            alignment: convertAlignment(attributes.align)
          })
        );
      } else if (text === '\n') {
        // Add paragraph break
        docElements.push(new docx.Paragraph({}));
      }
    });
    
    // Create the document
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: docElements
      }]
    });
    
    docx.Packer.toBlob(doc).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.docx';
      a.click();
      
      URL.revokeObjectURL(url);
      
      // Restore highlights
      highlightedRanges.forEach(range => {
        quill.formatText(range.index, range.length, {
          'background': '#e6f7ff'
        });
      });
      
      document.getElementById('debug-info').textContent = 'Document saved as DOCX';
    });
  } catch (error) {
    console.error('Error creating DOCX:', error);
    document.getElementById('debug-info').textContent = 'Error creating DOCX: ' + error.message;
    
    // Restore highlights even if there's an error
    highlightedRanges.forEach(range => {
      quill.formatText(range.index, range.length, {
        'background': '#e6f7ff'
      });
    });
  }
}

// Helper function to convert Quill alignment to DOCX alignment
function convertAlignment(align) {
  switch (align) {
    case 'right':
      return docx.AlignmentType.RIGHT;
    case 'center':
      return docx.AlignmentType.CENTER;
    case 'justify':
      return docx.AlignmentType.JUSTIFIED;
    default:
      return docx.AlignmentType.LEFT;
  }
}

// Helper function to convert pixels to points
function pxToPoints(px) {
  if (!px) return 24; // Default to 12pt
  const points = Math.round(parseInt(px) * 72 / 96); // Convert px to pt
  return points * 2; // Convert to half-points for DOCX
}

// Helper function to clean color values
function cleanColor(color) {
  if (!color) return undefined;
  if (color.startsWith('#')) return color.replace('#', '');
  if (color.startsWith('rgb')) {
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length === 3) {
      const hex = rgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
      return hex.toUpperCase();
    }
  }
  return undefined;
}

// Function to process a node and its styles
function processNode(node, elements) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim();
    if (text) {
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: text,
              size: 24, // Default 12pt font size
              font: "Arial"
            })
          ]
        })
      );
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Process child nodes
    for (const childNode of node.childNodes) {
      processNode(childNode, elements);
    }
  }
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

// Function to analyze document with OpenAI
function analyzeDocument() {
  document.getElementById('debug-info').textContent = 'Analyzing document...';
  
  // Get the document content
  const content = quill.getText();
  if (!content || content.trim().length === 0) {
    document.getElementById('debug-info').textContent = 'Error: Document is empty. Please add content before analyzing.';
    return;
  }
  
  // Show loading state
  addMessageToChat("Analyzing your document. This may take a moment...", 'ai');
  
  // Expand the chat if it's collapsed
  const chatContainer = document.getElementById('ai-chat-container');
  if (chatContainer && chatContainer.classList.contains('collapsed')) {
    toggleAIChat();
  }
  
  // Call the server API
  fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content })
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('debug-info').textContent = 'Analysis complete';
    addMessageToChat(data.response, 'ai');
  })
  .catch(error => {
    console.error('Error:', error);
    document.getElementById('debug-info').textContent = 'Error analyzing document';
    addMessageToChat('Sorry, I encountered an error while analyzing the document.', 'ai');
  });
}

// Function to send chat message to OpenAI
function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  const message = chatInput.value.trim();
  
  if (!message) return;
  
  // Add user message to chat
  addMessageToChat(message, 'user');
  
  // Clear input
  chatInput.value = '';
  
  // Get selected section
  const sectionSelector = document.getElementById('section-selector');
  const sectionIndex = sectionSelector.value;
  let sectionContent = '';
  let sectionName = 'entire document';
  
  if (sectionIndex !== '') {
    const section = documentSections[parseInt(sectionIndex)];
    if (section) {
      sectionContent = section.content;
      sectionName = section.name || 'selected section';
    }
  } else {
    sectionContent = quill.getText();
  }
  
  // Show thinking message
  const thinkingMessage = addMessageToChat(`Analyzing ${sectionName}...`, 'ai');
  
  // Prepare the prompt for improvement suggestion
  const improvePrompt = `Please improve this ${sectionName}. First provide your explanation, then provide ONLY the improved text between <suggestion></suggestion> tags.\n\nCurrent text: "${sectionContent}"`;
  
  // Call the server API
  fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message: improvePrompt,
      userMessage: message,
      sectionContent,
      sectionName
    })
  })
  .then(response => response.json())
  .then(data => {
    // Remove thinking message
    const chatMessages = document.querySelector('.ai-chat-messages');
    if (thinkingMessage && thinkingMessage.parentNode === chatMessages) {
      chatMessages.removeChild(thinkingMessage);
    }

    // Extract suggestion from response if it exists
    let suggestion = '';
    let explanation = data.response;
    
    // Try to find the suggested text between tags
    const suggestionMatch = data.response.match(/<suggestion>([\s\S]*?)<\/suggestion>/);
    if (suggestionMatch && suggestionMatch[1]) {
      suggestion = suggestionMatch[1].trim();
      explanation = data.response.replace(/<suggestion>[\s\S]*?<\/suggestion>/g, '').trim();
    }

    // Add the explanation to the chat
    addMessageToChat(explanation, 'ai');
    
    // Show the suggestion button if we have a section selected and a suggestion
    if (sectionIndex !== '' && suggestion) {
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'ai-chat-buttons';
      
      // Add preview button
      const previewButton = document.createElement('button');
      previewButton.className = 'ai-chat-btn preview-btn';
      previewButton.textContent = 'Preview Changes';
      previewButton.onclick = function() {
        // Add preview message
        addMessageToChat('Suggested changes:\n\nOriginal:\n' + sectionContent + '\n\nImproved:\n' + suggestion, 'ai');
        
        // Add apply button after preview
        const previewButtonsDiv = document.createElement('div');
        previewButtonsDiv.className = 'ai-chat-buttons';
        
        const applyAfterPreviewButton = document.createElement('button');
        applyAfterPreviewButton.className = 'ai-chat-btn apply-btn';
        applyAfterPreviewButton.textContent = 'Apply Changes';
        applyAfterPreviewButton.onclick = function() {
          const section = documentSections[parseInt(sectionIndex)];
          if (section) {
            applyProposedChanges(section, suggestion);
          }
        };
        
        previewButtonsDiv.appendChild(applyAfterPreviewButton);
        const chatMessages = document.querySelector('.ai-chat-messages');
        chatMessages.appendChild(previewButtonsDiv);
      };
      
      // Add apply button
      const applyButton = document.createElement('button');
      applyButton.className = 'ai-chat-btn apply-btn';
      applyButton.textContent = 'Apply Changes';
      applyButton.onclick = function() {
        const section = documentSections[parseInt(sectionIndex)];
        if (section) {
          applyProposedChanges(section, suggestion);
        }
      };
      
      buttonsDiv.appendChild(previewButton);
      buttonsDiv.appendChild(applyButton);
      chatMessages.appendChild(buttonsDiv);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    const chatMessages = document.querySelector('.ai-chat-messages');
    if (thinkingMessage && thinkingMessage.parentNode === chatMessages) {
      chatMessages.removeChild(thinkingMessage);
    }
    addMessageToChat('Sorry, I encountered an error. Please try again.', 'ai');
  });
}

// Function to optimize a section based on job description
function optimizeSection(sectionIndex, jobDescription) {
  const section = documentSections[sectionIndex];
  
  // Show optimizing message
  document.getElementById('debug-info').textContent = `Optimizing "${section.name}" section...`;
  const optimizingMessage = addMessageToChat(`Optimizing your "${section.name}" section for the job description...`, 'ai');
  
  // Call the server API
  fetch('/api/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      sectionContent: section.content, 
      sectionName: section.name, 
      jobDescription 
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    // Remove optimizing message
    const chatMessages = document.querySelector('.ai-chat-messages');
    chatMessages.removeChild(optimizingMessage);
    
    // Apply the optimized content
    applyProposedChanges(section, data.response);
    
    // Add success message
    addMessageToChat(`I've optimized your "${section.name}" section to better match the job description.`, 'ai');
  })
  .catch(error => {
    console.error('Error calling API:', error);
    
    // Remove optimizing message
    const chatMessages = document.querySelector('.ai-chat-messages');
    chatMessages.removeChild(optimizingMessage);
    
    document.getElementById('debug-info').textContent = `Error optimizing section: ${error.message}`;
    addMessageToChat(`I encountered an error while optimizing your section: ${error.message}. Please try again later.`, 'ai');
  });
}

// Helper function to add message to chat and return the message element
function addMessageToChat(message, sender) {
  const chatMessages = document.querySelector('.ai-chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = sender === 'user' ? 'user-message' : 'ai-message';
  messageDiv.textContent = message;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageDiv;
}

// Function to mark a section
function markSection() {
  const range = quill.getSelection();
  if (!range) {
    document.getElementById('debug-info').textContent = 'Please select text to mark as a section.';
    return;
  }
  
  // Show popup for section type
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
  
  // Define section names mapping
  const sectionNames = {
    'summary': 'Professional Summary',
    'experience': 'Work Experience',
    'education': 'Education',
    'skills': 'Skills',
    'projects': 'Projects',
    'certifications': 'Certifications'
  };
  
  if (!sectionType) {
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
  
  // Add section to documentSections with proper name
  documentSections.push({
    name: sectionNames[sectionType], // Use the mapped name
    type: sectionType,
    content: content,
    range: range
  });
  
  // Update section selector in AI chat
  updateSectionSelector();
  
  // Format the text to indicate it's a section
  quill.formatText(range.index, range.length, {
    'background': '#e6f7ff'
  });
  
  // Hide popup
  hideSectionPopup();
  
  // Show confirmation
  document.getElementById('debug-info').textContent = `Marked as ${sectionNames[sectionType]}`;
}

// Function to update section selector
function updateSectionSelector() {
  const selector = document.getElementById('section-selector');
  
  // Clear existing options except the first one
  while (selector.options.length > 1) {
    selector.remove(1);
  }
  
  // Add options for each section
  documentSections.forEach((section, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = section.name; // Use the stored section name
    selector.appendChild(option);
  });
}

// Function to show suggestions from AI
function showSuggestions() {
  console.log("showSuggestions called");
  
  // Check if we have sections
  if (documentSections.length === 0) {
    addMessageToChat("Please mark sections in your document first to get specific suggestions.", 'ai');
    return;
  }
  
  const suggestionContainer = document.getElementById('suggestion-container');
  if (!suggestionContainer) {
    console.error("Suggestion container not found in the DOM");
    return;
  }
  
  // Make sure the container is visible
  suggestionContainer.style.display = 'flex';
  
  // Clear previous suggestions
  const suggestionsList = document.getElementById('suggestions-list');
  if (suggestionsList) {
    suggestionsList.innerHTML = '';
  } else {
    console.error("Suggestions list not found in the DOM");
    return;
  }
  
  console.log(`Creating suggestions for ${documentSections.length} sections`);
  
  // Add suggestions for each section
  documentSections.forEach((section, index) => {
    // Create a suggestion for this section
    createSuggestionForSection(section, index);
  });
}

// Function to show suggestions for a specific section
function showSuggestionsForSection(section) {
  console.log("showSuggestionsForSection called for", section.name);
  
  const suggestionContainer = document.getElementById('suggestion-container');
  if (!suggestionContainer) {
    console.error("Suggestion container not found in the DOM");
    return;
  }
  
  // Make sure the container is visible
  suggestionContainer.style.display = 'flex';
  
  // Clear previous suggestions
  const suggestionsList = document.getElementById('suggestions-list');
  if (suggestionsList) {
    suggestionsList.innerHTML = '';
  } else {
    console.error("Suggestions list not found in the DOM");
    return;
  }
  
  // Create a suggestion for this section
  createSuggestionForSection(section, documentSections.indexOf(section));
}

// Function to create a suggestion for a section
function createSuggestionForSection(section, index) {
  console.log(`Creating suggestion for section: ${section.name}`);
  
  const suggestionsList = document.getElementById('suggestions-list');
  if (!suggestionsList) {
    console.error("Suggestions list not found");
    return;
  }
  
  // Create suggestion item
  const suggestionItem = document.createElement('div');
  suggestionItem.className = 'suggestion-item';
  
  // Create suggestion header
  const suggestionHeader = document.createElement('div');
  suggestionHeader.className = 'suggestion-item-header';
  suggestionHeader.innerHTML = `<strong>${section.name}</strong>`;
  
  // Create suggestion content
  const suggestionContent = document.createElement('div');
  suggestionContent.className = 'suggestion-item-content';
  
  // Create original content
  const originalContent = document.createElement('div');
  originalContent.className = 'original-content';
  originalContent.innerHTML = `<h4>Original</h4><div class="content-text">${section.content}</div>`;
  
  // Create improved content (will be filled by AI)
  const improvedContent = document.createElement('div');
  improvedContent.className = 'improved-content';
  improvedContent.innerHTML = `<h4>Suggested Improvement</h4><div class="content-text">Loading AI suggestion...</div>`;
  
  // Create action buttons
  const actionButtons = document.createElement('div');
  actionButtons.className = 'suggestion-actions';
  
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply Change';
  applyButton.disabled = true; // Disabled until suggestion is loaded
  applyButton.onclick = function() {
    // Get the improved content text
    const improvedText = improvedContent.querySelector('.content-text').textContent;
    applyProposedChanges(section, improvedText);
  };
  
  const ignoreButton = document.createElement('button');
  ignoreButton.textContent = 'Ignore';
  ignoreButton.onclick = function() {
    suggestionItem.remove();
    // If no more suggestions, hide the container
    if (suggestionsList.children.length === 0) {
      closeSuggestions();
    }
  };
  
  // Add buttons to action container
  actionButtons.appendChild(applyButton);
  actionButtons.appendChild(ignoreButton);
  
  // Add all elements to suggestion item
  suggestionContent.appendChild(originalContent);
  suggestionContent.appendChild(improvedContent);
  suggestionItem.appendChild(suggestionHeader);
  suggestionItem.appendChild(suggestionContent);
  suggestionItem.appendChild(actionButtons);
  
  // Add suggestion item to list
  suggestionsList.appendChild(suggestionItem);
  
  // Get AI suggestion for this section
  getAISuggestionForSection(section, improvedContent, applyButton);
}

// Function to get AI suggestion for a section
function getAISuggestionForSection(section, improvedContentElement, applyButton) {
  console.log(`Getting AI suggestion for section: ${section.name}`);
  
  // Call the server API to get a suggestion
  fetch('/api/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      sectionContent: section.content, 
      sectionName: section.name, 
      jobDescription: "Improve this section to be more impactful and professional" 
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(`Received AI suggestion for section: ${section.name}`);
    
    // Update the improved content with the AI suggestion
    const contentTextElement = improvedContentElement.querySelector('.content-text');
    contentTextElement.textContent = data.response;
    
    // Enable the apply button
    applyButton.disabled = false;
    
    // Add a diff view to highlight changes
    const diffElement = document.createElement('div');
    diffElement.className = 'diff-view';
    diffElement.innerHTML = `<h4>Changes</h4><div class="diff-text">${generateDiffView(section.content, data.response)}</div>`;
    
    // Insert diff view between original and improved
    improvedContentElement.parentNode.insertBefore(diffElement, improvedContentElement);
  })
  .catch(error => {
    console.error('Error getting AI suggestion:', error);
    const contentTextElement = improvedContentElement.querySelector('.content-text');
    contentTextElement.textContent = `Error: ${error.message}`;
  });
}

// Function to generate a simple diff view
function generateDiffView(original, improved) {
  // This is a simple implementation - for a real app, you might want to use a proper diff library
  const words1 = original.split(' ');
  const words2 = improved.split(' ');
  
  let diffHtml = '';
  let i = 0, j = 0;
  
  while (i < words1.length || j < words2.length) {
    if (i < words1.length && j < words2.length && words1[i] === words2[j]) {
      // Words are the same
      diffHtml += words1[i] + ' ';
      i++;
      j++;
    } else {
      // Words are different
      if (i < words1.length) {
        diffHtml += `<span class="removed">${words1[i]}</span> `;
        i++;
      }
      if (j < words2.length) {
        diffHtml += `<span class="added">${words2[j]}</span> `;
        j++;
      }
    }
  }
  
  return diffHtml;
}

// Function to close suggestions
function closeSuggestions() {
  console.log("closeSuggestions called");
  const suggestionContainer = document.getElementById('suggestion-container');
  if (suggestionContainer) {
    suggestionContainer.style.display = 'none';
  }
}

// Function to apply proposed changes
function applyProposedChanges(section, suggestion) {
  if (!section || !suggestion) {
    addMessageToChat('Error: Missing section or suggestion content.', 'ai');
    return;
  }
  
  try {
    const range = section.range;
    if (!range) {
      addMessageToChat('Error: Could not find the section to update.', 'ai');
      return;
    }
    
    // Store old content for undo
    const oldContent = section.content;
    
    // Apply the changes
    quill.deleteText(range.index, range.length);
    quill.insertText(range.index, suggestion);
    
    // Update section data
    section.content = suggestion;
    section.range = {
      index: range.index,
      length: suggestion.length
    };
    
    // Format the section background
    quill.formatText(range.index, suggestion.length, {
      'background': '#e6f7ff'
    });
    
    // Show success message
    addMessageToChat('✓ Changes applied successfully! The section has been updated.', 'ai');
    
    // Add undo button
    const chatMessages = document.querySelector('.ai-chat-messages');
    const undoDiv = document.createElement('div');
    undoDiv.className = 'ai-chat-buttons';
    
    const undoButton = document.createElement('button');
    undoButton.className = 'ai-chat-btn undo-btn';
    undoButton.textContent = 'Undo Changes';
    undoButton.onclick = function() {
      quill.deleteText(range.index, suggestion.length);
      quill.insertText(range.index, oldContent);
      section.content = oldContent;
      section.range = {
        index: range.index,
        length: oldContent.length
      };
      quill.formatText(range.index, oldContent.length, {
        'background': '#e6f7ff'
      });
      addMessageToChat('Changes undone. Restored previous version.', 'ai');
      undoDiv.remove();
    };
    
    undoDiv.appendChild(undoButton);
    chatMessages.appendChild(undoDiv);
    
  } catch (error) {
    console.error('Error applying changes:', error);
    addMessageToChat('Error applying changes. Please try again.', 'ai');
  }
}

// Function to review sections one by one
function reviewSectionBySectionSuggestions() {
  console.log("reviewSectionBySectionSuggestions called");
  
  // Check if we have sections
  if (documentSections.length === 0) {
    addMessageToChat("Please mark sections in your document first to review them one by one.", 'ai');
    return;
  }
  
  // Start with the first section
  startSectionReview(0);
}

// Function to start reviewing a specific section
function startSectionReview(sectionIndex) {
  if (sectionIndex >= documentSections.length) {
    // We've reviewed all sections
    addMessageToChat("That's all the sections! Your resume is now improved.", 'ai');
    return;
  }
  
  const section = documentSections[sectionIndex];
  console.log(`Starting review for section: ${section.name}`);
  
  // Show a message about this section
  addMessageToChat(`Let's review your "${section.name}" section:`, 'ai');
  
  // Call the server API to get a suggestion
  fetch('/api/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      sectionContent: section.content, 
      sectionName: section.name, 
      jobDescription: "Improve this section to be more impactful and professional" 
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(`Received AI suggestion for section: ${section.name}`);
    
    // Show the original content
    addMessageToChat(`Original: ${section.content}`, 'ai');
    
    // Show the suggested improvement
    addMessageToChat(`Suggested improvement: ${data.response}`, 'ai');
    
    // Add buttons to apply or skip
    const chatMessages = document.querySelector('.ai-chat-messages');
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'ai-chat-buttons';
    
    const applyButton = document.createElement('button');
    applyButton.className = 'ai-chat-btn';
    applyButton.style.backgroundColor = '#28a745';
    applyButton.textContent = 'Apply This Change';
    applyButton.onclick = function() {
      applyProposedChanges(section, data.response);
      
      // Move to the next section
      setTimeout(() => {
        startSectionReview(sectionIndex + 1);
      }, 1000);
    };
    
    const skipButton = document.createElement('button');
    skipButton.className = 'ai-chat-btn';
    skipButton.style.backgroundColor = '#6c757d';
    skipButton.textContent = 'Skip This Section';
    skipButton.onclick = function() {
      addMessageToChat(`Skipped changes to "${section.name}" section.`, 'ai');
      
      // Move to the next section
      setTimeout(() => {
        startSectionReview(sectionIndex + 1);
      }, 1000);
    };
    
    buttonsDiv.appendChild(applyButton);
    buttonsDiv.appendChild(skipButton);
    chatMessages.appendChild(buttonsDiv);
  })
  .catch(error => {
    console.error('Error getting AI suggestion:', error);
    addMessageToChat(`Error getting suggestion for "${section.name}": ${error.message}`, 'ai');
    
    // Move to the next section despite the error
    setTimeout(() => {
      startSectionReview(sectionIndex + 1);
    }, 1000);
  });
}

// Make sure these functions are available globally
window.showSuggestions = showSuggestions;
window.closeSuggestions = closeSuggestions;
window.showSuggestionsForSection = showSuggestionsForSection;