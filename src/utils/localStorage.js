import localForage from 'localforage';
import logger from './logger';

// 配置 localForage
localForage.config({
    driver: localForage.INDEXEDDB,  // 指定使用 IndexedDB
    name: 'robotMap',               // 数据库名称
    version: 1.0,                   // 数据库版本
    storeName: 'mapCache',          // 存储对象名称
    description: 'mapCache'         // 描述
});

// 定期清理过期的数据
async function clearExpiredItems() {
    try {
        await localForage.iterate((value, key) => {
            const now = new Date().getTime();
            if (value.expiry && now > value.expiry) {
                localForage.removeItem(key);
            }
        });
    } catch (error) {
        logger.d("Error clearing expired items:", error);
    }
}

// 存储数据并附带过期时间, 默认15分钟
async function setItem(key, value, ttl = 15 * 60 * 1000) {
    const now = new Date().getTime();
    const item = {
        value: value,
        expiry: now + ttl,
    };
    try {
        await localForage.setItem(key, item);
    } catch (error) {
        logger.d("Error setting item:", error);
    }
}

// 获取数据时检查是否过期
async function getItem(key) {
    try {
        const item = await localForage.getItem(key);
        if (!item) return null;

        const now = new Date().getTime();
        if (now > item.expiry) {
            await localForage.removeItem(key);
            return null;
        }
        return item.value;
    } catch (error) {
        logger.d("Error getting item:", error);
        return null;
    }
}

// 导出函数
export default {
    setItem,
    getItem,
    clearExpiredItems,
};


// // 示例：设置和获取数据
// setItemWithExpiry('myKey', 'myValue', 15 * 60 * 1000); // 15分钟过期
// getItem('myKey').then(value => console.log(value)); // 获取数据

// // 例如在应用启动时清理过期数据
// clearExpiredItems();
