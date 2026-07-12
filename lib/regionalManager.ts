/**
 * Military Pass - Regional Configuration
 * ======================================
 * Multi-region Modal worker configuration for intelligent routing:
 * 
 * ✅ Regional endpoint configuration
 * ✅ Intelligent routing logic
 * ✅ Health monitoring
 * ✅ Auto-scaling configuration
 * ✅ TypeScript with full type safety
 */

export interface RegionalConfig {
  region: string;
  endpoint: string;
  priority: number;
  health: boolean;
  latency: number;
  load: number;
}

export interface RoutingConfig {
  regions: RegionalConfig[];
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  enableAutoScaling: boolean;
  maxInstancesPerRegion: number;
}

export class RegionalManager {
  private config: RoutingConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private currentRegion: string | null = null;
  
  constructor(config: RoutingConfig) {
    this.config = {
      regions: config.regions,
      enableHealthChecks: config.enableHealthChecks !== false,
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      enableAutoScaling: config.enableAutoScaling || false,
      maxInstancesPerRegion: config.maxInstancesPerRegion || 4,
    };
  }
  
  /**
   * Get optimal region for request
   */
  async getOptimalRegion(): Promise<string> {
    // Check if health checks are enabled
    if (this.config.enableHealthChecks) {
      await this._performHealthChecks();
    }
    
    // Sort regions by priority and health
    const healthyRegions = this.config.regions
      .filter(r => r.health)
      .sort((a, b) => {
        // First by priority
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Then by latency
        return a.latency - b.latency;
      });
    
    if (healthyRegions.length === 0) {
      console.warn('[RegionalManager] No healthy regions available');
      return this.config.regions[0].region; // Fallback to first region
    }
    
    // Select best region
    const optimal = healthyRegions[0];
    this.currentRegion = optimal.region;
    
    console.log(`[RegionalManager] Selected region: ${optimal.region} (latency: ${optimal.latency}ms)`);
    
    return optimal.region;
  }
  
  /**
   * Get region configuration
   */
  getRegionConfig(region: string): RegionalConfig | undefined {
    return this.config.regions.find(r => r.region === region);
  }
  
  /**
   * Get all regions
   */
  getAllRegions(): RegionalConfig[] {
    return this.config.regions;
  }
  
  /**
   * Update region health
   */
  updateRegionHealth(region: string, health: boolean): void {
    const regionConfig = this.getRegionConfig(region);
    if (regionConfig) {
      regionConfig.health = health;
      console.log(`[RegionalManager] Updated ${region} health: ${health}`);
    }
  }
  
  /**
   * Update region latency
   */
  updateRegionLatency(region: string, latency: number): void {
    const regionConfig = this.getRegionConfig(region);
    if (regionConfig) {
      regionConfig.latency = latency;
    }
  }
  
  /**
   * Update region load
   */
  updateRegionLoad(region: string, load: number): void {
    const regionConfig = this.getRegionConfig(region);
    if (regionConfig) {
      regionConfig.load = load;
    }
  }
  
  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (!this.config.enableHealthChecks) {
      console.log('[RegionalManager] Health checks disabled');
      return;
    }
    
    this._stopHealthMonitoring();
    
    this.healthCheckTimer = setInterval(async () => {
      await this._performHealthChecks();
    }, this.config.healthCheckInterval);
    
    console.log('[RegionalManager] Health monitoring started');
  }
  
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    this._stopHealthMonitoring();
    console.log('[RegionalManager] Health monitoring stopped');
  }
  
  /**
   * Get regional statistics
   */
  getStats() {
    const healthyCount = this.config.regions.filter(r => r.health).length;
    const avgLatency = this.config.regions.reduce((sum, r) => sum + r.latency, 0) / this.config.regions.length;
    const avgLoad = this.config.regions.reduce((sum, r) => sum + r.load, 0) / this.config.regions.length;
    
    return {
      totalRegions: this.config.regions.length,
      healthyRegions: healthyCount,
      unhealthyRegions: this.config.regions.length - healthyCount,
      avgLatency,
      avgLoad,
      currentRegion: this.currentRegion,
    };
  }
  
  // Private methods
  
  private async _performHealthChecks(): Promise<void> {
    for (const region of this.config.regions) {
      try {
        const startTime = Date.now();
        
        // Perform health check
        const response = await fetch(`${region.endpoint}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        
        const latency = Date.now() - startTime;
        
        this.updateRegionHealth(region.region, response.ok);
        this.updateRegionLatency(region.region, latency);
        
      } catch (error) {
        console.error(`[RegionalManager] Health check failed for ${region.region}:`, error);
        this.updateRegionHealth(region.region, false);
      }
    }
  }
  
  private _stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}

/**
 * Default regional configuration
 */
export function getDefaultRegionalConfig(): RoutingConfig {
  return {
    regions: [
      {
        region: 'us-east-1',
        endpoint: process.env.MODAL_FACE_SWAP_URL_US_EAST || '',
        priority: 1,
        health: true,
        latency: 10,
        load: 0.5,
      },
      {
        region: 'us-west-2',
        endpoint: process.env.MODAL_FACE_SWAP_URL_US_WEST || '',
        priority: 2,
        health: true,
        latency: 15,
        load: 0.3,
      },
      {
        region: 'eu-west-1',
        endpoint: process.env.MODAL_FACE_SWAP_URL_EU_WEST || '',
        priority: 3,
        health: true,
        latency: 20,
        load: 0.4,
      },
      {
        region: 'ap-southeast-1',
        endpoint: process.env.MODAL_FACE_SWAP_URL_AP_SOUTHEAST || '',
        priority: 4,
        health: true,
        latency: 25,
        load: 0.3,
      },
      {
        region: 'sa-east-1',
        endpoint: process.env.MODAL_FACE_SWAP_URL_SA_EAST || '',
        priority: 5,
        health: true,
        latency: 30,
        load: 0.2,
      },
    ],
    enableHealthChecks: true,
    healthCheckInterval: 30000,
    enableAutoScaling: true,
    maxInstancesPerRegion: 4,
  };
}

// Singleton instance
let globalRegionalManager: RegionalManager | null = null;

export function getRegionalManager(): RegionalManager {
  if (!globalRegionalManager) {
    globalRegionalManager = new RegionalManager(getDefaultRegionalConfig());
    globalRegionalManager.startHealthMonitoring();
  }
  return globalRegionalManager;
}