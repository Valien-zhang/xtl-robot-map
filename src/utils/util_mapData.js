import logger from './logger';
import _ from 'lodash';
import storage from './localStorage';
import { SMapColorConfig } from './constants';
import { getMapDataPoints, perfectMapData, Uint8ToPNGBase64 } from './util_function';
import { isNull, generateMd5Key } from "./util_function";
/**
 *  地图数据的坐标 x上y右 转换为 笛卡尔坐标 y上 x右 
 *                  
 *                  
 *                  
 * x                 
 * |                |y
 * |                |
 * |                |
 * |_ _ _ _ _ y  => |--------x
 * @param {[number, number]} param0 
 * @returns {{x:number, y:number}} 笛卡尔坐标系下的xy
 */
function mapToCRS([ox, oy]) {
    return { x: oy, y: ox };
    // return { x: ox, y: oy };
}

/**
 * 
 * @param {[number, number]} param0 
 * @returns {{x:number, y:number}} 笛卡尔坐标系下的xy
 */
function CRSToMap([ox, oy]) {
    return { x: oy, y: ox };
}

/**
 * 非地图数据的坐标 ,京蛙传过来是屏幕坐标系-
 *                 
 * |----------x    |y
 * |               |
 * |               |
 * |y           => |--------x
 * @param {[number, number]} ox oy 房间坐标系下的xy
 * @param {number} size 地图的size，default is 800
 * @returns {{x:number, y:number}} 笛卡尔坐标系下的xy
 */
function roomToCRS([ox, oy], size = 800) {
    // return { x: Number(ox), y: size - Number(oy) };
    return { x: Number(oy), y: size - Number(ox) };
    // return { x: Number(oy), y: Number(ox) + size };
}

/**
 * 将笛卡尔坐标系下的xy转换到房间坐标系下 
 * @param {[number, number]} ox oy 笛卡尔坐标系下的xy
 * @param {number} size 地图的size，default is 800
 * @returns {{x:number, y:number}} 房间坐标系下的xy
 */
