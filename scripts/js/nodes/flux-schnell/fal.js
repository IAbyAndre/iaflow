// ==================== FLUX SCHNELL NODE (FAL) ====================
function FluxSchnellFalNode() {
  this.addInput("Prompt", "string");
  this.addOutput("Image", "string");
  this.addOutput("Data", "object");
  
  // Mandatory properties shown as widgets
  this.addWidget("combo", "ratio", "1:1", (value) => {
    this.properties.ratio = value;
  }, {
    values: ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "9:21", "3:2", "2:3"]
  });
  
  this.addWidget("combo", "format", "jpeg", (value) => {
    this.properties.output_format = value;
  }, {
    values: ["jpeg", "png"]
  });
  
  this.addWidget("combo", "acceleration", "regular", (value) => {
    this.properties.acceleration = value;
  }, {
    values: ["none", "regular", "high"]
  });
  
  this.addWidget("combo", "inference_steps", 4, (value) => {
    this.properties.num_inference_steps = value;
  }, {
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  });
  
  this.addWidget("combo", "guidance_scale", 4, (value) => {
    this.properties.guidance_scale = value;
  }, {
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  });
  
  this.addWidget("toggle", "safety_checker", true, (value) => {
    this.properties.enable_safety_checker = value;
  });
  
  // Properties (accessible via properties panel)
  this.addProperty("ratio", "1:1");
  this.addProperty("output_format", "jpeg");
  this.addProperty("acceleration", "regular");
  this.addProperty("num_inference_steps", 4);
  this.addProperty("guidance_scale", 4);
  this.addProperty("enable_safety_checker", true);
  this.addProperty("num_images", 1);
  this.addProperty("seed", null);
  
  this.size = [280, 200];
  this.isGenerating = false;
  this.status = "Ready";
  this.lastImageUrl = null;
  this.lastRequestData = null;
  this.lastResponseData = null;
  this.provider = "FAL";
}
FluxSchnellFalNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getModelNodeTitle("Flux Schnell v1.0 (Fal)", "Text To Image", "Fal") : "🟡 Flux Schnell";

FluxSchnellFalNode.prototype.onExecute = function() {
  const prompt = this.getInputData(0);
  this.setOutputData(0, this.lastImageUrl);
  this.setOutputData(1, {
    request: this.lastRequestData,
    response: this.lastResponseData
  });
};



