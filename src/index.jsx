import React, { useState, useEffect, useMemo } from 'react';
import L from 'leaflet';
import { Observer, useLocalObservable } from 'mobx-react-lite';
import {
    CLEAN_TIMES,
    isWorking,
    WIND_LEVEL,
    MAP_COLOR,
    VIRTUAL_TYPE,
    SMapColorConfig,
    bottomBarHeight,
    isInStation,
    WORK_STATE,
    SWEEP_MODE,
    WATER_LEVEL,
} from './utils/constants';
import robotAnimated from './RobotAnimated';
import {
    Uint8ToPNGBase64,
    getMapValue,
    SMapValueType,
    SCCMapColor,
    isCarpetXY,
    setRGBA,
    perfectMapData,
    isMaterialXY,
    isNull
} from './utils/util_function';

import './index.less';
import './Path.Drag';
import { Images } from './assets';
import logger from './utils/logger';
import { useIsMounted } from './hooks';
import { decode as base64decode, toUint8Array } from 'js-base64';
import storage from './utils/localStorage';
import { fetchMapImage } from './utils/util_mapData';
import base64js from 'base64-js';
import Lz4 from './utils/lz4Util';



const areaColor = {
    fill: 'rgba(255,255,255,0.39)', // 划区框颜色
    border: 'white', // 划区框边框颜色
}
const useOldmap = 0;
const PATH_WEIGHT_LIMIT = 0.5; // 路径最小线宽

let map = null;
let mapReadyStatus = true;// 地图是否准备好 绘制
// 当前的地图缩放等级, 偏移量
let mapTrans = { offsetX: 0, offsetY: 0, scale: 1 };
/** layer */
//地图图层
let mapLayer = null;
//充电桩图层
let chargeStationLayer = null;
// 虚拟墙图层
let virtualWallsLayer = null;
// 划区图层
let areaLayers = [];
// 房间名称图层
let roomNameLayer = [];
//房间组图层
let roomsGroupLayer = null;
//房间图层
let roomsLayer = [];
//路径图层
let lastPathLayer = null;
// 机器人图层
let robotMarker = null;
// AI物体涂层
// let aiMarkers = [];
//设置的划区图层
let setArearect = null;

// 地图边界
let xMin = 0;
let yMin = 0;
let resolution = 0;//分辨率
let mapPathArray = [];
let isFit = true; // 是否需要重新适配

let startAng = 0;//矩形初始对角线夹角
// let zoomStartPoint = null;
// let tlStartPoint = null;
// let trStartPoint = null;
// let blStartPoint = null;
// let width = 0;
// let height = 0;

let rotateMarker = null;
let zoomMarker = null;
let closeMarker = null;

// 真实的房间边界点
let realRoomChains = [];
// 地图的边界  左上、左下、右下、右上、中心
let mapValidRect = {};

// 分割线
let line = null;
let dot1 = null;
let dot2 = null;
// 分割划线起始点
let startPoint = {};
// 分割划线结束点
let endPoint = {};
// 分割线起始点
let lineStart = { lat: 0, lng: 0 };
// 分割线结束点
let lineEnd = { lat: 0, lng: 0 };

// 当前操作的房间链条
let curEditChain = null;
// 本地缓存的路径点字典
let mapPathAllArray = []; // 根据mapPathAllMap生成的array,[{ x:0,y:0,tie:1 },...]
let drawPathAndRobotTime = null;

// 屏幕的宽高
let screenWidth = document.body.clientWidth;
let screenHeight = document.documentElement.clientHeight;

// 全图的boudaryInfo
let boudaryInfo;
// 房间关系矩阵-对象  [{"room_id":11,"neibs":"12,13"},{"room_id":12,"neibs":"11"},{"room_id":13,"neibs":"11"}]}
let roomMatrix;

// 距离开始限制拖动的距离
let lastMapDistance = { left: 10000, right: 10000, top: 10000, bottom: 10000 };

// 地图的默认缩放比例
let mapZoonRect = { max: 2, min: 0.01, default: 1 };
let customTempList = [];
const topBarHeight = 88;

