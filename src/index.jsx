import React, { useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import {
    getCorrectBound,
    isNull
} from './utils/util_function';
import { MapZIndex, MAP_COLOR } from './utils/constants';
import './index.less';
import logger from './utils/logger';
import { useIsMounted } from './hooks';
import storage from './utils/localStorage';
import { fetchMapImage, paresMapData, roomToCRS, CRSToRoom } from './utils/util_mapData';
import 'leaflet-path-drag';
import getChargeIcon from './components/chargeIcon';
import getRobotIcon from './components/robotIcon';
import roomInfoCard from './components/customInfoCard'

import { MapInfo, RoomTipType, CleanModeType } from './interface.ts';
import testData from './testData.json';



/**
 * @typedef {Object} LayersRefType
 * @property {L.ImageOverlay|null} mapLayer - 地图
 * @property {Object|null} virtualWallsLayer - 虚拟墙
 * @property {Array<>} areaLayers - 划区
 * @property {Array} roomNameLayer - 房间名称
 * @property {Array} roomsLayer - 房间
 * @property {Object|null} lastPathLayer - 路径
 * @property {L.Marker|null} robotMarker - 机器人
 * @property {L.Marker|null} chargeStationMarker - 充电桩
 * @property {Object|null} setArearect - 设置划区
 * @property {L.Marker|null} topRightMarker - 上右
 * @property {L.Marker|null} bottomLeftMarker - 下左
 * @property {L.Marker|null} rotateMarker - 旋转
 * @property {L.Marker|null} zoomMarker - 缩放
 * @property {L.Marker|null} closeMarker - 关闭
 */



//marker图标
const closeIcon = L.icon({
    iconUrl: './assets/img/close.png',
    iconSize: [25, 25],
    className: 'closemarker'
});
//旋转图标
const xuanzhuanIcon = L.icon({
    iconUrl: './assets/img/xuanzhuan.png',
    iconSize: [25, 25],
    className: 'rotateIcon'
});
//缩放图标
const suofangIcon = L.icon({
    iconUrl: './assets/img/suofang.png',
    iconSize: [32, 32],
    className: 'zoomIcon'
});
const topRightIcon = L.icon({
    iconUrl: './assets/img/topRight.png',
    iconSize: [1, 1],
    className: 'rotateIcon'
});


const MapView = (props) => {
    const {
        mapInfo,
        cleanMode = CleanModeType.Smart,
        selectedRooms = [], // 选中的房间
        uiConfig:
        {
            isEditPileRin = false, // 是否可编辑禁区
            isShowPileRin = false, // 是否显示禁区

            isShowSplitLine = false, // 是否显示分割线
            isShowCurPosRing = false, // 是否显示机器人当前位置
            isShowBaseRing = false, // 是否显示基站ring

            isShowTrace = false, // 是否显示轨迹
            isShowAreaTips = false, // 是否显示房间标记
            roomTipType = RoomTipType.IconName, // 房间标记类型

            isEditZoning = false, // 是否可编辑划区
            isShowZoning = false, // 是否显示划区

            isShowCarpet = false, // 是否显示地毯
            isEditCarpet = false, // 是否可编辑地毯

            isSupportPanZoom = false, // 是否可缩放
            isSupportSelectArea = false // 是否可选房间
        },
        onMapMoveStart,
        onMapMoveEnd,
        onDrawFinish, // 地图渲染完成
    } = props;

    /** 图层引用 */
    /** @type {React.MutableRefObject<L.Map>} */
    const mapRef = useRef(null);
    /** @type {React.MutableRefObject<LayersRefType>} */
    const layersRef = useRef({
        mapLayer: null,//
        virtualWallsLayer: null, // 虚拟墙
        areaLayers: [], // 划区

        roomNameLayer: [], // 房间名称
        roomsLayer: [], // 房间框

        lastPathLayer: null, // 路径
        robotMarker: null, // 机器人
        chargeStationMarker: null, // 充电桩
        setArearect: null, // 设置划区
        // 图层按钮
        topRightMarker: null, // 上右
        bottomLeftMarker: null, // 下左
        rotateMarker: null, // 旋转
        zoomMarker: null, // 缩放
        closeMarker: null, // 关闭
    });
    /** @type {React.MutableRefObject} */
    const mapZoonRectRef = useRef({ max: 4, min: -1, default: 1.0, current: 0.0, showRatio: 0.9 });

    // 数据
    /** @type {React.MutableRefObject<MapInfo>} */
    const mapModel = useRef(null);

    /** @type {React.MutableRefObject} */
    const lastMapModel = useRef(null);

    /** @type {React.MutableRefObject<number>} */
    const mapScale = useRef(1);

    /** @type {React.MutableRefObject<string>} 内存缓存 */
    const mapBase64Image = useRef('');
    // 所有记录的数据坐标以leaflet 坐标系为准.
    /** @type {React.MutableRefObject} 地图图层有效范围 */
    const mapValidRectRef = useRef({});

    /** @type {React.MutableRefObject<[]>} 房间边界 集合 */
    const roomChainsRef = useRef([]);

    /** @type {React.MutableRefObject<number>} */
    const lastUploadTimeRef = useRef(0);

    /** @type {React.MutableRefObject<boolean>} */
    const mapReadyStatusRef = useRef(true);

    const isUnmount = !useIsMounted();// 已挂载

    // 初始化 
    useEffect(() => {

        mapRef.current = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            zoomSnap: 0.01,
            zoom: mapZoonRectRef.current.default,
            minZoom: mapZoonRectRef.current.min,
            maxZoom: mapZoonRectRef.current.max,
            crs: L.CRS.Simple,
            editable: true,
            touchZoom: 'center',
            bounceAtZoomLimits: false,
            debounceMoveend: false,
            doubleClickZoom: false,
            easeLinearity: 0.0,
            center: L.latLng(400, 400),
            renderer: L.canvas({ padding: 0.05 })
        });
        logger.d(`55555--->初始化`);
        // fitMapBounds(1);
        // 地图在操作中，不要重绘
        mapRef.current.on('zoom', (e) => {
            mapReadyStatusRef.current = false;
        });
        mapRef.current.on('movestart', (e) => { // move
            // logg('map movestart:');
        });
        mapRef.current.on('move', (e) => { // move
            mapReadyStatusRef.current = false; // logger('map move:');
            // setupMaxRect();
        });

        mapRef.current.on('moveend', (e) => { // moveend
            mapReadyStatusRef.current = true;
            // // logger.d('map moveend zoom:', e.target.getZoom());
            // setTimeout(() => {
            //     // logger.d('7777-moveend:允许拖动');
            //     map && map.dragging.enable();
            // }, 300);
        });
        mapRef.current.on('zoomend', (e) => {
            mapReadyStatusRef.current = true;
            // mapTrans.scale = e.target.getZoom();
            // logger.d('map zoomend zoom:', mapTrans.scale);
            // mapOnZoomend();
        });
        mapRef.current.on('load', (e) => {
        });

        logger.d(`55555--->初始化完成`, testData);

        return () => {
            mapRef.current.eachLayer((layer) => {
                mapRef.current.removeLayer(layer);
            });
            mapRef.current.off();
            mapRef.current.remove();
            mapRef.current = null;
            // 清空过期缓存
            storage.clearExpiredItems();
        }
    }, [])

    useEffect(() => {
        // 过滤
        if (isNull(mapInfo) || isNull(mapInfo.mapId) || isNull(mapInfo.mapData)) {
            return;
        }
        // 处理地图数据, 缓存 + 更新
        // handleMapData(mapInfo);
        const info = paresMapData(testData);
        logger.d('地图数据处理完成', info);
        handleMapData(info)
        mapModel.current = info;
    }, [mapInfo, handleMapData])

    const handleMapData = useCallback(async (newMapInfo) => {
        const { chargePos, robotPos, pathData, roomInfos, roomChain } = newMapInfo;
        if (isUnmount) return;

        await drawMapGround(newMapInfo);
        // 绘制房间名称+区域+面板
        handleRoom(roomInfos, roomChain);

        drawCharge(chargePos);

        drawRobot(robotPos);

        drawPath();

        logger.d('地图绘制完成')

    }, [drawCharge, drawMapGround, drawPath, drawRobot, drawRoom, isUnmount])

    // 地图
    const drawMapGround = useCallback(async (newMapInfo) => {
        const { minX, minY, sizeX, sizeY, map, lz4Len } = newMapInfo.mapData;

        // 1, 从内存取
        if (newMapInfo.upload < mapModel.current?.upload) {
            logger.d('过滤渲染旧图', newMapInfo.upload, mapModel.upload);
            return;
        }

        const mapChanged = newMapInfo.begin != mapModel.current?.begin || newMapInfo.mapId != mapModel.current?.mapId;
        if (newMapInfo.upload === mapModel.current?.upload && !mapChanged) {
            logger.d('过滤渲染相同图', newMapInfo.mapId);
            return;
        }
        // 从本地取图或云端数据重新生成
        const res = await fetchMapImage({
            perfectScale: !mapModel.current ? 2 : 1, // 第一次,加载1倍图. 加快首页图速度
            mapId: newMapInfo.mapId,
            map,
            lz4Len,
            minX,
            minY,
            sizeX,
            sizeY,
            roomInfos: newMapInfo.roomInfos ?? []
        });

        if (res) {
            logger.d('地图图片渲染生成', res);
            mapBase64Image.current = res.base64Image;
            // 绘制
            if (layersRef.current.mapLayer) {
                layersRef.current.mapLayer.remove();
            }
            //由于设备返回地图图片的minY和maxY是上下镜像的，这里需要用Y-总高度。
            const mapLayerBounds = L.latLngBounds(L.latLng(res.minPoint.y - sizeY, res.minPoint.x), L.latLng(res.maxPoint.y - sizeY, res.maxPoint.x));
            layersRef.current.mapLayer = L.imageOverlay(mapBase64Image.current, mapLayerBounds, { zIndex: MapZIndex.map }).addTo(mapRef.current);
            // 更新有效地图范围
            resetMapValidRect([res.minPoint, res.maxPoint]);
            // 更新 画布位置和缩放 适应 fitbounds
            let corretBounds = getCorrectBound(mapZoonRectRef.current, layersRef.current.mapLayer.getBounds());
            mapRef.current.fitBounds(corretBounds);
            calculateMinMaxScale();


        } else {
            logger.e('地图图片渲染生成失败');
        }
    }, []);

    // 根据目前的地图大小，在缩放范围内，计算画布合适的默认缩放比例
    function calculateMinMaxScale() {
        // let mapZoonRect = { max: 6, min: 4, default: 4.0, showRatio: 0.9};
        let currentZoom = mapRef.current.getZoom();
        // mapZoonRectRef.current = currentZoom;
        let maxZoom;
        let minZoom;
        if (currentZoom < mapZoonRectRef.current.min) {
            logger.d(`Jack--55555--->地图最优显示时,已经小于最小缩放限制 ${currentZoom} min:${mapZoonRectRef.current.min}`);
            mapZoonRectRef.current.min = minZoom;
            minZoom = currentZoom;
        } else {
            minZoom = currentZoom * 0.5;
        }
        if (currentZoom > mapZoonRectRef.current.max) {
            logger.d(`Jack--55555--->地图最优显示时,已经大于最大缩放限制 ${currentZoom} min:${mapZoonRectRef.current.max}`);
            mapZoonRectRef.current.max = maxZoom;
        } else {
            maxZoom = currentZoom * 1.5;
        }

        maxZoom = maxZoom > mapZoonRectRef.current.max ? mapZoonRectRef.current.max : maxZoom;
        minZoom = minZoom < mapZoonRectRef.current.min ? mapZoonRectRef.current.min : minZoom;

        logger.d(`Jack--55555--->重新计算缩放比的最大和最小限制---> currentZoom:${currentZoom} minZoom:${minZoom} maxZoom:${maxZoom} `);
        mapRef.current.setMinZoom(minZoom);
        mapRef.current.setMaxZoom(maxZoom);
    }

    const resetMapValidRect = ([minPoint, maxPoint]) => {
        let leftTop = { lng: minPoint.x, lat: maxPoint.y };
        let leftBottom = { lng: minPoint.x, lat: minPoint.y };
        let rightBottom = { lng: maxPoint.x, lat: minPoint.y };
        let rightTop = { lng: maxPoint.x, lat: maxPoint.y };
        let centerP = { lng: (minPoint.x + maxPoint.x) / 2, lat: (minPoint.y + maxPoint.y) / 2 };

        mapValidRectRef.current = {
            leftTop,
            leftBottom,
            rightBottom,
            rightTop,
            centerP,
            validSizeX: rightTop.lng - leftTop.lng,
            validSizeY: leftTop.lat - leftBottom.lat
        }

        {
            // 地图有效区的四个顶点
            L.circle(leftTop, { color: "#FF0000", fillColor: '#FF0000', fillOpacity: 1, radius: 0.01 }).addTo(mapRef.current);
            L.circle(leftBottom, { color: "#00FF00", fillColor: '#00FF00', fillOpacity: 1, radius: 0.01 }).addTo(mapRef.current);
            L.circle(rightBottom, { color: "#0000FF", fillColor: '#0000FF', fillOpacity: 1, radius: 0.01 }).addTo(mapRef.current);
            L.circle(rightTop, { color: "#0000FF", fillColor: '#0000FF', fillOpacity: 1, radius: 0.01 }).addTo(mapRef.current);
            // 中心
            L.circle(centerP, { color: "#000000", fillColor: '#FF0000', fillOpacity: 1, radius: 0.01 }).addTo(mapRef.current);
        }
    }
    // 房间
    const handleRoom = useCallback((roomInfos, roomChain) => {
        if (!isShowAreaTips || isNull(roomChain) || isNull(roomInfos)) return;

        roomChainsRef.current = [];
        roomChain.forEach((room, index) => {
            const PTS = room.PTS;
            let chainlatLng = [];
            PTS.forEach((pt) => {
                const mapPoint = roomToCRS([pt.x, pt.y]);
                let roomPoint = L.latLng([mapPoint.y, mapPoint.x]);
                chainlatLng.push(roomPoint);
            })

            roomChainsRef.current.push(chainlatLng);
            _drawRoom(roomInfos[index], chainlatLng);
        })
    }, [_drawRoom, isShowAreaTips]);

    // 绘制单个房间(选择框)
    const _drawRoom = useCallback((info, chainlatLng) => {
        if (isNull(info) || isNull(chainlatLng)) return;
        // 房间清洁状态
        const isRoomClean = cleanMode === CleanModeType.Room;

        // 房间边界图层绘制
        layersRef.current.roomsLayer.forEach((layer) => {
            layer.remove();
        });
        layersRef.current.roomsLayer = [];
        // 如果当前是选择房间状态
        if (isRoomClean) {
            mapRef.current.createPane(`roomNormal${info.id}`);
            mapRef.current.getPane(`roomNormal${info.id}`).style.zIndex = 720;
        }
        // 房间多边形
        let polygonRoom = L.polygon(chainlatLng, {
            // color: "#fff",
            stroke: true,
            // color: MAP_COLOR.border,
            // fillColor: MAP_COLOR.normal,
            color: 'rgba(255, 255, 255, 0)',
            fillColor: 'rgba(255, 255, 255, 0)',
            weight: 1.5,
            fillOpacity: 1,
            attribution: `${info.id}+polygonRoom`,
            pane: isRoomClean ? `roomNormal${info.id}` : undefined
        })
        layersRef.current.roomsLayer.push(polygonRoom);


        //
        // 判断房间是否被选中，选中需要显示清扫信息气泡和房间阴影
        let polygonSelected = null;
        const isSelected = getSelectedRoom(info.id);
        if (isSelected) { // 选中的房间
            // 添加房间阴影
            mapRef.current.createPane(`roomSelected${info.id}`);
            mapRef.current.getPane(`roomSelected${info.id}`).style.zIndex = 720;

            polygonSelected = L.polygon(chainlatLng, {
                stroke: true,
                color: MAP_COLOR.border,
                weight: 1.5,
                fillColor: MAP_COLOR.selected1,
                fillOpacity: 1,
                attribution: `${info.id}+polygon`,
                pane: `roomSelected${info.id}`
            })
            layersRef.current.roomsLayer.push(polygonSelected);


            // 添加房间信息气泡（自定义跟普通区分）
            let customHtml, icon;
            if (isRoomClean) {
                customHtml = roomInfoCard(
                    result.num,
                    result.RN,
                    result.cleanTimes,
                    result.wind,
                    result.sweepMode,
                    result.water
                );
                icon = L.divIcon({
                    html: customHtml,
                    className: "myiconSelect",
                    iconSize: [12 * (info.RN.length + 1) + 2, 12],
                    iconAnchor: [12 * info.RN.length, 20],
                });
            } else {
                icon = L.divIcon({
                    html: `<div class=roomName><img class=icon src=${require("./assets/img/selected.png")
                        }></img><div class=name>${info.RN}</div></div>`,
                    className: "myiconSelect",
                    iconSize: [12 * (info.RN.length + 1) + 2, 12],
                    iconAnchor: [12 * info.RN.length, 6],
                });
            }
            map.createPane(`roomNameSelected${info.id}`);
            map.getPane(`roomNameSelected${info.id}`).style.zIndex = 722;
            iconRect = L.marker(poistion, {
                attribution: `${info.id}+iconRect`,
                icon: icon,
                zIndex: MapZIndex.iconName,
                pane: `roomNameSelected${info.id}`
            }).addTo(map);
            roomNameLayer.push(iconRect);
        } else { // 未选择


        }

        // layersRef.current.roomNameLayer.forEach((layer) => {
        //     layer.remove();
        // });
        // layersRef.current.roomNameLayer = [];

    }, [cleanMode]);

    function getSelectedRoom(id) {
        if (selectedRooms && selectedRooms.length > 0) {
            return selectedRooms.find(room => room.id === id);
        }
        return false;
    }


    // 基站
    const drawCharge = useCallback((chargePos) => {
        if (!isShowBaseRing || !chargePos) return;
        // 绘制
        const makerPoint = L.latLng(chargePos.y, chargePos.x);
        let stationIcon = L.divIcon({
            html: getChargeIcon(chargePos.a),
            iconSize: [24, 30],
            fillOpacity: 1,
        });
        // 有旧的先移除
        if (layersRef.current.chargeStationMarker) {
            layersRef.current.chargeStationMarker.remove();
        }
        layersRef.current.chargeStationMarker = L.marker(makerPoint, { icon: stationIcon, zIndex: MapZIndex.chareBase })
            .addTo(mapRef.current);


    }, [isShowBaseRing]);

    // 机器人
    const drawRobot = useCallback((robotPos) => {
        if (!isShowCurPosRing || !robotPos) return;
        // 绘制
        const makerPoint = L.latLng(robotPos.y, robotPos.x)
        let robotIcon = L.divIcon({
            html: getRobotIcon(robotPos.a),
            iconSize: [24, 30],
            fillOpacity: 1,
        });
        // 有旧的先移除
        if (layersRef.current.robotMarker) {
            layersRef.current.robotMarker.remove();
        }
        layersRef.current.robotMarker = L.marker(makerPoint, { icon: robotIcon, zIndex: MapZIndex.robot })
            .addTo(mapRef.current);
    }, [isShowCurPosRing]);

    // 虚拟区域
    const drawVirtual = useCallback(() => {
    }, []);

    // 路径
    const drawPath = useCallback(() => {
    }, []);

    return (
        <div className="mapBox">
            <div id="map" style={{ width: '100%', height: '100%', left: 0, top: 0 }} />
        </div>
    );


}

export default MapView;