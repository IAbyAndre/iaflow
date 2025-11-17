// Node Menu System for LiteGraph
// Handles node categories, subcategories, and the Add Node context menu

class NodeMenu {
  constructor(graph, canvas) {
    this.graph = graph;
    this.canvas = canvas;
    this.categories = new Map();
    this.initializeDefaultCategories();
  }

  // Initialize default node categories
  initializeDefaultCategories() {
    // Basic LiteGraph categories
    // this.addCategory('basic', ['graph', 'events', 'widget', 'input']);
    // this.addCategory('math', ['math', 'math3d']);
    // this.addCategory('string', ['string']);
    // this.addCategory('logic', ['logic']);
    // this.addCategory('graphics', ['graphics', 'color', 'geometry']);
    // this.addCategory('audio', ['audio', 'midi']);
    // this.addCategory('network', ['network']);
    
    // AI Tools - organized by type (Text, Image, Video, 3D)
    this.addCategory('AI Tools', ['Text', 'Image', 'Video', '3D']);
    // AI Models - organized by provider (Wavespeed, Fal, etc) then models
    this.addCategory('AI Models', []);
  }

  // Add a category with subcategories
  addCategory(name, subcategories = []) {
    this.categories.set(name, subcategories);
  }

  // Add a subcategory to an existing category
  addSubcategory(categoryName, subcategoryName) {
    if (this.categories.has(categoryName)) {
      const subcats = this.categories.get(categoryName);
      if (!subcats.includes(subcategoryName)) {
        subcats.push(subcategoryName);
      }
    } else {
      this.addCategory(categoryName, [subcategoryName]);
    }
  }

  // Get all categories
  getCategories() {
    return Array.from(this.categories.keys());
  }

  // Get subcategories for a category
  getSubcategories(categoryName) {
    return this.categories.get(categoryName) || [];
  }

