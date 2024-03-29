import {ExchangeInfo, OrderSide} from 'binance-api-node';
import {error, log, logStart, logStop, logStopLose, logStopProfit} from '../utils/log';
import {binanceClient} from '../init';
import {Telegram} from '../telegram';
import dayjs from 'dayjs';
import {Balance} from "./Balance";
import Emittery from "emittery";
import {Order} from "./Order";
import {getPricePrecision, validQuantity} from "../utils/currencyInfo";
import {sendDailyResult, sendHourResult} from "../telegram/message";
import {Counter} from "./Counter";
import {Aver} from "../candles/Aver";

export class Bot {
    private strategyConfigs: StrategyConfig[];
    private telegram: Telegram;
    private balance: Balance
    private exchangeInfo: ExchangeInfo;
    private hasOpenPosition: { [pair: string]: boolean };
    private currentHour: number;
    private currentDay: string;
    private currentMonth: string;
    private bit: boolean
    private counters: Counter;

    constructor(tradeConfigs: StrategyConfig[]) {
        this.strategyConfigs = tradeConfigs;
        this.hasOpenPosition = {};
        this.currentHour = Number(dayjs(Date.now()).format('HH'))
        this.currentDay = dayjs(Date.now()).format('DD/MM/YYYY');
        this.currentMonth = dayjs(Date.now()).format('MM/YYYY');
        this.bit = true
    }

    public async run() {
        log('============ 💵 BINANCE BOT TRADING 💵 ============');
        this.telegram = new Telegram()
        this.balance = new Balance()
        this.counters = new Counter();
        this.exchangeInfo = await binanceClient.exchangeInfo();
        const emitter = new Emittery();
        await this.balance.init()

        let min = Number(dayjs(Date.now()).format('mm'));
        let sec = Number(dayjs(Date.now()).format('ss'));
        let left = 3600 - min * 60 - sec
        setTimeout(() =>
            setInterval(() =>
                sendHourResult(this.telegram, this.counters.getCounter()), 3600000), left * 1000);

        this.strategyConfigs.forEach((strategyConfig) => {
            const pair = strategyConfig.asset + strategyConfig.base;
            let b1 = this.balance.bCurrent(strategyConfig.asset).toFixed(4)
            let b2 = this.balance.bCurrent(strategyConfig.base).toFixed(0)
            log(`Trades ${pair}:\t${b1}\t${b2}$`);
            //let view = new View(emitter, strategyConfig.leverage)
            let view = new Aver(emitter, strategyConfig.leverage)
            let order = new Order()
            order.closeOpenOrders(pair)
            binanceClient.ws.aggTrades(pair, AggregatedTrade => {
                console.log(AggregatedTrade.quantity, AggregatedTrade.isBuyerMaker, AggregatedTrade.price)

                if (
                    //AggregatedTrade.quantity == '0.00050000' ||
                    //AggregatedTrade.quantity == '0.00020000' ||
                    //AggregatedTrade.quantity == '0.0040000' ||
                    //AggregatedTrade.quantity == '0.00150000' ||
                    //AggregatedTrade.quantity == '0.00100000'
                    // AggregatedTrade.quantity == '0.00200000' ||
                    // AggregatedTrade.quantity == '0.00300000' ||
                    // AggregatedTrade.quantity == '0.01000000' ||
                    // AggregatedTrade.quantity == '0.03000000' ||
                    // AggregatedTrade.quantity == '0.05000000'
                    Number(AggregatedTrade.quantity) > 1.0
                ) {
                    console.log(AggregatedTrade.quantity, AggregatedTrade.isBuyerMaker, AggregatedTrade.price)
                    view.update(AggregatedTrade)
                }
            })
            emitter.on(pair, message => {
                this.trade(message.dataCandles, strategyConfig, pair, order, message.currentPrice,)
            })
        })
    }

