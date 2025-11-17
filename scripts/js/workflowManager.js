/**
 * Workflow Manager
 * Handles import and export functionality for LiteGraph workflows
 */

class WorkflowManager {
  constructor(graph, canvas) {
    this.graph = graph;
    this.canvas = canvas;
  }

  /**
   * Export the current workflow to a JSON file
   * Saves all node states including prompts, images, and properties
   */
  exportWorkflow() {
    try {
      // Ensure all nodes save their current state
      this.graph._nodes.forEach(node => {
        this.saveNodeState(node);
      });

      const data = this.graph.serialize();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Export error:', error);
      throw new Error('Failed to export workflow: ' + error.message);
    }
  }

  /**
   * Import a workflow from a JSON file
   * @param {File} file - The JSON file to import
   * @returns {Promise<boolean>} Success status
   */
  async importWorkflow(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          this.loadWorkflow(data);
          resolve(true);
        } catch (error) {
          console.error('Import error:', error);
          reject(new Error('Failed to import workflow. Please check the file format.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Migrate old node types to new categorized structure
   * @param {Object} data - Serialized workflow data
   * @returns {Object} Migrated workflow data
   */
  migrateNodeTypes(data) {
    // Node type migration map
    const migrations = {
      'ai-tools/prompt': 'ai-tools/text/prompt',
      'ai-tools/json_data': 'ai-tools/text/json_data',
      'ai-tools/image_preview': 'ai-tools/image/image_preview',
      'ai-tools/upload_image': 'ai-tools/image/upload_image',
      'ai-tools/video_preview': 'ai-tools/video/video_preview',
      'ai-tools/upload_video': 'ai-tools/video/upload_video',
      'ai-tools/model_3d_preview': 'ai-tools/3d/model_3d_preview',
      'ai-tools/upload_3d_model': 'ai-tools/3d/upload_3d_model'
    };

    if (data.nodes) {
      data.nodes.forEach(node => {
        if (migrations[node.type]) {
          console.log(`Migrating node type: ${node.type} → ${migrations[node.type]}`);
          node.type = migrations[node.type];
        }
      });
    }

    return data;
  }

  /**
   * Load workflow data into the graph
   * @param {Object} data - Serialized workflow data
   */
  loadWorkflow(data) {
    // Clear current graph
    this.graph.clear();

    // Remove all textareas
    document.querySelectorAll('.comfy-multiline-input').forEach(el => el.remove());

    // Migrate old node types to new structure
    data = this.migrateNodeTypes(data);

    // Load new graph
    this.graph.configure(data);

    // Restore nodes with their data
    this.graph._nodes.forEach(node => {
      this.restoreNodeState(node);
    });

    // Start the graph to ensure continuous execution
    this.graph.start();
    
    // Force graph execution to propagate data through connections
    setTimeout(() => {
      // Run multiple steps to ensure all connections are updated
      this.graph.runStep();
      this.graph.runStep();
      this.canvas.setDirty(true, true);
    }, 100);

    this.canvas.setDirty(true, true);
  }

  /**
   * Save the current state of a node to its properties
   * @param {Object} node - The node to save state for
   */
  saveNodeState(node) {
    // Save prompt textarea value
    if (node.textareaElement) {
      node.properties.prompt = node.textareaElement.value;
    }

    // Save generator lastImageUrl and status
    if (node.lastImageUrl) {
      node.properties._lastImageUrl = node.lastImageUrl;
      node.properties._status = node.status;
    }

    // Save video generator lastVideoUrl and status
    if (node.lastVideoUrl) {
      node.properties._lastVideoUrl = node.lastVideoUrl;
      node.properties._status = node.status;
    }

    // Save preview imageUrl
    if (node.imageUrl) {
      node.properties._imageUrl = node.imageUrl;
    }

    // Save video preview videoUrl
    if (node.type === 'ai/video_preview' && node.videoUrl) {
      node.properties._videoUrl = node.videoUrl;
    }

    // Save upload node image data
    if (node.type === 'ai/image_upload' && node.imageData) {
      node.properties._imageData = node.imageData;
      node.properties._imageUrl = node.imageUrl;
    }
  }

  /**
   * Restore a node's state from its properties
   * @param {Object} node - The node to restore state for
   */
  restoreNodeState(node) {
    // Restore prompt textareas
    if (node.createTextarea) {
      node.createTextarea();
      // Sync textarea value with property
      if (node.textareaElement && node.properties.prompt) {
        node.textareaElement.value = node.properties.prompt;
      }
    }

    // Restore generator widgets from properties
    if (node.widgets) {
      node.widgets.forEach(widget => {
        // For combo widgets, sync with properties
        if (widget.type === 'combo') {
          if (widget.name === 'ratio' && node.properties.ratio) {
            widget.value = node.properties.ratio;
          }
          if (widget.name === 'format' && node.properties.output_format) {
            widget.value = node.properties.output_format;
          }
        }
        // For number widgets
        if (widget.type === 'number') {
          if (widget.name === 'strength' && node.properties.strength !== undefined) {
            widget.value = node.properties.strength;
          }
        }
      });
    }

    // Restore lastImageUrl and status for image generators
    if (node.properties._lastImageUrl) {
      node.lastImageUrl = node.properties._lastImageUrl;
      node.status = node.properties._status || "✓ Complete";
      node.isGenerating = false;
      node.boxcolor = "#4CAF50";
      node._lastClickTime = 0; // Reset click time to allow immediate clicking
      
      // Set output data immediately for generators
      if (node.outputs && node.outputs.length > 0) {
        node.setOutputData(0, node.lastImageUrl);
        if (node.outputs.length > 1) {
          node.setOutputData(1, node.status);
        }
      }
    } else if (node.generateImage) {
      // Reset status for generator nodes without saved images
      node.status = "Ready";
      node.isGenerating = false;
      node.boxcolor = null;
      node._lastClickTime = 0;
    }

    // Restore lastVideoUrl and status for video generators
    if (node.properties._lastVideoUrl) {
      node.lastVideoUrl = node.properties._lastVideoUrl;
      node.status = node.properties._status || "✓ Complete";
      node.isGenerating = false;
      node.boxcolor = "#4CAF50";
      node._lastClickTime = 0;
      
      // Set output data immediately for video generators
      if (node.outputs && node.outputs.length > 0) {
        node.setOutputData(0, node.lastVideoUrl);
      }
    } else if (node.generateVideo) {
      // Reset status for video generator nodes without saved videos
      node.status = "Ready";
      node.isGenerating = false;
      node.boxcolor = null;
      node._lastClickTime = 0;
    }

    // Restore images in preview nodes
    if (node.type === 'ai-tools/image/image_preview') {
      if (node.properties._imageUrl) {
        // Load the image directly
        if (node.loadImage) {
          node.loadImage(node.properties._imageUrl);
        } else {
          // Fallback if loadImage method doesn't exist
          node.imageUrl = node.properties._imageUrl;
        }
      }
    }

    // Restore videos in video preview nodes
    if (node.type === 'ai-tools/video/video_preview') {
      if (node.properties._videoUrl) {
        // Load the video directly
        if (node.loadVideo) {
          node.loadVideo(node.properties._videoUrl);
        } else {
          // Fallback if loadVideo method doesn't exist
          node.videoUrl = node.properties._videoUrl;
        }
      }
    }

    // Restore upload node images
    if (node.type === 'ai-tools/image/upload_image') {
      if (node.properties._imageData) {
        node.imageData = node.properties._imageData;
        node.imageUrl = node.properties._imageUrl;
        if (node.loadImage) {
          node.loadImage(node.imageUrl);
        }
      }
    }
  }

  /**
   * Create a backup of the current workflow
   * @returns {Object} Serialized workflow data
   */
  createBackup() {
    this.graph._nodes.forEach(node => {
      this.saveNodeState(node);
    });
    return this.graph.serialize();
  }

  /**
   * Restore a workflow from backup data
   * @param {Object} backupData - Previously saved workflow data
   */
  restoreBackup(backupData) {
    this.loadWorkflow(backupData);
  }

  /**
   * Validate workflow data before importing
   * @param {Object} data - Workflow data to validate
   * @returns {boolean} Whether the data is valid
   */
  validateWorkflow(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for required properties
    if (!data.nodes || !Array.isArray(data.nodes)) {
      return false;
    }

    // Basic node validation
    for (const node of data.nodes) {
      if (!node.type || !node.id) {
        return false;
      }
    }

    return true;
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkflowManager;
} else {
  window.WorkflowManager = WorkflowManager;
}
