// ==================== PROVIDER CONFIGURATION ====================
// Centralized configuration for API providers
// Edit this file to switch providers or add new ones

const API_PROVIDERS = {
  // Current active provider
  CURRENT: 'WAVESPEED',
  
  // Provider configurations
  WAVESPEED: {
    name: 'Wavespeed AI',
    baseUrl: 'https://api.wavespeed.ai/api/v3',
    endpoints: {
      fluxSchnell: '/wavespeed-ai/flux-schnell',
      imageUpscaler: '/wavespeed-ai/image-upscaler',
      midjourneyVideo: '/midjourney/image-to-video',
      qwenImageEdit: '/wavespeed-ai/qwen-image/edit'
    },
    // API key retrieval function
    getApiKey: () => window.getWavespeedApiKey(),
    // Authorization header format
    getAuthHeader: (apiKey) => `Bearer ${apiKey}`,
    // Provider-specific adapters
    buildRequestBody: (modelType, params) => {
      // Add Wavespeed-specific parameters
      if (modelType === 'fluxSchnell') {
        return {
          ...params,
          strength: params.strength !== undefined ? params.strength : 0.8,
          enable_sync_mode: params.enable_sync_mode !== undefined ? params.enable_sync_mode : false,
          enable_base64_output: params.enable_base64_output !== undefined ? params.enable_base64_output : false
        };
      }
      return params;
    },
    parseResponse: (modelType, data) => {
      if (data.code === 200 && data.data) {
        return {
          request_id: data.data.id,
          status_url: data.data.urls.get,
          response_url: data.data.urls.get
        };
      }
      throw new Error('Invalid response from API');
    },
    parseStatus: (data) => {
      if (data.code === 200 && data.data) {
        return {
          status: data.data.status,
          outputs: data.data.outputs || [],
          executionTime: data.data.executionTime || 0
        };
      }
      throw new Error('Invalid status response');
    }
  },

  FAL: {
    name: 'Fal AI',
    baseUrl: 'https://queue.fal.run',
    endpoints: {
      fluxSchnell: '/fal-ai/flux-1/schnell',
      imageUpscaler: '/fal-ai/clarity-upscaler',
      midjourneyVideo: '/fal-ai/minimax/video-01',
      qwenImageEdit: '/fal-ai/flux-1/schnell'
    },
    getApiKey: () => window.getFalApiKey(),
    getAuthHeader: (apiKey) => `Key ${apiKey}`,
    // Provider-specific adapters
    buildRequestBody: (modelType, params) => {
      // Adapter for FAL's different request format
      if (modelType === 'fluxSchnell') {
        const body = {
          prompt: params.prompt,
          num_images: params.num_images || 1,
          output_format: params.output_format || 'jpeg',
          num_inference_steps: params.num_inference_steps || 4,
          guidance_scale: params.guidance_scale || 3.5
        };
        
        // Handle image_size parameter
        if (params.image_size) {
          body.image_size = params.image_size;
        }
        
        // Handle acceleration parameter
        if (params.acceleration) {
          body.acceleration = params.acceleration;
        }
        
        // Handle safety checker
        if (params.enable_safety_checker !== undefined) {
          body.enable_safety_checker = params.enable_safety_checker;
        }
        
        if (params.seed && params.seed !== -1 && params.seed !== null) {
          body.seed = params.seed;
        }
        
        return body;
      }
      return params;
    },
    parseResponse: (modelType, data) => {
      // Adapter for FAL's different response format
      if (modelType === 'fluxSchnell') {
        return {
          request_id: data.request_id,
          status_url: data.status_url,
          response_url: data.response_url
        };
      }
      return data;
    },
    parseStatus: (data) => {
      // For FAL, when status is not COMPLETED, we get a QueueStatus response
      // When COMPLETED, we need to fetch the actual result from response_url
      const statusMap = {
        'IN_QUEUE': 'processing',
        'IN_PROGRESS': 'processing',
        'COMPLETED': 'completed'
      };
      
      // If this is the final result (has images array)
      if (data.images) {
        return {
          status: 'completed',
          outputs: data.images.map(img => img.url),
          seed: data.seed,
          executionTime: data.timings?.inference || 0
        };
      }
      
      // If this is a queue status response
      return {
        status: statusMap[data.status] || data.status?.toLowerCase() || 'processing',
        outputs: [],
        seed: null,
        executionTime: 0,
        response_url: data.response_url // Keep this for fetching final result
      };
    }
  }
};

// Helper function to get current provider configuration
function getCurrentProvider() {
  return API_PROVIDERS[API_PROVIDERS.CURRENT];
}

// Helper function to get provider by name
function getProviderByName(providerName) {
  return API_PROVIDERS[providerName] || getCurrentProvider();
}

// Helper function to get list of available providers
function getAvailableProviders() {
  return Object.keys(API_PROVIDERS).filter(key => key !== 'CURRENT');
}

// Helper function to build full endpoint URL
function getEndpointUrl(endpointKey, providerName = null) {
  const provider = providerName ? getProviderByName(providerName) : getCurrentProvider();
  return provider.baseUrl + provider.endpoints[endpointKey];
}

// Helper function to get API key for current provider
function getProviderApiKey(providerName = null) {
  const provider = providerName ? getProviderByName(providerName) : getCurrentProvider();
  return provider.getApiKey();
}

// Helper function to get authorization header
function getAuthorizationHeader(providerName = null) {
  const provider = providerName ? getProviderByName(providerName) : getCurrentProvider();
  const apiKey = providerName ? provider.getApiKey() : getProviderApiKey();
  return apiKey ? provider.getAuthHeader(apiKey) : null;
}
