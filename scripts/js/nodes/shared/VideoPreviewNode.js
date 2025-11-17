// ==================== VIDEO PREVIEW NODE ====================
function VideoPreviewNode() {
  this.addInput("Video URL", "string");
  this.addOutput("Video URL", "string");
  
  this.size = [400, 300];
  this.videoLoaded = false;
  this.videoUrl = null;
  this.video = null;
  this.videoContainer = null;
}
VideoPreviewNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("Video Preview", "Video") : "⚪ Video Preview";

VideoPreviewNode.prototype.onExecute = function() {
  const videoUrl = this.getInputData(0);
  
  if (videoUrl !== this.videoUrl) {
    this.loadVideo(videoUrl);
  }
  
  this.setOutputData(0, videoUrl);
};

VideoPreviewNode.prototype.loadVideo = function(videoUrl) {
  this.videoUrl = videoUrl;
  this.videoLoaded = false;
  
  // Remove old video container
  if (this.videoContainer && this.videoContainer.parentNode) {
    this.videoContainer.parentNode.removeChild(this.videoContainer);
  }
  this.video = null;
  this.videoContainer = null;
  
  if (videoUrl) {
    // Create container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.pointerEvents = 'auto';
    container.style.zIndex = '10';
    container.style.display = 'none';
    
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.controls = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.backgroundColor = '#000';
    
    video.onloadedmetadata = () => {
      this.video = video;
      this.videoLoaded = true;
      console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
      this.updateVideoPosition();
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    
    video.onerror = (e) => {
      console.error('Video load error:', e, video.error);
      this.videoLoaded = false;
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    
    container.appendChild(video);
    document.body.appendChild(container);
    
    this.videoContainer = container;
    console.log('Loading video from URL:', videoUrl);
    video.src = videoUrl;
    video.load();
  }
};

VideoPreviewNode.prototype.updateVideoPosition = function() {
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
  const h = (this.size[1] - 60 - padding * 2) * scale;
  
  this.videoContainer.style.left = x + 'px';
  this.videoContainer.style.top = y + 'px';
  this.videoContainer.style.width = w + 'px';
  this.videoContainer.style.height = h + 'px';
};

VideoPreviewNode.prototype.onDrawForeground = function(ctx) {
  this.updateVideoPosition();
  
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  if (this.videoLoaded && this.video) {
    // Video is rendered via DOM, just draw placeholder
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    const padding = 10;
    ctx.fillRect(padding, 30 + padding, this.size[0] - padding * 2, this.size[1] - 60 - padding * 2);
  } else if (this.videoUrl) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading video...", this.size[0] / 2, this.size[1] / 2);
    ctx.textAlign = "left";
  } else {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No video", this.size[0] / 2, this.size[1] / 2);
    ctx.textAlign = "left";
  }
};



VideoPreviewNode.prototype.onRemoved = function() {
  if (this.videoContainer && this.videoContainer.parentNode) {
    this.videoContainer.parentNode.removeChild(this.videoContainer);
  }
  this.videoContainer = null;
  this.video = null;
};

LiteGraph.registerNodeType("ai-tools/video/video_preview", VideoPreviewNode);
