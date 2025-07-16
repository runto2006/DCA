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

// 策略评分计算
export function calculateStrategyScore(
  currentPrice: number,
  ema89: number,
  obv: number,
  obvPrev: number,
  rsi: number,
  macd: number,
  macdSignal: number
): {
  emaScore: number;
  obvScore: number;
  rsiScore: number;
  macdScore: number;
  totalScore: number;
  recommendation: string;
} {
  // EMA评分 (0-100)
  const emaDiff = ((currentPrice - ema89) / ema89) * 100;
  let emaScore = 50;
  if (emaDiff > 5) emaScore = 20; // 价格远高于EMA，可能超买
  else if (emaDiff > 2) emaScore = 35;
  else if (emaDiff > -2) emaScore = 50; // 价格接近EMA，中性
  else if (emaDiff > -5) emaScore = 65;
  else emaScore = 80; // 价格远低于EMA，可能超卖
  
  // OBV评分 (0-100)
  const obvChange = ((obv - obvPrev) / obvPrev) * 100;
  let obvScore = 50;
  if (obvChange > 10) obvScore = 80; // OBV大幅上升，看涨
  else if (obvChange > 5) obvScore = 65;
  else if (obvChange > -5) obvScore = 50; // OBV变化不大，中性
  else if (obvChange > -10) obvScore = 35;
  else obvScore = 20; // OBV大幅下降，看跌
  
  // RSI评分 (0-100)
  let rsiScore = 50;
  if (rsi > 70) rsiScore = 20; // 超买
  else if (rsi > 60) rsiScore = 35;
  else if (rsi > 40) rsiScore = 50; // 中性
  else if (rsi > 30) rsiScore = 65;
  else rsiScore = 80; // 超卖
  
  // MACD评分 (0-100)
  const macdDiff = macd - macdSignal;
  let macdScore = 50;
  if (macdDiff > 0.01) macdScore = 80; // MACD在信号线上方，看涨
  else if (macdDiff > 0) macdScore = 65;
  else if (macdDiff > -0.01) macdScore = 50; // 接近，中性
  else if (macdDiff > -0.02) macdScore = 35;
  else macdScore = 20; // MACD在信号线下方，看跌
  
  // 总评分
  const totalScore = Math.round((emaScore + obvScore + rsiScore + macdScore) / 4);
  
  // 建议
  let recommendation = 'HOLD';
  if (totalScore >= 70) recommendation = 'BUY';
  else if (totalScore <= 30) recommendation = 'SELL';
  
  return {
    emaScore: Math.round(emaScore),
    obvScore: Math.round(obvScore),
    rsiScore: Math.round(rsiScore),
    macdScore: Math.round(macdScore),
    totalScore,
    recommendation
  };
} 