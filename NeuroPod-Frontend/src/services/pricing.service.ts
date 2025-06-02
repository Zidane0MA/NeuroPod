import api from "./api";

export interface PricingGpu {
  id: string;
  name: string;
  price: number;
  available: boolean;
  specs: {
    memory: string;
    cores: number;
    performance: string;
  };
}

export interface PricingStorage {
  containerDisk: {
    price: number;
    unit: string;
    description: string;
  };
  volumeDisk: {
    price: number;
    unit: string;
    description: string;
  };
}

export interface PricingLimits {
  containerDiskMax: number;
  volumeDiskMax: number;
  portsMax: number;
}

export interface FreeTier {
  enabled: boolean;
  initialBalance: number;
}

export interface PricingData {
  gpus: Record<string, PricingGpu>;
  storage: PricingStorage;
  limits: PricingLimits;
  freeTier: FreeTier;
}

export interface CostBreakdown {
  gpu: {
    name: string;
    hourlyRate: number;
    cost: number;
    hours: number;
  };
  containerDisk: {
    size: number;
    hourlyRate: number;
    cost: number;
    hours: number;
  };
  volumeDisk: {
    size: number;
    hourlyRate: number;
    cost: number;
    hours: number;
  };
  total: number;
  totalHourly: number;
  currency: string;
}

export interface UpdatePricingParams {
  gpus?: Record<string, Partial<PricingGpu>>;
  storage?: Partial<PricingStorage>;
  limits?: Partial<PricingLimits>;
  freeTier?: Partial<FreeTier>;
}

export const pricingService = {
  /**
   * Obtener configuración actual de precios
   */
  async getPricing(): Promise<PricingData> {
    try {
      const response = await api.get("/api/pricing");
      return response.data.data;
    } catch (error) {
      console.error("Error fetching pricing:", error);
      throw error;
    }
  },

  /**
   * Actualizar configuración de precios (solo administradores)
   */
  async updatePricing(updates: UpdatePricingParams): Promise<PricingData> {
    try {
      const response = await api.put("/api/pricing", updates);
      return response.data.data;
    } catch (error) {
      console.error("Error updating pricing:", error);
      throw error;
    }
  },

  /**
   * Calcular costo estimado de configuración
   */
  async calculateCost(config: {
    gpu: string;
    containerDiskSize: number;
    volumeDiskSize: number;
    hours?: number;
  }): Promise<CostBreakdown> {
    try {
      const response = await api.post("/api/pricing/calculate-cost", config);
      return response.data.data;
    } catch (error) {
      console.error("Error calculating cost:", error);
      throw error;
    }
  },

  /**
   * Obtener información de GPU específica
   */
  async getGpuInfo(gpuId: string): Promise<PricingGpu> {
    try {
      const response = await api.get(`/api/pricing/gpus/${gpuId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching GPU info:", error);
      throw error;
    }
  },

  /**
   * Obtener lista de GPUs disponibles
   */
  async getAvailableGpus(): Promise<PricingGpu[]> {
    try {
      const response = await api.get("/api/pricing/gpus/available");
      return response.data.data;
    } catch (error) {
      console.error("Error fetching available GPUs:", error);
      throw error;
    }
  },

  /**
   * Resetear precios a valores por defecto (solo administradores)
   */
  async resetPricing(): Promise<PricingData> {
    try {
      const response = await api.post("/api/pricing/reset");
      return response.data.data;
    } catch (error) {
      console.error("Error resetting pricing:", error);
      throw error;
    }
  },

  /**
   * Obtener precios formateados para display
   */
  formatPrice(price: number, currency: string = "€"): string {
    return `${price.toFixed(2)} ${currency}`;
  },

  /**
   * Convertir datos de precios a formato para PricingCards
   */
  convertToPricingCards(pricingData: PricingData) {
    return Object.keys(pricingData.gpus).map(gpuId => {
      const gpu = pricingData.gpus[gpuId];
      return {
        id: gpuId,
        name: gpu.name,
        price: this.formatPrice(gpu.price),
        priceUnit: "por hora",
        available: gpu.available,
        specs: gpu.specs
      };
    });
  },

  /**
   * Convertir datos de precios a formato para páginas de deploy
   */
  convertToGpuOptions(pricingData: PricingData) {
    return Object.keys(pricingData.gpus).map(gpuId => {
      const gpu = pricingData.gpus[gpuId];
      return {
        id: gpuId,
        name: gpu.name,
        available: gpu.available,
        price: gpu.price,
        vram: gpu.specs.memory,
        cores: gpu.specs.cores,
        image: `gpu-${gpuId.replace('rtx-', '')}.jpg`
      };
    });
  }
};
