import logger from './logger';
import _ from 'lodash';
import storage from './localStorage';
import { SMapColorConfig } from './constants';
import { getMapDataPoints, perfectMapData, Uint8ToPNGBase64 } from './util_function';

/**
 * 地图坐标转换为 x上y右  笛卡尔坐标 y上 x右 
 */
export function mapToCRSLatLng([x, y]) {
    return [y, x];
}

export function CRSLatLngToMap([x, y]) {
    return [y, x];
}

/**
 * 判断当前地图是否为空图
 * 判断依据，最大最小xy是否都是400
 * @param mapData 地图数据
 * @returns 
 */
export function isMapEmpty(mapData) {
    return false;
}

/**
 * 根据地图数据, 生成配色
 * @param {*} areas 
 * @returns 
 */
// const colorMapping = (areas) => {
//     const transformedColorMapping = {};
//     if (areas.length <= 4) { // 小于4个图形 或未保存图, 直接配色
//         areas.forEach((item, index) => {
//             const roomId = item.room_id ?? (item.id + 2);
//             const key = `${roomId}`;
//             transformedColorMapping[key] = SMapColorConfig.roomColors[index % 4];
//         });
//     } else { // 多于4个图形, 使用四色定理配色
//         const graph = colorGraph(areas.map((item) => ({
//             [item.room_id ?? (item.id + 2)]: (item.neibs ?? [])
//         })));
//         logger.d('配色:', graph);
//         Object.entries(graph).forEach(([key, value]) => {
//             transformedColorMapping[key] = SMapColorConfig.roomColors[value];
//         });
//     }
//     return transformedColorMapping;
// };

export async function fetchMapImage({ perfectScale, mapId, map, lz4Len, minX, minY, sizeX, sizeY, roomInfos }) {

    const mapPoints = getMapDataPoints(map, lz4Len);
    const zeroNums = mapPoints.filter((item) => item === 0).length;
    const MAP_CACHE_KEY = `mapCache-${mapId}-${minX}-${minY}-${sizeX}-${sizeY}-${JSON.stringify(roomInfos)}-${zeroNums}`;
    // room.color : 1234
    let roomColor = {};
    roomInfos.forEach((room) => {
        let index = room.color;
        if (index > SMapColorConfig.roomColors.length) {
            index = index % SMapColorConfig.roomColors.length;
        }
        index--;
        roomColor[room.id] = SMapColorConfig.roomColors[index];
    });
    const mapColor = {
        ...roomColor,
        "0": SMapColorConfig.bgColor,
        "1": SMapColorConfig.wallColor,
        "2": SMapColorConfig.discoverColor
    }

    logger.d('生成地图配色', mapColor);

    let mapImage = await getCachedMapImage(MAP_CACHE_KEY);
    if (!mapImage) {
        mapImage = await getMapImage(sizeX, sizeY, mapPoints, mapColor, MAP_CACHE_KEY, perfectScale);
    }
    let minPoint = { x: minX, y: minY - sizeY };
    let maxPoint = { x: minX + sizeX, y: minY };
    return { base64Image: mapImage, minPoint, maxPoint };
}

const getCachedMapImage = async (cacheKey) => {
    // try {
    //     const mapImage = await storage.getItem(cacheKey);
    //     return mapImage;
    // } catch (error) {
    return null;
    // }
};

const getMapImage = async (sizeX, sizeY, mapPoints, mapColor, cacheKey, mapPerfectScale) => {
    logger.d('地图无缓存, 生成地图image', cacheKey);
    if (mapPoints.length != sizeX * sizeY) {
        logger.e(`地图数据错误: 宽高不匹配栅格值数量`);
        return null;
    }
    const mapImage = await mapToImage(sizeX, sizeY, mapPoints, mapColor, mapPerfectScale);
    if (mapImage) {
        try {
            storage.setItem(cacheKey, mapImage);
        } catch (error) {
            logger.e('Failed to store mapImage in cache', error);
        }
    }
    return mapImage;
};

/**
 * 
 * x上 y右
 * @param {*} minX 
 * @param {*} minY 
 * @param {*} validWidth 
 * @param {*} validHeight 
 * @param {*} mapPoints 
 * @param {*} mapColor 
 * @returns 
 */
