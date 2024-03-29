import { RSI } from 'technicalindicators';
import {getCandleSourceType} from "../../utils/currencyInfo";

interface Options {
  sourceType?: SourceType;
  period?: number;
}

const defaultOptions: Options = {
  sourceType: 'close',
  period: 14,
};

export function calculate(candles: CandleRage[], options?: Options) {
  options = { ...defaultOptions, ...options };

  let values = getCandleSourceType(candles, options.sourceType);
  let result: number[] = RSI.calculate({ values, period: options.period });

  return result;
}
