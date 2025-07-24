import { ExchangeConfig, ExchangeStatus } from './base'

// 交易所配置管理器
export class ExchangeConfigManager {
  private static instance: ExchangeConfigManager
  private configs: Map<string, ExchangeConfig> = new Map()
  
  private constructor() {
    this.loadConfigsFromEnv()
  }
  
  static getInstance(): ExchangeConfigManager {
    if (!ExchangeConfigManager.instance) {
      ExchangeConfigManager.instance = new ExchangeConfigManager()
    }
    return ExchangeConfigManager.instance
  }
  
  // 从环境变量加载配置
  private loadConfigsFromEnv(): void {
    // Binance配置
    if (process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET) {
      this.configs.set('binance', {
        name: 'Binance',
        apiKey: process.env.BINANCE_API_KEY,
        secretKey: process.env.BINANCE_API_SECRET,
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    } else {
      // Binance 支持无密钥访问公开数据
      this.configs.set('binance', {
        name: 'Binance',
        apiKey: '',
        secretKey: '',
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    }
    
    // OKX配置
    if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
      this.configs.set('okx', {
        name: 'OKX',
        apiKey: process.env.OKX_API_KEY,
        secretKey: process.env.OKX_SECRET_KEY,
        passphrase: process.env.OKX_PASSPHRASE,
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    } else {
      // OKX 支持无密钥访问公开数据
      this.configs.set('okx', {
        name: 'OKX',
        apiKey: '',
        secretKey: '',
        passphrase: '',
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    }
    
    // Bitget配置
    if (process.env.BITGET_API_KEY && process.env.BITGET_SECRET_KEY && process.env.BITGET_PASSPHRASE) {
      this.configs.set('bitget', {
        name: 'Bitget',
        apiKey: process.env.BITGET_API_KEY,
        secretKey: process.env.BITGET_SECRET_KEY,
        passphrase: process.env.BITGET_PASSPHRASE,
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    } else {
      // Bitget 支持无密钥访问公开数据
      this.configs.set('bitget', {
        name: 'Bitget',
        apiKey: '',
        secretKey: '',
        passphrase: '',
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    }
    
    // Gate.io配置
    if (process.env.GATE_API_KEY && process.env.GATE_SECRET_KEY) {
      this.configs.set('gate', {
        name: 'Gate.io',
        apiKey: process.env.GATE_API_KEY,
        secretKey: process.env.GATE_SECRET_KEY,
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    } else {
      // Gate.io 支持无密钥访问公开数据
      this.configs.set('gate', {
        name: 'Gate.io',
        apiKey: '',
        secretKey: '',
        sandbox: process.env.NODE_ENV === 'development',
        isActive: true
      })
    }
    
    console.log(`📊 加载了 ${this.configs.size} 个交易所配置`)
  }
  
  // 获取所有配置
  getAllConfigs(): Map<string, ExchangeConfig> {
    return new Map(this.configs)
  }
  
  // 获取指定交易所配置
  getConfig(exchangeName: string): ExchangeConfig | undefined {
    return this.configs.get(exchangeName.toLowerCase())
  }
  
  // 添加或更新配置
  setConfig(exchangeName: string, config: ExchangeConfig): void {
    this.configs.set(exchangeName.toLowerCase(), config)
  }
  
  // 移除配置
  removeConfig(exchangeName: string): boolean {
    return this.configs.delete(exchangeName.toLowerCase())
  }
  
  // 获取活跃的交易所列表
  getActiveExchanges(): string[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => config.isActive)
      .map(([name, _]) => name)
  }
  
  // 检查交易所是否配置
  isConfigured(exchangeName: string): boolean {
    return this.configs.has(exchangeName.toLowerCase())
  }
  
  // 检查交易所是否活跃
  isActive(exchangeName: string): boolean {
    const config = this.getConfig(exchangeName)
    return config?.isActive || false
  }
  
  // 获取配置摘要
  getConfigSummary(): Array<{name: string, isActive: boolean, hasConfig: boolean}> {
    const exchanges = ['binance', 'okx', 'bitget', 'gate']
    return exchanges.map(name => ({
      name,
      isActive: this.isActive(name),
      hasConfig: this.isConfigured(name)
    }))
  }
  
  // 验证配置完整性
  validateConfig(exchangeName: string): {valid: boolean, errors: string[]} {
    const config = this.getConfig(exchangeName)
    const errors: string[] = []
    
    if (!config) {
      errors.push('配置不存在')
      return { valid: false, errors }
    }
    
    if (!config.apiKey) {
      errors.push('API Key 缺失')
    }
    
    if (!config.secretKey) {
      errors.push('Secret Key 缺失')
    }
    
    // OKX需要passphrase
    if (exchangeName.toLowerCase() === 'okx' && !config.passphrase) {
      errors.push('Passphrase 缺失 (OKX必需)')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // 获取环境变量配置模板
  static getEnvTemplate(): string {
    return `# 交易所API配置

# Binance配置
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# OKX配置
OKX_API_KEY=your_okx_api_key
OKX_SECRET_KEY=your_okx_secret_key
OKX_PASSPHRASE=your_okx_passphrase

# Bybit配置
BYBIT_API_KEY=your_bybit_api_key
BYBIT_SECRET_KEY=your_bybit_secret_key

# Gate.io配置
GATE_API_KEY=your_gate_api_key
GATE_SECRET_KEY=your_gate_secret_key`
  }
} 