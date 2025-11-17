// ==================== 3D MODEL PREVIEW NODE ====================
function Model3DPreviewNode() {
  this.addInput("Model URL", "string");
  this.addOutput("Model URL", "string");
  
  this.size = [400, 400];
  this.modelLoaded = false;
  this.modelUrl = null;
  this.viewerElement = null;
  this.modelViewerScript = null;
}
Model3DPreviewNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("3D Preview", "3D") : "⚪ 3D Preview";

Model3DPreviewNode.prototype.onAdded = function() {
  this.loadModelViewerScript();
};

Model3DPreviewNode.prototype.loadModelViewerScript = function() {
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
  }
};

Model3DPreviewNode.prototype.createViewer = function() {
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
    this.loadModel(this.modelUrl);
  }
};

Model3DPreviewNode.prototype.onExecute = function() {
  const modelUrl = this.getInputData(0);
  
  if (modelUrl !== this.modelUrl) {
    this.loadModel(modelUrl);
  }
  
  this.setOutputData(0, modelUrl);
};

Model3DPreviewNode.prototype.loadModel = function(modelUrl) {
  this.modelUrl = modelUrl;
  this.modelLoaded = false;
  
  if (modelUrl && this.viewerElement) {
    this.viewerElement.setAttribute('src', modelUrl);
  }
};

Model3DPreviewNode.prototype.updateViewerPosition = function() {
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
  
  // Calculate position relative to canvas
  const x = canvasRect.left + (this.pos[0] * scale) + offset[0] + (6 * scale);
  const y = canvasRect.top + (this.pos[1] * scale) + offset[1] + (32 * scale);
  const w = (this.size[0] - 12) * scale;
  const h = (this.size[1] - 38) * scale;
  
  this.viewerElement.style.left = x + 'px';
  this.viewerElement.style.top = y + 'px';
  this.viewerElement.style.width = w + 'px';
  this.viewerElement.style.height = h + 'px';
};

Model3DPreviewNode.prototype.onDrawForeground = function(ctx) {
  // Update viewer position on every frame
  this.updateViewerPosition();
  
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  // Draw placeholder text if no model or loading
  if (!this.modelUrl) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No 3D model", this.size[0] / 2, this.size[1] / 2);
    ctx.textAlign = "left";
  } else if (!this.modelLoaded) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading model...", this.size[0] / 2, this.size[1] / 2);
    ctx.textAlign = "left";
  }
};

Model3DPreviewNode.prototype.onDrawBackground = function(ctx) {
  // Don't draw background when node is collapsed
  if (this.flags.collapsed) return;
  
  // Draw background for viewer area
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(6, 32, this.size[0] - 12, this.size[1] - 38);
};

Model3DPreviewNode.prototype.onRemoved = function() {
  if (this.viewerElement && this.viewerElement.parentNode) {
    this.viewerElement.parentNode.removeChild(this.viewerElement);
    this.viewerElement = null;
  }
};

LiteGraph.registerNodeType("ai-tools/3d/model_3d_preview", Model3DPreviewNode);
