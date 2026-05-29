// Photo Resizer Tool - Client-Side Image Processing
// All processing happens in the browser - no server required

// State management
let originalImage = null;
let processedImageBlob = null;
let cropper = null;

// DOM Elements
const elements = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    previewImage: document.getElementById('preview-image'),
    previewContainer: document.getElementById('preview-container'),
    uploadPrompt: document.getElementById('upload-prompt'),
    closePreviewBtn: document.getElementById('close-preview'),
    widthInput: document.getElementById('width-input'),
    heightInput: document.getElementById('height-input'),
    unitSelect: document.getElementById('unit-select'),
    dpiInput: document.getElementById('dpi-input'),
    formatSelect: document.getElementById('format-select'),
    qualitySlider: document.getElementById('quality-slider'),
    qualityValue: document.getElementById('quality-value'),
    targetSize: document.getElementById('target-size'),
    processBtn: document.getElementById('process-btn'),
    downloadBtn: document.getElementById('download-btn'),
    resetBtn: document.getElementById('reset-btn'),
    toolTitle: document.getElementById('tool-title'),
    seoContent: document.getElementById('seo-content'),
    seoDescription: document.getElementById('seo-description'),
    resultInfo: document.getElementById('result-info'),
    fileSizeInfo: document.getElementById('file-size-info'),
    downloadSuccess: document.getElementById('download-success'),
    zoomSlider: document.getElementById('zoom-slider'),
    zoomValue: document.getElementById('zoom-value'),
    presetBtns: document.querySelectorAll('.preset-btn')
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initializeTool();
    setupEventListeners();
    loadSEOContent();
});

// Initialize tool with default values
function initializeTool() {
    updateQualityDisplay();
}

// Setup all event listeners
function setupEventListeners() {
    // File upload events
    elements.dropZone.addEventListener('click', () => {
        if (originalImage) return;
        elements.fileInput.click();
    });
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);
    
    // Close preview button
    elements.closePreviewBtn.addEventListener('click', closePreview);

    // Control events
    elements.qualitySlider.addEventListener('input', updateQualityDisplay);
    elements.zoomSlider.addEventListener('input', handleZoomChange);
    elements.processBtn.addEventListener('click', processImage);
    elements.downloadBtn.addEventListener('click', downloadImage);
    elements.resetBtn.addEventListener('click', resetTool);

    // Quick preset buttons
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const w = btn.getAttribute('data-width');
            const h = btn.getAttribute('data-height');
            const u = btn.getAttribute('data-unit');
            const t = btn.getAttribute('data-target');
            
            elements.widthInput.value = w;
            elements.heightInput.value = h;
            if (u) elements.unitSelect.value = u;
            if (t) elements.targetSize.value = t;
        });
    });

    // Auto-process when target size changes
    elements.targetSize.addEventListener('change', () => {
        if (originalImage && elements.processBtn.disabled === false) {
            processImage();
        }
    });
}

// Update quality slider display
function updateQualityDisplay() {
    elements.qualityValue.textContent = elements.qualitySlider.value;
}

// Update zoom slider display and apply to cropper
function handleZoomChange() {
    const zoom = elements.zoomSlider.value;
    elements.zoomValue.textContent = zoom;
    
    if (cropper) {
        cropper.zoomTo(zoom / 100);
    }
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    elements.dropZone.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave() {
    elements.dropZone.classList.remove('dragover');
}

// Handle file drop
function handleDrop(event) {
    event.preventDefault();
    elements.dropZone.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

// Load image file
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        elements.previewImage.src = event.target.result;
        elements.previewImage.classList.remove('hidden');
        elements.previewContainer.classList.remove('hidden');
        elements.uploadPrompt.classList.add('hidden');
        originalImage = new Image();
        originalImage.onload = () => {
            initializeCropper();
            enableProcessButton();
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Initialize Cropper.js
function initializeCropper() {
    if (cropper) {
        cropper.destroy();
    }
    
    cropper = new Cropper(elements.previewImage, {
        viewMode: 1,
        dragMode: 'move',
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        background: true,
        crop: function(event) {
            // Auto-update dimensions based on crop
            if (elements.unitSelect.value === 'px') {
                elements.widthInput.value = Math.round(event.detail.width);
                elements.heightInput.value = Math.round(event.detail.height);
            }
        }
    });
}

// Enable process button
function enableProcessButton() {
    elements.processBtn.disabled = false;
}

// Process image with current settings
async function processImage() {
    if (!originalImage || !cropper) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Get dimensions in pixels
    const { width, height } = getDimensionsInPixels();
    
    canvas.width = width;
    canvas.height = height;

    // Get cropped canvas from cropper
    const cropData = cropper.getData();
    const scaleX = originalImage.naturalWidth / elements.previewImage.naturalWidth;
    const scaleY = originalImage.naturalHeight / elements.previewImage.naturalHeight;

    // Draw cropped and resized image
    ctx.drawImage(
        originalImage,
        cropData.x * scaleX,
        cropData.y * scaleY,
        cropData.width * scaleX,
        cropData.height * scaleY,
        0, 0,
        width,
        height
    );

    // Get target size for compression
    const targetKB = elements.targetSize.value ? parseInt(elements.targetSize.value) : null;
    let quality = parseInt(elements.qualitySlider.value) / 100;
    const mimeType = `image/${elements.formatSelect.value}`;

    // Function to compress and check size
    function compressToBlob(qualityVal) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, mimeType, qualityVal);
        });
    }

    // Process with size control if target specified
    let blob = await compressToBlob(quality);
    
    if (!blob) {
        console.error('Canvas toBlob returned null - image may be tainted');
        elements.fileSizeInfo.textContent = 'Error: Could not process image. Try a different image file.';
        return;
    }
    
    if (targetKB && blob) {
        let currentKB = blob.size / 1024;
        
        if (currentKB > targetKB) {
            // Binary search for optimal quality
            let low = 0.05, high = 0.95;
            while (low <= high) {
                const mid = (low + high) / 2;
                blob = await compressToBlob(mid);
                if (!blob) break;
                currentKB = blob.size / 1024;
                
                if (Math.abs(currentKB - targetKB) < 5) break;
                
                if (currentKB > targetKB) {
                    high = mid - 0.05;
                } else {
                    low = mid + 0.05;
                }
            }
        }
    }

    if (blob) {
        processedImageBlob = blob;
        elements.downloadBtn.disabled = false;
        elements.resultInfo.classList.remove('hidden');
        elements.fileSizeInfo.textContent = `Processed size: ${(blob.size / 1024).toFixed(1)} KB (${width}x${height}px)`;
    }
}

