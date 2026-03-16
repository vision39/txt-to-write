// DOM Elements
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('textInput');
const fontSelect = document.getElementById('fontSelect');
const fontSizeInput = document.getElementById('fontSize');
const inkColorInput = document.getElementById('inkColor');
const hexDisplay = document.getElementById('hexDisplay');
const paperTypeSelect = document.getElementById('paperType');
const downloadBtn = document.getElementById('downloadBtn');
const resetLayoutBtn = document.getElementById('resetLayoutBtn');

// New DOM Elements for individual paragraph color
const floatingToolbar = document.getElementById('floatingToolbar');
const floatingColor = document.getElementById('floatingColor');
const floatingReset = document.getElementById('floatingReset');

// State to track each paragraph's individual offsets and color
let paragraphsState = [];
let selectedParaIndex = -1; // Tracks which paragraph is currently selected

// Paper configuration
const PAPER_PADDING_LEFT = 80; // Space for the margin line
const PAPER_PADDING_RIGHT = 30;
const PAPER_PADDING_TOP = 80;

// Function to draw the background and ruled lines
function drawPaperBackground(lineSpacing) {
    // Fill background with white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (paperTypeSelect.value === 'ruled') {
        // Draw horizontal blue ruled lines
        ctx.strokeStyle = "rgba(0, 150, 255, 0.2)";
        ctx.lineWidth = 1;
        
        // Start drawing lines from top padding, down to the bottom
        for (let y = PAPER_PADDING_TOP; y < canvas.height; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw vertical red margin line
        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)"; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(PAPER_PADDING_LEFT - 10, 0);
        ctx.lineTo(PAPER_PADDING_LEFT - 10, canvas.height);
        ctx.stroke();
    }
}

// Function to process, calculate hitboxes, and draw individual paragraphs
function processAndDrawParagraphs(maxWidth, lineSpacing, fontSize) {
    let currentBaseY = PAPER_PADDING_TOP - (fontSize * 0.2); 
    const startX = PAPER_PADDING_LEFT + 10;

    paragraphsState.forEach((para, index) => { // FIXED: Added 'index' here
        if (para.text.length === 0) {
            currentBaseY += lineSpacing;
            para.boundingBox = null;
            return;
        }

        const words = para.text.split(' ');
        let currentLine = '';
        let lines = [];

        // Word wrap logic for this specific paragraph
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && i > 0) {
                lines.push(currentLine);
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        const paraStartX = startX + para.offsetX;
        const paraStartY = currentBaseY + para.offsetY;
        const height = lines.length * lineSpacing;

        // Set color specifically for this paragraph
        ctx.fillStyle = para.color || inkColorInput.value;

        // Draw text lines
        lines.forEach((line, i) => {
            ctx.fillText(line, paraStartX, paraStartY + (i * lineSpacing));
        });

        // Save bounding box for hit detection (mouse interactions)
        para.boundingBox = {
            x: startX - 10, // Wider hitbox for easier grabbing
            y: paraStartY - fontSize, 
            w: maxWidth + 20, 
            h: height + (fontSize * 0.2)
        };

        // Draw solid selection box if this paragraph is selected
        if (index === selectedParaIndex) {
            ctx.save();
            // Solid light blue background
            ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
            ctx.fillRect(para.boundingBox.x, para.boundingBox.y, para.boundingBox.w, para.boundingBox.h);
            
            // Solid blue outline
            ctx.strokeStyle = "rgba(59, 130, 246, 0.8)"; 
            ctx.setLineDash([]); // Solid line
            ctx.lineWidth = 2;
            ctx.strokeRect(para.boundingBox.x, para.boundingBox.y, para.boundingBox.w, para.boundingBox.h);
            ctx.restore();
        }

        currentBaseY += height;
    });
}

// Main render function
function renderCanvas() {
    const fontSize = parseInt(fontSizeInput.value) || 32;
    const lineSpacing = fontSize * 1.4; 
    
    drawPaperBackground(lineSpacing);

    const fontFamily = `"${fontSelect.value}", cursive`;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = inkColorInput.value;
    ctx.textBaseline = "alphabetic";

    const maxTextWidth = canvas.width - PAPER_PADDING_LEFT - PAPER_PADDING_RIGHT;
    processAndDrawParagraphs(maxTextWidth, lineSpacing, fontSize);
    
    // Position floating toolbar after drawing
    positionFloatingToolbar();
}

// Sync text input with paragraph state
function syncText() {
    const lines = textInput.value.split('\n');
    paragraphsState = lines.map((text, index) => {
        // Keep existing offsets and color if the paragraph already existed
        if (paragraphsState[index]) {
            return { ...paragraphsState[index], text: text };
        }
        return { text: text, offsetX: 0, offsetY: 0, boundingBox: null, color: inkColorInput.value };
    });

    // If the selected paragraph was deleted, deselect it
    if (selectedParaIndex >= paragraphsState.length) {
        selectedParaIndex = -1;
        updateSelectionUI();
    } else {
        renderCanvas();
    }
}

// Event Listeners for real-time updates
textInput.addEventListener('input', syncText);

const settingsInputs = [fontSelect, fontSizeInput, paperTypeSelect];
settingsInputs.forEach(input => {
    input.addEventListener('input', renderCanvas);
});

