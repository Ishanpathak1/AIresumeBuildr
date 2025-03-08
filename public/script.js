// Add this at the beginning of your script.js file to check server connection
// console.log('Script loaded. Checking server connection...');

// Register custom fonts with Quill
var Font = Quill.import('formats/font');
Font.whitelist = [
  'arial', 
  'calibri', 
  'times-new-roman', 
  'courier-new', 
  'georgia', 
  'verdana', 
  'tahoma', 
  'trebuchet-ms', 
  'garamond', 
  'comic-sans-ms'
];
Quill.register(Font, true);

// Initialize Quill editor
var quill = new Quill('#editor', {
  modules: {
    toolbar: '#toolbar'
  },
  theme: 'snow'
});

// Canvas setup
var canvas = document.getElementById('line-canvas');
var ctx = canvas.getContext('2d');
var drawMode = false;
var isDrawing = false;
var lineThickness = 2;
var lines = [];
var selectedLine = null;
var isDragging = false;
var isResizing = false;
var resizingEnd = null; // 'start' or 'end'
var dragStartX, dragStartY;
var undoStack = [];
var redoStack = [];
var snapAngle = 15; // Snap to every 15 degrees

// Global variables
let documentSections = [];
let currentSuggestions = [];

// Add these debugging functions at the top of your script.js file

// Debug function to check if elements exist
function checkElements() {
  // console.log('Checking critical elements:');
  
  const elements = [
    'mark-section-btn',
    'section-popup',
    'section-type',
    'custom-section-container',
    'custom-section-name',
    'apply-section',
    'cancel-section',
    'sections-sidebar',
    'sections-list'
  ];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    // console.log(`Element '${id}': ${element ? 'EXISTS' : 'MISSING'}`);
  });
}

// Debug function to check event listeners
function testEventListeners() {
  // console.log('Testing event listeners:');
  
  // Create a test click event
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  // Test mark section button
  const markSectionBtn = document.getElementById('mark-section-btn');
  if (markSectionBtn) {
    // console.log('Dispatching click event to mark-section-btn');
    markSectionBtn.dispatchEvent(clickEvent);
  }
}

// Function to resize the canvas
function resizeCanvas() {
  var container = document.getElementById('editor-container');
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  redrawLines();
}

// Resize canvas on window resize
window.addEventListener('resize', resizeCanvas);

// Initialize canvas size
window.addEventListener('load', function() {
  resizeCanvas();
  // console.log('Canvas initialized with size:', canvas.width, 'x', canvas.height);
  // Initialize canvas to not capture pointer events
  updateCanvasInteractivity();
});

// Function to update canvas interactivity based on draw mode
function updateCanvasInteractivity() {
  canvas.style.pointerEvents = drawMode ? 'auto' : 'none';
}

// Function to draw a line
function drawLine(x1, y1, x2, y2, thickness, isSelected) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = thickness;
  ctx.strokeStyle = isSelected ? 'blue' : 'black';
  ctx.stroke();
  
  // Draw handles for selected lines
  if (isSelected) {
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(x1, y1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Function to redraw all lines
function redrawLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    drawLine(line.x1, line.y1, line.x2, line.y2, line.thickness, line === selectedLine);
  }
}

// Function to check if a point is near a line
function isPointNearLine(x, y, line) {
  var dx = line.x2 - line.x1;
  var dy = line.y2 - line.y1;
  var len = Math.sqrt(dx * dx + dy * dy);
  
  // Avoid division by zero
  if (len === 0) return false;
  
  var dot = ((x - line.x1) * dx + (y - line.y1) * dy) / (len * len);
  
  // Check if the point projection is on the line segment
  if (dot < 0 || dot > 1) return false;
  
  var closestX = line.x1 + dot * dx;
  var closestY = line.y1 + dot * dy;
  var distance = Math.sqrt((x - closestX) * (x - closestX) + (y - closestY) * (y - closestY));
  
  return distance < 10; // 10 pixels threshold
}

// Function to check if a point is near a line endpoint
function isPointNearEndpoint(x, y, line, threshold = 10) {
  var distToStart = Math.sqrt((x - line.x1) * (x - line.x1) + (y - line.y1) * (y - line.y1));
  var distToEnd = Math.sqrt((x - line.x2) * (x - line.x2) + (y - line.y2) * (y - line.y2));
  
  if (distToStart < threshold) return 'start';
  if (distToEnd < threshold) return 'end';
  return null;
}

// Function to save state for undo
function saveState() {
  undoStack.push(JSON.stringify(lines));
  redoStack = []; // Clear redo stack when a new action is performed
}

// Function to undo
function undo() {
  if (undoStack.length === 0) return;
  
  redoStack.push(JSON.stringify(lines));
  lines = JSON.parse(undoStack.pop());
  selectedLine = null;
  redrawLines();
}