function CRSToRoom([ox, oy], size = 800) {
    return {
        x: Number(ox),
        y: size - Number(oy)
    };

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
    const MAP_CACHE_KEY = generateMd5Key(`mapCache-${mapId}-${minX}-${minY}-${sizeX}-${sizeY}-${JSON.stringify(roomInfos)}-${zeroNums}`);

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

    if (!mapImage) {
        return null;
    }
    let minPoint = { x: minX, y: minY };
    let maxPoint = { x: minX + sizeX, y: (minY + sizeY) };
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

    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            let ind = x + y * sizeX;
            let value = mapPoints[ind] ?? 0;
            setRGBA(rgbaArrayT, ind, mapColor[value]);
        }
    }
    // for (let y = 0; y < sizeY; y++) { // 从顶部到底部遍历每一行
    //     // 在每一行中从左到右遍历每一个像素  
    //     for (let x = 0; x < sizeX; x++) {
    //         let ind = x + y * sizeX;
    //         let value = mapPoints[ind] ?? 0; // 根据mapPoints获取当前像素的值  
    //         setRGBA(rgbaArrayT, (sizeY - y - 1) * sizeX + x, mapColor[value]); // 计算上下翻转后的索引，填充数组
    //     }
    // }

    let base64 = '';
    try {
        rgbaArrayT = perfectMapData(rgbaArrayT, sizeX, sizeY, mapPerfectScale);
        base64 = await Uint8ToPNGBase64(sizeX * mapPerfectScale, sizeY * mapPerfectScale, rgbaArrayT);
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
 * 转化禁区数据 string -> JSON
 * @param {string} virtualStr "1,1,x1,y1,x2,y2;2,2,x1,y1,x2,y2,x3,y3,x4,y4"... id, type
 * @param {number} mapId 
 * @returns {Array} walls
 */
export const stringConvertVirtuals = (virtualStr, mapId) => {
    if (typeof virtualStr === 'string' && virtualStr.trim() !== '') {
        const segments = virtualStr.split(';');
        return segments.map((segment) => {
            const parts = segment.split(',');
            const coordinatesArray = parts.slice(2);

            const coordinatesObjects = [];
            for (let i = 0; i < coordinatesArray.length; i += 2) {
                const x = parseInt(coordinatesArray[i], 10);
                const y = parseInt(coordinatesArray[i + 1], 10);
                coordinatesObjects.push({ x, y });
            }

            const object = {
                id: parseInt(parts[0], 10),
                type: parseInt(parts[1], 10), // 1线 , 2矩形
                points: coordinatesObjects,
                mapId,
                action: '' // 假设 `VirtualActionType.Normal` 是 'Normal'
            };
            return object;
        });
    } else {
        return [];
    }
};


/**
 * 解析地图文件数据 - 转成统一格式mapInfo
 */
export function paresMapData(data) {
    if (!data) return null;
    if ('fields' in data) { // 历史遗留问题,当前图
        const mapInfo = {
            ts: new Date().getTime(),
            mapId: '',
            /** @type {IMapData} 全量地图 */
            mapData: {},
            /** @type {IMapTraceData} 轨迹 */
            mapTraceData: {},
            pos: {},
            areas: [],
            /** @type {IVirtualModel[]} */
            virtualWalls: [],
            // '1,1,300,300,400,400',
            // 1,1,x1,y1,x2,y2;2,2,x1,y1,x2,y2,x3,y3,x4,y4 每条虚拟墙(区)用分号分割，
            // 虚拟墙每个字段用逗号分割 第一个为id ，第二个为类型（1 线形 2矩形），第三个到最后一个是对应的世界坐标
            // 矩形虚拟墙坐标是4个点，线行2个点，单位是（厘米）
            mopWalls: [], // 同上
            carpet: [], // 地毯同上
            thres: [],
            carpetPrefer: []
        };
        // mapId
        mapInfo.mapId = data.mapId;
        // MapData
        if (data?.fields?.length > 0) {
            if (!isNull(data.fields[0])) {
                try {
                    const mapDataStr = window.atob(data.fields[0]);
                    mapInfo.mapData = JSON.parse(mapDataStr);

                } catch (error) {
                    logger.e('mapData 解析数据时出错：', error);
                }
            }

        }
        // mapTraceData
        if (data.fields?.length > 1) {
            if (!isNull(data.fields[1])) {
                try {
                    const mapTraceStr = window.atob(data.fields[1]);
                    mapInfo.mapTraceData = JSON.parse(mapTraceStr);
                } catch (error) {
                    logger.e('当前地图mapTraceData 解析数据时出错：', error);
                }
            }
        }
        // pos
        if (data.fields?.length > 2) {
            try {
                mapInfo.pos = JSON.parse(data.fields[2]);
            } catch (error) {
                logger.e('当前地图解析机器位置出错:', error);
            }
        }
        // areas
        if (data.fields?.length > 3) {
            if (!isNull(data.fields[3])) {
                try {
                    const areas = JSON.parse(data.fields[3]);
                    if (Array.isArray(areas) && areas.length) {
                        mapInfo.areas = areas?.map((area) => {
                            // 转换成[]
                            if (area.neibs !== undefined) {
                                area.neibs = area.neibs.split(',').filter((element) => element !== "");
                            }
                            // 默认name
                            if (area.name === '') {
                                area.name = `房间${area.id}`; //  keyword257: "房间",
                            }
                            // 默认分类
                            if (area.type === '') {
                                area.type = "0";// 房间类型 int
                            }
                            return area;
                        });

                    }
                } catch (error) {
                    logger.e('解析当前地图 areas追踪数据出错：', error, typeof value);
                }
            }
        }
        // VirtualWalls
        if (data.fields?.length > 4) {
            if (!isNull(data.fields[4])) {
                try {
                    const wallStr = window.atob(data.fields[4]);
                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.virtualWalls = walls;
                } catch (error) {
                    logger.e('当前地图解析虚拟墙追踪数据出错：', error);
                }
            }
        }
        // mopWalls
        if (data.fields?.length > 5) {
            if (!isNull(data.fields[5])) {
                try {
                    const wallStr = window.atob(data.fields[5]);
                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.mopWalls = walls;
                } catch (error) {
                    logger.e('当前地图解析虚拟墙追踪数据出错：', error);
                }
            }
        }
        // carpet
        if (data.fields?.length > 6) {
            if (!isNull(data.fields[6])) {
                try {
                    const wallStr = window.atob(data.fields[6]);
                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.carpet = walls;
                } catch (error) {
                    logger.e('当前地图解析虚拟墙地毯追踪数据出错：', error);
                }
            }
        }

        // thres
        if (data.fields?.length > 7) {
            if (!isNull(data.fields[7])) {
                try {
                    const wallStr = window.atob(data.fields[7]);
                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.thres = walls;
                } catch (error) {
                    logger.e('当前地图解析thres追踪数据出错：', error);
                }
            }
        }

        // carpetPrefer
        if (data.fields?.length > 8) {
            if (!isNull(data.fields[8])) {
                try {
                    mapInfo.carpetPrefer = data.fields[8];
                } catch (error) {
                    logger.e('当前地图解析thres追踪数据出错：', error);
                }
            }
        }

        //  测试数据:  
        mapInfo.roomChain = [{
            id: 4, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 5, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 6, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 7, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 8, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 9, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 10, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 11, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 12, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        }, {
            id: 13, PTS: [{//  
                "x": 390,// 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
                "y": 341,
                "v": 4294967295 // 用于展示门的位置，和判断指哪点、划区的合法性
            }, {
                "x": 391,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 392,
                "y": 341,
                "v": 4294967295
            }, {
                "x": 393,
                "y": 341,
                "v": 4294967295
            }]
        },]

        return translateDataKey(mapInfo);
    } else { // 存图数据
        return null
    }

}

/**
 * 四色 - 使用最多颜色
 */
/**
 * 使用最多颜色给房间染色
 * @param {Array} rooms - 房间数组，每个房间包含id和相邻房间neibs
 * [
    { id: 1, neibs: [2, 3] },
    { id: 2, neibs: [1, 3, 4] },
    { id: 3, neibs: [1, 2, 4] },
    { id: 4, neibs: [2, 3] }
  ]
 * @returns {Object} - 包含房间id及其对应的颜色
  {
  1: 1,  // 房间 1 使用颜色 1
  2: 2,  // 房间 2 使用颜色 2
  3: 3,  // 房间 3 使用颜色 3
  4: 4   // 房间 4 使用颜色 4
}
 */
function getRoomColors(rooms) {
    const colorMap = {};  // 存储房间与颜色的对应关系
    const colorUsage = { 1: 0, 2: 0, 3: 0, 4: 0 };  // 记录每种颜色的使用次数

    // 遍历每个房间
    rooms.forEach(room => {
        const usedColors = new Set();  // 记录相邻房间使用的颜色

        // 检查相邻房间并收集已使用的颜色
        room.neibs.forEach(neib => {
            if (colorMap[neib] !== undefined) {
                usedColors.add(colorMap[neib]);
            }
        });

        // 找到使用次数最少的颜色，并且该颜色没有被相邻房间使用
        let selectedColor = null;
        let minUsage = Infinity;

        for (let color in colorUsage) {
            if (!usedColors.has(parseInt(color)) && colorUsage[color] < minUsage) {
                selectedColor = parseInt(color);
                minUsage = colorUsage[color];
            }
        }

        // 为当前房间分配颜色
        if (selectedColor !== null) {
            colorMap[room.id] = selectedColor;
            colorUsage[selectedColor]++;  // 更新该颜色的使用次数
        }
    });

    return colorMap;
}


/**
 * || false、0、NaN、""、null、undefined
 * ?? null 或 undefined
 * @param {*} areas 
 */
function translateRoomInfos(areas) {
    if (!areas) return null;

    const roomColors = getRoomColors(areas.map((item) => ({
        id: item.room_id ?? item.id + 2,
        neibs: item.neibs.map((neib) => parseInt(neib))
    })));
    return areas.map((item) => {
        const point = roomToCRS([item.centerX, item.centerY]);
        return {
            id: item.room_id ?? item.id + 2,
            name: item.name,
            centerX: point.x,
            centerY: point.y,
            neibs: item.neibs.map((neib) => parseInt(neib)),
            type: parseInt(item.type) ?? item.type,
            status: item.status,// // 清扫状态 0-未清扫 1- 正在清扫 2-已经清扫
            material: item.material ?? 0,
            color: roomColors[item.room_id ?? item.id + 2],
            prefer: item.prefer
        }
    });
}

function translateMapData(data) {
    const position = mapToCRS([data.xMin, data.yMax])
    return !data ? null : {
        ...data,
        sizeX: data.width,
        sizeY: data.height,
        minX: position.x,
        minY: position.y,
    }
}

function translatePosData(data) {
    const position = roomToCRS([data.x, data.y])
    return !data ? null : {
        ...data,
        ...position
    }
}

// function translatePathData(data) {
//     // x: number; // 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
//     // y: number;
//     // v: number; // 是否门
//     // break : number, // 是否隔断
//     // type: number; // 动作类型 - 1 弓字
//     // mode: number; // 工作模式 0 扫地，1 拖地，2扫拖
//     return !data ? null : data.map((item) => ({

//     }))
// }

function translateDataKey(data) {
    return !data ? null : {
        mapId: data.mapId,
        name: data.mapName ?? "name",
        saved: data.saved ?? 0,
        full: data.full ?? 0,
        status: data.status ?? 1,
        angle: data.angle,
        upload: data.upload ?? 1230674396,
        begin: data.begin ?? 1230674396,
        mapData: translateMapData(data.mapData), // 地图数据    // 地图更新, 时间戳一定也更新了, 但时间戳更新,地图不一定更新 (十几秒) // 解码: base64js.toByteArray, Lz4.uncompress.
        chargePos: translatePosData(JSON.parse(data.mapData?.chargePos ?? '')), // 充电座位置
        robotPos: translatePosData(data.pos), // 机器人位置
        pathData: data.mapTraceData, // 轨迹数据，具体类型待定
        roomInfos: translateRoomInfos(data.areas), // 房间信息列表
        roomChain: data.roomChain, // 房间边界信息
        virtualAreas: [...data.virtualWalls, ...data.mopWalls, ...data.carpet, ...data.thres], // 虚拟列表
        carpetPrefer: data.carpetPrefer,// 地毯清洁偏好
        three: [], // 3D AI 信息，类型不详
    }
}