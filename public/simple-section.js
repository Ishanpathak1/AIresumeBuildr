// Simple section marking script
console.log('Simple section marking script loaded');

// Global variables
let quill;
let documentSections = [];

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded - simple version');
  
  // Initialize Quill
  try {
    quill = new Quill('#editor', {
      modules: {
        toolbar: '#toolbar'
      },
      theme: 'snow'
    });
    console.log('Quill initialized successfully');
  } catch (error) {
    console.error('Error initializing Quill:', error);
  }
  
  // Set up event listeners
  setupSimpleEventListeners();
});

// Set up simple event listeners
function setupSimpleEventListeners() {
  console.log('Setting up simple event listeners');
  
  // Mark section button
  const markSectionBtn = document.getElementById('mark-section-btn');
  if (markSectionBtn) {
    markSectionBtn.onclick = function() {
      console.log('Mark section button clicked');
      showSimpleSectionPopup();
    };
    console.log('Mark section button listener added');
  } else {
    console.error('Mark section button not found');
  }
  
  // Apply section button
  const applySectionBtn = document.getElementById('apply-section');
  if (applySectionBtn) {
    applySectionBtn.onclick = function() {
      console.log('Apply section button clicked');
      applySimpleSection();
    };
    console.log('Apply section button listener added');
  } else {
    console.error('Apply section button not found');
  }
  
  // Cancel section button
  const cancelSectionBtn = document.getElementById('cancel-section');
  if (cancelSectionBtn) {
    cancelSectionBtn.onclick = function() {
      console.log('Cancel section button clicked');
      hideSimpleSectionPopup();
    };
    console.log('Cancel section button listener added');
  } else {
    console.error('Cancel section button not found');
  }
  
  // Section type select
  const sectionTypeSelect = document.getElementById('section-type');
  if (sectionTypeSelect) {
    sectionTypeSelect.onchange = function() {
      console.log('Section type changed to:', this.value);
      const customContainer = document.getElementById('custom-section-container');
      if (customContainer) {
        customContainer.style.display = this.value === 'custom' ? 'block' : 'none';
      }
    };
    console.log('Section type select listener added');
  } else {
    console.error('Section type select not found');
  }
}

// Show simple section popup
function showSimpleSectionPopup() {
  console.log('Showing simple section popup');
  
  // Check if text is selected
  if (!quill) {
    console.error('Quill not initialized');
    return;
  }
  
  const range = quill.getSelection();
  console.log('Current selection:', range);
  
  if (!range || range.length === 0) {
    alert('Please select some text first');
    return;
  }
  
  // Show popup
  const popup = document.getElementById('section-popup');
  if (popup) {
    popup.style.display = 'flex';
  } else {
    console.error('Section popup not found');
  }
}

// Hide simple section popup
function hideSimpleSectionPopup() {
  console.log('Hiding simple section popup');
  const popup = document.getElementById('section-popup');
  if (popup) {
    popup.style.display = 'none';
  } else {
    console.error('Section popup not found');
  }
}

// Apply simple section
function applySimpleSection() {
  console.log('Applying simple section');
  
  try {
    // Check if quill is initialized
    if (!quill) {
      console.error('Quill not initialized');
      alert('Editor not initialized');
      return;
    }
    
    // Get selection
    const range = quill.getSelection();
    console.log('Selection for applying section:', range);
    
    if (!range || range.length === 0) {
      alert('Please select some text first');
      hideSimpleSectionPopup();
      return;
    }
    
    // Get section type
    const sectionTypeSelect = document.getElementById('section-type');
    if (!sectionTypeSelect) {
      console.error('Section type select not found');
      return;
    }
    
    const sectionType = sectionTypeSelect.value;
    console.log('Selected section type:', sectionType);
    
    if (!sectionType) {
      alert('Please select a section type');
      return;
    }
    
    // Apply a simple background color
    console.log('Applying background color to range:', range.index, range.length);
    quill.formatText(range.index, range.length, {
      'background': '#e0f7fa'
    });
    
    // Hide popup
    hideSimpleSectionPopup();
    
    // Show success message
    alert('Section marked successfully!');
    
    console.log('Section applied successfully');
  } catch (error) {
    console.error('Error applying section:', error);
    alert('Error: ' + error.message);
  }
}

// Make functions globally available
window.showSimpleSectionPopup = showSimpleSectionPopup;
window.hideSimpleSectionPopup = hideSimpleSectionPopup;
window.applySimpleSection = applySimpleSection; 