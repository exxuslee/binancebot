import { EMA } from 'technicalindicators';
import {getCandleSourceType} from "../../utils/currencyInfo";

interface Options {
  sourceType?: SourceType;
  period?: number;
  multiplier?: number;
}

const defaultOptions: Options = {
  sourceType: 'close',
  period: 10,
  multiplier: 2.0,
};

export function calculate(candles: CandleRage[], options?: Options) {
  options = { ...defaultOptions, ...options };
  let values = getCandleSourceType(candles, options.sourceType);

  let avrng = new Array(options.period - 1).fill(0).concat(
    EMA.calculate({
      period: options.period,
      values: values.map((s, i) => (i > 0 ? Math.abs(s - values[i - 1]) : 0)),
    })
  );

  let smoothrng = new Array(options.period * 2 - 2)
    .fill(0)
    .concat(EMA.calculate({ period: options.period * 2 - 1, values: avrng }))
    .map((v) => v * options.multiplier);

  values = values.slice(-smoothrng.length);
  let filt = values.slice(-smoothrng.length);
  let upward = new Array(smoothrng.length).fill(0);
  let downward = new Array(smoothrng.length).fill(0);

  for (let i = 1; i < filt.length; i++) {
    filt[i] =
      values[i] > filt[i - 1]
        ? values[i] - smoothrng[i] < filt[i - 1]
          ? filt[i - 1]
          : values[i] - smoothrng[i]
        : values[i] + smoothrng[i] > filt[i - 1]
        ? filt[i - 1]
        : values[i] + smoothrng[i];
    upward[i] =
      filt[i] > filt[i - 1]
        ? upward[i - 1] + 1
        : filt[i] < filt[i - 1]
        ? 0
        : upward[i - 1];
    downward[i] =
      filt[i] < filt[i - 1]
        ? downward[i - 1] + 1
        : filt[i] > filt[i - 1]
        ? 0
        : downward[i - 1];
  }

  upward = upward.slice(-filt.length);
  downward = downward.slice(-filt.length);

  // Calculate the high band and low band

  let result: {
    highBand: number;
    lowBand: number;
    upward: number;
    downward: number;
    filt: number;
  }[] = [];

  for (let i = options.period; i < filt.length; i++) {
    result.push({
      highBand: filt[i] + smoothrng[i],
      lowBand: filt[i] - smoothrng[i],
      upward: upward[i],
      downward: downward[i],
      filt: filt[i],
    });
  }

  return result;
}
