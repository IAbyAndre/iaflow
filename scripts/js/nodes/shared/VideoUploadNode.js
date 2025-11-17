// ==================== VIDEO UPLOAD NODE ====================
function VideoUploadNode() {
  this.addOutput("Video URL", "string");
  
  this.size = [400, 300];
  this.videoUrl = null;
  this.videoLoaded = false;
  this.video = null;
  this.fileInputElement = null;
  this.videoContainer = null;
}
VideoUploadNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("Video Upload", "Video") : "⚪ Video Upload";

VideoUploadNode.prototype.onAdded = function() {
  this.createFileInput();
};

VideoUploadNode.prototype.createFileInput = function() {
  if (this.fileInputElement) return;
  
  // Create hidden file input
  this.fileInputElement = document.createElement('input');
  this.fileInputElement.type = 'file';
  this.fileInputElement.accept = 'video/*';
  this.fileInputElement.style.display = 'none';
  
  this.fileInputElement.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      this.loadVideoFromFile(file);
    }
  });
  
  document.body.appendChild(this.fileInputElement);
};

VideoUploadNode.prototype.loadVideoFromFile = function(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    this.videoUrl = e.target.result; // base64 data URL
    this.videoLoaded = false;
    this.fileName = file.name;
    this.fileSize = file.size;
    
    // Remove old video container
    if (this.videoContainer && this.videoContainer.parentNode) {
      this.videoContainer.parentNode.removeChild(this.videoContainer);
    }
    this.video = null;
    this.videoContainer = null;
    
    // Create container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.pointerEvents = 'auto';
    container.style.zIndex = '10';
    container.style.display = 'none';
    
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.backgroundColor = '#000';
    
    video.onloadeddata = () => {
      this.video = video;
      this.videoLoaded = true;
      this.setOutputData(0, this.videoUrl);
      this.updateVideoPosition();
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    
    video.onerror = () => {
      this.videoLoaded = false;
      this.video = null;
      console.error('Failed to load uploaded video');
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    
    container.appendChild(video);
    document.body.appendChild(container);
    this.videoContainer = container;
    
    video.src = this.videoUrl;
    this.setOutputData(0, this.videoUrl);
  };
  
  reader.onerror = () => {
    console.error('Failed to read video file');
  };
  
  reader.readAsDataURL(file);
};

VideoUploadNode.prototype.onExecute = function() {
  this.setOutputData(0, this.videoUrl);
};

VideoUploadNode.prototype.updateVideoPosition = function() {
  if (!this.videoContainer || !this.graph || !this.graph.list_of_graphcanvas) return;
  
  // Hide container when node is collapsed
  if (this.flags.collapsed) {
    this.videoContainer.style.display = 'none';
    return;
  } else {
    this.videoContainer.style.display = 'block';
  }
  
  const canvas = this.graph.list_of_graphcanvas[0];
  if (!canvas) return;
  
  const scale = canvas.ds.scale;
  const offset = canvas.ds.offset;
  const canvasRect = canvas.canvas.getBoundingClientRect();
  
  const padding = 10;
  // Calculate position relative to canvas with offset
  const x = canvasRect.left + (this.pos[0] * scale) + offset[0] + (padding * scale);
  const y = canvasRect.top + (this.pos[1] * scale) + offset[1] + (40 * scale);
  const w = (this.size[0] - padding * 2) * scale;
  const h = (this.size[1] - 80 - padding * 2) * scale;
  
  this.videoContainer.style.left = x + 'px';
  this.videoContainer.style.top = y + 'px';
  this.videoContainer.style.width = w + 'px';
  this.videoContainer.style.height = h + 'px';
};

VideoUploadNode.prototype.onDrawForeground = function(ctx) {
  this.updateVideoPosition();
  
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  // Draw uploaded video preview
  if (this.videoLoaded && this.video) {
    // Video is rendered via DOM, just draw placeholder
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    const padding = 10;
    ctx.fillRect(padding, 30 + padding, this.size[0] - padding * 2, this.size[1] - 80 - padding * 2);
  } else if (this.videoUrl) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading video...", this.size[0] / 2, this.size[1] / 2 - 20);
    ctx.textAlign = "left";
  } else {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No video uploaded", this.size[0] / 2, this.size[1] / 2 - 20);
    ctx.textAlign = "left";
  }
  
  // Draw upload button
  const btnY = this.size[1] - 35;
  const btnHeight = 25;
  
  ctx.fillStyle = "#2196F3";
  ctx.fillRect(10, btnY, this.size[0] - 20, btnHeight);
  
  ctx.fillStyle = "#FFF";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(this.videoLoaded ? "Change Video" : "Upload Video", this.size[0] / 2, btnY + 16);
  ctx.textAlign = "left";
};

VideoUploadNode.prototype.onMouseDown = function(e, pos, canvas) {
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

VideoUploadNode.prototype.onRemoved = function() {
  if (this.fileInputElement && this.fileInputElement.parentNode) {
    this.fileInputElement.parentNode.removeChild(this.fileInputElement);
    this.fileInputElement = null;
  }
  if (this.videoContainer && this.videoContainer.parentNode) {
    this.videoContainer.parentNode.removeChild(this.videoContainer);
  }
  this.videoContainer = null;
  this.video = null;
};

VideoUploadNode.prototype.onSerialize = function(o) {
  // Save the video data URL so it persists across save/load
  if (this.videoUrl) {
    o.videoUrl = this.videoUrl;
    o.fileName = this.fileName;
    o.fileSize = this.fileSize;
  }
};

VideoUploadNode.prototype.onConfigure = function(o) {
  // Restore the video from saved data
  if (o.videoUrl) {
    this.videoUrl = o.videoUrl;
    this.fileName = o.fileName;
    this.fileSize = o.fileSize;
    
    // Remove old video container
    if (this.videoContainer && this.videoContainer.parentNode) {
      this.videoContainer.parentNode.removeChild(this.videoContainer);
    }
    
    // Create container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.pointerEvents = 'auto';
    container.style.zIndex = '10';
    container.style.display = 'none';
    
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.backgroundColor = '#000';
    
    video.onloadeddata = () => {
      this.video = video;
      this.videoLoaded = true;
      this.setOutputData(0, this.videoUrl);
      this.updateVideoPosition();
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    
    container.appendChild(video);
    document.body.appendChild(container);
    this.videoContainer = container;
    video.src = this.videoUrl;
  }
};

LiteGraph.registerNodeType("ai-tools/video/upload_video", VideoUploadNode);