/** 虚拟墙 */
// 右上按钮
let topRightMarker = null;
// 左下角按钮
let bottomLeftMarker = null;
// 当前虚拟墙id
let currentLayer = null;
// zoomMarker坐标旧值
let oldZoomLatlng = null;
// 禁止缩放
let zoomDisable = false;
// 缩放起始点
let zoomStart_tr, zoomStart_tl, zoomStart_bl, zoomStart_br = null;
let initialWidth = 0;
let initialHeight = 0;
// 拖拽控件的类型 划区/禁区
const ZoomMarkerType = { Area: 'ZoomMarkerType_Area', Wall: 'ZoomMarkerType_Wall' };
// 是否已添加了拆分滑动监听，防止重复添加
let isAddSplitListener = false;
// 组件已卸载
let isUnmount = false;
// 房间信息（临时方案：解决分割后，房间信息没更新问题）
let rInfo = null;
// 上一次地图的上传时间，用于过滤重复渲染
let lastUploadTime = 0;

// 划区编辑框数组(id, layer)
const areaLayerEditArr = [];

const MapView = (props) => {
    //marker图标
    const closeIcon = L.icon({
        iconUrl: Images.closeIconUrl,
        iconSize: [25, 25],
        className: 'closemarker'
    });
    //旋转图标
    const xuanzhuanIcon = L.icon({
        iconUrl: Images.xuanzhuanIconUrl,
        iconSize: [25, 25],
        className: 'rotateIcon'
    });
    //缩放图标
    const suofangIcon = L.icon({
        iconUrl: Images.suofangIconUrl,
        iconSize: [32, 32],
        className: 'zoomIcon'
    });
    const topRightIcon = L.icon({
        iconUrl: Images.topRightIconUrl,
        iconSize: [1, 1],
        className: 'rotateIcon'
    });

    const {
        mapInfo,
        onMapMoveStart,
        onMapMoveEnd,
        onDrawFinish // 地图渲染完成
    } = props;

    const store = useLocalObservable(() => ({
        mapModel: null, // 当前地图对象 
        // {"angle": 0, "areas": "", "full": 0, "index": 0, "mapData": {map,width,height,minX,maxY,timetamp}, "mapId": 0, "mapTraceData": "***", "mopWalls": "", 
        // "name": "", "pos": "{\"x\":411,\"y\":396,\"a\":231,\"i\":0}", "saved": 0, "status": 1, "ts": 1416732620, "virtualWalls": ""}
        lastMapModel: null, // 上一次地图对象

        mapScale: 1, // 地图缩放比例

        arearectLatlngs: [], // 划区框坐标

        // action
        setMapModel(newMapInfo) {
            //TODO: 测试数据 需要解析mapData
            if (!isNull(newMapInfo?.mapData)) {
                const mapData = base64decode(newMapInfo.mapData);
                newMapInfo.mapData = JSON.parse(mapData);
            }

            //TODO: 测试数据 需要解析mapData
            if (!isNull(newMapInfo?.areas)) {
                newMapInfo.areas = JSON.parse(newMapInfo.areas);
            }

            this.mapModel = newMapInfo;
        },

        setMapScale(scale) {
            this.mapScale = scale;
        }
    }));

    const isMounted = useIsMounted();

    // 初始化 
    useEffect(() => {
        // 新建map对象
        lastUploadTime = 0;
        isUnmount = false;
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            zoomSnap: 0.01,//缩放精度
            zoom: mapZoonRect.default,
            minZoom: mapZoonRect.min,
            maxZoom: mapZoonRect.max,
            crs: L.CRS.Simple,// 笛卡尔坐标系 y上 x右
            editable: true,
            touchZoom: 'center',
            bounceAtZoomLimits: false,
            debounceMoveend: false,
            doubleClickZoom: false,
            easeLinearity: 0.0,
            renderer: L.canvas({ padding: 0.05 })
        });
        logger.d(`55555--->初始化`);

        fitBounds();

        // 地图在操作中，不要重绘
        map.on('zoom', (e) => {
            mapReadyStatus = false;
        });
        map.on('movestart', (e) => { // move
            onMapMoveStart && onMapMoveStart();
            logger.d(`map movestart:`);
        });
        map.on('move', (e) => { // move
            mapReadyStatus = false; // logger('map move:');
            // 设置最大边界
            setupMaxRect();
        });
        map.on('error', (e) => { // error
            onMapMoveEnd && onMapMoveEnd();
        });

        map.on('moveend', (e) => { // move end
            // if (Store.isSegmentation) {
            //     logger.d('moveend 强制禁用')
            //     map && map.dragging.disable();
            //     return;
            // }
            mapReadyStatus = true;
            // logger.d('map moveend zoom:', e.target.getZoom());
            setTimeout(() => {
                // logger.d('7777-moveend:允许拖动');
                map && map.dragging.enable();
                onMapMoveEnd && onMapMoveEnd();
            }, 300);
        });
        map.on('zoomend', (e) => {
            mapReadyStatus = true;
            // logger.d('map zoomend zoom:', e.target.getZoom());
            mapTrans.scale = e.target.getZoom();
            store.setMapScale(mapTrans.scale);
        });

        map.on('load', (e) => {
        });
        logger.d('7777-初始屏幕宽高:', screenWidth, screenHeight); // 414 – 896
        return () => {
            logger.d(`map deinit销毁`);
            isUnmount = true;
            mapReadyStatus = true;
            mapLayer && map.removeLayer(mapLayer);
            mapLayer = null;
            chargeStationLayer && map.removeLayer(chargeStationLayer);
            chargeStationLayer = null;
            virtualWallsLayer && map.removeLayer(virtualWallsLayer);
            virtualWallsLayer = null;
            clearAreaLayers();
            resetFunctionBtn();
            if (setArearect) {
                setArearect.remove();
                setArearect = null;
            }
            roomNameLayer = [];
            roomsGroupLayer && map.removeLayer(roomsGroupLayer);
            roomsGroupLayer = null;
            roomsLayer = [];
            map.remove();
            map = null;
            isAddSplitListener = false;
            rInfo = null;
            lastUploadTime = 0;
            // 清空过期缓存
            storage.clearExpiredItems();
        }
    }, [])

    // const mapPoints = useMemo(() => {
    //     try {
    //         if (!store.mapModel.mapData || !store.mapModel.mapData?.lz4Len) {
    //             throw new Error('useMapPoints map pix is empty');
    //         }
    //         const decodedString = base64js.toByteArray(map);
    //         const data = Lz4.uncompress(decodedString, store.mapModel.mapData.lz4Len);
    //         const uint8Array = new Uint8Array(data);
    //         return uint8Array;
    //     } catch (error) {
    //         logger.e('Error in useMapPoints:', error);
    //         return [];
    //     }
    // }, [store.mapModel?.mapData]);

    /**
    * 清除屏幕上的划区框（非编辑的，在地图数据中的）
    */
    function clearAreaLayers() {
        logger.d("划区 - clearAreaLayers");
        if (areaLayers.length > 0) {
            areaLayers.forEach(layer => {
                layer.remove();
                layer = null;
            });
            areaLayers = [];
        }
    }

    /**
     * 重置功能按钮
     * 缩放、关闭、移动、上右、下左
     */
    function resetFunctionBtn() {
        logger.d("划区 - resetFunctionBtn");
        zoomMarker && zoomMarker.remove();
        closeMarker && closeMarker.remove();
        rotateMarker && rotateMarker.remove();
        topRightMarker && topRightMarker.remove();
        bottomLeftMarker && bottomLeftMarker.remove();
        zoomMarker = null;
        closeMarker = null;
        rotateMarker = null;
        topRightMarker = null;
        bottomLeftMarker = null;
    }

    /** 禁区 */

    /** 划区 */

    /** 房间 */

    /** 图标位置 */

    /** 轨迹 */

    /** 地图 */
    useEffect(() => {
        store.setMapModel(mapInfo);
    }, [mapInfo]);

    useEffect(() => {
        logger.d("mapInfo2:", JSON.stringify(store.mapModel));
        if (store.mapModel && !isNull(store.mapModel?.mapData)) {
            try {
                drawMap();
            } catch (error) {
                logger.d("地图渲染异常", error);
            }
        }
    }, [store.mapModel])

    const drawMap = async () => {
        if (!map || !store.mapModel || isUnmount) return;
        logger.d("开始绘制地图");
        // logger.d(`55555--->drawMap--->`);

        //判断是否需加载缓存
        await drawGround(false);

        // // 绘制房间名称+区域+面板
        // handleRoom();
        // // // 绘制充电座
        // drawChargeBase();
        // // // 绘制虚拟墙
        // drawVirtualWalls();
        // // // 地图详情不显示路径、机器人和AI物体
        // if (Store.currentPage !== PAGES.mapediter) {
        //   // 绘制地毯专清区域
        //   drawCarpetArea();
        //   // 绘制划区
        //   handleArea();
        //   // 更新本地历史轨迹缓存
        //   updatePathData(2);
        //   // 绘制路径
        //   drawPath();
        //   // 绘制机器人
        //   drawRobot();
        //   // 绘制AI物体
        //   // drawAIObject();
        // }

        // 居中缩放
        fitBounds();

        if (isFit) {
            firstFitBound();
        }

        // 地图渲染完成
        onDrawFinish && onDrawFinish();

        // 如果是从后台回来的，在这里释放标记
        // if (Store.isAppBackground) {
        //   logger.d('检测到后台返回，并且已经刷新了地图，这里释放路径刷新开关')
        //   Store.setIsAppBackground(false);
        // }
    }

    async function drawGround() {
        let beginTime = new Date().getTime() / 1000; // 
        // 拦截重复渲染
        if (store.mapModel.ts === lastUploadTime) { // 等于上一个
            logger.d('该地图已经渲染过来，无需重新处理', lastUploadTime);
            return;
        }
        lastUploadTime = store.mapModel.ts;
        // lastUploadTime = mapModel.ext.upload;
        // 判断是否处理过
        const mapPoints = () => {
            try {
                if (!store.mapModel.mapData || !store.mapModel.mapData?.lz4Len) {
                    throw new Error('useMapPoints map pix is empty');
                }
                const decodedString = base64js.toByteArray(store.mapModel.mapData.map);
                const data = Lz4.uncompress(decodedString, store.mapModel.mapData.lz4Len);
                const uint8Array = new Uint8Array(data);
                logger.d('uint8Array in useMapPoints:', uint8Array);

                return uint8Array;
            } catch (error) {
                logger.e('Error in useMapPoints:', error);
                return [];
            }
        }

        const base64Array = await fetchMapImage({
            mapId: store.mapModel.mapId,
            mapPoints: mapPoints(),
            width: store.mapModel.mapData.width,
            height: store.mapModel.mapData.height,
            timestamp: store.mapModel.mapData.timestamp ?? '',
            areas: store.mapModel.areas,
        });
        if (!map) {
            logger.d('drawGround 地图为空，无法渲染');
            return;
        }

        // minX，maxX, minY, maxY 1234
        // const latLngBoundsT = [{ lng: base64Array[1], lat: base64Array[4] }, { lng: base64Array[2], lat: base64Array[3] },];
        // logger.d(`6666-----实时地图边界:`, JSON.stringify(latLngBoundsT));
        // resetMapValidRect([base64Array[1], base64Array[2], base64Array[3], base64Array[4]]);



        // if (mapChanged || !mapLayer) {
        //     if (mapLayer) mapLayer.remove();
        //     mapLayer = L.imageOverlay(base64Array[0], latLngBoundsT, { zIndex: MapZIndex.map });
        //     map.addLayer(mapLayer);
        // } else {
        //     mapLayer.setUrl(base64Array[0]);
        //     mapLayer.setBounds(latLngBoundsT);
        // }

        //缓存地图数据
        // if (isCacheHome) {//需要缓存首页地图信息
        //     Store.setHomeCacheMapInfo(base64Array);

        // } else {//暂存设置页地图信息，需要时赋值给首页
        //     //判断是否需要同步编辑页缓存
        //     logger.d('非首页解析得到base64地图，判断是否需要缓存到首页');
        //     const needCacheEditArearMap = Store.needCacheNoneHomeMap;
        //     if (needCacheEditArearMap) {
        //         Store.setHomeCacheMapInfo(base64Array);
        //         //重置缓存非首页地图标志位
        //         Store.setNeedCacheNoneHomeMap(false);
        //     }
        // }


        // {
        //   beginTimeT = new Date().getTime() / 1000; // 
        //   logger.d(`6666-----添加完成1--- 地面 用时:${beginTimeT - beginTime}`);
        //   beginTime = beginTimeT;
        // }
    }

    /** 手势 */
    function setupMaxRect() {
        if (isFit) return;  // 第一次数据是错误的
        if (!map) return;
        const radio = 0.05; // 在屏幕上能看到的有效区的比例
        // 左上角的点，距离屏幕右边的距离，不能低于 有效区宽度的10%
        // 左上角的点，距离屏幕底边的距离，不能低于 有效区高度度的10%
        var leftTopP = map.latLngToContainerPoint(mapValidRect.leftTop);

        var rightBottomP = map.latLngToContainerPoint(mapValidRect.rightBottom);
        // logger.d('setupMaxRect leftTopP', leftTopP, rightBottomP, screenWidth, screenHeight); 
        let distanceX = rightBottomP.x - leftTopP.x; // leaflex 坐标系下
        let distanceY = rightBottomP.y - leftTopP.y;

        // let xToRight = screenWidth + screenWidth - distanceX * radio;
        // let yToTop = screenHeight * 2 - (distanceY * radio + bottomBarHeight);  // 距离顶部
        let xToRight = screenWidth - distanceX * radio;
        let yToTop = screenHeight - (distanceY * radio + bottomBarHeight);  // 距离顶部

        var isValid = true;

        let distanceRight = xToRight - leftTopP.x;

        if (distanceRight < 0) {
            logger.d('太右了 7777-99999:leftTopP.x:', leftTopP.x, xToRight);
            isValid = false;
        }
        // logger.d('7777-99999:leftTopP:', leftTopP.y, yToTop); 
        let distanceBottom = yToTop - leftTopP.y
        if (distanceBottom < 0) {
            logger.d('太下了 7777-99999:leftTopP.y:', leftTopP.y, yToTop);
            isValid = false;
        }

        // 右下角的点，距离屏幕左边的距离，不能低于 有效区宽度的10%
        // let x2ToRight = screenWidth + distanceX * radio;
        let x2ToRight = distanceX * radio;

        let distanceLeft = rightBottomP.x - x2ToRight;
        if (distanceLeft < 0) {
            logger.d('太左了 7777-99999:rightBottomP.x:', rightBottomP.x, x2ToRight);
            isValid = false;
        }

        // let y2ToTop = screenHeight + (distanceY * radio + topBarHeight);  // 距离顶部
        let y2ToTop = (distanceY * radio + topBarHeight);  // 距离顶部
        // logger.d('7777-99999:rightBottomP:', rightBottomP.y, yToTop); 
        let distanceTop = rightBottomP.y - y2ToTop;
        if (distanceTop < 0) {
            logger.d('太上了 7777-99999:rightBottomP.y:', rightBottomP.y, y2ToTop);
            isValid = false;
        }
        if (isValid) {
            map && map.dragging.enable();
        }
        else {
            if (distanceLeft > lastMapDistance.left && lastMapDistance.left < 0) {
                logger.d(`7777- 在禁止拖动的基础上，有所改善-- 左`);
            } else if (distanceRight > lastMapDistance.right && lastMapDistance.right < 0) {
                logger.d(`7777- 在禁止拖动的基础上，有所改善-- 右`);
            } else if (distanceTop > lastMapDistance.top && lastMapDistance.top < 0) {
                logger.d(`7777- 在禁止拖动的基础上，有所改善-- 上`);
            } else if (distanceBottom > lastMapDistance.bottom && lastMapDistance.bottom < 0) {
                logger.d(`7777- 在禁止拖动的基础上，有所改善-- 下`);
            } else {
                logger.d(`7777- 禁止拖动`);
                map && map.dragging.disable();
                const flyDistance = -30;
                if (distanceLeft < flyDistance || distanceRight < flyDistance || distanceTop < flyDistance || distanceBottom < flyDistance) {
                    logger.d(`7777- 触发居中 55555--->手势触发，缩小`);
                    fitBounds();
                }
            }
        }
        lastMapDistance.left = distanceLeft;
        lastMapDistance.right = distanceRight;
        lastMapDistance.top = distanceTop;
        lastMapDistance.bottom = distanceBottom;
    }
    /** private */
    function firstFitBound() {
        if (!map || isUnmount) return;
        if (!mapValidRect.rightBottom || !mapValidRect.leftTop) {
            logger.d('firstFitBound异常,缺少mapValidRect数据');
            return;
        }
        const showRectHeight = screenHeight - topBarHeight - bottomBarHeight;
        let leftTopP = { x: screenWidth * 1.1, y: screenHeight + topBarHeight + showRectHeight * 0.1 };
        var lf_leftTopP = map.containerPointToLatLng(leftTopP);
        // L.circle(lf_leftTopP, { color: "#000000", fillColor: '#000000', fillOpacity: 1, radius: 10 }).addTo(map);

        let rightBottomP = { x: screenWidth * 1.9, y: screenHeight + topBarHeight + showRectHeight * 0.9 };
        var lf_rightBottomP = map.containerPointToLatLng(rightBottomP);
        // L.circle(lf_rightBottomP, { color: "#FFFF00", fillColor: '#FFFF00', fillOpacity: 1, radius: 10 }).addTo(map);

        // logger.d(`00000-> 目标边界 左上角+右下角:`, lf_leftTopP, lf_rightBottomP);

        let distanceX = lf_rightBottomP.lng - lf_leftTopP.lng;
        let distanceY = lf_leftTopP.lat - lf_rightBottomP.lat;
        // logger.d(`00000-> distanceX:${distanceX} distanceY:${distanceY}`);

        let distanceValidX = mapValidRect.rightBottom.lng - mapValidRect.leftTop.lng;
        let distanceValidY = mapValidRect.leftTop.lat - mapValidRect.rightBottom.lat;
        // logger.d(`00000-> distanceRect X:${distanceValidX} distanceY:${distanceValidY}`);

        var radioX = distanceX / distanceValidX;
        radioX = radioX > mapZoonRect.max ? mapZoonRect.max : radioX;
        radioX = radioX < mapZoonRect.min ? mapZoonRect.min : radioX;

        var radioY = distanceY / distanceValidY;
        radioY = radioY > mapZoonRect.max ? mapZoonRect.max : radioY;
        radioY = radioY < mapZoonRect.min ? mapZoonRect.min : radioY;

        const targetZoom = Math.min(radioX, radioY);
        logger.d(`00000-> 默认缩放比例 distanceRect Radio:${radioX} distanceY:${radioY} targetZoom:${targetZoom}`);
        map.setView(mapValidRect.centerP, targetZoom, { animate: false });

    }
    // 适配 有效点移动到屏幕中心，并适配缩放 needFix > 0 ：需要缩小 needFix < 0 ：需要放大
    const fitBounds = () => {
        if (!map || isUnmount) return;
        logger.d(`55555--->fitBounds--- isFit:${isFit}`);
        // return;
        logger.d(`55555--->needFix1 mapValidRect:`, mapValidRect.centerP);
        if (mapValidRect.centerP) {  // 0.736 * 0.736
            if (isFit) {
                let targetZoom = 0.2;
                if (isFit) targetZoom = 0.7;
                if (store.mapModel && store.mapModel.ext && store.mapModel.ext.boudaryInfo) {
                    const { vMinX, vMaxX, vMinY, vMaxY } = store.mapModel.ext.boudaryInfo;
                    // 缩放等级
                    const limintLevel = [
                        { level: 360, scale: 0.01 },
                        { level: 340, scale: 0.05 },
                        { level: 320, scale: 0.1 },
                        { level: 300, scale: 0.15 }
                    ];
                    const maxOffset = Math.max(vMaxX - vMinX, vMaxY - vMinY);
                    for (let i = 0; i < limintLevel.length; i++) {
                        if (maxOffset > limintLevel[i].level) {
                            targetZoom = limintLevel[i].scale;
                            break;
                        }
                    }
                }
                isFit = false;
                logger.d(`55555--->needFix3:位置 ${JSON.stringify(mapValidRect.centerP)} targetZoom:${targetZoom}`);
                map.setView(mapValidRect.centerP, targetZoom, { animate: false });
                // map.setView(L.latLng(400, -400));
            } else {
                // logger.d(`55555--->needFix3:`, needFix);
            }
        } else {
            logger.d(`55555--->needFix4:默认位置400, -400`);
            map.setView(L.latLng(400, 400));
        }
    }

    // 重设地图边界
    function resetMapValidRect(array) {
        // minX，maxX, minY, maxY
        let leftTop = { lng: array[0], lat: array[3] };
        let leftBottom = { lng: array[0], lat: array[2] };
        let rightBottom = { lng: array[1], lat: array[2] };
        let rightTop = { lng: array[1], lat: array[3] };

        let centerP = { lng: (array[0] + array[1]) / 2, lat: (array[2] + array[3]) / 2 };

        mapValidRect.leftTop = leftTop;
        mapValidRect.leftBottom = leftBottom;
        mapValidRect.rightBottom = rightBottom;
        mapValidRect.rightTop = rightTop;
        mapValidRect.centerP = centerP;

        mapValidRect.offsetX = centerP.lng + store.mapModel.head.size[0] / 2;
        mapValidRect.offsetY = centerP.lat - store.mapModel.head.size[1] / 2;

        mapValidRect.validSizeX = rightTop.lng - leftTop.lng;
        mapValidRect.validSizeY = leftTop.lat - leftBottom.lat;

        // 屏幕坐标系 在默认缩放为1是的坐标
        logger.d(`888----mapValidRect:`, mapValidRect);
        setupMaxRect(1);

        // {
        //   // TODO: 地图有效区的四个顶点
        //   L.circle(leftTop, { color: "#FF0000", fillColor: '#FF0000', fillOpacity: 1, radius: 1 }).addTo(map);
        //   L.circle(leftBottom, { color: "#00FF00", fillColor: '#00FF00', fillOpacity: 1, radius: 1 }).addTo(map);
        //   L.circle(rightBottom, { color: "#0000FF", fillColor: '#0000FF', fillOpacity: 1, radius: 1 }).addTo(map);
        //   L.circle(rightTop, { color: "#FFFFFF", fillColor: '#FF0000', fillOpacity: 1, radius: 1 }).addTo(map);
        //   // 中心
        //   L.circle(centerP, { color: "#000000", fillColor: '#FF0000', fillOpacity: 1, radius: 1 }).addTo(map);
        // }
    }


    return (<div className="mapBox">
        <div id="map" style={{ width: '100%', height: '100%', left: 0, top: 0 }}
        />
    </div>);

}

export default MapView;


// import globals from "globals";
// import pluginReact from "eslint-plugin-react";


// export default [
//   {
//     ignores: ['dist/**', 'node_modules/**'],
//   },
//   {
//     files: ["**/*.{js,mjs,cjs,jsx}"],
//     languageOptions: {
//       globals: globals.browser,
//     },
//     ...pluginReact.configs.flat.recommended, // 引入 React 的推荐配置
//   },
// ];