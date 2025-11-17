// ==================== JSON DATA NODE ====================
function JsonDataNode() {
  this.addInput("Data", "*");
  
  this.size = [500, 400];
  this.inputJsonData = null;
  this.outputJsonData = null;
  this.inputDisplayText = "No input data";
  this.outputDisplayText = "No output data";
  this.inputScrollOffset = 0;
  this.outputScrollOffset = 0;
  this.maxInputScrollOffset = 0;
  this.maxOutputScrollOffset = 0;
}
JsonDataNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getAIToolsNodeTitle("JSON Data", "Text") : "⚪ JSON Data";

JsonDataNode.prototype.onExecute = function() {
  const data = this.getInputData(0);
  
  // Extract request and response from data object
  let inputData = null;
  let outputData = null;
  
  if (data && typeof data === 'object') {
    if (data.request !== undefined) {
      inputData = data.request;
    }
    if (data.response !== undefined) {
      outputData = data.response;
    }
  }
  
  // Process input data
  if (inputData !== undefined && inputData !== null) {
    this.inputJsonData = inputData;
    
    try {
      if (typeof inputData === 'string') {
        try {
          const parsed = JSON.parse(inputData);
          this.inputDisplayText = JSON.stringify(parsed, null, 2);
        } catch (e) {
          this.inputDisplayText = inputData;
        }
      } else {
        this.inputDisplayText = JSON.stringify(inputData, null, 2);
      }
    } catch (error) {
      this.inputDisplayText = "Error formatting data: " + error.message;
    }
  } else {
    this.inputJsonData = null;
    this.inputDisplayText = "No input data";
  }
  
  // Process output data  
  if (outputData !== undefined && outputData !== null) {
    this.outputJsonData = outputData;
    
    try {
      if (typeof outputData === 'string') {
        try {
          const parsed = JSON.parse(outputData);
          this.outputDisplayText = JSON.stringify(parsed, null, 2);
        } catch (e) {
          this.outputDisplayText = outputData;
        }
      } else {
        this.outputDisplayText = JSON.stringify(outputData, null, 2);
      }
    } catch (error) {
      this.outputDisplayText = "Error formatting data: " + error.message;
    }
  } else {
    this.outputJsonData = null;
    this.outputDisplayText = "No output data";
  }
  
  // Calculate scroll offsets
  const lineHeight = 14;
  const sectionHeight = (this.size[1] - 90) / 2;
  
  const inputLines = this.inputDisplayText.split('\n');
  const inputContentHeight = inputLines.length * lineHeight;
  this.maxInputScrollOffset = Math.max(0, inputContentHeight - sectionHeight + 30);
  this.inputScrollOffset = Math.max(0, Math.min(this.inputScrollOffset, this.maxInputScrollOffset));
  
  const outputLines = this.outputDisplayText.split('\n');
  const outputContentHeight = outputLines.length * lineHeight;
  this.maxOutputScrollOffset = Math.max(0, outputContentHeight - sectionHeight + 30);
  this.outputScrollOffset = Math.max(0, Math.min(this.outputScrollOffset, this.maxOutputScrollOffset));
  
  if (this.graph && this.graph.canvas) {
    this.graph.canvas.setDirty(true, true);
  }
};