  // Override the default LiteGraph context menu to use our custom structure
  setupContextMenu() {
    const self = this;
    
    // Override with custom menu
    this.canvas.getCanvasMenuOptions = function() {
      const options = [];
      const canvas = this;
      
      // Capture the current mouse position in graph coordinates
      const clickPosition = canvas.graph_mouse ? [canvas.graph_mouse[0], canvas.graph_mouse[1]] : [100, 100];
      
      // Add Node submenu
      const nodeSubmenu = [];
      
      // Build category structure
      self.categories.forEach((subcategories, categoryName) => {
        // Special handling for AI Models category
        if (categoryName === 'AI Models') {
          const providers = self.getProviders();
          if (providers.length > 0) {
            const providerMenus = [];
            
            providers.forEach(provider => {
              const modelCategories = self.getModelCategoriesForProvider(provider);
              if (modelCategories.length > 0) {
                const categoryMenus = [];
                
                modelCategories.forEach(modelCategory => {
                  const models = self.getModelsForCategoryAndProvider(modelCategory, provider);
                  if (models.length > 0) {
                    // Convert category slug to display name for icon lookup
                    const categoryDisplayName = modelCategory
                      .split('-')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    const categoryIcon = self.getIconForItem(categoryDisplayName);
                    
                    // Sort models alphabetically by display name
                    const sortedModels = models.map(nodeType => {
                      const displayName = self.getNodeDisplayName(nodeType, true);
                      return {
                        content: categoryIcon ? categoryIcon + displayName : displayName,
                        nodeType: nodeType,
                        callback: () => {
                          const node = LiteGraph.createNode(nodeType);
                          if (node) {
                            node.pos = [clickPosition[0], clickPosition[1]];
                            self.graph.add(node);
                          }
                        }
                      };
                    }).sort((a, b) => {
                      // Sort by text content only (strip HTML)
                      const aText = a.content.replace(/<[^>]*>/g, '');
                      const bText = b.content.replace(/<[^>]*>/g, '');
                      return aText.localeCompare(bText);
                    });
                    
                    categoryMenus.push({
                      content: categoryIcon ? categoryIcon + categoryDisplayName : categoryDisplayName,
                      has_submenu: true,
                      callback: null,
                      submenu: {
                        options: sortedModels
                      }
                    });
                  }
                });
                
                if (categoryMenus.length > 0) {
                  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
                  const providerIcon = self.getIconForItem(providerName);
                  providerMenus.push({
                    content: providerIcon ? providerIcon + providerName : providerName,
                    has_submenu: true,
                    callback: null,
                    submenu: {
                      options: categoryMenus
                    }
                  });
                }
              }
            });
            
            if (providerMenus.length > 0) {
              const categoryIcon = self.getIconForItem(categoryName);
              nodeSubmenu.push({
                content: categoryIcon ? categoryIcon + categoryName : categoryName,
                has_submenu: true,
                callback: null,
                submenu: {
                  options: providerMenus
                }
              });
            }
          }
        } else if (subcategories.length === 0) {
          // Category with no subcategories - add nodes directly
          const nodes = self.getNodesForCategory(categoryName);
          if (nodes.length > 0) {
            // Sort nodes alphabetically by display name
            const sortedOptions = nodes.map(nodeType => {
              const displayName = self.getNodeDisplayName(nodeType);
              const icon = self.getParentCategoryIcon(categoryName);
              return {
                content: icon ? icon + displayName : displayName,
                nodeType: nodeType,
                callback: () => {
                  const node = LiteGraph.createNode(nodeType);
                  if (node) {
                    node.pos = [clickPosition[0], clickPosition[1]];
                    self.graph.add(node);
                  }
                }
              };
            }).sort((a, b) => {
              const aText = a.content.replace(/<[^>]*>/g, '');
              const bText = b.content.replace(/<[^>]*>/g, '');
              return aText.localeCompare(bText);
            });
            
            const categoryIcon = self.getIconForItem(categoryName);
            nodeSubmenu.push({
              content: categoryIcon ? `${categoryIcon} ${categoryName}` : categoryName,
              has_submenu: true,
              callback: null,
              submenu: {
                options: sortedOptions
              }
            });
          }
        } else {
          // Category with subcategories
          const subcatMenus = [];
          
          subcategories.forEach(subcatName => {
            const nodes = self.getNodesForCategory(subcatName);
            if (nodes.length > 0) {
              // Sort nodes alphabetically by display name
              const sortedOptions = nodes.map(nodeType => {
                const displayName = self.getNodeDisplayName(nodeType);
                const icon = self.getParentCategoryIcon(subcatName);
                return {
                  content: icon ? icon + displayName : displayName,
                  nodeType: nodeType,
                  callback: () => {
                    const node = LiteGraph.createNode(nodeType);
                    if (node) {
                      node.pos = [clickPosition[0], clickPosition[1]];
                      self.graph.add(node);
                    }
                  }
                };
              }).sort((a, b) => {
                const aText = a.content.replace(/<[^>]*>/g, '');
                const bText = b.content.replace(/<[^>]*>/g, '');
                return aText.localeCompare(bText);
              });
              
              const subcatIcon = self.getIconForItem(subcatName);
              subcatMenus.push({
                content: subcatIcon ? subcatIcon + subcatName : subcatName,
                has_submenu: true,
                callback: null,
                submenu: {
                  options: sortedOptions
                }
              });
            }
          });
          
          if (subcatMenus.length > 0) {
            const categoryIcon = self.getIconForItem(categoryName);
            nodeSubmenu.push({
              content: categoryIcon ? categoryIcon + categoryName : categoryName,
              has_submenu: true,
              callback: null,
              submenu: {
                options: subcatMenus
              }
            });
          }
        }
      });
      
      // Add all node categories directly to root menu
      nodeSubmenu.forEach(item => {
        options.push(item);
      });
      
      // Add AI Group option
      const groupIcon = self.getIconForItem('AI Group');
      options.push({
        content: groupIcon ? groupIcon + 'AI Group' : 'AI Group',
        callback: () => {
          const group = new LiteGraph.LGraphGroup();
          group.pos = [clickPosition[0], clickPosition[1]];
          self.graph.add(group);
        }
      });
      
      return options;
    };
  }

  // Get all registered nodes for a specific category
  getNodesForCategory(categoryName) {
    const nodes = [];
    
    // Special handling for AI Tools subcategories
    if (['Text', 'Image', 'Video', '3D'].includes(categoryName)) {
      const prefix = 'ai-tools/' + categoryName.toLowerCase() + '/';
      for (let nodeType in LiteGraph.registered_node_types) {
        if (nodeType.startsWith(prefix)) {
          nodes.push(nodeType);
        }
      }
    } else if (categoryName === 'AI Tools') {
      for (let nodeType in LiteGraph.registered_node_types) {
        if (nodeType.startsWith('ai-tools/')) {
          nodes.push(nodeType);
        }
      }
    } else {
      for (let nodeType in LiteGraph.registered_node_types) {
        if (nodeType.startsWith(categoryName.toLowerCase() + '/')) {
          nodes.push(nodeType);
        }
      }
    }
    
    return nodes.sort();
  }
  
