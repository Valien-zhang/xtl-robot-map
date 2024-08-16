// import { Device, Service } from 'miot';

/**
 * 日志分级
 * @type {{ERROR: 3, INFO: 1, DEBUG: 0, WARN: 2}}
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

/**
 * 修改这个值，可以过滤线上日志，小于此级别的日志会被过滤。
 * 
 * 比如设置：LogLevel.INFO，
 * 那么 logger.d 的日志只会在开发调试的时候显示在控制台上，而不会上报到线上。
 */
const REPORT_LEVEL = LogLevel.DEBUG;

/**
 * 日志工具类，会自动添加日志级别标签以及相关的时间戳。
 *
 * ### 日志打印特性：
 * - 如果是本地调试模式，会在控制台输出日志信息，同时会自动保存日志到手机本地。
 * - 如果打包上传到开发者平台后，只会自动保存日志到手机本地。
 *
 * ### 线上日志：
 * 用户提交反馈后，开发者可以在 `开发者平台后台 - 控制台 - 运营 - 用户运营 - 用户反馈管理` 查询到用户反馈的日志。
 *
 * ### 线上日志级别：
 * 可以修改上面的 {@link REPORT_LEVEL} 配置上报的日志级别。
 * 只有日志级别 **大于等于配置的日志级别** 的时候才会保存到手机日志文件中。
 *
 * 日志级别从低到高分别是：LogLevel.DEBUG、LogLevel.INFO、LogLevel.WARNING、LogLevel.ERROR
 *
 * @example
 * ```javascript
 *
 * logger.d('打印 debug 级别的日志');
 * logger.i('打印 info 级别的日志', '一般在关键流程中打印', '以排查代码流程走向');
 * logger.w('打印 warning 级别的日志', '一般是比较重要的日志');
 * logger.e('打印 error 级别的日志', '一般发生错误时打印');
 *
 * ```
 */
class Logger {
    constructor() {
        this.debug = __DEV__;
        this.reportLevel = REPORT_LEVEL ?? LogLevel.WARN;
    }

    /**
     * 上报本地保存的日志。
     * @param {0|1|2|3} logLevel 日志分级，具体参见 {@link LogLevel}
     * @param {Array<string|object|number|boolean>} message 日志信息。
     * @private
     */
    _reportLog(logLevel, ...message) {
        if (logLevel >= this.reportLevel) {
            const messages = [this._level(logLevel), ...message];
            //   Service.smarthome.reportLog(
            //     Device.model,
            //     messages?.map((/** @type {string|object|number|boolean} */ m) =>
            //       typeof m === 'string' ? m : JSON.stringify(m)
            //       )
            //       .join('  ')
            //   );
        }
    }

    /**
     * 打印 debug 日志信息。
     * @param {Array<string|object|number|boolean>} message 日志信息。
     */
    d(...message) {
        if (this.debug) {
            console.debug(this._time(), ...message);
        }

        this._reportLog(LogLevel.DEBUG, ...message);
    }

    /**
     * 打印 info 日志信息。
     * @param {Array<string|object|number|boolean>} message 日志信息。
     */
    i(...message) {
        if (this.debug) {
            console.info(this._time(), ...message);
        }

        this._reportLog(LogLevel.INFO, ...message);
    }

    /**
     * 打印 warning 日志信息。
     * @param {Array<string|object|number|boolean>} message 日志信息。
     */
    w(...message) {
        if (this.debug) {
            if (__DEV__ && console.warn) {
                console.warn(this._time(), ...message);
            } else {
                console.log(this._time(), ...message);
            }
        }

        this._reportLog(LogLevel.WARN, ...message);
    }

    /**
     * 打印 error 日志信息。
     * @param {Array<string|object|number|boolean>} message 日志信息。
     */
    e(...message) {
        if (this.debug) {
            // 不能直接 console.error(message); 会终止程序的运行
            if (__DEV__ && console.warn) {
                console.warn(this._time(), this._level(LogLevel.ERROR), ...message);
            } else {
                console.log(this._time(), this._level(LogLevel.ERROR), ...message);
            }
        }

        this._reportLog(LogLevel.ERROR, ...message);
    }

    /**
     * Debug 日志打印时间
     *
     * @private
     * @returns {string} 格式化好的时间
     */
    _time() {
        return new Date().toLocaleTimeString();
    }

    /**
     * 日志级别打印
     *
     * @private
     * @param {0|1|2|3} level 日志分级，具体参见 {@link LogLevel}
     * @returns {string} 日志级别
     */
    _level(level) {
        switch (level) {
            case 0:
                return '[DEBUG]';
            case 1:
                return '[INFO]';
            case 2:
                return '[WARN]';
            case 3:
                return '[ERROR]';
            default:
                return `[UNKONW] - ${level}`;
        }
    }
}

const logger = new Logger();
export default logger;
