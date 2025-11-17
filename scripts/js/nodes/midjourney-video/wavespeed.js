// ==================== MIDJOURNEY VIDEO NODE ====================
function MidjourneyVideoNode() {
  this.addInput("Image", "string");
  this.addInput("Prompt", "string");
  this.addOutput("Video", "string");
  this.addOutput("Data", "object");
  
  // Provider selector widget
  // this.addWidget("combo", "provider", "WAVESPEED", (value) => {
  //   this.properties.provider = value;
  // }, {
  //   values: getAvailableProviders()
  // });
  
  // Mandatory properties shown as widgets
  this.addWidget("combo", "resolution", "480p", (value) => {
    this.properties.resolution = value;
  }, {
    values: ["480p", "720p"]
  });
  
  this.addWidget("combo", "aspect_ratio", "1:1", (value) => {
    this.properties.aspect_ratio = value;
  }, {
    values: ["1:1", "4:3", "3:4", "2:3", "16:9", "9:16", "1:2"]
  });
  
  this.addWidget("combo", "motion", "low", (value) => {
    this.properties.motion = value;
  }, {
    values: ["low", "high"]
  });
  
  this.addWidget("combo", "quality", 1, (value) => {
    this.properties.quality = value;
  }, {
    values: [0.25, 0.5, 1, 2]
  });
  
  // Properties (accessible via properties panel)
  // this.addProperty("provider", "WAVESPEED");
  this.addProperty("resolution", "480p");
  this.addProperty("aspect_ratio", "1:1");
  this.addProperty("motion", "low");
  this.addProperty("quality", 1);
  this.addProperty("stylize", 0);
  this.addProperty("chaos", 0);
  this.addProperty("weird", 0);
  this.addProperty("seed", -1);
  
  this.size = [280, 160];
  this.isGenerating = false;
  this.status = "Ready";
  this.lastVideoUrl = null;
  this.lastRequestData = null;
  this.lastResponseData = null;
}
MidjourneyVideoNode.title = (typeof IconConfig !== 'undefined') ? IconConfig.getModelNodeTitle("Midjourney Video", "Image To Video", "Wavespeed") : "🟡 Midjourney Video";

MidjourneyVideoNode.prototype.onExecute = function() {
  const imageUrl = this.getInputData(0);
  const prompt = this.getInputData(1);
  this.setOutputData(0, this.lastVideoUrl);
  this.setOutputData(1, {
    request: this.lastRequestData,
    response: this.lastResponseData
  });
};

MidjourneyVideoNode.prototype.generateVideo = async function() {
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

  const imageUrl = this.getInputData(0);
  const prompt = this.getInputData(1);
  
  if (!imageUrl) {
    this.status = "Error: No image";
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
    return;
  }
  
  if (!prompt) {
    this.status = "Error: No prompt";
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
    // Build request body - include main parameters, optional ones only if non-default
    const requestBody = {
      image: imageUrl,
      prompt: prompt,
      resolution: this.properties.resolution || "480p",
      aspect_ratio: this.properties.aspect_ratio || "1:1",
      motion: this.properties.motion || "low",
      quality: this.properties.quality || 1
    };
    
    // Add optional advanced parameters only if set
    if (this.properties.stylize > 0) {
      requestBody.stylize = this.properties.stylize;
    }
    if (this.properties.chaos > 0) {
      requestBody.chaos = this.properties.chaos;
    }
    if (this.properties.weird > 0) {
      requestBody.weird = this.properties.weird;
    }
    if (this.properties.seed && this.properties.seed !== -1) {
      requestBody.seed = this.properties.seed;
    }

    console.log('Midjourney Video request:', requestBody);
    
    // Store request data before sending
    this.lastRequestData = requestBody;
    this.setOutputData(1, {
      request: this.lastRequestData,
      response: this.lastResponseData
    });

    const response = await fetch(getEndpointUrl('midjourneyVideo', provider), {
      method: 'POST',
      headers: {
        'Authorization': getAuthorizationHeader(provider),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // Get error details from response
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Request failed: ${response.status} - ${errorText}`);
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
    console.error('Video generation error:', error);
    this.isGenerating = false;
    if (this.graph && this.graph.canvas) {
      this.graph.canvas.setDirty(true, true);
    }
  }
};

MidjourneyVideoNode.prototype.pollForResult = async function(resultUrl, apiKey) {
  const maxAttempts = 120; // Videos take longer
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
          this.lastVideoUrl = data.data.outputs[0];
          this.lastResponseData = data.data;
          this.status = "✓ Complete";
          this.boxcolor = "#4CAF50";
          this.setOutputData(0, this.lastVideoUrl);
          this.setOutputData(1, {
            request: this.lastRequestData,
            response: this.lastResponseData
          });
          this.triggerOutputNodes();
        } else {
          throw new Error('No video in response');
        }
        this.isGenerating = false;
        if (this.graph && this.graph.canvas) {
          this.graph.canvas.setDirty(true, true);
        }
      } else if (status === 'failed' || status === 'error') {
        throw new Error(data.data.error || 'Video generation failed');
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for result');
        }
        
        this.status = `Processing... (${Math.round(data.data.executionTime || 0)}s)`;
        if (this.graph && this.graph.canvas) {
          this.graph.canvas.setDirty(true, true);
        }
        setTimeout(poll, 3000); // Poll every 3 seconds for videos
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

MidjourneyVideoNode.prototype.onDrawForeground = function(ctx) {
  // Don't draw content when node is collapsed
  if (this.flags.collapsed) return;
  
  ctx.fillStyle = "#FFF";
  ctx.font = "12px Arial";
  ctx.fillText(this.status, 10, this.size[1] - 30);
  
  if (!this.isGenerating) {
    ctx.fillStyle = "#9C27B0";
    ctx.fillRect(10, this.size[1] - 20, this.size[0] - 20, 15);
    ctx.fillStyle = "#FFF";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Generate Video", this.size[0] / 2, this.size[1] - 9);
    ctx.textAlign = "left";
  }
};

MidjourneyVideoNode.prototype.onMouseDown = function(e, pos, canvas) {
  if (!this.isGenerating && pos[1] > this.size[1] - 20 && pos[0] >= 10 && pos[0] <= this.size[0] - 10) {
    if (this._lastClickTime && Date.now() - this._lastClickTime < 500) {
      return true;
    }
    this._lastClickTime = Date.now();
    this.generateVideo();
    return true;
  }
  return false;
};

// Helper to trigger connected output nodes
MidjourneyVideoNode.prototype.triggerOutputNodes = function() {
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

LiteGraph.registerNodeType("ai-providers/image-to-video/midjourney_video_wavespeed", MidjourneyVideoNode);