JsonDataNode.prototype.onDrawForeground = function(ctx) {
  if (this.flags.collapsed) return;
  
  const sectionHeight = (this.size[1] - 90) / 2;
  const lineHeight = 14;
  
  // ===== INPUT SECTION =====
  // Draw input header
  ctx.fillStyle = "#2c5282";
  ctx.fillRect(0, 0, this.size[0], 25);
  ctx.fillStyle = "#FFF";
  ctx.font = "bold 12px Arial";
  ctx.fillText("INPUT (Request)", 10, 16);
  
  // Draw input content area
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(5, 30, this.size[0] - 10, sectionHeight);
  
  // Draw input content with scrolling
  ctx.save();
  ctx.beginPath();
  ctx.rect(5, 30, this.size[0] - 10, sectionHeight);
  ctx.clip();
  
  ctx.font = "11px 'Courier New', monospace";
  const inputLines = this.inputDisplayText.split('\n');
  const inputStartY = 45 - this.inputScrollOffset;
  
  this.drawJsonContent(ctx, inputLines, inputStartY, 30, sectionHeight, lineHeight);
  ctx.restore();
  
  // Draw input scroll indicator
  if (this.maxInputScrollOffset > 0) {
    const thumbHeight = Math.max(20, sectionHeight * (sectionHeight / (sectionHeight + this.maxInputScrollOffset)));
    const thumbPosition = (this.inputScrollOffset / this.maxInputScrollOffset) * (sectionHeight - thumbHeight);
    ctx.fillStyle = "#555";
    ctx.fillRect(this.size[0] - 8, 30, 3, sectionHeight);
    ctx.fillStyle = "#888";
    ctx.fillRect(this.size[0] - 8, 30 + thumbPosition, 3, thumbHeight);
  }
  
  // ===== OUTPUT SECTION =====
  const outputY = 35 + sectionHeight;
  
  // Draw output header
  ctx.fillStyle = "#276749";
  ctx.fillRect(0, outputY, this.size[0], 25);
  ctx.fillStyle = "#FFF";
  ctx.font = "bold 12px Arial";
  ctx.fillText("OUTPUT (Response)", 10, outputY + 16);
  
  // Draw output content area
  const outputContentY = outputY + 30;
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(5, outputContentY, this.size[0] - 10, sectionHeight);
  
  // Draw output content with scrolling
  ctx.save();
  ctx.beginPath();
  ctx.rect(5, outputContentY, this.size[0] - 10, sectionHeight);
  ctx.clip();
  
  ctx.font = "11px 'Courier New', monospace";
  const outputLines = this.outputDisplayText.split('\n');
  const outputStartY = outputContentY + 15 - this.outputScrollOffset;
  
  this.drawJsonContent(ctx, outputLines, outputStartY, outputContentY, sectionHeight, lineHeight);
  ctx.restore();
  
  // Draw output scroll indicator
  if (this.maxOutputScrollOffset > 0) {
    const thumbHeight = Math.max(20, sectionHeight * (sectionHeight / (sectionHeight + this.maxOutputScrollOffset)));
    const thumbPosition = (this.outputScrollOffset / this.maxOutputScrollOffset) * (sectionHeight - thumbHeight);
    ctx.fillStyle = "#555";
    ctx.fillRect(this.size[0] - 8, outputContentY, 3, sectionHeight);
    ctx.fillStyle = "#888";
    ctx.fillRect(this.size[0] - 8, outputContentY + thumbPosition, 3, thumbHeight);
  }
  
  // Draw copy buttons
  const btnY = this.size[1] - 35;
  const btnHeight = 25;
  const btnWidth = (this.size[0] - 30) / 2;
  
  // Copy Input button
  ctx.fillStyle = "#2c5282";
  ctx.fillRect(10, btnY, btnWidth, btnHeight);
  ctx.fillStyle = "#FFF";
  ctx.font = "11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Copy Input", 10 + btnWidth / 2, btnY + 16);
  
  // Copy Output button
  ctx.fillStyle = "#276749";
  ctx.fillRect(20 + btnWidth, btnY, btnWidth, btnHeight);
  ctx.fillStyle = "#FFF";
  ctx.fillText("Copy Output", 20 + btnWidth + btnWidth / 2, btnY + 16);
  ctx.textAlign = "left";
};