// Get dimensions converted to pixels
function getDimensionsInPixels() {
    let width = parseInt(elements.widthInput.value) || 0;
    let height = parseInt(elements.heightInput.value) || 0;
    const unit = elements.unitSelect.value;
    const dpi = parseInt(elements.dpiInput.value) || 300;

    switch (unit) {
        case 'inch':
            width = Math.round(width * dpi);
            height = Math.round(height * dpi);
            break;
        case 'mm':
            width = Math.round(width * dpi / 25.4);
            height = Math.round(height * dpi / 25.4);
            break;
        case 'cm':
            width = Math.round(width * dpi / 2.54);
            height = Math.round(height * dpi / 2.54);
            break;
    }

    return { width, height };
}

// Download processed image
function downloadImage() {
    if (!processedImageBlob) {
        alert('No image processed yet. Please upload an image and click Process first.');
        return;
    }
    
    // Get file extension
    const format = elements.formatSelect.value;
    const formatMap = {
        'jpeg': 'jpg',
        'png': 'png',
        'webp': 'webp'
    };
    const ext = formatMap[format] || 'jpg';
    
    try {
        const url = URL.createObjectURL(processedImageBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `resized-${elements.widthInput.value}x${elements.heightInput.value}.${ext}`;
        document.body.appendChild(a);
        a.click();
        
        // Show success message on mobile
        if (elements.downloadSuccess) {
            elements.downloadSuccess.classList.remove('hidden');
            setTimeout(() => {
                elements.downloadSuccess.classList.add('hidden');
            }, 3000);
        }
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        alert('Download failed. Please try again.');
    }
}

// Close preview image
function closePreview() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    elements.previewImage.src = '';
    elements.previewImage.classList.add('hidden');
    elements.previewContainer.classList.add('hidden');
    elements.uploadPrompt.classList.remove('hidden');
    elements.fileInput.value = '';
    elements.processBtn.disabled = true;
    elements.downloadBtn.disabled = true;
    elements.resultInfo.classList.add('hidden');
    processedImageBlob = null;
    originalImage = null;
}

// Reset tool to initial state
function resetTool() {
    closePreview();
}

// Load SEO content based on URL parameter
async function loadSEOContent() {
    const urlParams = new URLSearchParams(window.location.search);
    const toolId = urlParams.get('tool');

    if (!toolId) {
        elements.toolTitle.textContent = 'Free Photo Resizer - Resize Images Online';
        elements.seoContent.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch('seo-data.json');
        const seoData = await response.json();
        const tool = seoData.find(item => item.id === toolId);

        if (tool) {
            // Update meta tags
            updateMetaTags(tool);
            
            // Update H1
            elements.toolTitle.textContent = tool.h1;
            
            // Auto-fill dimensions
            elements.widthInput.value = tool.width;
            elements.heightInput.value = tool.height;
            elements.unitSelect.value = tool.unit || 'px';
            if (tool.dpi) {
                elements.dpiInput.value = tool.dpi;
            }
            
            // Show SEO content (description + blog)
            let contentHtml = `<p>${tool.description}</p>`;
            if (tool.blog) {
                contentHtml += tool.blog;
            }
            elements.seoDescription.innerHTML = contentHtml;
            elements.seoContent.classList.remove('hidden');
            
            // Auto-set target size if specified
            if (tool.targetSize) {
                elements.targetSize.value = tool.targetSize;
            }
        }
    } catch (error) {
        console.error('Error loading SEO data:', error);
    }
}

// Update meta tags for SEO
function updateMetaTags(tool) {
    document.title = tool.title;
    
    // Update description meta
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        metaDesc.content = tool.meta_desc;
        document.head.appendChild(metaDesc);
    } else {
        metaDesc.content = tool.meta_desc;
    }

    // Update or create Open Graph tags
    const ogTags = [
        { property: 'og:title', content: tool.title },
        { property: 'og:description', content: tool.meta_desc },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: window.location.href }
    ];

    ogTags.forEach(tag => {
        let meta = document.querySelector(`meta[property="${tag.property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.property = tag.property;
            meta.content = tag.content;
            document.head.appendChild(meta);
        } else {
            meta.content = tag.content;
        }
    });
}