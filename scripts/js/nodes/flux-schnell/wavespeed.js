

// ==================== FLUX SCHNELL NODE ====================
function FluxSchnellWavespeedNode() {
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
    values: ["jpeg", "png", "webp"]
  });
  
  this.addWidget("combo", "strength", 0.8, (value) => {
    this.properties.strength = value;
  }, {
    values: ["0","0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1"]
  });
  
  // this.addWidget("number", "num_images", 1, (value) => {
  //   this.properties.num_images = value;
  // }, {
  //   min: 1,
  //   max: 4,
  //   step: 1,
  //   precision: 0
  // });
  
  this.addWidget("number", "seed", -1, (value) => {
    this.properties.seed = value;
  }, {
    min: -1,
    max: 2147483647,
    step: 1,
    precision: 0
  });
  
  this.addWidget("toggle", "sync_mode", false, (value) => {
    this.properties.enable_sync_mode = value;
  });
  
  this.addWidget("toggle", "base64_output", false, (value) => {
    this.properties.enable_base64_output = value;
  });
  
  // Properties (accessible via properties panel)
  this.addProperty("ratio", "1:1");
  this.addProperty("output_format", "jpeg");
  this.addProperty("strength", 0.8);
  // this.addProperty("num_images", 1);
  this.addProperty("seed", -1);
  this.addProperty("enable_sync_mode", false);
  this.addProperty("enable_base64_output", false);
  
  this.size = [280, 220];
  this.isGenerating = false;
  this.status = "Ready";
  this.lastImageUrl = null;
  this.lastRequestData = null;
  this.lastResponseData = null;
  this.provider = "WAVESPEED";
}
FluxSchnellWavespeedNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getModelNodeTitle("Flux Schnell v1.0 (Wav.)", "Text To Image", "Wavespeed") : "🟡 Flux Schnell";

FluxSchnellWavespeedNode.prototype.onExecute = function() {
  const prompt = this.getInputData(0);
  this.setOutputData(0, this.lastImageUrl);
  this.setOutputData(1, {
    request: this.lastRequestData,
    response: this.lastResponseData
  });
};

FluxSchnellWavespeedNode.prototype.generateImage = async function() {
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
    // Calculate size from ratio
    const ratio = this.properties.ratio.split(':').map(Number);
    const maxDim = 1024;
    let width, height;
    
    if (ratio[0] > ratio[1]) {
      // Landscape
      width = maxDim;
      height = Math.round((maxDim * ratio[1] / ratio[0]) / 8) * 8; // Round to nearest multiple of 8
    } else if (ratio[1] > ratio[0]) {
      // Portrait
      height = maxDim;
      width = Math.round((maxDim * ratio[0] / ratio[1]) / 8) * 8; // Round to nearest multiple of 8
    } else {
      // Square
      width = height = maxDim;
    }
    
    // Base request parameters (provider-agnostic)
    const baseParams = {
      prompt: prompt,
      size: `${width}*${height}`,
      num_images: this.properties.num_images,
      seed: this.properties.seed,
      output_format: this.properties.output_format,
      strength: this.properties.strength,
      enable_sync_mode: this.properties.enable_sync_mode,
      enable_base64_output: this.properties.enable_base64_output
    };
    
    // Get provider and adapt request body
    const providerConfig = getProviderByName(this.provider);
    const requestBody = providerConfig.buildRequestBody('fluxSchnell', baseParams);
    
    // Store complete request data (including provider-specific parameters)
    this.lastRequestData = requestBody;
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

FluxSchnellWavespeedNode.prototype.pollForResult = async function(resultUrl) {
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
              'Authorization': getAuthorizationHeader(provider)
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
        
        // Direct result (WAVESPEED or FAL final result)
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

FluxSchnellWavespeedNode.prototype.onDrawForeground = function(ctx) {
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
    ctx.fillText("Generate Image", this.size[0] / 2, this.size[1] - 9);
    ctx.textAlign = "left";
  }
};

FluxSchnellWavespeedNode.prototype.onMouseDown = function(e, pos, canvas) {
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
FluxSchnellWavespeedNode.prototype.triggerOutputNodes = function() {
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

LiteGraph.registerNodeType("ai-providers/text-to-image/flux_schnell_wavespeed", FluxSchnellWavespeedNode);