// Function to redo
function redo() {
  if (redoStack.length === 0) return;
  
  undoStack.push(JSON.stringify(lines));
  lines = JSON.parse(redoStack.pop());
  selectedLine = null;
  redrawLines();
}

// Function to snap angle to nearest multiple of snapAngle
function snapToAngle(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var angle = Math.atan2(dy, dx);
  
  // Convert to degrees
  var degrees = angle * (180 / Math.PI);
  
  // Snap to nearest multiple of snapAngle
  var snappedDegrees = Math.round(degrees / snapAngle) * snapAngle;
  
  // Convert back to radians
  var snappedAngle = snappedDegrees * (Math.PI / 180);
  
  // Calculate new endpoint
  var length = Math.sqrt(dx * dx + dy * dy);
  var newX2 = x1 + length * Math.cos(snappedAngle);
  var newY2 = y1 + length * Math.sin(snappedAngle);
  
  return { x: newX2, y: newY2 };
}

// Mouse down event
canvas.addEventListener('mousedown', function(e) {
  if (!drawMode) return;
  
  var rect = canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;

  // Check if clicking on a line endpoint for resizing
  if (selectedLine) {
    var endpoint = isPointNearEndpoint(x, y, selectedLine);
    if (endpoint) {
      isResizing = true;
      resizingEnd = endpoint;
      dragStartX = x;
      dragStartY = y;
      // console.log('Resizing line from', resizingEnd, 'endpoint');
      e.preventDefault(); // Prevent text selection
      return;
    }
  }
  
  // Check if clicking on a line for dragging
  var clickedOnLine = false;
  for (var i = 0; i < lines.length; i++) {
    if (isPointNearLine(x, y, lines[i])) {
      saveState();
      selectedLine = lines[i];
      isDragging = true;
      dragStartX = x;
      dragStartY = y;
      clickedOnLine = true;
      // console.log('Selected line:', selectedLine);
      redrawLines(); // Redraw to highlight the selected line
      e.preventDefault(); // Prevent text selection
      break;
    }
  }
  
  // If not clicking on any line, start drawing a new line
  if (!clickedOnLine && !isResizing) {
    saveState();
    isDrawing = true;
    lines.push({
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      thickness: lineThickness
    });
    selectedLine = null;
    redrawLines();
    // console.log('Started drawing line at:', x, y);
  }
});

// Mouse move event
canvas.addEventListener('mousemove', function(e) {
  if (!drawMode) return;
  
  var rect = canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;

  if (isDrawing) {
    var line = lines[lines.length - 1];
    
    // Check if shift key is pressed for angle snapping
    if (e.shiftKey) {
      var snapped = snapToAngle(line.x1, line.y1, x, y);
      line.x2 = snapped.x;
      line.y2 = snapped.y;
    } else {
      line.x2 = x;
      line.y2 = y;
    }
    
    redrawLines();
    // console.log('Drawing line to:', line.x2, line.y2);
    e.preventDefault(); // Prevent text selection
  } else if (isResizing && selectedLine) {
    if (resizingEnd === 'start') {
      // Check if shift key is pressed for angle snapping
      if (e.shiftKey) {
        var snapped = snapToAngle(selectedLine.x2, selectedLine.y2, x, y);
        selectedLine.x1 = snapped.x;
        selectedLine.y1 = snapped.y;
      } else {
        selectedLine.x1 = x;
        selectedLine.y1 = y;
      }
    } else {
      // Check if shift key is pressed for angle snapping
      if (e.shiftKey) {
        var snapped = snapToAngle(selectedLine.x1, selectedLine.y1, x, y);
        selectedLine.x2 = snapped.x;
        selectedLine.y2 = snapped.y;
      } else {
        selectedLine.x2 = x;
        selectedLine.y2 = y;
      }
    }
    redrawLines();
    // console.log('Resizing line to:', selectedLine.x1, selectedLine.y1, selectedLine.x2, selectedLine.y2);
    e.preventDefault(); // Prevent text selection
  } else if (isDragging && selectedLine) {
    var dx = x - dragStartX;
    var dy = y - dragStartY;
    selectedLine.x1 += dx;
    selectedLine.y1 += dy;
    selectedLine.x2 += dx;
    selectedLine.y2 += dy;
    dragStartX = x;
    dragStartY = y;
    redrawLines();
    // console.log('Moving line to:', selectedLine.x1, selectedLine.y1, selectedLine.x2, selectedLine.y2);
    e.preventDefault(); // Prevent text selection
  }
});

// Mouse up event
canvas.addEventListener('mouseup', function() {
  if (!drawMode) return;
  
  isDrawing = false;
  isDragging = false;
  isResizing = false;
  // Note: We don't reset selectedLine here to keep the selection
  // console.log('Stopped drawing/dragging/resizing');
});