// Helper to draw JSON content with syntax highlighting
JsonDataNode.prototype.drawJsonContent = function(ctx, lines, startY, sectionTop, sectionHeight, lineHeight) {
  lines.forEach((line, index) => {
    const y = startY + (index * lineHeight);
    
    // Only draw lines that are visible within the section
    if (y > sectionTop && y < sectionTop + sectionHeight) {
      if (line.includes(':')) {
        const parts = line.split(':');
        const key = parts[0];
        const value = parts.slice(1).join(':');
        
        ctx.fillStyle = "#4EC9B0";
        ctx.fillText(key + ':', 15, y);
        
        const keyWidth = ctx.measureText(key + ':').width;
        if (value.includes('"')) {
          ctx.fillStyle = "#CE9178";
        } else if (value.match(/\d+/)) {
          ctx.fillStyle = "#B5CEA8";
        } else if (value.includes('true') || value.includes('false')) {
          ctx.fillStyle = "#569CD6";
        } else if (value.includes('null')) {
          ctx.fillStyle = "#808080";
        } else {
          ctx.fillStyle = "#D4D4D4";
        }
        ctx.fillText(value, 15 + keyWidth, y);
      } else {
        ctx.fillStyle = "#D4D4D4";
        ctx.fillText(line, 15, y);
      }
    }
  });
};

JsonDataNode.prototype.onMouseDown = function(e, pos, canvas) {
  const btnY = this.size[1] - 35;
  const btnHeight = 25;
  const btnWidth = (this.size[0] - 30) / 2;
  
  // Check Copy Input button
  if (pos[1] >= btnY && pos[1] <= btnY + btnHeight && pos[0] >= 10 && pos[0] <= 10 + btnWidth) {
    if (this.inputDisplayText && this.inputDisplayText !== "No input data") {
      navigator.clipboard.writeText(this.inputDisplayText).then(() => {
        console.log('Input JSON data copied to clipboard');
        const originalColor = this.boxcolor;
        this.boxcolor = "#4CAF50";
        setTimeout(() => {
          this.boxcolor = originalColor;
          if (this.graph && this.graph.canvas) {
            this.graph.canvas.setDirty(true, true);
          }
        }, 200);
        if (this.graph && this.graph.canvas) {
          this.graph.canvas.setDirty(true, true);
        }
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
    return true;
  }
  
  // Check Copy Output button
  if (pos[1] >= btnY && pos[1] <= btnY + btnHeight && pos[0] >= 20 + btnWidth && pos[0] <= this.size[0] - 10) {
    if (this.outputDisplayText && this.outputDisplayText !== "No output data") {
      navigator.clipboard.writeText(this.outputDisplayText).then(() => {
        console.log('Output JSON data copied to clipboard');
        const originalColor = this.boxcolor;
        this.boxcolor = "#4CAF50";
        setTimeout(() => {
          this.boxcolor = originalColor;
          if (this.graph && this.graph.canvas) {
            this.graph.canvas.setDirty(true, true);
          }
        }, 200);
        if (this.graph && this.graph.canvas) {
          this.graph.canvas.setDirty(true, true);
        }
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
    return true;
  }
  
  return false;
};

JsonDataNode.prototype.onMouseWheel = function(e, delta, pos) {
  const sectionHeight = (this.size[1] - 90) / 2;
  const inputSectionEnd = 30 + sectionHeight;
  const outputSectionStart = 35 + sectionHeight + 30;
  
  // Check if mouse is in input section
  if (pos && pos[1] >= 30 && pos[1] <= inputSectionEnd) {
    if (this.maxInputScrollOffset > 0) {
      this.inputScrollOffset -= delta * 30;
      this.inputScrollOffset = Math.max(0, Math.min(this.inputScrollOffset, this.maxInputScrollOffset));
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
      return true;
    }
  }
  
  // Check if mouse is in output section
  if (pos && pos[1] >= outputSectionStart) {
    if (this.maxOutputScrollOffset > 0) {
      this.outputScrollOffset -= delta * 30;
      this.outputScrollOffset = Math.max(0, Math.min(this.outputScrollOffset, this.maxOutputScrollOffset));
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
      return true;
    }
  }
  
  return false;
};

LiteGraph.registerNodeType("ai-tools/text/json_data", JsonDataNode);
