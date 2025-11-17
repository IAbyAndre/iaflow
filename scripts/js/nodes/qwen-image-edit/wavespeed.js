// ==================== QWEN IMAGE EDIT NODE ====================
function QwenImageEditNode() {
  this.addInput("Prompt", "string");
  this.addInput("Image URL", "string");
  this.addOutput("Edited Image URL", "string");
  this.addOutput("Data", "object");
  
  // Provider selector widget
  this.addWidget("combo", "provider", "WAVESPEED", (value) => {
    this.properties.provider = value;
  }, {
    values: getAvailableProviders()
  });
  
  this.addProperty("provider", "WAVESPEED");
  this.addProperty("strength", 0.8);
  this.addProperty("num_images", 1);
  this.addProperty("seed", -1);
  this.addProperty("output_format", "jpeg");
  
  this.size = [280, 100];
  this.isGenerating = false;
  this.status = "Ready";
  this.lastImageUrl = null;
  this.lastRequestData = null;
  this.lastResponseData = null;
}
QwenImageEditNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getModelNodeTitle("Qwen Image Edit", "Image Edit", "Wavespeed") : "🟡 Qwen Image Edit";

QwenImageEditNode.prototype.onExecute = function() {
  const prompt = this.getInputData(0);
  const imageUrl = this.getInputData(1);
  this.setOutputData(0, this.lastImageUrl);
  this.setOutputData(1, {
    request: this.lastRequestData,
    response: this.lastResponseData
  });
};

QwenImageEditNode.prototype.generateImage = async function() {
  if (this.isGenerating) {
    return;
  }

  // Manually trigger connected input nodes to execute first
  if (this.inputs) {
    for (let i = 0; i < this.inputs.length; i++) {
      const link = this.getInputLink(i);
      if (link) {
        const originNode = this.graph.getNodeById(link.origin_id);
        if (originNode && originNode.onExecute) {
          originNode.onExecute();
        }
      }
    }
  }

  const prompt = this.getInputData(0);
  const imageUrl = this.getInputData(1);
  
  if (!prompt) {
    this.status = "Error: No prompt";
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
    return;
  }
  
  if (!imageUrl) {
    this.status = "Error: No image";
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
    return;
  }

  const provider = this.properties.provider || 'WAVESPEED';
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    this.status = `Error: No ${provider} API key`;
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
    return;
  }

  this.isGenerating = true;
  this.status = "Submitting...";
  this.boxcolor = "#FF9800";
  if (this.graph && this.graph.canvas) {
    this.graph.canvas.setDirty(true, true);
  }

  try {
    const requestBody = {
      prompt: prompt,
      image: imageUrl,
      num_images: this.properties.num_images,
      seed: this.properties.seed,
      output_format: this.properties.output_format
    };

    const response = await fetch(getEndpointUrl('qwenImageEdit', provider), {
      method: 'POST',
      headers: {
        'Authorization': getAuthorizationHeader(provider),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 200 || !data.data || !data.data.id) {
      throw new Error('Invalid response from API');
    }

    const resultUrl = data.data.urls.get;
    this.status = "Processing...";
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }

    await this.pollForResult(resultUrl, apiKey);

  } catch (error) {
    this.status = `Error: ${error.message}`;
    this.boxcolor = "#f44336";
    console.error('Generation error:', error);
    this.isGenerating = false;
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
  }
};

QwenImageEditNode.prototype.pollForResult = async function(resultUrl, apiKey) {
  const maxAttempts = 60;
  let attempts = 0;

  const poll = async () => {
    try {
      const response = await fetch(resultUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code !== 200 || !data.data) {
        throw new Error('Invalid response from API');
      }

      const status = data.data.status;
      
      if (status === 'succeeded' || status === 'completed') {
        if (data.data.outputs && data.data.outputs.length > 0) {
          this.lastImageUrl = data.data.outputs[0];
          this.lastResponseData = data.data;
          this.status = "✓ Complete";
          this.boxcolor = "#4CAF50";
          this.setOutputData(0, this.lastImageUrl);
          this.setOutputData(1, {
            request: this.lastRequestData,
            response: this.lastResponseData
          });
          this.triggerOutputNodes();
        } else {
          throw new Error('No image in response');
        }
        this.isGenerating = false;
        if (this.graph && this.graph.canvas) {
          this.graph.canvas.setDirty(true, true);
        }
      } else if (status === 'failed' || status === 'error') {
        throw new Error(data.data.error || 'Generation failed');
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for result');
        }
        
        this.status = `Processing... (${Math.round(data.data.executionTime || 0)}s)`;
        if (this.graph && this.graph.canvas) {
          this.graph.canvas.setDirty(true, true);
        }
        setTimeout(poll, 2000);
      }
    } catch (error) {
      this.status = `Error: ${error.message}`;
      this.boxcolor = "#f44336";
      this.isGenerating = false;
      if (this.graph && this.graph.canvas) {
        this.graph.canvas.setDirty(true, true);
      }
      console.error('Polling error:', error);
    }
  };

  poll();
};

QwenImageEditNode.prototype.onDrawForeground = function(ctx) {
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  ctx.fillStyle = "#FFF";
  ctx.font = "12px Arial";
  ctx.fillText(this.status, 10, this.size[1] - 30);
  
  if (!this.isGenerating) {
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(10, this.size[1] - 20, this.size[0] - 20, 15);
    ctx.fillStyle = "#FFF";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Edit Image", this.size[0] / 2, this.size[1] - 9);
    ctx.textAlign = "left";
  }
};

QwenImageEditNode.prototype.onMouseDown = function(e, pos, canvas) {
  if (!this.isGenerating && pos[1] > this.size[1] - 20 && pos[0] >= 10 && pos[0] <= this.size[0] - 10) {
    if (this._lastClickTime && Date.now() - this._lastClickTime < 500) {
      return true;
    }
    this._lastClickTime = Date.now();
    this.generateImage();
    return true;
  }
  return false;
};

// Helper to trigger connected output nodes
QwenImageEditNode.prototype.triggerOutputNodes = function() {
  if (this.outputs) {
    for (let outputIndex = 0; outputIndex < this.outputs.length; outputIndex++) {
      const output = this.outputs[outputIndex];
      if (output && output.links) {
        for (let i = 0; i < output.links.length; i++) {
          const linkId = output.links[i];
          const link = this.graph.links[linkId];
          if (link) {
            const targetNode = this.graph.getNodeById(link.target_id);
            if (targetNode && targetNode.onExecute) {
              targetNode.onExecute();
            }
          }
        }
      }
    }
  }
};

LiteGraph.registerNodeType("ai-providers/qwen_image_edit_wavespeed", QwenImageEditNode);
