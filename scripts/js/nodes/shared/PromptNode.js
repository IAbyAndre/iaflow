// ==================== PROMPT INPUT NODE ====================
function PromptNode() {
  this.addOutput("Prompt", "string");
  this.addProperty("prompt", "");
  this.size = [400, 150];
  this.resizable = true;
  this.textareaElement = null;
}
PromptNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("Prompt Input", "Text") : "⚪ Prompt Input";

PromptNode.prototype.onAdded = function(graph) {
  this.createTextarea();
};

PromptNode.prototype.createTextarea = function() {
  if (this.textareaElement) return;
  
  this.textareaElement = document.createElement('textarea');
  this.textareaElement.value = this.properties.prompt;
  this.textareaElement.placeholder = "Enter your prompt...";
  this.textareaElement.className = 'comfy-multiline-input';
  this.textareaElement.style.pointerEvents = 'auto';
  
  // Prevent autofocus warnings during workflow execution
  this.textareaElement.addEventListener('focus', (e) => {
    e.stopPropagation();
  }, true);
  
  this.textareaElement.addEventListener('input', (e) => {
    this.properties.prompt = e.target.value;
    // Trigger graph update to propagate new prompt value
    if (this.graph) {
      this.setOutputData(0, this.properties.prompt);
    }
  });
  
  this.textareaElement.addEventListener('blur', () => {
    this.properties.prompt = this.textareaElement.value;
    if (this.graph) {
      this.setOutputData(0, this.properties.prompt);
    }
  });
  
  document.body.appendChild(this.textareaElement);
};

PromptNode.prototype.onExecute = function() {
  // Always sync from textarea to ensure latest value is used
  if (this.textareaElement) {
    this.properties.prompt = this.textareaElement.value;
  }
  this.setOutputData(0, this.properties.prompt);
};

PromptNode.prototype.onDrawForeground = function(ctx) {
  // Update position on every frame
  this.updateTextareaPosition();
};

PromptNode.prototype.onDrawBackground = function(ctx) {
  // Don't draw background when node is collapsed
  if (this.flags.collapsed) return;
  
  // Draw background for textarea area
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(6, 32, this.size[0] - 12, this.size[1] - 38);
};

PromptNode.prototype.updateTextareaPosition = function() {
  if (!this.textareaElement || !this.graph || !this.graph.list_of_graphcanvas) return;
  
  // Hide textarea when node is collapsed
  if (this.flags.collapsed) {
    this.textareaElement.style.display = 'none';
    return;
  } else {
    this.textareaElement.style.display = 'block';
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
  
  this.textareaElement.style.left = x + 'px';
  this.textareaElement.style.top = y + 'px';
  this.textareaElement.style.width = w + 'px';
  this.textareaElement.style.height = h + 'px';
  this.textareaElement.style.fontSize = Math.max(10, 12 * scale) + 'px';
  this.textareaElement.style.transform = 'scale(1)';
  this.textareaElement.style.transformOrigin = 'top left';
};

PromptNode.prototype.onRemoved = function() {
  if (this.textareaElement && this.textareaElement.parentNode) {
    this.textareaElement.parentNode.removeChild(this.textareaElement);
    this.textareaElement = null;
  }
};

LiteGraph.registerNodeType("ai-tools/text/prompt", PromptNode);
