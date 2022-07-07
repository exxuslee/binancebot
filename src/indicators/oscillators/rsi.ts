import { RSI } from 'technicalindicators';
import { getCandleSourceType } from '../../utils/loadCandleData';

interface Options {
  sourceType?: SourceType;
  period?: number;
}

const defaultOptions: Options = {
  sourceType: 'close',
  period: 14,
};

export function calculate(candles: Candle[], options?: Options) {
  options = { ...defaultOptions, ...options };

  let values = getCandleSourceType(candles, options.sourceType);
  let result: number[] = RSI.calculate({ values, period: options.period });

  return result;
}
