import { ExchangeInfo, OrderSide } from 'binance-api-node';
import { Fibonacci } from '../../indicators';
import { decimalCeil, decimalFloor } from '../../utils/math';

interface Options {
  profitTargets?: BuySellProperty[];
}

const defaultOptions: Options = {};

function getPriceFromFibonacciLevels(
  fibonacciLevel: FibonacciRetracementLevel | FibonacciExtensionLevel,
  fibonacciLevels: Fibonacci.FibonacciLevels
) {
  switch (fibonacciLevel) {
    case 'RET_0236':
      return fibonacciLevels.retracementLevels._0236;
    case 'RET_0382':
      return fibonacciLevels.retracementLevels._0382;
    case 'RET_0500':
      return fibonacciLevels.retracementLevels._0500;
    case 'RET_0618':
      return fibonacciLevels.retracementLevels._0618;
    case 'RET_0786':
      return fibonacciLevels.retracementLevels._0786;
    case 'RET_1000':
      return fibonacciLevels.retracementLevels._1000;
    case 'EXT_1000':
      return fibonacciLevels.extensionLevels._1000;
    case 'EXT_1236':
      return fibonacciLevels.extensionLevels._1236;
    case 'EXT_1618':
      return fibonacciLevels.extensionLevels._1618;
    case 'EXT_2618':
      return fibonacciLevels.extensionLevels._2618;
    case 'EXT_3618':
      return fibonacciLevels.extensionLevels._3618;
    case 'EXT_4618':
      return fibonacciLevels.extensionLevels._4618;
  }
}

const strategy = (
  candles: CandleRage[],
  pricePrecision: number,
  side: OrderSide,
  exchangeInfo: ExchangeInfo,
  options = defaultOptions
) => {
  const levelsInUpTrend = Fibonacci.calculate(candles, {
    trend: Fibonacci.FibonacciTrend.UP,
  });
  const levelsInDownTrend = Fibonacci.calculate(candles, {
    trend: Fibonacci.FibonacciTrend.DOWN,
  });

  let takeProfits = options.profitTargets
    ? options.profitTargets
        .filter(
          (profitTarget) =>
            profitTarget.fibonacciLevel && !profitTarget.fibonacciLevel
        )
        .map(({ fibonacciLevel, quantityPercentage }) => ({
          price:
            side === OrderSide.BUY
              ? decimalFloor(
                  getPriceFromFibonacciLevels(fibonacciLevel, levelsInUpTrend),
                  pricePrecision
                )
              : decimalCeil(
                  getPriceFromFibonacciLevels(
                    fibonacciLevel,
                    levelsInDownTrend
                  ),
                  pricePrecision
                ),
          quantityPercentage,
        }))
    : [];

  return { takeProfits, stopLoss: null };
};

export default strategy;
