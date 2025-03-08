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
  console.log('Canvas initialized with size:', canvas.width, 'x', canvas.height);
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
      console.log('Resizing line from', resizingEnd, 'endpoint');
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
      console.log('Selected line:', selectedLine);
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
    console.log('Started drawing line at:', x, y);
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
    console.log('Drawing line to:', line.x2, line.y2);
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
    console.log('Resizing line to:', selectedLine.x1, selectedLine.y1, selectedLine.x2, selectedLine.y2);
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
    console.log('Moving line to:', selectedLine.x1, selectedLine.y1, selectedLine.x2, selectedLine.y2);
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
  console.log('Stopped drawing/dragging/resizing');
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
  
  console.log('Draw mode:', drawMode ? 'Enabled' : 'Disabled');
});

// Increase line thickness
document.getElementById('increase-thickness').addEventListener('click', function() {
  if (!drawMode) return;
  
  if (selectedLine) {
    saveState();
    selectedLine.thickness += 1;
    redrawLines();
    console.log('Increased line thickness to:', selectedLine.thickness);
  } else {
    lineThickness += 1;
    console.log('Set default line thickness to:', lineThickness);
  }
});

// Decrease line thickness
document.getElementById('decrease-thickness').addEventListener('click', function() {
  if (!drawMode) return;
  
  if (selectedLine && selectedLine.thickness > 1) {
    saveState();
    selectedLine.thickness -= 1;
    redrawLines();
    console.log('Decreased line thickness to:', selectedLine.thickness);
  } else if (lineThickness > 1) {
    lineThickness -= 1;
    console.log('Set default line thickness to:', lineThickness);
  }
});

// Add undo button event listener
document.getElementById('undo').addEventListener('click', function() {
  if (!drawMode) return;
  
  undo();
  console.log('Undo action');
});

// Add redo button event listener
document.getElementById('redo').addEventListener('click', function() {
  if (!drawMode) return;
  
  redo();
  console.log('Redo action');
});

// Deselect line
document.getElementById('deselect').addEventListener('click', function() {
  if (!drawMode) return;
  
  selectedLine = null;
  redrawLines();
  console.log('Deselected line');
});

// DOCX file upload and conversion
document.getElementById('docx-upload').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
        .then(result => {
          const delta = quill.clipboard.convert(result.value);
          quill.setContents(delta);
        })
        .catch(err => {
          console.error('Error converting DOCX to HTML:', err);
          alert('Failed to convert DOCX file.');
        });
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert('Please upload a valid DOCX file.');
  }
});

// Save document
document.getElementById('save-doc').addEventListener('click', function() {
  const delta = quill.getContents();
  const html = quill.root.innerHTML;
  console.log('Document saved:', html);
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

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';