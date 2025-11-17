// API Key Management for multiple providers
    const wavespeedApiKeyInput = document.getElementById('wavespeed-api-key-input');
    const saveWavespeedKeyBtn = document.getElementById('save-wavespeed-key-btn');
    const wavespeedApiStatus = document.getElementById('wavespeed-api-status');
    
    const falApiKeyInput = document.getElementById('fal-api-key-input');
    const saveFalKeyBtn = document.getElementById('save-fal-key-btn');
    const falApiStatus = document.getElementById('fal-api-status');

    // Load Wavespeed API key from local storage
    function loadWavespeedApiKey() {
      const savedKey = localStorage.getItem('wavespeed_api_key');
      if (savedKey) {
        wavespeedApiKeyInput.value = savedKey;
        wavespeedApiStatus.textContent = '✓ API Key loaded';
        wavespeedApiStatus.classList.add('saved');
      }
    }

    // Load Fal API key from local storage
    function loadFalApiKey() {
      const savedKey = localStorage.getItem('fal_api_key');
      if (savedKey) {
        falApiKeyInput.value = savedKey;
        falApiStatus.textContent = '✓ API Key loaded';
        falApiStatus.classList.add('saved');
      }
    }

    // Save Wavespeed API key to local storage
    saveWavespeedKeyBtn.addEventListener('click', () => {
      const apiKey = wavespeedApiKeyInput.value.trim();
      if (apiKey) {
        localStorage.setItem('wavespeed_api_key', apiKey);
        wavespeedApiStatus.textContent = '✓ API Key saved successfully';
        wavespeedApiStatus.classList.add('saved');
      } else {
        wavespeedApiStatus.textContent = '⚠ Please enter an API key';
        wavespeedApiStatus.classList.remove('saved');
      }
    });

    // Save Fal API key to local storage
    saveFalKeyBtn.addEventListener('click', () => {
      const apiKey = falApiKeyInput.value.trim();
      if (apiKey) {
        localStorage.setItem('fal_api_key', apiKey);
        falApiStatus.textContent = '✓ API Key saved successfully';
        falApiStatus.classList.add('saved');
      } else {
        falApiStatus.textContent = '⚠ Please enter an API key';
        falApiStatus.classList.remove('saved');
      }
    });

    // Get Wavespeed API key
    function getWavespeedApiKey() {
      return localStorage.getItem('wavespeed_api_key') || wavespeedApiKeyInput?.value?.trim();
    }

    // Get Fal API key
    function getFalApiKey() {
      return localStorage.getItem('fal_api_key') || falApiKeyInput?.value?.trim();
    }

    // Load keys on start
    loadWavespeedApiKey();
    loadFalApiKey();

    // Patch LiteGraph to use passive event listeners
    (function patchLiteGraphPassiveEvents() {
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

      EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Ignore legacy mousewheel hooks so Chrome stops flagging them
        if (type === 'mousewheel') {
          return;
        }

        if (type === 'touchstart' || type === 'touchmove' || type === 'wheel') {
          if (typeof options === 'boolean') {
            options = { capture: options, passive: true };
          } else if (typeof options === 'object') {
            options = { ...options, passive: true };
          } else {
            options = { passive: true };
          }
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      EventTarget.prototype.removeEventListener = function(type, listener, options) {
        if (type === 'mousewheel') {
          return;
        }
        return originalRemoveEventListener.call(this, type, listener, options);
      };
    })();

    // Create the graph and canvas (expose globally for event handlers)
    const graph = new LGraph();
    const canvas = new LGraphCanvas("#graph-container", graph);
    window.graph = graph;
    window.canvas = canvas;
    
    // Initialize node menu system
    const nodeMenu = new NodeMenu(graph, canvas);
    nodeMenu.setupContextMenu();
    window.nodeMenu = nodeMenu;
    
    // Fix blurry canvas on high-DPI displays
    canvas.ds.scale = 1;
    canvas.resize();

    // Keep canvas resolution in sync with the viewport
    function handleResize() {
      canvas.resize();
      canvas.setDirty(true, true);
    }
    window.addEventListener('resize', handleResize);
    
    // Node preloader animation system
    let activePreloader = null; // { nodeId: id, progress: 0-1, color: string }
    
    function startNodePreloader(nodeId, color = "#2196F3") {
      activePreloader = {
        nodeId: nodeId,
        progress: 0,
        startTime: Date.now(),
        color: color
      };
    }
    
    function clearPreloader() {
      activePreloader = null;
    }
    
    // Update preloader and gradient animations
    function updateAnimations() {
      if (activePreloader) {
        const elapsed = Date.now() - activePreloader.startTime;
        activePreloader.progress = (elapsed / 1000) % 1; // 1 second rotation loop
      }
      // Always redraw to keep gradient animation flowing on selected nodes
      if (canvas.selected_nodes && Object.keys(canvas.selected_nodes).length > 0) {
        canvas.setDirty(true, true);
      } else if (activePreloader) {
        canvas.setDirty(true, true);
      }
    }
    
    // Continuous animation loop
    setInterval(updateAnimations, 16); // ~60fps
    
    // Zoom control functionality
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    
    function updateZoom(scale) {
      canvas.ds.scale = scale;
      zoomSlider.value = scale;
      zoomValue.textContent = Math.round(scale * 100) + '%';
      canvas.setDirty(true, true);
    }
    
    zoomSlider.addEventListener('input', (e) => {
      updateZoom(parseFloat(e.target.value));
    });
    
    zoomInBtn.addEventListener('click', () => {
      const newScale = Math.min(2, canvas.ds.scale + 0.1);
      updateZoom(newScale);
    });
    
    zoomOutBtn.addEventListener('click', () => {
      const newScale = Math.max(0.1, canvas.ds.scale - 0.1);
      updateZoom(newScale);
    });
    
    // Center and arrange workflow
    const centerBtn = document.getElementById('center-btn');
    
    centerBtn.addEventListener('click', () => {
      if (graph._nodes.length === 0) return;
      
      // Arrange nodes in a clean layout
      const HORIZONTAL_SPACING = 450;
      const VERTICAL_SPACING = 250;
      const START_X = 100;
      const START_Y = 100;
      
      // Group nodes by type (prompt, generator, preview)
      const promptNodes = graph._nodes.filter(n => n.type === 'ai-tools/text/prompt');
      const generatorNodes = graph._nodes.filter(n => n.generateImage);
      const previewNodes = graph._nodes.filter(n => n.type === 'ai-tools/image/image_preview');
      
      let yOffset = START_Y;
      
      // Arrange prompts in the first column
      promptNodes.forEach((node, i) => {
        node.pos[0] = START_X;
        node.pos[1] = yOffset;
        yOffset += node.size[1] + VERTICAL_SPACING;
      });
      
      // Arrange generators in the second column
      yOffset = START_Y;
      generatorNodes.forEach((node, i) => {
        node.pos[0] = START_X + HORIZONTAL_SPACING;
        node.pos[1] = yOffset;
        yOffset += Math.max(node.size[1], 200) + VERTICAL_SPACING;
      });
      
      // Arrange previews in the third column
      yOffset = START_Y;
      previewNodes.forEach((node, i) => {
        node.pos[0] = START_X + HORIZONTAL_SPACING * 2;
        node.pos[1] = yOffset;
        yOffset += node.size[1] + VERTICAL_SPACING;
      });
      
      // Calculate bounding box of all nodes
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      
      graph._nodes.forEach(node => {
        minX = Math.min(minX, node.pos[0]);
        minY = Math.min(minY, node.pos[1]);
        maxX = Math.max(maxX, node.pos[0] + node.size[0]);
        maxY = Math.max(maxY, node.pos[1] + node.size[1]);
      });
      
      // Center the view on the nodes
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const canvasWidth = canvas.canvas.width;
      const canvasHeight = canvas.canvas.height;
      
      canvas.ds.offset[0] = canvasWidth / 2 - centerX * canvas.ds.scale;
      canvas.ds.offset[1] = canvasHeight / 2 - centerY * canvas.ds.scale;
      
      canvas.setDirty(true, true);
    });
    
    // Update slider when zoom changes via mouse wheel
    const originalOnWheel = canvas.processMouseWheel;
    canvas.processMouseWheel = function(e) {
      if (originalOnWheel) {
        originalOnWheel.call(this, e);
      }
      zoomSlider.value = canvas.ds.scale;
      zoomValue.textContent = Math.round(canvas.ds.scale * 100) + '%';
    };
    
    // Run Workflow functionality
    const runWorkflowBtn = document.getElementById('run-workflow-btn');
    const runWorkflowText = document.getElementById('run-workflow-text');
    
    // Helper function to sort nodes in execution order (topological sort)
    function getExecutionOrder() {
      const sorted = [];
      const visited = new Set();
      const visiting = new Set();
      
      function visit(node) {
        if (visited.has(node.id)) return;
        if (visiting.has(node.id)) return; // Cycle detected, skip
        
        visiting.add(node.id);
        
        // Visit all input nodes first
        if (node.inputs) {
          node.inputs.forEach((input, idx) => {
            const link = node.getInputLink(idx);
            if (link) {
              const originNode = graph.getNodeById(link.origin_id);
              if (originNode) {
                visit(originNode);
              }
            }
          });
        }
        
        visiting.delete(node.id);
        visited.add(node.id);
        sorted.push(node);
      }
      
      // Start from nodes with no inputs (source nodes)
      graph._nodes.forEach(node => {
        visit(node);
      });
      
      return sorted;
    }
    
    async function runWorkflow() {
      if (runWorkflowBtn.disabled) return;
      
      runWorkflowBtn.disabled = true;
      runWorkflowBtn.classList.add('running');
      runWorkflowText.textContent = 'Running...';
      
      // Clear any previous selections
      graph._nodes.forEach(node => {
        canvas.deselectNode(node);
        node._stepComplete = false;
      });
      
      try {
        // Get nodes in proper execution order based on connections
        const orderedNodes = getExecutionOrder();
        
        // Separate nodes by type while maintaining order
        const promptNodes = orderedNodes.filter(n => n.type === 'ai-tools/text/prompt');
        const generatorNodes = orderedNodes.filter(node => 
          (typeof node.generateImage === 'function' || typeof node.generateVideo === 'function') && !node.isGenerating
        );
        const previewNodes = orderedNodes.filter(n => 
          n.type === 'ai-tools/image/image_preview' || n.type === 'ai-tools/video/video_preview'
        );
        
        if (generatorNodes.length === 0) {
          runWorkflowText.textContent = 'No generators found';
          setTimeout(() => {
            runWorkflowText.textContent = 'Run Workflow';
            runWorkflowBtn.classList.remove('running');
            runWorkflowBtn.disabled = false;
          }, 2000);
          return;
        }
        
        // Step 1: Animate prompt nodes with rotating preloader
        for (const node of promptNodes) {
          canvas.selectNode(node);
          startNodePreloader(node.id, "#2196F3");
          canvas.setDirty(true, true);
          await new Promise(resolve => setTimeout(resolve, 800)); // Show preloader rotating
          canvas.deselectNode(node);
          node._stepComplete = true;
          clearPreloader();
          canvas.setDirty(true, true);
          await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause before jumping
        }
        
        // Step 2: Execute generator nodes with preloader animation (in execution order)
        for (let i = 0; i < generatorNodes.length; i++) {
          const node = generatorNodes[i];
          runWorkflowText.textContent = `Running ${i + 1}/${generatorNodes.length}...`;
          
          // Select node and start preloader
          canvas.selectNode(node);
          startNodePreloader(node.id, "#FF9800");
          canvas.setDirty(true, true);
          
          // Trigger generation (image or video)
          if (node.generateImage) {
            await node.generateImage();
          } else if (node.generateVideo) {
            await node.generateVideo();
          }
          
          // Keep preloader spinning while generating
          while (node.isGenerating) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Mark complete and change to success color
          node._stepComplete = true;
          startNodePreloader(node.id, "#4CAF50");
          canvas.setDirty(true, true);
          await new Promise(resolve => setTimeout(resolve, 500)); // Show success color briefly
          clearPreloader();
          canvas.deselectNode(node);
          canvas.setDirty(true, true);
          
          // Check if it succeeded
          if (!node.lastImageUrl && !node.lastVideoUrl) {
            throw new Error(`Node ${node.title} failed to generate`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause before next node
        }
        
        // Step 3: Animate preview nodes with preloader
        for (const node of previewNodes) {
          canvas.selectNode(node);
          startNodePreloader(node.id, "#2196F3");
          canvas.setDirty(true, true);
          await new Promise(resolve => setTimeout(resolve, 600));
          canvas.deselectNode(node);
          node._stepComplete = true;
          clearPreloader();
          canvas.setDirty(true, true);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        runWorkflowText.textContent = '✓ Complete';
        setTimeout(() => {
          runWorkflowText.textContent = 'Run Workflow';
          runWorkflowBtn.classList.remove('running');
          runWorkflowBtn.disabled = false;
          clearPreloader();
          // Clear step completion markers
          graph._nodes.forEach(node => {
            node._stepComplete = false;
          });
          canvas.setDirty(true, true);
        }, 2000);
        
      } catch (error) {
        console.error('Workflow error:', error);
        runWorkflowText.textContent = '✗ Error';
        clearPreloader();
        setTimeout(() => {
          runWorkflowText.textContent = 'Run Workflow';
          runWorkflowBtn.classList.remove('running');
          runWorkflowBtn.disabled = false;
          // Clear step markers and selections
          graph._nodes.forEach(node => {
            canvas.deselectNode(node);
            node._stepComplete = false;
          });
          canvas.setDirty(true, true);
        }, 3000);
      }
    }
    
    runWorkflowBtn.addEventListener('click', runWorkflow);
    
    // Export/Import functionality using WorkflowManager
    const workflowManager = new WorkflowManager(graph, canvas);
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input');
    
    exportBtn.addEventListener('click', () => {
      try {
        workflowManager.exportWorkflow();
      } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export workflow: ' + error.message);
      }
    });
    
    importBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        await workflowManager.importWorkflow(file);
      } catch (error) {
        console.error('Import error:', error);
        alert(error.message);
      }
      
      fileInput.value = ''; // Reset input
    });

    // Minimalist FAB menu logic
    const mainFab = document.getElementById('main-fab');
    const fabMenu = document.getElementById('fab-menu');
    const fabClose = document.getElementById('fab-close');
    const fabExport = document.getElementById('fab-export');
    const fabImport = document.getElementById('fab-import');
    const fabRun = document.getElementById('fab-run');
    const fabKeys = document.getElementById('fab-keys');
    const fabZoomIn = document.getElementById('fab-zoom-in');
    const fabZoomOut = document.getElementById('fab-zoom-out');
    const fabCenter = document.getElementById('fab-center');

    // Show only the FAB on load (hide legacy floating controls via class)
    document.body.classList.add('minimal-ui');

    function toggleFabMenu(open) {
      if (open) {
        fabMenu.classList.add('open');
        fabMenu.setAttribute('aria-hidden', 'false');
      } else {
        fabMenu.classList.remove('open');
        fabMenu.setAttribute('aria-hidden', 'true');
      }
    }

    mainFab.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFabMenu(!fabMenu.classList.contains('open'));
    });

    fabClose.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFabMenu(false);
    });

    // Wire menu items to existing controls
    fabExport.addEventListener('click', () => {
      exportBtn.click();
      toggleFabMenu(false);
    });

    fabImport.addEventListener('click', () => {
      fileInput.click();
      toggleFabMenu(false);
    });

    fabRun.addEventListener('click', () => {
      runWorkflowBtn.click();
      toggleFabMenu(false);
    });

    fabKeys.addEventListener('click', () => {
      // Toggle visibility of the API keys panel
      const apiPanel = document.getElementById('api-key-panel');
      if (apiPanel.style.display === 'block') {
        apiPanel.style.display = 'none';
      } else {
        apiPanel.style.display = 'block';
      }
      toggleFabMenu(false);
    });

    fabZoomIn.addEventListener('click', () => {
      zoomInBtn.click();
      toggleFabMenu(false);
    });

    fabZoomOut.addEventListener('click', () => {
      zoomOutBtn.click();
      toggleFabMenu(false);
    });

    fabCenter.addEventListener('click', () => {
      centerBtn.click();
      toggleFabMenu(false);
    });

    // Close menu if user clicks outside
    document.addEventListener('click', () => {
      if (fabMenu.classList.contains('open')) toggleFabMenu(false);
    });

    // Prevent clicks inside menu from closing it
    fabMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Allow Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleFabMenu(false);
    });

    
    // Override node shape drawing to replace default white border with animated gradient
    const originalDrawNodeShape = LGraphCanvas.prototype.drawNodeShape;
    LGraphCanvas.prototype.drawNodeShape = function(node, ctx, size, fgcolor, bgcolor, selected, mouse_over) {
      // Call original to draw node background
      originalDrawNodeShape.call(this, node, ctx, size, fgcolor, bgcolor, false, mouse_over);
      
      // If selected, draw our custom animated gradient outline
      if (selected) {
        ctx.save();
        
        const time = Date.now() / 1000;
        const animOffset = (time * 0.5) % 1; // Animation speed
        
        // Offset outline outside the node
        const offset = 1;
        const titleHeight = LiteGraph.NODE_TITLE_HEIGHT || 30;
        const w = size[0] + offset * 2;
        const h = size[1] + titleHeight + offset * 2;
        const radius = 10; // Match node's rounded corners
        
        // Calculate perimeter including rounded corners
        const straightPerimeter = (w - 2 * radius) * 2 + (h - 2 * radius) * 2;
        const cornerPerimeter = 2 * Math.PI * radius;
        const perimeter = straightPerimeter + cornerPerimeter;
        
        // Draw the border path in small segments with animated colors
        const steps = 200;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // Translate to draw outside the node (including title)
        ctx.translate(-offset, -(titleHeight + offset));
        
        for (let i = 0; i < steps; i++) {
          const t1 = (i / steps) * perimeter;
          const t2 = ((i + 1) / steps) * perimeter;
          
          // Calculate color based on position along perimeter + animation offset
          const colorT = (i / steps + animOffset) % 1;
          
          // Smooth rainbow gradient
          const hue = colorT * 360;
          const saturation = 100;
          const lightness = 60;
          
          // Convert HSL to RGB
          const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
          const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
          const m = lightness / 100 - c / 2;
          
          let r, g, b;
          if (hue < 60) {
            r = c; g = x; b = 0;
          } else if (hue < 120) {
            r = x; g = c; b = 0;
          } else if (hue < 180) {
            r = 0; g = c; b = x;
          } else if (hue < 240) {
            r = 0; g = x; b = c;
          } else if (hue < 300) {
            r = x; g = 0; b = c;
          } else {
            r = c; g = 0; b = x;
          }
          
          r = Math.floor((r + m) * 255);
          g = Math.floor((g + m) * 255);
          b = Math.floor((b + m) * 255);
          
          ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
          
          // Helper to get point along rounded rectangle perimeter
          const getPoint = (dist) => {
            const topLength = w - 2 * radius;
            const rightLength = h - 2 * radius;
            const bottomLength = w - 2 * radius;
            const leftLength = h - 2 * radius;
            const cornerLength = Math.PI * radius / 2;
            
            // Top edge
            if (dist < topLength) {
              return [radius + dist, 0];
            }
            dist -= topLength;
            
            // Top-right corner
            if (dist < cornerLength) {
              const angle = -Math.PI / 2 + (dist / cornerLength) * Math.PI / 2;
              return [w - radius + Math.cos(angle) * radius, radius + Math.sin(angle) * radius];
            }
            dist -= cornerLength;
            
            // Right edge
            if (dist < rightLength) {
              return [w, radius + dist];
            }
            dist -= rightLength;
            
            // Bottom-right corner
            if (dist < cornerLength) {
              const angle = 0 + (dist / cornerLength) * Math.PI / 2;
              return [w - radius + Math.cos(angle) * radius, h - radius + Math.sin(angle) * radius];
            }
            dist -= cornerLength;
            
            // Bottom edge
            if (dist < bottomLength) {
              return [w - radius - dist, h];
            }
            dist -= bottomLength;
            
            // Bottom-left corner
            if (dist < cornerLength) {
              const angle = Math.PI / 2 + (dist / cornerLength) * Math.PI / 2;
              return [radius + Math.cos(angle) * radius, h - radius + Math.sin(angle) * radius];
            }
            dist -= cornerLength;
            
            // Left edge
            if (dist < leftLength) {
              return [0, h - radius - dist];
            }
            dist -= leftLength;
            
            // Top-left corner
            const angle = Math.PI + (dist / cornerLength) * Math.PI / 2;
            return [radius + Math.cos(angle) * radius, radius + Math.sin(angle) * radius];
          };
          
          const p1 = getPoint(t1);
          const p2 = getPoint(t2);
          
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }
        
        ctx.restore();
      }
    };
    
    // Custom rendering for preloader
    const originalRender = canvas.render;
    canvas.render = function() {
      originalRender.call(this);
      
      const ctx = this.ctx;
      
      // Draw rotating preloader on active node
      if (activePreloader && graph._nodes) {
        const node = graph._nodes.find(n => n.id === activePreloader.nodeId);
        if (node) {
          ctx.save();
          
          // Transform to canvas coordinates
          const x = node.pos[0] * this.ds.scale + this.ds.offset[0];
          const y = node.pos[1] * this.ds.scale + this.ds.offset[1];
          const w = node.size[0] * this.ds.scale;
          const h = node.size[1] * this.ds.scale;
          
          // Draw rotating arc around the node
          const centerX = x + w / 2;
          const centerY = y + h / 2;
          const radius = Math.max(w, h) / 2 + 15;
          
          // Calculate arc angles
          const arcLength = Math.PI * 0.5; // 90 degrees
          const startAngle = activePreloader.progress * Math.PI * 2 - Math.PI / 2;
          const endAngle = startAngle + arcLength;
          
          // Draw glowing arc
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          
          // Outer glow
          ctx.strokeStyle = activePreloader.color + '40';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, startAngle, endAngle);
          ctx.stroke();
          
          // Main arc
          ctx.strokeStyle = activePreloader.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, startAngle, endAngle);
          ctx.stroke();
          
          // Bright tip
          const tipX = centerX + Math.cos(endAngle) * radius;
          const tipY = centerY + Math.sin(endAngle) * radius;
          const gradient = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 10);
          gradient.addColorStop(0, '#FFFFFF');
          gradient.addColorStop(0.5, activePreloader.color);
          gradient.addColorStop(1, activePreloader.color + '00');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 10, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
      }
    };
    
    // Update textareas on zoom/pan
    canvas.onDrawBackground = function() {
      // Force update of all prompt nodes
      if (graph._nodes) {
        graph._nodes.forEach(node => {
          if (node.updateTextareaPosition) {
            node.updateTextareaPosition();
          }
        });
      }
    };

    // ==================== NODE TYPE DEFINITIONS ====================
    // All custom node types are now loaded from separate files in /scripts/js/nodes/
    // - PromptNode.js
    // - ImageGeneratorNode.js
    // - FluxSchnellNode.js
    // - QwenImageEditNode.js
    // - ImagePreviewNode.js
    
    // Helper functions for nodes to access API keys (exposed globally for node files)
    window.getWavespeedApiKey = getWavespeedApiKey;
    window.getFalApiKey = getFalApiKey;

    // Force continuous redraw for real-time updates (defined globally)
    function continuousRedraw() {
      if (canvas) {
        canvas.draw(true, true);
      }
      requestAnimationFrame(continuousRedraw);
    }
    requestAnimationFrame(continuousRedraw);

    // // ==================== CREATE DEFAULT GRAPH ====================
    // // Function to create default graph once all node types are registered
    // function createDefaultGraph() {
    //   // Check if all required node types are registered
    //   const requiredTypes = ["ai/prompt", "models/flux_schnell_wavespeed", "ai/image_preview"];
    //   const allRegistered = requiredTypes.every(type => LiteGraph.registered_node_types[type]);
      
    //   if (!allRegistered) {
    //     // Not ready yet, try again in 50ms
    //     setTimeout(createDefaultGraph, 50);
    //     return;
    //   }

    //   // Create prompt node
    //   const promptNode = LiteGraph.createNode("ai/prompt");
    //   promptNode.pos = [100, 100];
    //   graph.add(promptNode);

    //   // Create Flux Schnell node (Wavespeed)
    //   const generatorNode = LiteGraph.createNode("models/flux_schnell_wavespeed");
    //   generatorNode.pos = [450, 100];
    //   graph.add(generatorNode);

    //   // Create image preview node
    //   const previewNode = LiteGraph.createNode("ai/image_preview");
    //   previewNode.pos = [780, 100];
    //   graph.add(previewNode);

    //   // Connect nodes
    //   promptNode.connect(0, generatorNode, 0);
    //   generatorNode.connect(0, previewNode, 0);

    //   // Start graph
    //   graph.start();
    // }

    // // Start trying to create the graph after DOM is loaded
    // if (document.readyState === 'loading') {
    //   document.addEventListener('DOMContentLoaded', createDefaultGraph);
    // } else {
    //   createDefaultGraph();
    // }