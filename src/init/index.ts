// Initialize environment variables
require('dotenv').config();

import { initTelegramBot } from './initTelegramBot';
import { initializeDayJsPlugins } from './initDayJsPlugins';
import { initLogger } from './initLogger';
import { initJSonConfig } from './initJsonConfig';
import { loadStrategyConfig } from './initStrategy';
import { initBinanceClient } from './initClient';

initJSonConfig();

initializeDayJsPlugins();

export const logger = initLogger();
export const telegramBot = initTelegramBot();
export const BotConfig = initJSonConfig();
export const binanceClient = initBinanceClient();
export const { AbstractStrategy, StrategyConfig } =
  loadStrategyConfig(BotConfig['strategy_config_file_name']);

// The maximum number of candles to be loaded from the the binance api
export const MAX_LOADED_CANDLE_LENGTH_API = 500;