// Toggle draw mode
document.getElementById('toggle-draw').addEventListener('click', function() {
  drawMode = !drawMode;
  updateCanvasInteractivity();
  
  // Reset selection when exiting draw mode
  if (!drawMode) {
    selectedLine = null;
    redrawLines();
  }
  
  // console.log('Draw mode:', drawMode ? 'Enabled' : 'Disabled');
});

// Increase line thickness
document.getElementById('increase-thickness').addEventListener('click', function() {
  if (!drawMode) return;
  
  if (selectedLine) {
    saveState();
    selectedLine.thickness += 1;
    redrawLines();
    // console.log('Increased line thickness to:', selectedLine.thickness);
  } else {
    lineThickness += 1;
    // console.log('Set default line thickness to:', lineThickness);
  }
});

// Decrease line thickness
document.getElementById('decrease-thickness').addEventListener('click', function() {
  if (!drawMode) return;
  
  if (selectedLine && selectedLine.thickness > 1) {
    saveState();
    selectedLine.thickness -= 1;
    redrawLines();
    // console.log('Decreased line thickness to:', selectedLine.thickness);
  } else if (lineThickness > 1) {
    lineThickness -= 1;
    // console.log('Set default line thickness to:', lineThickness);
  }
});

// Add undo button event listener
document.getElementById('undo').addEventListener('click', function() {
  if (!drawMode) return;
  
  undo();
  // console.log('Undo action');
});

// Add redo button event listener
document.getElementById('redo').addEventListener('click', function() {
  if (!drawMode) return;
  
  redo();
  // console.log('Redo action');
});

// Deselect line
document.getElementById('deselect').addEventListener('click', function() {
  if (!drawMode) return;
  
  selectedLine = null;
  redrawLines();
  // console.log('Deselected line');
});

// DOCX file upload and conversion
document.getElementById('docx-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  alert('File selected: ' + file.name); // Show alert to confirm file selection
  
  const formData = new FormData();
  formData.append('file', file);
  
  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    alert('File processed successfully'); // Show alert on success
    if (data.content) {
      quill.setText(data.content);
    }
  })
  .catch(error => {
    alert('Error: ' + error.message); // Show alert on error
    console.error('Error:', error);
  });
});

// Save document
document.getElementById('save-doc').addEventListener('click', function() {
  const delta = quill.getContents();
  const html = quill.root.innerHTML;
  // console.log('Document saved:', html);
  // Implement save functionality here, e.g., send to server or save locally
});

// Add event listener to the Quill editor to handle clicks
quill.root.addEventListener('mousedown', function(e) {
  // If we're in draw mode or manipulating a line, prevent text editing
  if (drawMode || isDragging || isResizing) {
    e.stopPropagation();
  }
});

function tailorResume() {
  // Implement tailoring logic here
  alert('Tailoring feature coming soon!');
}

// Function to analyze the document using server API
async function analyzeDocument() {
  const content = quill.getText();
  if (!content.trim()) {
    alert('Please add some content to your document first.');
    return;
  }
  
  // Show loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'processing-indicator';
  loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI is analyzing your document...';
  document.body.appendChild(loadingIndicator);
  
  try {
    // Call server API
    const response = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze document');
    }
    
    const data = await response.json();
    
    // Parse the response
    let sections;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = data.result.match(/```json\n([\s\S]*?)\n```/) || 
                        data.result.match(/```\n([\s\S]*?)\n```/) || 
                        [null, data.result];
      sections = JSON.parse(jsonMatch[1] || data.result);
    } catch (parseError) {
      // console.error('Error parsing AI response:', parseError);
      alert('Could not parse the AI response. Please try again.');
      return;
    }
    
    // Highlight the identified sections
    highlightDocumentSections(sections);
    
    // Show success message
    alert('Document analysis complete! Sections have been identified and highlighted.');
  } catch (error) {
    // console.error('Error analyzing document:', error);
    alert(`Error analyzing document: ${error.message}`);
  } finally {
    // Remove loading indicator
    loadingIndicator.remove();
  }
}

// Function to highlight identified sections in the document
function highlightDocumentSections(sections) {
  // Clear any existing highlights
  quill.formatText(0, quill.getLength(), { 'background': false, 'section-id': false });
  
  // Get the document content as lines
  const content = quill.getText();
  const lines = content.split('\n');
  
  // Apply highlights to each section
  for (const [sectionName, sectionInfo] of Object.entries(sections)) {
    let startIndex = 0;
    let endIndex = 0;
    
    // Calculate the start index
    for (let i = 0; i < Math.min(sectionInfo.start, lines.length); i++) {
      startIndex += lines[i].length + 1; // +1 for newline
    }
    
    // Calculate the end index
    for (let i = 0; i < Math.min(sectionInfo.end, lines.length); i++) {
      endIndex += lines[i].length + 1; // +1 for newline
    }
    
    // Apply formatting
    quill.formatText(startIndex, endIndex - startIndex, {
      'background': 'rgba(52, 152, 219, 0.1)',
      'section-id': sectionName
    });
  }
}