async function mapToImage(sizeX, sizeY, mapPoints, mapColor, mapPerfectScale) {
    var rgbaArrayT = new Array(sizeX * sizeY * 4);
    for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
            let ind = y + x * sizeY;
            let value = mapPoints[ind] ?? 0;
            //   let value = valueT > 127 ? (valueT - 256) : valueT; // uint8->int8
            //   colorDic['' + value] = '' + value;
            // 获取房间值
            //   const ob = getMapValue(value);// 分层
            //   value = ob.value;

            // 地毯
            //   if ((value == SCCMapColor.patch_carpet || value == SCCMapColor.carpet)) {
            //     // color = carpeDisplayStatus ? SMapColorConfig.carpetColor : SMapColorConfig.discoverColor;
            //     color = SMapColorConfig.discoverColor;
            //   } else if (value == SCCMapColor.wall) {
            //     color = SMapColorConfig.wallColor;
            //   } else if (value == SCCMapColor.background) {
            //     color = SMapColorConfig.bgColor;
            //   } else if (value == SCCMapColor.discover || value == SCCMapColor.cover || value == SCCMapColor.deepCover) {
            //     color = SMapColorConfig.discoverColor;
            //   } else if (value >= SCCMapColor.roomBegin && value <= SCCMapColor.roomEnd) {//10-59
            //     if (carpeDisplayStatus && ob.type == SMapValueType.negative && isCarpetXY(x, y)) {
            //       color = SMapColorConfig.carpetColor;
            //     } else {
            //       // color = SMapColorConfig.roomColor;
            //       // 根据颜色id获取对应的颜色
            //       color = getRoomColor(value, x, y);
            //       // SSlog('房间颜色------', value, color)
            //     }
            //   }
            // color = SMapColorConfig.roomColor;
            // // 根据颜色id获取对应的颜色
            // color = getRoomColor(value, x, y);
            // // SSlog('房间颜色------', value, color)

            setRGBA(rgbaArrayT, ind, mapColor[value]);
        }
    }

    let base64 = '';
    try {
        rgbaArrayT = perfectMapData(rgbaArrayT, sizeY, sizeX, mapPerfectScale);
        base64 = await Uint8ToPNGBase64(sizeY * mapPerfectScale, sizeX * mapPerfectScale, rgbaArrayT);
    } catch (error) {
        logger.d('图片转换异常', error);
    }
    // logger.d(`55555 1 - 地图base64:色值:`, mapColor, base64);
    return base64;
}


export function setRGBA(rgba, i, color, four = true) {
    if (color == undefined) {
        return;
    }
    if (rgba.length < i * 4 + 3) {
        return;
    }
    if (four) {
        rgba[i * 4 + 0] = color[0];
        rgba[i * 4 + 1] = color[1];
        rgba[i * 4 + 2] = color[2];
        rgba[i * 4 + 3] = color[3];
    } else {
        rgba[i * 3 + 0] = color[0];
        rgba[i * 3 + 1] = color[1];
        rgba[i * 3 + 2] = color[2];
    }
}
/**
 * 
 * @param {*} graphRelations 相邻关系 [{"3": [Array]}]
 * @param {*} colors 配色 [""]
 * @returns 图形配色
 */
function colorGraph(graphRelations) {
    const coloredNodes = {};
    const colors = [0, 1, 2, 3];
    const colorUsage = colors.reduce((acc, color) => {
        acc[color] = 0;
        return acc;
    }, {});

    function canColor(node, color) {
        const neighbors = graphRelations.find((item) => item[node])?.[node] ?? [];
        return !neighbors.some((neighbor) => coloredNodes[neighbor] === color);
    }

    function colorNode(node) {
        const availableColors = colors.sort((a, b) => colorUsage[a] - colorUsage[b]);

        for (const color of availableColors) {
            if (canColor(node, color)) {
                coloredNodes[node] = color;
                colorUsage[color]++;
                const neighbors = graphRelations.find((item) => item[node])?.[node] ?? [];
                neighbors.forEach((neighbor) => {
                    if (!coloredNodes[neighbor]) {
                        colorNode(neighbor);
                    }
                });
                break;
            }
        }
    }

    graphRelations.forEach((relation) => {
        const node = Object.keys(relation)[0];
        if (!coloredNodes[node]) {
            colorNode(node);
        }
    });
    return coloredNodes;
}