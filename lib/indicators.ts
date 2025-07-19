// 技术指标计算工具

export interface PriceData {
  price: number;
  volume?: number;
  timestamp: string;
}

// EMA (指数移动平均线) 计算
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // 第一个EMA值使用前period个价格的简单平均值
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;
  
  // 计算后续的EMA值
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

// RSI (相对强弱指数) 计算
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // 计算价格变化
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // 计算第一个平均增益和损失
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
  
  // 计算第一个RSI
  rsi[period] = 100 - (100 / (1 + avgGain / avgLoss));
  
  // 计算后续的RSI值
  for (let i = period + 1; i < prices.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;
    rsi[i] = 100 - (100 / (1 + avgGain / avgLoss));
  }
  
  return rsi;
}

// OBV (能量潮指标) 计算
export function calculateOBV(prices: number[], volumes: number[]): number[] {
  const obv: number[] = [volumes[0]]; // 第一个OBV值等于第一个成交量
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      // 价格上涨，OBV增加
      obv[i] = obv[i - 1] + volumes[i];
    } else if (prices[i] < prices[i - 1]) {
      // 价格下跌，OBV减少
      obv[i] = obv[i - 1] - volumes[i];
    } else {
      // 价格不变，OBV保持不变
      obv[i] = obv[i - 1];
    }
  }
  
  return obv;
}

// MACD 计算
export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): { macd: number[], signal: number[], histogram: number[] } {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  
  // 计算MACD线
  const macd: number[] = [];
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    const fastIndex = i - (slowPeriod - fastPeriod);
    if (fastIndex >= 0) {
      macd.push(emaFast[fastIndex] - emaSlow[i]);
    }
  }
  
  // 计算信号线
  const signal = calculateEMA(macd, signalPeriod);
  
  // 计算柱状图
  const histogram: number[] = [];
  for (let i = 0; i < macd.length; i++) {
    if (i < signal.length) {
      histogram.push(macd[i] - signal[i]);
    }
  }
  
  return { macd, signal, histogram };
}

// 趋势分析函数
export function analyzeTrend(prices: number[], period: number = 20): {
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  strength: number;
  momentum: number;
} {
  if (prices.length < period) {
    return { trend: 'SIDEWAYS', strength: 0, momentum: 0 };
  }
  
  const recentPrices = prices.slice(-period);
  const firstPrice = recentPrices[0];
  const lastPrice = recentPrices[recentPrices.length - 1];
  
  // 计算趋势强度
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  const strength = Math.abs(priceChange);
  
  // 计算动量（价格变化率）
  const momentum = priceChange / period;
  
  // 判断趋势方向
  let trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  if (priceChange > 2) trend = 'UP';
  else if (priceChange < -2) trend = 'DOWN';
  else trend = 'SIDEWAYS';
  
  return { trend, strength, momentum };
}

// 波动率计算
export function calculateVolatility(prices: number[], period: number = 20): number {
  if (prices.length < period) return 0;
  
  const recentPrices = prices.slice(-period);
  const returns = [];
  
  for (let i = 1; i < recentPrices.length; i++) {
    returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
  }
  
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * 100; // 转换为百分比
}

// 支撑阻力位计算
export function calculateSupportResistance(prices: number[], period: number = 20): {
  support: number;
  resistance: number;
  currentLevel: 'NEAR_SUPPORT' | 'NEAR_RESISTANCE' | 'MIDDLE';
} {
  if (prices.length < period) {
    return { support: 0, resistance: 0, currentLevel: 'MIDDLE' };
  }
  
  const recentPrices = prices.slice(-period);
  const min = Math.min(...recentPrices);
  const max = Math.max(...recentPrices);
  const current = recentPrices[recentPrices.length - 1];
  
  const range = max - min;
  const support = min + range * 0.1;
  const resistance = max - range * 0.1;
  
  let currentLevel: 'NEAR_SUPPORT' | 'NEAR_RESISTANCE' | 'MIDDLE';
  const supportDistance = (current - support) / range;
  const resistanceDistance = (resistance - current) / range;
  
  if (supportDistance < 0.1) currentLevel = 'NEAR_SUPPORT';
  else if (resistanceDistance < 0.1) currentLevel = 'NEAR_RESISTANCE';
  else currentLevel = 'MIDDLE';
  
  return { support, resistance, currentLevel };
}