  // Get providers from registered model nodes
  getProviders() {
    const providers = new Set();
    for (let nodeType in LiteGraph.registered_node_types) {
      if (nodeType.startsWith('ai-providers/')) {
        // Extract provider from node type (e.g., ai-providers/text-to-image/flux_schnell_wavespeed -> wavespeed)
        const parts = nodeType.split('_');
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'wavespeed' || lastPart === 'fal') {
          providers.add(lastPart);
        }
      }
    }
    return Array.from(providers).sort();
  }
  
  // Get model categories for a specific provider
  getModelCategoriesForProvider(provider) {
    const categories = new Set();
    for (let nodeType in LiteGraph.registered_node_types) {
      if (nodeType.startsWith('ai-providers/') && nodeType.endsWith('_' + provider)) {
        const parts = nodeType.split('/');
        if (parts.length >= 2) {
          categories.add(parts[1]); // e.g., "text-to-image"
        }
      }
    }
    return Array.from(categories).sort();
  }
  
  // Get model categories (e.g., text-to-image, image-to-image)
  getModelCategories() {
    const categories = new Set();
    for (let nodeType in LiteGraph.registered_node_types) {
      if (nodeType.startsWith('ai-providers/')) {
        const parts = nodeType.split('/');
        if (parts.length >= 2) {
          categories.add(parts[1]); // e.g., "text-to-image"
        }
      }
    }
    return Array.from(categories).sort();
  }
  
  // Get models for a specific category and provider
  getModelsForCategoryAndProvider(category, provider) {
    const models = [];
    for (let nodeType in LiteGraph.registered_node_types) {
      if (nodeType.startsWith(`ai-providers/${category}/`) && nodeType.endsWith('_' + provider)) {
        models.push(nodeType);
      }
    }
    return models.sort();
  }
  
  // Get providers for a specific category
  getProvidersForCategory(category) {
    const providers = new Set();
    for (let nodeType in LiteGraph.registered_node_types) {
      if (nodeType.startsWith(`ai-providers/${category}/`)) {
        const parts = nodeType.split('_');
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'wavespeed' || lastPart === 'fal') {
          providers.add(lastPart);
        }
      }
    }
    return Array.from(providers).sort();
  }

  // Get icon for a category or node type (using centralized IconConfig)
  getIconForItem(itemName, itemType = 'category', wrapped = true) {
    return IconConfig.getIcon(itemName, itemType, wrapped);
  }
  
  // Get the parent category icon for inheritance
  getParentCategoryIcon(categoryName, wrapped = true) {
    return IconConfig.getIcon(categoryName, 'category', wrapped);
  }

  // Extract provider from node type
  getProviderFromNodeType(nodeType) {
    if (nodeType.startsWith('ai-providers/')) {
      const parts = nodeType.split('_');
      const lastPart = parts[parts.length - 1];
      if (lastPart === 'wavespeed' || lastPart === 'fal') {
        return lastPart;
      }
    }
    return null;
  }

  // Get display name for a node type
  getNodeDisplayName(nodeType, includeProviderIcon = false) {
    let displayName = '';
    let providerIcon = '';
    
    // Special cases for custom menu names
    if (nodeType === 'ai-tools/text/prompt') {
      return 'Prompt Input';
    }
    if (nodeType === 'ai-tools/3d/model_3d_preview') {
      return '3D Preview';
    }
    if (nodeType === 'ai-tools/3d/upload_3d_model') {
      return '3D Upload';
    }
    if (nodeType === 'ai-tools/image/upload_image') {
      return 'Image Upload';
    }
    if (nodeType === 'ai-tools/video/upload_video') {
      return 'Video Upload';
    }
    if (nodeType === 'ai-tools/text/json_data') {
      return 'JSON Data';
    }
    
    // For AI provider nodes, extract model name without provider suffix
    if (nodeType.startsWith('ai-providers/')) {
      const provider = this.getProviderFromNodeType(nodeType);
      const parts = nodeType.split('/');
      const fullName = parts[parts.length - 1];
      
      // Remove provider suffix from the name
      let modelName = fullName;
      if (provider) {
        modelName = fullName.replace('_' + provider, '');
      }
      
      // Convert snake_case to Title Case
      displayName = modelName
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Add provider icon if requested (at the beginning, after category icon)
      if (includeProviderIcon && provider) {
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        const icon = this.getIconForItem(providerName);
        if (icon) {
          providerIcon = icon;
        }
      }
      
      return providerIcon + displayName;
    }
    
    const parts = nodeType.split('/');
    const name = parts[parts.length - 1];
    // Convert snake_case or camelCase to Title Case
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Register a custom node type to a category
  registerNodeToCategory(nodeType, categoryName, subcategoryName = null) {
    if (subcategoryName) {
      this.addSubcategory(categoryName, subcategoryName);
    } else {
      if (!this.categories.has(categoryName)) {
        this.addCategory(categoryName, []);
      }
    }
  }
}

// Export for use in main.js
window.NodeMenu = NodeMenu;
