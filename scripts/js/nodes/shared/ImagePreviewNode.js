// ==================== IMAGE PREVIEW NODE ====================
function ImagePreviewNode() {
  this.addInput("Image", "string");
  this.addOutput("Image", "string");
  
  this.size = [280, 280];
  this.imageLoaded = false;
  this.imageUrl = null;
  this.image = null;
}
ImagePreviewNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("Image Preview", "Image") : "⚪ Image Preview";

ImagePreviewNode.prototype.onExecute = function() {
  const imageUrl = this.getInputData(0);
  
  if (imageUrl !== this.imageUrl) {
    this.loadImage(imageUrl);
  }
  
  this.setOutputData(0, imageUrl);
};

ImagePreviewNode.prototype.loadImage = function(imageUrl) {
  this.imageUrl = imageUrl;
  this.imageLoaded = false;
  this.image = null; // Clear previous image immediately
  
  if (imageUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.image = img;
      this.imageLoaded = true;
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    img.onerror = () => {
      this.imageLoaded = false;
      this.image = null;
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    img.src = imageUrl;
  } else {
    this.image = null;
  }
};

ImagePreviewNode.prototype.onDrawForeground = function(ctx) {
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  if (this.imageLoaded && this.image) {
    const padding = 10;
    const maxWidth = this.size[0] - padding * 2;
    const maxHeight = this.size[1] - 40 - padding * 2;
    
    const imgWidth = this.image.width;
    const imgHeight = this.image.height;
    const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
    
    const drawWidth = imgWidth * ratio;
    const drawHeight = imgHeight * ratio;
    
    const x = (this.size[0] - drawWidth) / 2;
    const y = 30 + (maxHeight - drawHeight) / 2 + padding;
    
    ctx.drawImage(this.image, x, y, drawWidth, drawHeight);
  } else if (this.imageUrl) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading...", this.size[0] / 2, this.size[1] / 2);
    ctx.textAlign = "left";
  } else {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No image", this.size[0] / 2, this.size[1] / 2);
    ctx.textAlign = "left";
  }
};

LiteGraph.registerNodeType("ai-tools/image/image_preview", ImagePreviewNode);
