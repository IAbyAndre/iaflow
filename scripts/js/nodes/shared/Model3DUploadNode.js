// ==================== 3D MODEL UPLOAD NODE ====================
function Model3DUploadNode() {
  this.addOutput("Model URL", "string");
  
  this.size = [400, 400];
  this.modelUrl = null;
  this.modelLoaded = false;
  this.fileInputElement = null;
  this.viewerElement = null;
  this.modelViewerScript = null;
}
Model3DUploadNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("3D Upload", "3D") : "⚪ 3D Upload";

Model3DUploadNode.prototype.onAdded = function() {
  this.createFileInput();
  this.loadModelViewerScript();
};

Model3DUploadNode.prototype.loadModelViewerScript = function() {
  // Check if model-viewer is already loaded
  if (window.customElements && window.customElements.get('model-viewer')) {
    this.createViewer();
    return;
  }
  
  // Load model-viewer script if not already loaded
  if (!document.querySelector('script[src*="model-viewer"]')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
    script.onload = () => {
      this.createViewer();
    };
    document.head.appendChild(script);
    this.modelViewerScript = script;
  } else {
    // Script exists, wait a bit for it to load
    setTimeout(() => this.createViewer(), 100);
  }
};

Model3DUploadNode.prototype.createViewer = function() {
  if (this.viewerElement) return;
  
  this.viewerElement = document.createElement('model-viewer');
  this.viewerElement.setAttribute('camera-controls', '');
  this.viewerElement.setAttribute('auto-rotate', '');
  this.viewerElement.setAttribute('shadow-intensity', '1');
  this.viewerElement.setAttribute('style', `
    width: 100%;
    height: 100%;
    position: absolute;
    background-color: #1a1a1a;
    pointer-events: auto;
  `);
  
  this.viewerElement.addEventListener('load', () => {
    this.modelLoaded = true;
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
  });
  
  this.viewerElement.addEventListener('error', () => {
    this.modelLoaded = false;
    console.error('Failed to load 3D model');
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
  });
  
  document.body.appendChild(this.viewerElement);
  
  // If we already have a model URL, load it
  if (this.modelUrl) {
    this.viewerElement.setAttribute('src', this.modelUrl);
  }
};

Model3DUploadNode.prototype.createFileInput = function() {
  if (this.fileInputElement) return;
  
  // Create hidden file input
  this.fileInputElement = document.createElement('input');
  this.fileInputElement.type = 'file';
  this.fileInputElement.accept = '.glb,.gltf,.obj,.fbx,.stl';
  this.fileInputElement.style.display = 'none';
  
  this.fileInputElement.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      this.loadModelFromFile(file);
    }
  });
  
  document.body.appendChild(this.fileInputElement);
};

Model3DUploadNode.prototype.loadModelFromFile = function(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    this.modelUrl = e.target.result; // base64 data URL
    this.modelLoaded = false; // Will be set to true by viewer onload
    this.fileName = file.name;
    this.fileSize = file.size;
    this.setOutputData(0, this.modelUrl);
    
    // Load model into viewer
    if (this.viewerElement) {
      this.viewerElement.setAttribute('src', this.modelUrl);
    }
    
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
  };
  
  reader.onerror = () => {
    console.error('Failed to read 3D model file');
    this.modelLoaded = false;
  };
  
  reader.readAsDataURL(file);
};

Model3DUploadNode.prototype.updateViewerPosition = function() {
  if (!this.viewerElement || !this.graph || !this.graph.list_of_graphcanvas) return;
  
  // Hide viewer when node is collapsed
  if (this.flags.collapsed) {
    this.viewerElement.style.display = 'none';
    return;
  } else {
    this.viewerElement.style.display = 'block';
  }
  
  const canvas = this.graph.list_of_graphcanvas[0];
  if (!canvas) return;
  
  const scale = canvas.ds.scale;
  const offset = canvas.ds.offset;
  const canvasRect = canvas.canvas.getBoundingClientRect();
  
  // Calculate position relative to canvas (leave space for button at bottom)
  const x = canvasRect.left + (this.pos[0] * scale) + offset[0] + (6 * scale);
  const y = canvasRect.top + (this.pos[1] * scale) + offset[1] + (32 * scale);
  const w = (this.size[0] - 12) * scale;
  const h = (this.size[1] - 78) * scale; // Leave space for button and info
  
  this.viewerElement.style.left = x + 'px';
  this.viewerElement.style.top = y + 'px';
  this.viewerElement.style.width = w + 'px';
  this.viewerElement.style.height = h + 'px';
};