    async trade(candles, strategyConfig, pair, order, currentPrice) {
        /** Log */
        let tempSlow = ''
        candles.map(asd => tempSlow += asd.isBuyerMaker ? '0' : '1')
        let volume = candles[0].volume
        //log(`${pair} ${tempSlow}\t${currentPrice}   \t${volume.toFixed(2)}`)
        log(`${pair} ${tempSlow}\t${currentPrice}`)


        /** Clear BUY by stop-loss */
        if (order.getBull() && order.getPriceSL() > currentPrice && !order.getTrading()) {
            await this.stopSignal(pair, order, OrderSide.SELL, order.getQuantity(), -1)
        }

        /** Clear SELL by stop-loss */
        if (order.getBear() && order.getPriceSL() < currentPrice && !order.getTrading()) {
            await this.stopSignal(pair, order, OrderSide.BUY, order.getQuantity(), -1)
        }

        /** Clear BUY by takeProfit */
        if (order.getBull() && order.getPriceTP() < currentPrice && !order.getTrading()) {
            await this.stopSignal(pair, order, OrderSide.SELL, order.getQuantity(), 1)
        }

        /** Clear SELL by takeProfit */
        if (order.getBear() && order.getPriceTP() > currentPrice && !order.getTrading()) {
            await this.stopSignal(pair, order, OrderSide.BUY, order.getQuantity(), 1)
        }

        /** Stop order BUY */
        // if (order.getBull() && !order.getTrading()) {
        //     if (candles[0].isBuyerMaker) order.setVolume(order.getVolume() - candles[0].volume)
        //     if (candles[0].isBuyerMaker && candles[1].isBuyerMaker) {
        //         //log(`Stop order BUY`)
        //         await this.stopSignal(pair, order, OrderSide.SELL, order.getQuantity(), 0)
        //     }
        // }

        /**Stop order SELL */
        // if (order.getBear() && !order.getTrading()) {
        //     if (!candles[0].isBuyerMaker) order.setVolume(order.getVolume() - candles[0].volume)
        //     if (!candles[0].isBuyerMaker && !candles[1].isBuyerMaker) {
        //         //log(`Stop order SELL`)
        //         await this.stopSignal(pair, order, OrderSide.BUY, order.getQuantity(), 0)
        //     }
        // }

        /** Ready to start */
        //if (!order.getBull() && !order.getBear() && !order.getTrading()) {

            /** Start order BUY */
            if (strategyConfig.buyStrategy(candles)) {
                order.setTrading(true)
                await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.BUY)
                order.setTrading(false)
            }

            /** Start order SELL */
            if (strategyConfig.sellStrategy(candles)) {
                order.setTrading(true)
                await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL)
                order.setTrading(false)
            }
        //}
    }

    async startSignal(candlesArray, strategyConfig, pair, order, currentPrice, orderSide) {
        let reverseOrder = (orderSide === OrderSide.BUY) ? OrderSide.SELL : OrderSide.BUY
        let {takeProfits, stopLoss} = await strategyConfig.exitStrategy
            ? strategyConfig.exitStrategy(
                currentPrice,
                candlesArray,
                getPricePrecision(pair, this.exchangeInfo),
                orderSide,
                this.exchangeInfo
            ) : {takeProfits: [], stopLoss: null};
        // Calculate the quantity for the position according to the risk management of the strategy
        let quantity = strategyConfig.riskManagement({
            asset: strategyConfig.asset,
            base: strategyConfig.base,
            balance: strategyConfig.allowPyramiding
                ? Number(this.balance.bCurrent(strategyConfig.asset))
                : Number(this.balance.bCurrent(strategyConfig.base)),
            risk: strategyConfig.risk,
            enterPrice: currentPrice,
            exchangeInfo: this.exchangeInfo
        });
        quantity = validQuantity(quantity, pair, this.exchangeInfo)

        let bit = await order.marketStart(binanceClient, pair, quantity, orderSide, currentPrice, 0).catch(error)
        if (bit) {
            //await order.stopLose(binanceClient, pair, quantity, reverseOrder, stopLoss)
            order.setVolume(candlesArray[0].volume + candlesArray[1].volume)
            await order.orderOco(binanceClient, pair, quantity, reverseOrder, takeProfits[0].price, stopLoss)
            logStart(pair, order.getPriceStart(), quantity, orderSide, takeProfits[0].price, stopLoss)
        }
        return bit
    }

    async stopSignal(pair, order, orderSide, quantity, type) {
        order.setTrading(true)
        quantity = validQuantity(quantity, pair, this.exchangeInfo)
        let openOrders = await order.closeOpenOrders(pair).catch(error);
        if (openOrders) {
            await order.stop(binanceClient, pair, quantity, orderSide)
        } else {
            // TODO определить в какую сторону закрылся
        }


        if (type === -1) logStopLose(pair, order.getPriceSL(), orderSide, order.getPriceStart())
        if (type === 0) logStop(pair, order.getPriceStop(), orderSide, order.getPriceStart())
        if (type === 1) logStopProfit(pair, order.getPriceTP(), orderSide, order.getPriceStart())

        order.setBull(false)
        order.setBear(false)
        this.counters.add(order.getPriceTP(), order.getPriceStart())
        order.setTrading(false)
    }

    async report(candles, strategyConfig, order, pair) {
        // Day change ?
        let candleDay = dayjs(new Date(candles[0].closeTime)).format('DD/MM/YYYY');
        if (candleDay !== this.currentDay) {
            let hour = Number(dayjs(Date.now()).format('HH'));
            if (hour > 6) {
                await this.balance.updateCurrent()
                sendDailyResult(this.telegram, this.balance, strategyConfig.asset, this.counters[pair].getCounter());
                this.currentDay = candleDay;
                this.balance.updateDay()
                this.counters[pair].reset();
            }
        }
        let hour = Number(dayjs(Date.now()).format('HH'));
        if (hour > this.currentHour) {
            sendDailyResult(this.telegram, this.balance, strategyConfig.asset, this.counters[pair].getCounter());
            this.currentHour = hour
        }
    }

}
