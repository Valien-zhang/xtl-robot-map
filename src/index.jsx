import React, { useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import {
    getCorrectBound,
    isNull,
} from './utils/util_function';
import { MapZIndex, MAP_COLOR } from './utils/constants';
import './index.less';
import logger from './utils/logger';
import { useIsMounted } from './hooks';
import storage from './utils/localStorage';
import { fetchMapImage, paresMapData } from './utils/util_mapData';
// import 'leaflet-path-drag';
import getChargeIcon from './components/chargeIcon';
import getRobotIcon from './components/robotIcon';
import roomInfoCard from './components/customInfoCard'

import { MapInfo, RoomTipType, CleanModeType } from './interface.ts';
import testData from './testData.json';
import selectedImg from './assets/img/selected.png';



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
            isEditVirtual = false, // 是否可编辑禁区
            isShowVirtual = false, // 是否显示禁区

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
            preferCanvas: true,
            zoomControl: false,
            attributionControl: false,
            zoomSnap: 0.01,
            zoom: -1,//mapZoonRectRef.current.default,
            minZoom: -1,//mapZoonRectRef.current.min,
            maxZoom: 2,//mapZoonRectRef.current.max,
            crs: L.CRS.Simple,// 
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
        // fitMapBounds();
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

        // logger.d(`55555--->初始化完成`, testData);

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
        // // 绘制房间名称+区域+面板
        handleRoom(roomInfos, roomChain);

        drawCharge(chargePos);

        drawRobot(robotPos);

        // drawPath();

        logger.d('地图绘制完成')

        fitMapBounds();

    }, [drawCharge, drawMapGround, drawRobot, fitMapBounds, handleRoom, isUnmount])

    // 地图
    const drawMapGround = useCallback(async (newMapInfo) => {
        const { minX, minY, sizeX, sizeY, map, lz4Len, totalWidth, totalHeight } = newMapInfo.mapData;
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
            resetMapValidRect([res.minPoint, res.maxPoint]);

            //由于设备返回地图图片的minY和maxY是上下镜像的，这里需要用Y-总高度。
            const mapLayerBounds = L.latLngBounds(L.latLng(res.minPoint.y, res.minPoint.x), L.latLng(res.maxPoint.y, res.maxPoint.x));
            layersRef.current.mapLayer = L.imageOverlay(res.base64Image, mapLayerBounds, { zIndex: MapZIndex.map }).addTo(mapRef.current);

            // resetMapValidRect([res.minPoint, res.maxPoint]);
            // const imgElement = layersRef.current.mapLayer.setStyle();
            // imgElement.style.transform = 'scaleX(-1)';
            // imgElement.style.transformOrigin = 'center';
            // layersRef.current.mapLayer.setStyle({ "transform": 'scaleX(-1)' });

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
            // const redIcon = L.divIcon({
            //     className: 'custom-marker',
            //     html: '<div style="background-color: #FF0000; width: 10px; height: 10px; border-radius: 50%;"></div>',
            //     iconSize: [10, 10],
            //     iconAnchor: [5, 5] // 将锚点设置为图标的中心

            // });
            // // 地图有效区的四个顶点
            // L.marker(leftTop, { icon: redIcon, pane: 'overlayPane' }).addTo(mapRef.current);
            L.circle(leftTop, {
                color: "#FF0000", fillColor: '#FF0000', fillOpacity: 1, radius: 10  // 将 L.circle 渲染到 markerPane 上
            }).addTo(mapRef.current);
            L.circle(leftBottom, { color: "#00FF00", fillColor: '#00FF00', fillOpacity: 1, radius: 10 }).addTo(mapRef.current);
            L.circle(rightBottom, { color: "#0000FF", fillColor: '#0000FF', fillOpacity: 1, radius: 10 }).addTo(mapRef.current);
            L.circle(rightTop, { color: "#0000FF", fillColor: '#0000FF', fillOpacity: 1, radius: 10 }).addTo(mapRef.current);
            // 中心
            const centerLayer = L.circle(centerP, { color: "#000000", fillColor: '#FF0000', fillOpacity: 1, radius: 10 }).addTo(mapRef.current);

            logger.d('centerLayer getBounds', centerLayer.getBounds());

        }
        logger.d('地图中心点位置 ', centerP)

    }

    const fitMapBounds = useCallback(() => {
        logger.d('mapLayer getBounds', layersRef.current.mapLayer.getBounds());
        logger.d('mapLayer getBounds', layersRef.current.chargeStationMarker.getLatLng());

        // if (mapValidRectRef.current.centerP) { // 有地图位置
        //     // 更新 画布位置和缩放 适应 fitbounds
        //     if (layersRef.current.mapLayer) {
        //         let corretBounds = getCorrectBound(mapZoonRectRef.current, layersRef.current.mapLayer.getBounds());
        //         mapRef.current.fitBounds(corretBounds);
        //         calculateMinMaxScale();
        //         logger.d(`fitMapBounds--->适应地图,更新画布缩放`, corretBounds);

        //     } else {// 无图
        //         logger.d(`fitMapBounds--->默认位置`);
        //         mapRef.current.setView(mapValidRectRef.current.centerP, mapZoonRectRef.current.default, { animate: false });
        //     }
        // } else { // 默认居中
        //     logger.d(`fitMapBounds---> setView 默认位置`);
        //     mapRef.current.setView(L.latLng(400, 400));
        // }
    }, [])
    // 房间
    const handleRoom = useCallback((roomInfos, roomChain) => {
        if (!isShowAreaTips || isNull(roomChain) || isNull(roomInfos)) return;
        // 房间轮廓 (可点击 - 可显示)
        layersRef.current.roomsLayer.forEach((layer) => {
            layer.remove();
        });
        layersRef.current.roomsLayer = [];

        // 房间标签 - 直接显示
        layersRef.current.roomNameLayer.forEach((layer) => {
            layer.remove();
        });
        layersRef.current.roomNameLayer = [];
        // 存储房间轮廓点, 方便计算位置
        roomChainsRef.current = [];
        // 循环绘制
        roomChain.forEach((room, index) => {
            const PTS = room.PTS;
            let chainlatLng = [];
            PTS.forEach((pt) => {
                let roomPoint = L.latLng(pt.y, pt.x);
                chainlatLng.push(roomPoint);
            })

            roomChainsRef.current.push(chainlatLng);
            _drawRoom(roomInfos[index], chainlatLng);
        })
    }, [_drawRoom, isShowAreaTips]);

    // 绘制单个房间(选择框)
    const _drawRoom = useCallback((info, chainlatLng) => {
        if (isNull(info) || isNull(chainlatLng)) return;

        const isRoomClean = true;//cleanMode === CleanModeType.Room;

        // 如果当前是 选房间状态
        if (isRoomClean) {
            mapRef.current.createPane(`roomNormal${info.id}`);
            mapRef.current.getPane(`roomNormal${info.id}`).style.zIndex = 720;
        }
        /** @type {L.Polygon} 房间多边形 - 普通形态 */
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


        // 判断房间是否被选中，选中需要显示清扫信息气泡和房间阴影
        let iconRect = null;
        const poistion = L.latLng(info.centerY, info.centerX);
        logger.d('房间中心点位置1 ', poistion)

        /** @type {L.Polygon} 房间多边形 - 选中形态 */
        let polygonSelected = null;
        const selectRoom = getSelectedRoom(info.id);
        if (selectRoom) { // 选中的房间
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
            // 选中模式下 房间标签样式 (分房间定制 和 普通两种)
            let customHtml, icon;
            if (isRoomClean) {
                customHtml = roomInfoCard(
                    selectRoom.name,
                    selectRoom.prefer.order,
                    selectRoom.prefer.mode,
                    selectRoom.prefer.count,
                    selectRoom.prefer.wind,
                    selectRoom.prefer.water
                );
                icon = L.divIcon({
                    html: customHtml,
                    className: "myiconSelect",
                    iconSize: [12 * (info.name.length + 1) + 2, 12],
                    iconAnchor: [12 * info.name.length, 20],
                });
            } else {
                icon = L.divIcon({
                    html: `<div class=roomName><img class=icon src=${selectedImg}></img><div class=name>${info.name}</div></div>`,
                    className: "myiconSelect",
                    iconSize: [12 * (info.name.length + 1) + 2, 12],
                    iconAnchor: [12 * info.name.length, 6],
                });
            }
            mapRef.current.createPane(`roomNameSelected${info.id}`);
            mapRef.current.getPane(`roomNameSelected${info.id}`).style.zIndex = 722;
            iconRect = L.marker(poistion, {
                attribution: `${info.id}+iconRect`,
                icon: icon,
                zIndex: MapZIndex.iconName,
                pane: `roomNameSelected${info.id}`
            });

        } else { // 未选择
            // 未选中，添加房间名称
            let icon = L.divIcon({
                html: `<div class=room>${info.name}</div>`,
                className: "myicon",
                iconSize: [15 * info.name.length, 12],
                iconAnchor: [6 * info.name.length, -4],
            });
            iconRect = L.marker(poistion, {
                attribution: `${info.id}+iconRect`,//  用于标记标记信息
                icon: icon,
                zIndex: MapZIndex.setArearect,
            });
        }

        // 先存储 房间多边形边界, 需要的时候展示. 
        layersRef.current.roomsLayer.push(polygonRoom);
        if (polygonSelected) layersRef.current.roomsLayer.push(polygonSelected);

        // 房间标签 - 直接显示
        iconRect.addTo(mapRef.current);
        layersRef.current.roomNameLayer.push(iconRect);

        // 添加点击事件
        if (!isEditVirtual) { // 是否不可编辑虚拟墙 - (非虚拟墙页面,可点击房间)
            polygonRoom.on("click", onClickListener);
            iconRect.on("click", onClickListener);
            if (polygonSelected) polygonSelected.on("click", onClickListener);
        }

    }, [getSelectedRoom, isEditVirtual, onClickListener]);

    const onClickListener = useCallback(() => {

    }, []);

    const getSelectedRoom = useCallback((id) => {
        if (selectedRooms && selectedRooms.length > 0) {
            return selectedRooms.find(room => room.id === id);
        }
        return null;
    }, [selectedRooms]);


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
        const makerPoint = L.latLng(robotPos.y, robotPos.x);
        let robotIcon = L.divIcon({
            html: getRobotIcon(robotPos.a),
            iconSize: [24, 30],
            fillOpacity: 1,
        });
        // 有旧的先移除
        if (layersRef.current.robotMarker) {
            layersRef.current.robotMarker.remove();
        }
        logger.d(`机器人位置: `, makerPoint);
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