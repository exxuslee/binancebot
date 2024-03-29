import { CrossUp, CrossDown } from 'technicalindicators';
import { SMA, EMA, WMA, WEMA } from '../../indicators';

interface Options {
  maPeriod?: number;
  maType?: MAType;
}

const defaultOptions: Options = {
  maPeriod: 21,
  maType: 'SMA',
};

const getMAClass = (type: MAType) =>
  type === 'SMA' ? SMA : type === 'EMA' ? EMA : type === 'WMA' ? WMA : WEMA;

/**
 * Return true if the last candle crosses up the MA
 */
export const isBuySignal = (
  candles: CandleRage[],
  options = defaultOptions
) => {
  if (candles.length < options.maPeriod) return false;

  const ma = getMAClass(options.maType);
  const candleValues = candles.map((candle) => candle.close);

  const values = ma.calculate(candles, {
    period: options.maPeriod,
  });

  const input = {
    lineA: candleValues.slice(-2),
    lineB: values.slice(-2),
  };

  const results = CrossUp.calculate(input);
  return results[results.length - 1];
};

/**
 * Return true if the last candle crosses down the MA
 */
export const isSellSignal = (
  candles: CandleRage[],
  options = defaultOptions
) => {
  if (candles.length < options.maPeriod) return false;

  const ma = getMAClass(options.maType);
  const candleValues = candles.map((candle) => candle.close);

  const values = ma.calculate(candles, {
    period: options.maPeriod,
  });

  const input = {
    lineA: candleValues.slice(-2),
    lineB: values.slice(-2),
  };

  const results = CrossDown.calculate(input);
  return results[results.length - 1];
};