// Function to toggle AI chat
function toggleAIChat() {
  // console.log('Toggling AI chat');
  
  const chatContainer = document.getElementById('ai-chat-container');
  if (!chatContainer) return;
  
  chatContainer.classList.toggle('collapsed');
  
  // Update button icon
  const toggleBtn = document.querySelector('.ai-chat-toggle i');
  if (toggleBtn) {
    toggleBtn.className = chatContainer.classList.contains('collapsed') 
      ? 'fas fa-chevron-down' 
      : 'fas fa-chevron-up';
  }
}

// Send chat message from input
function sendChatMessageFromInput() {
  const chatInput = document.querySelector('.ai-chat-input input');
  const sectionSelector = document.getElementById('section-selector');
  
  if (!chatInput) return;
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Get selected section ID if any
  const sectionId = sectionSelector ? sectionSelector.value : '';
  
  // Send the message
  sendChatMessage(message, sectionId);
  
  // Clear the input
  chatInput.value = '';
}

// Update the sendChatMessage function to handle all sections by default
async function sendChatMessage(message) {
  // console.log('Sending chat message:', message);
  
  const messagesContainer = document.querySelector('.ai-chat-messages');
  if (!messagesContainer) return;
  
  // Add user message to chat
  messagesContainer.innerHTML += `
    <div class="user-message">
      <p>${message}</p>
    </div>
  `;
  
  // Add loading indicator
  const loadingId = 'loading-' + Date.now();
  messagesContainer.innerHTML += `
    <div id="${loadingId}" class="ai-message">
      <p><i class="fas fa-spinner fa-spin"></i> Thinking...</p>
    </div>
  `;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  try {
    const sectionSelector = document.getElementById('section-selector');
    const selectedSectionId = sectionSelector ? sectionSelector.value : '';
    
    if (selectedSectionId) {
      // Process specific section
      await processSectionMessage(message, selectedSectionId);
    } else if (window.documentSections && window.documentSections.length > 0) {
      // Process all sections
      await processAllSections(message);
    } else {
      // Handle general conversation
      const prompt = `
        You are an AI assistant helping with resume writing and job applications. 
        The user says: "${message}"
        
        Current context:
        - You are a resume writing assistant
        - You can help improve resumes and provide career advice
        - You should be professional but friendly
        - If the user mentions technical issues, guide them on using the interface
        
        Please provide a helpful response.
      `;
      
      const response = await callOpenAIAPI(prompt);
      
      // Remove loading indicator
      const loadingElement = document.getElementById(loadingId);
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Add AI response to chat
      messagesContainer.innerHTML += `
        <div class="ai-message">
          <p>${response}</p>
        </div>
      `;
    }
  } catch (error) {
    // console.error('Error in sendChatMessage:', error);
    
    // Remove loading indicator
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // Show user-friendly error message
    messagesContainer.innerHTML += `
      <div class="ai-message error">
        <p>I apologize, but I encountered an issue: ${error.message}</p>
        <p>Please try again in a moment. If the problem persists, try refreshing the page.</p>
      </div>
    `;
  }
  
  // Clear input field
  const inputField = document.getElementById('chat-input');
  if (inputField) {
    inputField.value = '';
  }
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add new function to process all sections
async function processAllSections(message) {
  // console.log('Processing all sections');
  
  const messagesContainer = document.querySelector('.ai-chat-messages');
  if (!messagesContainer) return;
  
  try {
    // Create suggestions for all sections
    const suggestions = [];
    
    for (const section of window.documentSections) {
      const prompt = `
        You are a professional resume writer. Please help improve this ${section.name} section of a resume.
        
        Current content:
        "${section.content}"
        
        User request:
        "${message}"
        
        Please provide an improved version of this section that:
        1. Maintains the same key information
        2. Uses strong action verbs
        3. Quantifies achievements where possible
        4. Is concise and professional
        5. Addresses the user's specific request
        
        Respond with ONLY the improved text, no explanations or additional comments.
      `;
      
      const improvedContent = await callOpenAIAPI(prompt);
      
      suggestions.push({
        id: 'suggestion-' + Date.now() + '-' + section.id,
        sectionId: section.id,
        sectionName: section.name,
        originalContent: section.content,
        suggestedContent: improvedContent,
        range: section.range
      });
    }
    
    // Store the suggestions
    window.currentSuggestions = suggestions;
    
    // Add the response to the chat
    messagesContainer.innerHTML += `
      <div class="ai-message">
        <p>I've analyzed all sections and created suggestions for improvement.</p>
        ${suggestions.map(suggestion => `
          <div class="suggestion-preview">
            <h4>${suggestion.sectionName}</h4>
            <strong>Original:</strong>
            <pre>${suggestion.originalContent}</pre>
            <strong>Suggested Improvement:</strong>
            <pre>${suggestion.suggestedContent}</pre>
          </div>
        `).join('')}
        <button onclick="showSuggestions()" class="ai-action-btn">Review and Apply All Changes</button>
      </div>
    `;
    
  } catch (error) {
    // console.error('Error processing all sections:', error);
    messagesContainer.innerHTML += `
      <div class="ai-message error">
        <p>I apologize, but I encountered an error while processing your request: ${error.message}</p>
        <p>Please try again in a moment.</p>
      </div>
    `;
  }
}

// Update showSuggestions function to handle multiple suggestions
function showSuggestions() {
  // console.log('Showing suggestions');
  
  if (!window.currentSuggestions || window.currentSuggestions.length === 0) {
    // console.error('No suggestions available');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'suggestions-modal';
  modal.innerHTML = `
    <div class="suggestions-content">
      <h3>Suggested Improvements</h3>
      ${window.currentSuggestions.map(suggestion => `
        <div class="suggestion-comparison">
          <h4>${suggestion.sectionName}</h4>
          <div class="original">
            <h4>Original</h4>
            <div class="content">${suggestion.originalContent}</div>
          </div>
          <div class="suggested">
            <h4>Suggested</h4>
            <div class="content">${suggestion.suggestedContent}</div>
          </div>
        </div>
      `).join('')}
      <div class="suggestion-actions">
        <button onclick="acceptAllSuggestions()" class="accept-btn">Accept All</button>
        <button onclick="rejectSuggestion()" class="reject-btn">Reject</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Add function to accept all suggestions
function acceptAllSuggestions() {
  // console.log('Accepting all suggestions');
  
  if (!window.currentSuggestions || !window.quill) return;
  
  // Sort suggestions by range index in reverse order to avoid offset issues
  const sortedSuggestions = [...window.currentSuggestions]
    .sort((a, b) => b.range.index - a.range.index);
  
  // Apply each suggestion
  for (const suggestion of sortedSuggestions) {
    window.quill.deleteText(suggestion.range.index, suggestion.range.length);
    window.quill.insertText(suggestion.range.index, suggestion.suggestedContent);
    
    // Update the section content in documentSections
    const sectionIndex = window.documentSections.findIndex(s => s.id === suggestion.sectionId);
    if (sectionIndex !== -1) {
      window.documentSections[sectionIndex].content = suggestion.suggestedContent;
      window.documentSections[sectionIndex].range.length = suggestion.suggestedContent.length;
    }
  }
  
  // Close the suggestions modal
  const modal = document.querySelector('.suggestions-modal');
  if (modal) {
    modal.remove();
  }
  
  // Clear current suggestions
  window.currentSuggestions = [];
}

// Register custom Quill formats for sections
function registerQuillFormats() {
  const Inline = Quill.import('blots/inline');
  
  class SectionBlot extends Inline {
    static create(value) {
      let node = super.create();
      node.setAttribute('data-section-type', value.type || '');
      node.setAttribute('data-section-name', value.name || '');
      return node;
    }
    
    static formats(node) {
      return {
        type: node.getAttribute('data-section-type'),
        name: node.getAttribute('data-section-name')
      };
    }
  }
  
  SectionBlot.blotName = 'section';
  SectionBlot.tagName = 'span';
  
  Quill.register(SectionBlot);
}

// Call this function at the beginning
try {
  registerQuillFormats();
} catch (error) {
  // console.error('Error registering Quill formats:', error);
}

// Add this test function to your script.js

// Test function that can be called from the console
function testShowPopup() {
  // console.log('Test show popup function called');
  
  const popup = document.getElementById('section-popup');
  if (popup) {
    popup.style.display = 'flex';
    // console.log('Popup displayed via test function');
    return 'Popup displayed';
  } else {
    // console.error('Popup element not found');
    return 'Popup element not found';
  }
}

// Test function to apply a section
function testApplySection() {
  // console.log('Test apply section function called');
  
  try {
    if (!quill) {
      // console.error('Quill not initialized');
      return 'Quill not initialized';
    }
    
    // Set a test selection
    quill.setSelection(0, 10);
    
    // Apply a background color directly
    quill.formatText(0, 10, {
      'background': '#e8f5e9'
    });
    
    // console.log('Test section applied');
    return 'Test section applied';
  } catch (error) {
    // console.error('Error in test apply section:', error);
    return 'Error: ' + error.message;
  }
}

// Make test functions globally available
window.testShowPopup = testShowPopup;
window.testApplySection = testApplySection;

// Make functions globally available
window.showSectionPopup = showSectionPopup;
window.hideSectionPopup = hideSectionPopup;
window.applySection = applySection;
window.toggleAIChat = toggleAIChat;
window.sendChatMessageFromInput = sendChatMessageFromInput;
window.showSuggestions = showSuggestions;
window.closeSuggestions = closeSuggestions;
window.acceptSuggestion = acceptSuggestion;
window.rejectSuggestion = rejectSuggestion;
window.createResumeTemplate = createResumeTemplate;
window.saveDocument = saveDocument;

// Add this to your setupDirectEventListeners function
function setupDirectEventListeners() {
  // console.log('Setting up direct event listeners');
  
  // Add this code
  const markSectionBtn = document.getElementById('mark-section-btn');
  if (markSectionBtn) {
    markSectionBtn.addEventListener('click', function() {
      showSectionPopup();
      // console.log('Mark section click');
    });
    // console.log('Mark section button listener added');
  }
  
  // Rest of your existing event listener setup code
  // ...
}

// Create a mutation observer to watch for changes
const observeDOM = (function(){
  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
  
  return function(obj, callback){
    if(!obj || obj.nodeType !== 1) return;
    
    if(MutationObserver){
      // define a new observer
      const mutationObserver = new MutationObserver(callback);
      
      // have the observer observe for changes in children
      mutationObserver.observe(obj, { childList:true, subtree:true });
      return mutationObserver;
    }
    // browser support fallback
    else if(window.addEventListener){
      obj.addEventListener('DOMNodeInserted', callback, false);
      obj.addEventListener('DOMNodeRemoved', callback, false);
    }
  };
})();

// Then use it like:
// const targetNode = document.querySelector('.some-element');
// observeDOM(targetNode, function(mutations) {
//   console.log('DOM changed');
//   // Your code here
// });

// Add this function at the end of your script.js file
function fixMarkSectionButton() {
  // console.log('Fixing mark section button');
  
  // Get the button
  const markSectionBtn = document.getElementById('mark-section-btn');
  
  if (!markSectionBtn) {
    // console.error('Mark section button not found');
    return;
  }
  
  // Remove any existing click listeners to avoid duplicates
  const newButton = markSectionBtn.cloneNode(true);
  markSectionBtn.parentNode.replaceChild(newButton, markSectionBtn);
  
  // Add the event listener
  newButton.addEventListener('click', function() {
    // console.log('Mark section button clicked');
    if (typeof showSectionPopup === 'function') {
      showSectionPopup();
    } else {
      // console.error('showSectionPopup function not found');
      alert('Error: Section marking functionality not available');
    }
  });
  
  // console.log('Mark section button fixed');
}

// Call this function after the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // console.log('DOM fully loaded - fixing buttons');
  
  // Wait a short time to ensure all other scripts have run
  setTimeout(fixMarkSectionButton, 500);
});

// Also make sure showSectionPopup is in the global scope
window.showSectionPopup = function() {
  // console.log('Global showSectionPopup called');
  
  // Check if Quill is initialized
  if (!quill) {
    // console.error('Quill editor not initialized');
    alert('Editor not initialized. Please refresh the page.');
    return;
  }
  
  // Check if text is selected
  const range = quill.getSelection();
  // console.log('Current selection:', range);
  
  if (!range || range.length === 0) {
    // console.warn('No text selected');
    alert('Please select some text first');
    return;
  }
  
  // Get the popup element
  const popup = document.getElementById('section-popup');
  if (!popup) {
    // console.error('Section popup element not found');
    alert('Section popup not found. Please check the HTML.');
    return;
  }
  
  // console.log('Showing popup');
  popup.style.display = 'flex';
  
  // Reset the form
  const sectionTypeSelect = document.getElementById('section-type');
  if (sectionTypeSelect) {
    sectionTypeSelect.value = '';
  } else {
    // console.error('Section type select not found');
  }
  
  const customContainer = document.getElementById('custom-section-container');
  if (customContainer) {
    customContainer.style.display = 'none';
  } else {
    // console.error('Custom section container not found');
  }
  
  const customNameInput = document.getElementById('custom-section-name');
  if (customNameInput) {
    customNameInput.value = '';
  } else {
    // console.error('Custom section name input not found');
  }
  
  // Log success
  // console.log('Section popup displayed successfully');
};

// Direct fix for mark section button
document.addEventListener('DOMContentLoaded', function() {
  // console.log('DOM loaded - applying direct button fix');
  
  // Wait a bit to ensure everything is loaded
  setTimeout(function() {
    // Get the button
    const markSectionBtn = document.getElementById('mark-section-btn');
    
    if (markSectionBtn) {
      // console.log('Found mark section button, applying direct onclick');
      
      // Set the onclick property directly
      markSectionBtn.onclick = function() {
        // console.log('Mark section button clicked via direct onclick');
        
        // Check if Quill is initialized
        if (!quill) {
          // console.error('Quill editor not initialized');
          alert('Editor not initialized. Please refresh the page.');
          return;
        }
        
        // Check if text is selected
        const range = quill.getSelection();
        // console.log('Current selection:', range);
        
        if (!range || range.length === 0) {
          // console.warn('No text selected');
          alert('Please select some text first');
          return;
        }
        
        // Get the popup element
        const popup = document.getElementById('section-popup');
        if (!popup) {
          // console.error('Section popup element not found');
          alert('Section popup not found. Please check the HTML.');
          return;
        }
        
        // console.log('Showing popup');
        popup.style.display = 'flex';
        
        // Reset the form
        const sectionTypeSelect = document.getElementById('section-type');
        if (sectionTypeSelect) {
          sectionTypeSelect.value = '';
        } else {
          // console.error('Section type select not found');
        }
        
        const customContainer = document.getElementById('custom-section-container');
        if (customContainer) {
          customContainer.style.display = 'none';
        } else {
          // console.error('Custom section container not found');
        }
        
        const customNameInput = document.getElementById('custom-section-name');
        if (customNameInput) {
          customNameInput.value = '';
        } else {
          // console.error('Custom section name input not found');
        }
        
        // Log success
        // console.log('Section popup displayed successfully');
      };
      
      // console.log('Direct onclick handler applied to mark section button');
    } else {
      // console.error('Mark section button not found for direct fix');
    }
    
    // Also fix the apply section button
    const applySectionBtn = document.getElementById('apply-section-btn');
    if (applySectionBtn) {
      // console.log('Found apply section button, applying direct onclick');
      
      applySectionBtn.onclick = function() {
        // console.log('Apply section function called via direct onclick');
        
        try {
          // Check if Quill is initialized
          if (!quill) {
            // console.error('Quill not initialized');
            alert('Editor not initialized');
            return;
          }
          
          // Get the selected range
          const range = quill.getSelection();
          // console.log('Current selection for applying section:', range);
          
          if (!range || range.length === 0) {
            alert('Please select some text first');
            hideSectionPopup();
            return;
          }
          
          // Get the section type
          const sectionTypeSelect = document.getElementById('section-type');
          if (!sectionTypeSelect) {
            // console.error('Section type select not found');
            return;
          }
          
          const sectionType = sectionTypeSelect.value;
          // console.log('Selected section type:', sectionType);
          
          if (!sectionType) {
            alert('Please select a section type');
            return;
          }
          
          // Get section name for custom sections
          let sectionName;
          if (sectionType === 'custom') {
            const customNameInput = document.getElementById('custom-section-name');
            if (!customNameInput) {
              // console.error('Custom section name input not found');
              return;
            }
            
            sectionName = customNameInput.value.trim();
            if (!sectionName) {
              alert('Please enter a custom section name');
              return;
            }
          }
          
          // Apply a simple background color based on section type
          const sectionColors = {
            'contact': '#e3f2fd',
            'summary': '#e8f5e9',
            'experience': '#f3e5f5',
            'education': '#fff8e1',
            'skills': '#ffebee',
            'projects': '#e0f2f1',
            'certifications': '#e8eaf6',
            'languages': '#fff3e0',
            'interests': '#f1f8e9',
            'references': '#fce4ec',
            'custom': '#f5f5f5'
          };
          
          const backgroundColor = sectionColors[sectionType] || '#f5f5f5';
          
          // Apply the formatting
          // console.log('Applying background color to range:', range.index, range.length);
          quill.formatText(range.index, range.length, {
            'background': backgroundColor
          });
          
          // Get the display name for the section
          const sectionDisplayNames = {
            'contact': 'Contact Information',
            'summary': 'Professional Summary',
            'experience': 'Work Experience',
            'education': 'Education',
            'skills': 'Skills',
            'projects': 'Projects',
            'certifications': 'Certifications',
            'languages': 'Languages',
            'interests': 'Interests',
            'references': 'References'
          };
          
          // Use custom name or get from the mapping
          const displayName = sectionType === 'custom' ? sectionName : (sectionDisplayNames[sectionType] || sectionType.charAt(0).toUpperCase() + sectionType.slice(1));
          
          // Add to tracking array
          const sectionContent = quill.getText(range.index, range.length);
          const newSection = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: sectionType,
            name: displayName,
            range: {
              index: range.index,
              length: range.length
            },
            content: sectionContent
          };
          
          documentSections.push(newSection);
          
          // Update sidebar
          updateSectionsSidebar();
          
          // Update section selector in AI chat
          updateSectionSelectorDirectly();
          
          // Hide the popup
          hideSectionPopup();
          
          // Show confirmation
          const debugInfo = document.getElementById('debug-info');
          if (debugInfo) {
            debugInfo.textContent = 'Section applied: ' + displayName;
          }
          
          // console.log('Section applied successfully:', newSection);
        } catch (error) {
          // console.error('Error applying section:', error);
          alert('Error applying section: ' + error.message);
        }
      };
      
      // console.log('Direct onclick handler applied to apply section button');
    } else {
      // console.error('Apply section button not found for direct fix');
    }
    
    // Fix the cancel button
    const cancelSectionBtn = document.getElementById('cancel-section-btn');
    if (cancelSectionBtn) {
      cancelSectionBtn.onclick = function() {
        // console.log('Hiding section popup via direct onclick');
        const popup = document.getElementById('section-popup');
        if (popup) {
          popup.style.display = 'none';
        } else {
          // console.error('Section popup not found');
        }
      };
    }
    
  }, 1000); // Wait 1 second to ensure everything is loaded
});

// console.log('Direct button fix code added');

// Update the section selector in the AI chat
function updateSectionSelectorDirectly() {
  // console.log('Updating section selector directly');
  
  const sectionSelector = document.getElementById('section-selector');
  if (!sectionSelector) {
    // console.error('Section selector not found');
    return;
  }
  
  // Clear current options
  sectionSelector.innerHTML = '<option value="">Select a section to improve</option>';
  
  // Add each section
  if (window.documentSections && window.documentSections.length > 0) {
    window.documentSections.forEach(section => {
      const option = document.createElement('option');
      option.value = section.id;
      option.textContent = section.name;
      sectionSelector.appendChild(option);
    });
    // console.log('Added', window.documentSections.length, 'sections to selector');
  } else {
    // console.log('No sections available for selector');
    sectionSelector.innerHTML = '<option value="">No sections marked yet</option>';
  }
}

// Make sure to call updateSectionSelectorDirectly after applying a section
function applySectionDirectly() {
  // ... existing code ...
  
  // After adding the section to documentSections
  window.documentSections.push(newSection);
  
  // Update both the sidebar and the section selector
  forceUpdateSidebar();
  updateSectionSelectorDirectly();
  
  // ... rest of the code ...
}

// Add some styles for the suggestion preview
const style = document.createElement('style');
style.textContent = `
  .suggestion-preview {
    background: #f5f5f5;
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
    font-size: 0.9em;
  }
  
  .suggestion-preview pre {
    white-space: pre-wrap;
    margin: 5px 0 15px;
    padding: 10px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
`;
document.head.appendChild(style);

// Update the error handling to be less verbose
function handleError(error) {
  // Only log critical errors
  if (error.status === 500) {
    // console.error('Critical error:', error.message);
  }
}

// Remove debug logging from functions
async function processSectionMessage(message, sectionId) {
  // Remove console.log statements
  try {
    // ... existing code ...
  } catch (error) {
    handleError(error);
    throw error;
  }
}

// Add this function definition
async function callOpenAIAPI(prompt, options = {}) {
  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        model: options.model || 'gpt-3.5-turbo',
        max_tokens: options.maxTokens || 1000
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error calling OpenAI API');
    }
    
    if (!data.response) {
      throw new Error('Invalid response format from API');
    }
    
    return data.response;
    
  } catch (error) {
    throw new Error(
      error.message || 'Failed to process your request. Please try again.'
    );
  }
}

// Make sure this function is available globally
window.callOpenAIAPI = callOpenAIAPI;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Initialize Quill
    let quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: {
                container: '#toolbar'
            }
        }
    });
    console.log('Quill initialized');
    
    // Find the existing upload button
    const uploadBtn = document.querySelector('.upload-btn') || document.getElementById('upload-btn');
    
    // Create file input if it doesn't exist
    let fileInput = document.getElementById('docx-upload');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'docx-upload';
        fileInput.accept = '.docx';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }
    
    if (uploadBtn) {
        console.log('Upload button found');
        uploadBtn.onclick = function() {
            console.log('Upload button clicked');
            fileInput.click();
        };
    } else {
        console.error('Upload button not found');
    }
    
    fileInput.onchange = function(e) {
        console.log('File selected');
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('Processing file:', file.name);
        const formData = new FormData();
        formData.append('file', file);
        
        // Show loading state
        quill.setText('Loading document...');
        
        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response received:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Data received');
            if (data.content) {
                console.log('Setting content');
                quill.root.innerHTML = data.content;
            } else if (data.error) {
                console.error('Error:', data.error);
                quill.setText('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            quill.setText('Error uploading file: ' + error.message);
        });
    };
});