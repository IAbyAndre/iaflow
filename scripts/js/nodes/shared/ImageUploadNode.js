// ==================== IMAGE UPLOAD NODE ====================
function ImageUploadNode() {
  this.addOutput("Image URL", "string");
  
  this.size = [280, 280];
  this.imageUrl = null;
  this.imageLoaded = false;
  this.image = null;
  this.fileInputElement = null;
}
ImageUploadNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("Image Upload", "Image") : "⚪ Image Upload";

ImageUploadNode.prototype.onAdded = function() {
  this.createFileInput();
};

ImageUploadNode.prototype.createFileInput = function() {
  if (this.fileInputElement) return;
  
  // Create hidden file input
  this.fileInputElement = document.createElement('input');
  this.fileInputElement.type = 'file';
  this.fileInputElement.accept = 'image/*';
  this.fileInputElement.style.display = 'none';
  
  this.fileInputElement.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.loadImageFromFile(file);
    }
  });
  
  document.body.appendChild(this.fileInputElement);
};

ImageUploadNode.prototype.loadImageFromFile = function(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    this.imageUrl = e.target.result; // base64 data URL
    this.imageLoaded = false;
    
    const img = new Image();
    img.onload = () => {
      this.image = img;
      this.imageLoaded = true;
      this.setOutputData(0, this.imageUrl);
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    img.onerror = () => {
      this.imageLoaded = false;
      this.image = null;
      console.error('Failed to load uploaded image');
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    img.src = this.imageUrl;
  };
  
  reader.onerror = () => {
    console.error('Failed to read file');
  };
  
  reader.readAsDataURL(file);
};

ImageUploadNode.prototype.onExecute = function() {
  this.setOutputData(0, this.imageUrl);
};

ImageUploadNode.prototype.onDrawForeground = function(ctx) {
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  // Draw uploaded image preview
  if (this.imageLoaded && this.image) {
    const padding = 10;
    const maxWidth = this.size[0] - padding * 2;
    const maxHeight = this.size[1] - 80 - padding * 2;
    
    const imgWidth = this.image.width;
    const imgHeight = this.image.height;
    const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
    
    const drawWidth = imgWidth * ratio;
    const drawHeight = imgHeight * ratio;
    
    const x = (this.size[0] - drawWidth) / 2;
    const y = 30 + (maxHeight - drawHeight) / 2 + padding;
    
    ctx.drawImage(this.image, x, y, drawWidth, drawHeight);
    
    // Image info
    ctx.fillStyle = "#AAA";
    ctx.font = "10px Arial";
    ctx.fillText(`${this.image.width}x${this.image.height}`, 10, this.size[1] - 45);
  } else {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No image uploaded", this.size[0] / 2, this.size[1] / 2 - 20);
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
  ctx.fillText(this.imageLoaded ? "Change Image" : "Image Upload", this.size[0] / 2, btnY + 16);
  ctx.textAlign = "left";
};

ImageUploadNode.prototype.onMouseDown = function(e, pos, canvas) {
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

ImageUploadNode.prototype.onRemoved = function() {
  if (this.fileInputElement && this.fileInputElement.parentNode) {
    this.fileInputElement.parentNode.removeChild(this.fileInputElement);
    this.fileInputElement = null;
  }
};

ImageUploadNode.prototype.onSerialize = function(o) {
  // Save the image data URL so it persists across save/load
  if (this.imageUrl) {
    o.imageUrl = this.imageUrl;
  }
};

ImageUploadNode.prototype.onConfigure = function(o) {
  // Restore the image from saved data
  if (o.imageUrl) {
    this.imageUrl = o.imageUrl;
    
    const img = new Image();
    img.onload = () => {
      this.image = img;
      this.imageLoaded = true;
      this.setOutputData(0, this.imageUrl);
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
    };
    img.src = this.imageUrl;
  }
};

LiteGraph.registerNodeType("ai-tools/image/upload_image", ImageUploadNode);
