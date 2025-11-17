// Centralized Icon Configuration
// All icons for categories, nodes, and providers in one place

const IconConfig = {
  // Main categories
  categories: {
    'AI Tools': '⚪',
    'AI Models': '🟡',
    'AI Group': ''
  },
  
  // AI Tools subcategories
  subcategories: {
    'Text': '',
    'Image': '',
    'Video': '',
    '3D': ''
  },
  
  // Providers
  providers: {
    'Fal': '',
    'Wavespeed': ''
  },
  
  // Model categories (Text to Image, Image to Image, etc.)
  modelCategories: {
    'Text To Image': '',
    'Text To Video': '',
    'Image To Image': '',
    'Image To Video': '', 
    'Image Upscaler': '',
    'Image Edit': ''
  },
  
  // Custom sizes for specific icons (optional)
  iconSizes: {
    '߷': 'small',
    '𝐓': 'small',
    '⛶': 'small',
    '▷': 'small',
    '⬡': 'small',
    '⚡': 'small',
    '🚀': 'small'
  },
  
  // Wrap emoji with span for styling
  wrapIcon(emoji, customSize = null) {
    if (!emoji) return '';
    
    // Get size from iconSizes map or use custom size
    const size = customSize || this.iconSizes[emoji] || '';
    const sizeClass = size ? ` ${size}` : '';
    
    return `<span class="emoji-icon${sizeClass}">${emoji}</span>`;
  },
  
  // Get icon for any item
  getIcon(itemName, itemType = 'category', wrapped = false) {
    let emoji = null;
    
    // Check main categories
    if (this.categories[itemName]) {
      emoji = this.categories[itemName];
    }
    // Check subcategories
    else if (this.subcategories[itemName]) {
      emoji = this.subcategories[itemName];
    }
    // Check providers
    else if (this.providers[itemName]) {
      emoji = this.providers[itemName];
    }
    // Check model categories
    else if (this.modelCategories[itemName]) {
      emoji = this.modelCategories[itemName];
    }
    
    if (!emoji) return null;
    
    return wrapped ? this.wrapIcon(emoji) : emoji;
  },
  
  // Get parent category icon for inheritance
  getParentCategoryIcon(categoryName) {
    return this.getIcon(categoryName);
  },
  
  // Get node title with icons
  getNodeTitle(baseName, categoryIcon, providerIcon = null) {
    let title = '';
    
    if (categoryIcon) {
      title += categoryIcon;
    }
    
    if (providerIcon) {
      title += providerIcon + ' ';
    } else if (categoryIcon) {
      title += ' ';
    }
    
    title += baseName;
    
    return title;
  },
  
  // Generate title for AI Tools nodes (e.g., "Image Preview" -> "⚪ Image Preview")
  getAIToolsNodeTitle(nodeName, subcategory) {
    const mainIcon = this.categories['AI Tools'] || '';
    const subIcon = this.subcategories[subcategory] || '';
    let title = '';
    
    if (mainIcon) title += mainIcon;
    if (subIcon) title += subIcon;
    if (title) title += ' ';
    
    return title + nodeName;
  },
  
  // Generate title for AI Model nodes (e.g., "Flux Schnell" -> "🟡 Flux Schnell")
  getModelNodeTitle(modelName, modelCategory, provider) {
    const mainIcon = this.categories['AI Models'] || '';
    const subCategoryIcon = this.modelCategories[modelCategory] || '';
    const providerIcon = this.providers[provider] || '';
    let title = '';
    
    if (mainIcon) title += mainIcon;
    if (subCategoryIcon) title += subCategoryIcon;
    if (providerIcon) title += providerIcon;
    if (title) title += ' ';
    
    return title + modelName;
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IconConfig;
} else {
  window.IconConfig = IconConfig;
}