FluxSchnellFalNode.prototype.generateImage = async function() {
  if (this.isGenerating) {
    return;
  }

  // Manually trigger connected input nodes to execute first
  if (this.inputs && this.inputs[0]) {
    const link = this.getInputLink(0);
    if (link) {
      const originNode = this.graph.getNodeById(link.origin_id);
      if (originNode && originNode.onExecute) {
        originNode.onExecute();
      }
    }
  }

  const prompt = this.getInputData(0);
  
  if (!prompt) {
    this.status = "Error: No prompt";
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
    return;
  }

  const apiKey = getProviderApiKey(this.provider);
  if (!apiKey) {
    this.status = `Error: No ${this.provider} API key`;
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
    // Map ratio to FAL's predefined image size enums
    const ratioToFalSize = {
      "1:1": "square_hd",
      "4:3": "landscape_4_3",
      "3:4": "portrait_4_3",
      "16:9": "landscape_16_9",
      "9:16": "portrait_16_9",
      "21:9": "landscape_16_9",  // Use 16:9 as fallback
      "9:21": "portrait_16_9",   // Use 9:16 as fallback
      "3:2": "landscape_4_3",    // Use 4:3 as fallback
      "2:3": "portrait_4_3"      // Use 3:4 as fallback
    };
    
    const imageSize = ratioToFalSize[this.properties.ratio] || "square_hd";
    
    // Base request parameters for FAL
    const baseParams = {
      prompt: prompt,
      image_size: imageSize,
      num_images: this.properties.num_images,
      output_format: this.properties.output_format,
      acceleration: this.properties.acceleration,
      num_inference_steps: this.properties.num_inference_steps,
      guidance_scale: this.properties.guidance_scale,
      enable_safety_checker: this.properties.enable_safety_checker
    };
    
    // Add seed if provided (FAL accepts null or integer)
    if (this.properties.seed !== null && this.properties.seed !== -1) {
      baseParams.seed = this.properties.seed;
    }
    
    // Get provider and adapt request body
    const providerConfig = getProviderByName(this.provider);
    const requestBody = providerConfig.buildRequestBody('fluxSchnell', baseParams);
    
    // Store request data
    this.lastRequestData = baseParams;
    this.setOutputData(1, {
      request: this.lastRequestData,
      response: this.lastResponseData
    });

    const response = await fetch(getEndpointUrl('fluxSchnell', this.provider), {
      method: 'POST',
      headers: {
        'Authorization': getAuthorizationHeader(this.provider),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Parse response using provider adapter
    const parsedResponse = providerConfig.parseResponse('fluxSchnell', data);
    
    this.status = "Processing...";
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }

    await this.pollForResult(parsedResponse.status_url);

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

FluxSchnellFalNode.prototype.pollForResult = async function(resultUrl) {
  const maxAttempts = 60;
  let attempts = 0;
  const providerConfig = getProviderByName(this.provider);

  const poll = async () => {
    try {
      const response = await fetch(resultUrl, {
        method: 'GET',
        headers: {
          'Authorization': getAuthorizationHeader(this.provider)
        }
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse status using provider adapter
      const parsedStatus = providerConfig.parseStatus(data);
      const status = parsedStatus.status;
      
      if (status === 'succeeded' || status === 'completed') {
        // For FAL: if outputs are empty but we have response_url, fetch the actual result
        if ((!parsedStatus.outputs || parsedStatus.outputs.length === 0) && parsedStatus.response_url) {
          const resultResponse = await fetch(parsedStatus.response_url, {
            method: 'GET',
            headers: {
              'Authorization': getAuthorizationHeader(this.provider)
            }
          });
          
          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            const finalResult = providerConfig.parseStatus(resultData);
            
            if (finalResult.outputs && finalResult.outputs.length > 0) {
              this.lastImageUrl = finalResult.outputs[0];
              this.lastResponseData = resultData;
              this.status = "✓ Complete";
              this.boxcolor = "#4CAF50";
              this.setOutputData(0, this.lastImageUrl);
              this.setOutputData(1, {
                request: this.lastRequestData,
                response: this.lastResponseData
              });
              this.isGenerating = false;
              this.triggerOutputNodes();
              if (this.graph && this.graph.canvas) {
                this.graph.canvas.setDirty(true, true);
              }
              return;
            }
          }
        }
        
        // Direct result
        if (parsedStatus.outputs && parsedStatus.outputs.length > 0) {
          this.lastImageUrl = parsedStatus.outputs[0];
          this.lastResponseData = data;
          this.status = "✓ Complete";
          this.boxcolor = "#4CAF50";
          this.setOutputData(0, this.lastImageUrl);
          this.setOutputData(1, {
            request: this.lastRequestData,
            response: this.lastResponseData
          });
          this.isGenerating = false;
          this.triggerOutputNodes();
          if (this.graph && this.graph.canvas) {
            this.graph.canvas.setDirty(true, true);
          }
        } else {
          throw new Error('No image in response');
        }
      } else if (status === 'failed' || status === 'error') {
        throw new Error(parsedStatus.error || 'Generation failed');
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for result');
        }
        
        this.status = `Processing... (${Math.round(parsedStatus.executionTime || 0)}s)`;
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

FluxSchnellFalNode.prototype.onDrawForeground = function(ctx) {
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
    ctx.fillText("Generate Image", this.size[0] / 2, this.size[1] - 9);
    ctx.textAlign = "left";
  }
};

FluxSchnellFalNode.prototype.onMouseDown = function(e, pos, canvas) {
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
FluxSchnellFalNode.prototype.triggerOutputNodes = function() {
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

LiteGraph.registerNodeType("ai-providers/text-to-image/flux_schnell_fal", FluxSchnellFalNode);