// 增强的策略评分计算
export function calculateStrategyScore(
  currentPrice: number,
  ema89: number,
  obv: number,
  obvPrev: number,
  rsi: number,
  macd: number,
  macdSignal: number,
  prices: number[] = [],
  volumes: number[] = [],
  customSupport: number = 0,
  customResistance: number = 0
): {
  emaScore: number;
  obvScore: number;
  rsiScore: number;
  macdScore: number;
  totalScore: number;
  recommendation: string;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  riskFactors: string[];
  trend: string;
  support: number;
  resistance: number;
  volatility: number;
  detailedAnalysis: {
    emaAnalysis: string;
    obvAnalysis: string;
    rsiAnalysis: string;
    macdAnalysis: string;
    trendAnalysis: string;
    riskAnalysis: string;
  };
} {
  // EMA评分 (0-100) - 更精细的评分
  const emaDiff = ((currentPrice - ema89) / ema89) * 100;
  let emaScore = 50;
  let emaAnalysis = '';
  
  if (emaDiff > 8) {
    emaScore = 15;
    emaAnalysis = '价格严重偏离EMA89，存在回调风险';
  } else if (emaDiff > 5) {
    emaScore = 25;
    emaAnalysis = '价格高于EMA89，可能处于超买状态';
  } else if (emaDiff > 2) {
    emaScore = 40;
    emaAnalysis = '价格略高于EMA89，需谨慎';
  } else if (emaDiff > -2) {
    emaScore = 50;
    emaAnalysis = '价格接近EMA89，处于平衡状态';
  } else if (emaDiff > -5) {
    emaScore = 60;
    emaAnalysis = '价格略低于EMA89，可能存在机会';
  } else if (emaDiff > -8) {
    emaScore = 75;
    emaAnalysis = '价格低于EMA89，可能存在买入机会';
  } else {
    emaScore = 85;
    emaAnalysis = '价格严重低于EMA89，可能存在超卖机会';
  }
  
  // OBV评分 (0-100) - 考虑成交量趋势
  const obvChange = obvPrev > 0 ? ((obv - obvPrev) / obvPrev) * 100 : 0;
  let obvScore = 50;
  let obvAnalysis = '';
  
  if (obvChange > 15) {
    obvScore = 85;
    obvAnalysis = 'OBV大幅上升，成交量支撑价格上涨';
  } else if (obvChange > 8) {
    obvScore = 70;
    obvAnalysis = 'OBV上升，成交量趋势良好';
  } else if (obvChange > 3) {
    obvScore = 60;
    obvAnalysis = 'OBV小幅上升，成交量略有增加';
  } else if (obvChange > -3) {
    obvScore = 50;
    obvAnalysis = 'OBV变化不大，成交量稳定';
  } else if (obvChange > -8) {
    obvScore = 40;
    obvAnalysis = 'OBV小幅下降，成交量略有减少';
  } else if (obvChange > -15) {
    obvScore = 30;
    obvAnalysis = 'OBV下降，成交量趋势不佳';
  } else {
    obvScore = 15;
    obvAnalysis = 'OBV大幅下降，成交量支撑不足';
  }
  
  // RSI评分 (0-100) - 考虑超买超卖和背离
  let rsiScore = 50;
  let rsiAnalysis = '';
  
  if (rsi > 80) {
    rsiScore = 10;
    rsiAnalysis = 'RSI严重超买，存在大幅回调风险';
  } else if (rsi > 70) {
    rsiScore = 25;
    rsiAnalysis = 'RSI超买，需注意回调风险';
  } else if (rsi > 60) {
    rsiScore = 40;
    rsiAnalysis = 'RSI偏高，需谨慎操作';
  } else if (rsi > 45) {
    rsiScore = 50;
    rsiAnalysis = 'RSI处于正常区间';
  } else if (rsi > 35) {
    rsiScore = 60;
    rsiAnalysis = 'RSI偏低，可能存在机会';
  } else if (rsi > 25) {
    rsiScore = 75;
    rsiAnalysis = 'RSI超卖，可能存在买入机会';
  } else {
    rsiScore = 90;
    rsiAnalysis = 'RSI严重超卖，可能存在大幅反弹机会';
  }
  
  // MACD评分 (0-100) - 考虑金叉死叉和背离
  const macdDiff = macd - macdSignal;
  let macdScore = 50;
  let macdAnalysis = '';
  
  if (macdDiff > 0.02) {
    macdScore = 85;
    macdAnalysis = 'MACD强势金叉，趋势向上';
  } else if (macdDiff > 0.01) {
    macdScore = 70;
    macdAnalysis = 'MACD金叉，趋势向好';
  } else if (macdDiff > 0) {
    macdScore = 60;
    macdAnalysis = 'MACD在信号线上方，偏多';
  } else if (macdDiff > -0.01) {
    macdScore = 50;
    macdAnalysis = 'MACD接近信号线，中性';
  } else if (macdDiff > -0.02) {
    macdScore = 40;
    macdAnalysis = 'MACD在信号线下方，偏空';
  } else {
    macdScore = 25;
    macdAnalysis = 'MACD死叉，趋势向下';
  }
  
  // 趋势分析
  const trendAnalysis = prices.length > 20 ? analyzeTrend(prices) : { trend: 'SIDEWAYS', strength: 0, momentum: 0 };
  const trend = trendAnalysis.trend;
  
  // 波动率分析
  const volatility = prices.length > 20 ? calculateVolatility(prices) : 0;
  
  // 支撑阻力位 - 优先使用自定义设置
  let supportResistance = prices.length > 20 ? calculateSupportResistance(prices) : { support: 0, resistance: 0, currentLevel: 'MIDDLE' };
  
  // 如果提供了自定义支撑阻力位，则使用自定义值
  if (customSupport > 0 && customResistance > 0 && customSupport < customResistance) {
    supportResistance = {
      support: customSupport,
      resistance: customResistance,
      currentLevel: 'MIDDLE' // 需要重新计算当前水平
    }
    
    // 重新计算当前价格相对于自定义支撑阻力位的位置
    const supportDistance = ((currentPrice - customSupport) / currentPrice) * 100
    const resistanceDistance = ((customResistance - currentPrice) / currentPrice) * 100
    
    if (supportDistance < 0.1) {
      supportResistance.currentLevel = 'NEAR_SUPPORT'
    } else if (resistanceDistance < 0.1) {
      supportResistance.currentLevel = 'NEAR_RESISTANCE'
    }
  }
  
  // 风险等级评估 - 增强版
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  let riskFactors: string[] = [];
  let riskScore = 0;
  
  // 1. 波动率风险 (权重: 30%)
  if (volatility > 8) {
    riskScore += 30;
    riskFactors.push(`波动率过高: ${volatility.toFixed(1)}%`);
  } else if (volatility > 5) {
    riskScore += 20;
    riskFactors.push(`波动率较高: ${volatility.toFixed(1)}%`);
  } else if (volatility > 3) {
    riskScore += 10;
    riskFactors.push(`波动率中等: ${volatility.toFixed(1)}%`);
  }
  
  // 2. EMA偏离度风险 (权重: 25%)
  if (Math.abs(emaDiff) > 12) {
    riskScore += 25;
    riskFactors.push(`EMA偏离严重: ${emaDiff.toFixed(1)}%`);
  } else if (Math.abs(emaDiff) > 8) {
    riskScore += 20;
    riskFactors.push(`EMA偏离较大: ${emaDiff.toFixed(1)}%`);
  } else if (Math.abs(emaDiff) > 5) {
    riskScore += 15;
    riskFactors.push(`EMA偏离中等: ${emaDiff.toFixed(1)}%`);
  }
  
  // 3. RSI超买超卖风险 (权重: 20%)
  if (rsi > 85) {
    riskScore += 20;
    riskFactors.push(`RSI严重超买: ${rsi.toFixed(1)}`);
  } else if (rsi > 75) {
    riskScore += 15;
    riskFactors.push(`RSI超买: ${rsi.toFixed(1)}`);
  } else if (rsi < 15) {
    riskScore += 20;
    riskFactors.push(`RSI严重超卖: ${rsi.toFixed(1)}`);
  } else if (rsi < 25) {
    riskScore += 15;
    riskFactors.push(`RSI超卖: ${rsi.toFixed(1)}`);
  }
  
  // 4. MACD背离风险 (权重: 15%)
  const macdHistogram = macd - macdSignal;
  const macdHistogramPrev = prices.length > 1 ? (macd - macdSignal) : 0; // 简化计算
  if (Math.abs(macdHistogram) > 0.03) {
    riskScore += 15;
    riskFactors.push(`MACD背离: ${macdHistogram.toFixed(4)}`);
  } else if (Math.abs(macdHistogram) > 0.02) {
    riskScore += 10;
    riskFactors.push(`MACD偏离: ${macdHistogram.toFixed(4)}`);
  }
  
  // 5. 支撑压力位风险 (权重: 20%)
  const supportDistance = supportResistance.support > 0 ? ((currentPrice - supportResistance.support) / currentPrice) * 100 : 0;
  const resistanceDistance = supportResistance.resistance > 0 ? ((supportResistance.resistance - currentPrice) / currentPrice) * 100 : 0;
  
  // 接近支撑位或阻力位的风险
  if (supportDistance < 2 && supportDistance > 0) {
    riskScore += 20;
    riskFactors.push(`接近支撑位: 距离${supportDistance.toFixed(1)}%`);
  } else if (supportDistance < 5 && supportDistance > 0) {
    riskScore += 15;
    riskFactors.push(`接近支撑位: 距离${supportDistance.toFixed(1)}%`);
  } else if (supportDistance < 10 && supportDistance > 0) {
    riskScore += 10;
    riskFactors.push(`接近支撑位: 距离${supportDistance.toFixed(1)}%`);
  } else if (resistanceDistance < 2 && resistanceDistance > 0) {
    riskScore += 20;
    riskFactors.push(`接近阻力位: 距离${resistanceDistance.toFixed(1)}%`);
  } else if (resistanceDistance < 5 && resistanceDistance > 0) {
    riskScore += 15;
    riskFactors.push(`接近阻力位: 距离${resistanceDistance.toFixed(1)}%`);
  } else if (resistanceDistance < 10 && resistanceDistance > 0) {
    riskScore += 10;
    riskFactors.push(`接近阻力位: 距离${resistanceDistance.toFixed(1)}%`);
  }
  
  // 突破支撑位或阻力位的风险
  if (currentPrice < supportResistance.support && supportResistance.support > 0) {
    riskScore += 25;
    riskFactors.push(`跌破支撑位: ${supportResistance.support.toFixed(2)}`);
  } else if (currentPrice > supportResistance.resistance && supportResistance.resistance > 0) {
    riskScore += 25;
    riskFactors.push(`突破阻力位: ${supportResistance.resistance.toFixed(2)}`);
  }
  
  // 根据风险评分确定风险等级
  if (riskScore >= 50) {
    riskLevel = 'HIGH';
  } else if (riskScore <= 25) {
    riskLevel = 'LOW';
  } else {
    riskLevel = 'MEDIUM';
  }
  
  // 综合评分（加权平均）
  const weights = { ema: 0.25, obv: 0.25, rsi: 0.25, macd: 0.25 };
  const totalScore = Math.round(
    emaScore * weights.ema +
    obvScore * weights.obv +
    rsiScore * weights.rsi +
    macdScore * weights.macd
  );
  
  // 置信度计算
  const confidence = Math.min(100, Math.max(0, 
    50 + 
    (trendAnalysis.strength * 2) + 
    (Math.abs(macdDiff) * 1000) + 
    (Math.abs(obvChange) / 2)
  ));
  
  // 建议生成
  let recommendation = 'HOLD';
  if (totalScore >= 75 && confidence > 60) {
    recommendation = 'STRONG_BUY';
  } else if (totalScore >= 65 && confidence > 50) {
    recommendation = 'BUY';
  } else if (totalScore <= 25 && confidence > 60) {
    recommendation = 'STRONG_SELL';
  } else if (totalScore <= 35 && confidence > 50) {
    recommendation = 'SELL';
  }
  
  // 趋势分析文本
  let trendAnalysisText = '';
  if (trend === 'UP') {
    trendAnalysisText = `上升趋势，强度${trendAnalysis.strength.toFixed(1)}%，动量${trendAnalysis.momentum.toFixed(3)}`;
  } else if (trend === 'DOWN') {
    trendAnalysisText = `下降趋势，强度${Math.abs(trendAnalysis.strength).toFixed(1)}%，动量${trendAnalysis.momentum.toFixed(3)}`;
  } else {
    trendAnalysisText = '横盘整理，趋势不明显';
  }
  
  // 风险分析
  let riskAnalysis = '';
  if (riskLevel === 'HIGH') {
    riskAnalysis = `高风险(评分:${riskScore})：${riskFactors.join(', ')}，建议谨慎操作，设置止损`;
  } else if (riskLevel === 'MEDIUM') {
    riskAnalysis = `中等风险(评分:${riskScore})：${riskFactors.length > 0 ? riskFactors.join(', ') : '风险因素较少'}，正常操作`;
  } else {
    riskAnalysis = `低风险(评分:${riskScore})：${riskFactors.length > 0 ? riskFactors.join(', ') : '风险因素较少'}，相对安全`;
  }
  
  return {
    emaScore: Math.round(emaScore),
    obvScore: Math.round(obvScore),
    rsiScore: Math.round(rsiScore),
    macdScore: Math.round(macdScore),
    totalScore,
    recommendation,
    confidence: Math.round(confidence),
    riskLevel,
    riskScore: Math.round(riskScore),
    riskFactors,
    trend,
    support: supportResistance.support,
    resistance: supportResistance.resistance,
    volatility: Math.round(volatility * 10) / 10,
    detailedAnalysis: {
      emaAnalysis,
      obvAnalysis,
      rsiAnalysis,
      macdAnalysis,
      trendAnalysis: trendAnalysisText,
      riskAnalysis
    }
  };
} 