Model3DUploadNode.prototype.onExecute = function() {
  this.setOutputData(0, this.modelUrl);
};

Model3DUploadNode.prototype.onDrawForeground = function(ctx) {
  // Update viewer position on every frame
  this.updateViewerPosition();
  
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  // Draw placeholder text if no model
  if (!this.modelUrl) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No 3D model uploaded", this.size[0] / 2, this.size[1] / 2 - 20);
    ctx.textAlign = "left";
  } else if (!this.modelLoaded) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading model...", this.size[0] / 2, this.size[1] / 2 - 20);
    ctx.textAlign = "left";
  }
  
  // Model info bar
  if (this.fileName || this.fileSize) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, this.size[1] - 65, this.size[0] - 20, 25);
    
    ctx.fillStyle = "#AAA";
    ctx.font = "10px Arial";
    if (this.fileName) {
      const displayName = this.fileName.length > 40 ? this.fileName.substring(0, 37) + '...' : this.fileName;
      ctx.fillText(displayName, 15, this.size[1] - 53);
    }
    if (this.fileSize) {
      const sizeKB = (this.fileSize / 1024).toFixed(1);
      ctx.fillText(`${sizeKB} KB`, 15, this.size[1] - 43);
    }
  }
  
  // Draw upload button
  const btnY = this.size[1] - 35;
  const btnHeight = 25;
  
  ctx.fillStyle = "#2196F3";
  ctx.fillRect(10, btnY, this.size[0] - 20, btnHeight);
  
  ctx.fillStyle = "#FFF";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(this.modelUrl ? "Change Model" : "Upload 3D Model", this.size[0] / 2, btnY + 16);
  ctx.textAlign = "left";
};

Model3DUploadNode.prototype.onDrawBackground = function(ctx) {
  // Don't draw background when node is collapsed
  if (this.flags.collapsed) return;
  
  // Draw background for viewer area
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(6, 32, this.size[0] - 12, this.size[1] - 70);
};

Model3DUploadNode.prototype.onMouseDown = function(e, pos, canvas) {
  // Check if click is on upload button
  const btnY = this.size[1] - 35;
  const btnHeight = 25;
  
  if (pos[1] >= btnY && pos[1] <= btnY + btnHeight && pos[0] >= 10 && pos[0] <= this.size[0] - 10) {
    // Trigger file input
    if (this.fileInputElement) {
      this.fileInputElement.click();
    }
    return true;
  }
  return false;
};

Model3DUploadNode.prototype.onRemoved = function() {
  if (this.fileInputElement && this.fileInputElement.parentNode) {
    this.fileInputElement.parentNode.removeChild(this.fileInputElement);
    this.fileInputElement = null;
  }
  if (this.viewerElement && this.viewerElement.parentNode) {
    this.viewerElement.parentNode.removeChild(this.viewerElement);
    this.viewerElement = null;
  }
};

Model3DUploadNode.prototype.onSerialize = function(o) {
  // Save the model data URL so it persists across save/load
  if (this.modelUrl) {
    o.modelUrl = this.modelUrl;
    o.fileName = this.fileName;
    o.fileSize = this.fileSize;
  }
};

Model3DUploadNode.prototype.onConfigure = function(o) {
  // Restore the model from saved data
  if (o.modelUrl) {
    this.modelUrl = o.modelUrl;
    this.fileName = o.fileName;
    this.fileSize = o.fileSize;
    this.setOutputData(0, this.modelUrl);
    
    // Load model into viewer if it exists
    if (this.viewerElement) {
      this.viewerElement.setAttribute('src', this.modelUrl);
    }
    
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
  }
};

LiteGraph.registerNodeType("ai-tools/3d/upload_3d_model", Model3DUploadNode);
