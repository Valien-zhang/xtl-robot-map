import logger from './logger';
import _ from 'lodash';
import storage from './localStorage';
import { perfectMapData, Uint8ToPNGBase64 } from './util_function';

/**
 * 地图坐标转换为 x上y右  笛卡尔坐标 y上 x右 
 */
export function mapToCRSLatLng({ x, y }) {
    return { x: y, y: x };
}

export function CRSLatLngToMap({ x, y }) {
    return { x: y, y: x };
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

const mapConfig = Object.freeze({
    mapColor: {
        defaultColor: {
            "0": '#00000000', // 背景
            "1": '#CC6D7D7D', // 墙 6D7D7D 80%s
            "2": '#FFD6E4E4'// 发现区域E1EEEE #D6E4E4
        },
        originMapColors: [
            '#FFBFE8E4', // 绿
            '#FFF1E5B6', // 黄
            '#FFC5DAF6', // 蓝
            '#FFF4CDBD'// 红
        ],
        highlightMapColors: [
            '#FF2CD5AE',
            '#FFEDC357',
            '#FF7AAFF5',
            '#FFEA6025'
        ],
        originMapColor: '#FFE1E5E9'
    }
});

const colorMapping = (areas) => {
    logger.d('重新生成地图配色数据', areas);
    const { highlightMapColors, originMapColors, defaultColor } = mapConfig.mapColor;
    // 注意深拷贝
    const transformedColorMapping = _.cloneDeep(defaultColor);

    if (areas.length <= 4) { // 小于4个图形 或未保存图, 直接配色
        areas.forEach((item, index) => {
            const roomId = item.room_id ?? (item.id + 2);
            const key = `${roomId}`;
            const colors = originMapColors;
            transformedColorMapping[key] = colors[index % 4];
        });
        // logger.d('重新生成地图配色数据 <= 4', transformedColorMapping);

    } else { // 多于4个图形, 使用四色定理配色
        logger.d('重新生成地图配色数据1', typeof areas);
        areas.map((item) => ({
            [item.room_id ?? (item.id + 2)]: (item.neibs ?? [])
        }))

        const graph = colorGraph();
        // logger.d('配色:', graph);
        Object.entries(graph).forEach(([key, value]) => {
            const colors = originMapColors;
            transformedColorMapping[key] = colors[value];
        });
    }
    return transformedColorMapping;
};

export async function fetchMapImage({ mapId, mapPoints, width, height, timestamp, areas }) {
    const MAP_CACHE_KEY = `mapCache-${JSON.stringify({ mapId, width, height, areas, timestamp })}`;
    const mapColor = colorMapping(areas);

    let mapImage = await getCachedMapImage(MAP_CACHE_KEY);
    if (!mapImage) {
        mapImage = await generateAndCacheMapImage(width, height, mapPoints, mapColor, MAP_CACHE_KEY);
    }
    return mapImage;
}

const getCachedMapImage = async (cacheKey) => {
    try {
        const mapImage = await storage.getItem(cacheKey);
        return mapImage;
    } catch (error) {
        logger.d('获取缓存地图失败:', error);
        return null;
    }
};

const generateAndCacheMapImage = async (width, height, mapPoints, mapColor, cacheKey) => {
    logger.d('地图无缓存, 生成地图image', cacheKey);
    if (mapPoints.length != width * height) {
        logger.e(`地图生成数据错误: width:${width} height:${height}  mapPoints:${mapPoints}`);
        return null;
    }
    const mapImage = await mapToImage(width, height, mapPoints, mapColor);
    if (mapImage) {
        storage.setItem(cacheKey, mapImage);
    }
    return mapImage;
};


async function mapToImage(width, height, mapPoints, mapColor) {
    var rgbaArrayT = new Array(width * height * 4);

    // let color = mapConfig.defaultColor['0'];
    for (let y = 0; y < width; y++) {
        for (let x = 0; x < height; x++) {
            let ind = y * height;

            let value = mapPoints[ind] ?? 0;
            //   let value = valueT > 127 ? (valueT - 256) : valueT; // uint8->int8
            //   colorDic['' + value] = '' + value;
            // 获取房间值
            //   const ob = getMapValue(value);// 分层
            //   value = ob.value;
            // if ((value == SCCMapColor.patch_carpet || value == SCCMapColor.carpet) && isCarpetXY(x, y)){
            //   color = carpeDisplayStatus ? SMapColorConfig.carpetColor : SMapColorConfig.discoverColor;
            // } 
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

            setRGBA(rgbaArrayT, ind, mapColor[value + '']);

        }
    }

    let base64 = '';
    try {
        const mapPerfectScale = 2;
        rgbaArrayT = perfectMapData(rgbaArrayT, width, height, mapPerfectScale);
        base64 = await Uint8ToPNGBase64(width * mapPerfectScale, height * mapPerfectScale, rgbaArrayT);
    } catch (error) {
        logger.d('图片转换异常', error);
    }
    logger.d(`55555 1 - 地图base64:色值:`, mapColor, base64);
    // lng:X轴坐标，lat:Y轴坐标     L的坐标系是，左下为(-800，0) 右上为:(0,800) - (笛卡尔坐标系左上角部分 为 地图)
    //   return [base64, minX - sizeX, maxX - sizeX, sizeY - minY, sizeY - maxY];
    // 
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