// DCA网格交易策略计算
export interface DCAStrategyConfig {
  type: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  pricePosition: number; // 价格位置百分比
  maxOrders: number; // 最大加仓次数
  initialAmount: number; // 首单金额
  orderAmount: number; // DCA订单金额
  priceDeviation: number; // 价格偏差百分比
  takeProfit: number; // 限价止盈百分比
  stopLoss?: number; // 整体止损百分比（可选）
  amountMultiplier: number; // DCA金额乘数
  deviationMultiplier: number; // 价格偏差乘数
  totalInvestment: number; // 总投入
  description: string; // 策略描述
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// 计算价格位置
export function calculatePricePosition(
  currentPrice: number,
  historicalHigh: number,
  historicalLow: number
): number {
  if (historicalHigh <= historicalLow) {
    return 50; // 默认中间位置
  }
  
  const range = historicalHigh - historicalLow;
  const position = ((currentPrice - historicalLow) / range) * 100;
  return Math.max(0, Math.min(100, position));
}

// 根据价格位置确定DCA策略
export function getDCAStrategy(
  pricePosition: number,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
): DCAStrategyConfig {
  // 根据风险等级调整策略参数
  let baseConfig: DCAStrategyConfig;
  
  if (pricePosition >= 100 && pricePosition <= 130) {
    // 保守型策略 - 价格突破历史高点
    baseConfig = {
      type: 'CONSERVATIVE',
      pricePosition,
      maxOrders: 8,
      initialAmount: 60,
      orderAmount: 60,
      priceDeviation: 1.2,
      takeProfit: 0.8,
      stopLoss: 2.0,
      amountMultiplier: 1.6,
      deviationMultiplier: 1.2,
      totalInvestment: 600,
      description: '防范高位回调风险，采用高频小额交易，快速止盈锁定利润',
      riskLevel: 'HIGH'
    };
  } else if (pricePosition >= 70 && pricePosition < 100) {
    // 平衡型策略 - 价格接近历史高点
    baseConfig = {
      type: 'BALANCED',
      pricePosition,
      maxOrders: 6,
      initialAmount: 80,
      orderAmount: 80,
      priceDeviation: 1.5,
      takeProfit: 1.2,
      amountMultiplier: 1.5,
      deviationMultiplier: 1.2,
      totalInvestment: 800,
      description: '平衡收益与风险，采用中等频率交易，追求稳定收益',
      riskLevel: 'MEDIUM'
    };
  } else if (pricePosition >= 30 && pricePosition < 70) {
    // 激进型策略 - 价格在历史中间区间
    baseConfig = {
      type: 'AGGRESSIVE',
      pricePosition,
      maxOrders: 5,
      initialAmount: 100,
      orderAmount: 100,
      priceDeviation: 2.0,
      takeProfit: 1.5,
      amountMultiplier: 1.3,
      deviationMultiplier: 1.1,
      totalInvestment: 900,
      description: '追求大幅波动收益，采用低频大额交易，追求更大利润空间',
      riskLevel: 'LOW'
    };
  } else {
    // 默认平衡型策略
    baseConfig = {
      type: 'BALANCED',
      pricePosition,
      maxOrders: 6,
      initialAmount: 80,
      orderAmount: 80,
      priceDeviation: 1.5,
      takeProfit: 1.2,
      amountMultiplier: 1.5,
      deviationMultiplier: 1.2,
      totalInvestment: 800,
      description: '默认平衡策略，适用于大多数市场情况',
      riskLevel: 'MEDIUM'
    };
  }
  
  // 根据风险等级调整参数
  if (riskLevel === 'HIGH') {
    // 高风险时采用更保守的参数
    baseConfig.priceDeviation *= 1.2;
    baseConfig.takeProfit *= 0.8;
    if (baseConfig.stopLoss) {
      baseConfig.stopLoss *= 0.8;
    }
    baseConfig.amountMultiplier *= 0.9;
  } else if (riskLevel === 'LOW') {
    // 低风险时可以采用更激进的参数
    baseConfig.priceDeviation *= 0.9;
    baseConfig.takeProfit *= 1.1;
    baseConfig.amountMultiplier *= 1.1;
  }
  
  return baseConfig;
}

// 计算DCA订单详情
export function calculateDCAOrders(config: DCAStrategyConfig): {
  orderNumber: number;
  amount: number;
  priceDeviation: number;
  triggerPrice: number;
  takeProfitPrice: number;
}[] {
  const orders = [];
  let currentAmount = config.initialAmount;
  let currentDeviation = config.priceDeviation;
  
  for (let i = 0; i < config.maxOrders; i++) {
    orders.push({
      orderNumber: i + 1,
      amount: currentAmount,
      priceDeviation: currentDeviation,
      triggerPrice: 0, // 将在外部计算
      takeProfitPrice: 0 // 将在外部计算
    });
    
    // 更新下一单的参数
    currentAmount *= config.amountMultiplier;
    currentDeviation *= config.deviationMultiplier;
  }
  
  return orders;
}

// 增强的策略评分计算 - 集成DCA策略
export function calculateEnhancedStrategyScore(
  currentPrice: number,
  ema89: number,
  obv: number,
  obvPrev: number,
  rsi: number,
  macd: number,
  macdSignal: number,
  prices: number[] = [],
  volumes: number[] = [],
  customSupport: number = 0,
  customResistance: number = 0,
  historicalHigh: number = 0,
  historicalLow: number = 0
): {
  emaScore: number;
  obvScore: number;
  rsiScore: number;
  macdScore: number;
  totalScore: number;
  recommendation: string;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  riskFactors: string[];
  trend: string;
  support: number;
  resistance: number;
  volatility: number;
  dcaStrategy: DCAStrategyConfig;
  pricePosition: number;
  detailedAnalysis: {
    emaAnalysis: string;
    obvAnalysis: string;
    rsiAnalysis: string;
    macdAnalysis: string;
    trendAnalysis: string;
    riskAnalysis: string;
    dcaAnalysis: string;
  };
} {
  // 调用原有的策略评分计算
  const baseScore = calculateStrategyScore(
    currentPrice,
    ema89,
    obv,
    obvPrev,
    rsi,
    macd,
    macdSignal,
    prices,
    volumes,
    customSupport,
    customResistance
  );
  
  // 计算价格位置
  const pricePosition = calculatePricePosition(currentPrice, historicalHigh, historicalLow);
  
  // 获取DCA策略配置
  const dcaStrategy = getDCAStrategy(pricePosition, baseScore.riskLevel);
  
  // DCA策略分析
  let dcaAnalysis = '';
  if (dcaStrategy.type === 'CONSERVATIVE') {
    dcaAnalysis = `价格位置${pricePosition.toFixed(1)}%处于历史高位，采用保守型DCA策略。防范回调风险，建议高频小额交易，快速止盈锁定利润。`;
  } else if (dcaStrategy.type === 'BALANCED') {
    dcaAnalysis = `价格位置${pricePosition.toFixed(1)}%接近历史高点，采用平衡型DCA策略。平衡收益与风险，追求稳定收益。`;
  } else {
    dcaAnalysis = `价格位置${pricePosition.toFixed(1)}%在历史中间区间，采用激进型DCA策略。追求大幅波动收益，承担更多风险。`;
  }
  
  // 根据风险等级调整DCA策略建议
  if (baseScore.riskLevel === 'HIGH') {
    dcaAnalysis += ' 当前市场风险较高，建议减少单次投入金额，增加止损保护。';
  } else if (baseScore.riskLevel === 'LOW') {
    dcaAnalysis += ' 当前市场风险较低，可以适当增加投入金额，追求更高收益。';
  }
  
  return {
    ...baseScore,
    dcaStrategy,
    pricePosition,
    detailedAnalysis: {
      ...baseScore.detailedAnalysis,
      dcaAnalysis
    }
  };
} 