// Global ink color affects all paragraphs and resets them
inkColorInput.addEventListener('input', (e) => {
    hexDisplay.textContent = e.target.value;
    paragraphsState.forEach(para => {
        para.color = e.target.value;
    });
    if (selectedParaIndex !== -1 && paragraphsState[selectedParaIndex]) {
        floatingColor.value = e.target.value;
    }
    renderCanvas();
});

// Specific paragraph color listener from floating toolbar
floatingColor.addEventListener('input', (e) => {
    if (selectedParaIndex !== -1 && paragraphsState[selectedParaIndex]) {
        paragraphsState[selectedParaIndex].color = e.target.value;
        renderCanvas();
    }
});

floatingReset.addEventListener('click', () => {
    if (selectedParaIndex !== -1 && paragraphsState[selectedParaIndex]) {
        paragraphsState[selectedParaIndex].offsetX = 0;
        paragraphsState[selectedParaIndex].offsetY = 0;
        renderCanvas();
    }
});

resetLayoutBtn.addEventListener('click', () => {
    paragraphsState.forEach(para => {
        para.offsetX = 0;
        para.offsetY = 0;
    });
    renderCanvas();
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `handwritten-note-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// --- Drag and Drop Logic for Individual Paragraphs ---
let isDragging = false;
let activeParaIndex = -1;
let dragStartX = 0;
let dragStartY = 0;
let initialOffsetX = 0;
let initialOffsetY = 0;

function positionFloatingToolbar() {
    if (selectedParaIndex === -1 || !paragraphsState[selectedParaIndex]) {
        floatingToolbar.classList.add('hidden');
        return;
    }

    const box = paragraphsState[selectedParaIndex].boundingBox;
    if (!box) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const screenX = rect.left + window.scrollX + (box.x * scaleX);
    const screenY = rect.top + window.scrollY + (box.y * scaleY);

    // Center toolbar horizontally relative to the box
    const boxScreenWidth = box.w * scaleX;
    const toolbarLeft = screenX + (boxScreenWidth / 2) - (floatingToolbar.offsetWidth / 2);

    // Position toolbar slightly above the box, or below if it hits the top
    let toolbarTop = screenY - 55;
    if (box.y * scaleY < 50) {
        toolbarTop = screenY + (box.h * scaleY) + 15;
    }

    floatingToolbar.style.left = `${toolbarLeft}px`;
    floatingToolbar.style.top = `${toolbarTop}px`;
}

function updateSelectionUI() {
    if (selectedParaIndex !== -1 && paragraphsState[selectedParaIndex]) {
        floatingToolbar.classList.remove('hidden');
        const pColor = paragraphsState[selectedParaIndex].color || inkColorInput.value;
        floatingColor.value = pColor;
        positionFloatingToolbar();
    } else {
        floatingToolbar.classList.add('hidden');
    }
    renderCanvas();
}

// Keep toolbar attached to the box when resizing or scrolling
window.addEventListener('resize', positionFloatingToolbar);
window.addEventListener('scroll', positionFloatingToolbar);

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDrag(e) {
    const pos = getCanvasCoordinates(e);
    
    // Find which paragraph was clicked (reverse order for top-most layer)
    activeParaIndex = -1;
    for (let i = paragraphsState.length - 1; i >= 0; i--) {
        const box = paragraphsState[i].boundingBox;
        if (box && pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h) {
            activeParaIndex = i;
            break;
        }
    }

    // Update selection state and UI
    if (selectedParaIndex !== activeParaIndex) {
        selectedParaIndex = activeParaIndex;
        updateSelectionUI();
    }

    if (activeParaIndex !== -1) {
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        dragStartX = pos.x;
        dragStartY = pos.y;
        initialOffsetX = paragraphsState[activeParaIndex].offsetX;
        initialOffsetY = paragraphsState[activeParaIndex].offsetY;
    }
}

function drag(e) {
    if (!isDragging || activeParaIndex === -1) return;
    if (e.type === 'touchmove') e.preventDefault(); 

    const pos = getCanvasCoordinates(e);
    const dx = pos.x - dragStartX;
    const dy = pos.y - dragStartY;

    // Update only the actively dragged paragraph
    paragraphsState[activeParaIndex].offsetX = initialOffsetX + dx;
    paragraphsState[activeParaIndex].offsetY = initialOffsetY + dy;
    
    renderCanvas();
}

function stopDrag() {
    isDragging = false;
    activeParaIndex = -1;
    canvas.style.cursor = 'default';
}

// Mouse Event Listeners
canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) {
        const pos = getCanvasCoordinates(e);
        let hovered = false;
        for (let i = paragraphsState.length - 1; i >= 0; i--) {
            const box = paragraphsState[i].boundingBox;
            if (box && pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h) {
                hovered = true;
                break;
            }
        }
        canvas.style.cursor = hovered ? 'grab' : 'default';
    }
});
window.addEventListener('mousemove', (e) => {
    if (isDragging) drag(e);
}, { passive: false });
window.addEventListener('mouseup', stopDrag);

// Touch Event Listeners for mobile/tablets
canvas.addEventListener('touchstart', startDrag, { passive: false });
window.addEventListener('touchmove', (e) => {
    if (isDragging) drag(e);
}, { passive: false });
window.addEventListener('touchend', stopDrag);

// Wait for all custom fonts to be loaded by the browser before drawing the first time
document.fonts.ready.then(() => {
    syncText();
});

// Initialize state
syncText();
