import logger from './logger';
import _ from 'lodash';
import storage from './localStorage';
import { SMapColorConfig } from './constants';
import { getMapDataPoints, perfectMapData, Uint8ToPNGBase64 } from './util_function';
import { isNull, generateMd5Key } from "./util_function";
/**
 * 地图坐标转换为 x上y右  笛卡尔坐标 y上 x右 
 *  x                 y 
 * |                |
 * |                |
 * |                |
 * |_ _ _ _ _ y  => |_ _ _ _ _ _ x
 */
export function mapToCRS([x, y]) {
    return [y, x];
}


export function CRSToMap([x, y]) {
    return [y, x];
}

/**
 * 将房间坐标系转换到笛卡尔坐标系 (房间传过来的数据跟地图坐标系不同)
 * @param {[number, number]} ox oy 房间坐标系下的xy
 * @param {number} size 地图的size，default is 800
 * @returns {[number, number]} 笛卡尔坐标系下的xy
 */
export function roomToCRS([ox, oy], size = 800) {
    ox = Number(ox);
    oy = Number(oy);
    return [oy, size - ox];
}

/**
 * 将笛卡尔坐标系下的xy转换到房间坐标系下 
 * @param {[number, number]} ox oy 笛卡尔坐标系下的xy
 * @param {number} size 地图的size，default is 800
 * @returns {[number, number]} 房间坐标系下的xy
 */
export function CRSToRoom([ox, oy], size = 800) {
    ox = Number(ox);
    oy = Number(oy);
    return {
        x: size - ox,
        y: oy
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

/**
 * 转化禁区数据 string -> JSON
 * @param {string} virtualStr "1,1,x1,y1,x2,y2;2,2,x1,y1,x2,y2,x3,y3,x4,y4"... id, type
 * @param {number} mapId 
 * @returns {Array<IVirtualModel>} walls
 */
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
        // logger.d('当前地图更新', JSON.stringify(data));
        // MapData
        if (data?.fields?.length > 0) {
            if (!isNull(data.fields[0])) {
                try {
                    const mapDataStr = atob(data.fields[0]);
                    mapInfo.mapData = JSON.parse(mapDataStr);
                    // logger.d('当前地图数据：', { ...mapInfo.mapData, map: '***', mapId: mapInfo.mapId });

                } catch (error) {
                    logger.e('mapData 解析数据时出错：', error);
                }
            }

        }
        // mapTraceData
        if (data.fields?.length > 1) {
            if (!isNull(data.fields[1])) {
                try {
                    const mapTraceStr = atob(data.fields[1]);
                    mapInfo.mapTraceData = JSON.parse(mapTraceStr);
                    logger.d('当前地图轨迹:', mapInfo.mapTraceData.totalCount);
                } catch (error) {
                    logger.e('当前地图mapTraceData 解析数据时出错：', error);
                }
            }
        }
        // pos
        if (data.fields?.length > 2) {
            try {
                mapInfo.pos = JSON.parse(data.fields[2]);
                logger.d('当前地图------------pos', mapInfo.pos);
            } catch (error) {
                logger.e('当前地图解析机器位置出错:', error);
            }
        }
        // areas
        if (data.fields?.length > 3) {
            if (!isNull(data.fields[3])) {
                try {
                    const areas = JSON.parse(data.fields[3]);
                    logger.d('当前地图------------areas', areas);

                    if (Array.isArray(areas) && areas.length) {
                        mapInfo.areas = areas?.map((area) => {
                            // 转换成[]
                            if (area.neibs !== undefined) {
                                area.neibs = area.neibs.split(',').filter((element) => element !== "");
                            }
                            // 默认name
                            if (area.name === '') {
                                area.name = `房间${area.id}`; //  keyword257: "房间",
                                // area.name=`한국인한국인한국인한국인한국인한국인한국인`;
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
                    const wallStr = atob(data.fields[4]);
                    // logger.d('当前地图------------虚拟墙str', wallStr);

                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.virtualWalls = walls;
                    logger.d('当前地图------------虚拟墙变化', wallStr);

                } catch (error) {
                    logger.e('当前地图解析虚拟墙追踪数据出错：', error);
                }
            }
        }
        // mopWalls
        if (data.fields?.length > 5) {
            if (!isNull(data.fields[5])) {
                try {
                    const wallStr = atob(data.fields[5]);
                    // logger.d('当前地图------------mop虚拟墙 str', wallStr);

                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.mopWalls = walls;
                    logger.d('当前地图------------mop虚拟墙', walls);

                } catch (error) {
                    logger.e('当前地图解析虚拟墙追踪数据出错：', error);
                }
            }
        }
        // carpet
        if (data.fields?.length > 6) {
            if (!isNull(data.fields[6])) {
                try {
                    const wallStr = atob(data.fields[6]);
                    // logger.d('当前地图------------mop虚拟墙 str', wallStr);

                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.carpet = walls;
                    logger.d('当前地图------------地毯数据', walls);

                } catch (error) {
                    logger.e('当前地图解析虚拟墙地毯追踪数据出错：', error);
                }
            }
        }

        // thres
        if (data.fields?.length > 7) {
            if (!isNull(data.fields[7])) {
                try {
                    const wallStr = atob(data.fields[7]);
                    // logger.d('当前地图------------mop虚拟墙 str', wallStr);

                    const walls = stringConvertVirtuals(wallStr, mapInfo.mapId);
                    mapInfo.thres = walls;
                    logger.d('当前地图------------thres数据', walls);

                } catch (error) {
                    logger.e('当前地图解析thres追踪数据出错：', error);
                }
            }
        }

        if (data.fields?.length > 8) {
            if (!isNull(data.fields[8])) {
                try {
                    // logger.d('当前地图------------mop虚拟墙 str', wallStr);
                    mapInfo.carpetPrefer = data.fields[8];
                    logger.d('当前地图------------tcarpetPrefer数据', mapInfo.carpetPrefer);

                } catch (error) {
                    logger.e('当前地图解析thres追踪数据出错：', error);
                }
            }
        }

        return translateMapDataKey(mapInfo);
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
    return areas.map((item) => ({
        id: item.room_id ?? item.id + 2,
        name: item.name,
        centerX: item.centerX,
        centerY: item.centerY,
        neibs: item.neibs.map((neib) => parseInt(neib)),
        type: parseInt(item.type) ?? item.type,
        status: item.status,// // 清扫状态 0-未清扫 1- 正在清扫 2-已经清扫
        material: item.material ?? 0,
        color: roomColors[item.room_id ?? item.id + 2],
        prefer: item.prefer
    }));
}

function translateMapData(data) {
    return !data ? null : {
        ...data,
        sizeX: data.width, // 地图坐标系 是 x上 y 右
        sizeY: data.height, // 
        minX: data.xMin, // 最小 X 坐标
        minY: data.yMax, // 最小 Y 坐标
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

function translateMapDataKey(data) {
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
        chargePos: JSON.parse(data.mapData?.chargePos ?? ''), // 充电座位置
        robotPos: data.pos, // 机器人位置
        pathData: data.mapTraceData, // 轨迹数据，具体类型待定
        roomInfos: translateRoomInfos(data.areas), // 房间信息列表
        roomChain: data.roomChain, // 房间边界信息
        virtualAreas: [...data.virtualWalls, ...data.mopWalls, ...data.carpet, ...data.thres], // 虚拟列表
        carpetPrefer: data.carpetPrefer,// 地毯清洁偏好
        three: [], // 3D AI 信息，类型不详
    }
}