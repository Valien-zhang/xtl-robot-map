import React, { useRef, useState, useEffect, useCallback, useMemo, MutableRefObject } from 'react';
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
    MapZIndex
} from './utils/constants';
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
import { Images } from './assets';
import logger from './utils/logger';
import { useIsMounted } from './hooks';
import { decode as base64decode, toUint8Array } from 'js-base64';
import storage from './utils/localStorage';
import { fetchMapImage } from './utils/util_mapData';
import base64js from 'base64-js';
import Lz4 from './utils/lz4Util';
import { MapContainer, ImageOverlay, Marker, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet'
// import 'leaflet/dist/leaflet.css';
import 'leaflet-path-drag';
import { testData } from './interface';
import { RobotIconMarker, ChargeIconMarker } from './components';
import { runInAction } from 'mobx';



// 屏幕的宽高
const screenWidth = document.body.clientWidth;
const screenHeight = document.documentElement.clientHeight;
const mapZoonRect = { max: 6, min: 4, default: 4.0, current: 0.0, showRatio: 0.9 };
// 距离开始限制拖动的距离
const lastMapDistance = { left: 10000, right: 10000, top: 10000, bottom: 10000 };
const topBarHeight = 88;
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


const MapView = (props) => {
    const {
        mapInfo,
        onMapMoveStart,
        onMapMoveEnd,
        onDrawFinish // 地图渲染完成
    } = props;

    /** 图层引用 */
    // const layersRef = useRef({
    //     virtualWallsLayer: null, // 虚拟墙
    //     areaLayers: [], // 划区
    //     roomNameLayer: [], // 房间名称
    //     roomsGroupLayer: null, // 房间组
    //     roomsLayer: [], // 房间
    //     lastPathLayer: null, // 路径
    //     robotMarker: null, // 机器人
    //     setArearect: null, // 设置划区
    //     // 图层按钮
    //     topRightMarker: null, // 上右
    //     bottomLeftMarker: null, // 下左
    //     rotateMarker: null, // 旋转
    //     zoomMarker: null, // 缩放
    //     closeMarker: null, // 关闭
    // });
    // 是否可渲染
    const mapReadyStatusRef = useRef(true);
    // 地图有效边界,随地图图层变化  左上、左下、右下、右上、中心
    const mapValidRectRef = useRef({});
    // 上一次地图的上传时间，用于过滤重复渲染
    const lastUploadTimeRef = useRef(0);
    // state
    const isUnmount = !useIsMounted();// 已卸载
    const store = useLocalObservable(() => ({
        mapModel: null, // 当前地图数据 
        // {"angle": 0, "areas": "", "full": 0, "index": 0, "mapData": {map,width,height,minX,maxY,timetamp}, "mapId": 0, "mapTraceData": "***", "mopWalls": "", 
        // "name": "", "pos": "{\"x\":411,\"y\":396,\"a\":231,\"i\":0}", "saved": 0, "status": 1, "ts": 1416732620, "virtualWalls": ""}
        lastMapModel: null, // 上一次地图数据
        mapScale: 1, // 地图缩放比例
        // arearectLatlngs: [], // 划区框坐标

        mapBase64Image: '',
        mapBounds: [{ x: 0, y: 0 }, { x: 0, y: 0 }], // 地图边界

        // action
        setMapModel(newMapInfo) {
            // 过滤
            if (isNull(newMapInfo) || isNull(newMapInfo.mapId) || isNull(newMapInfo.mapData)) {
                return;
            }
            logger.d('init setMapModel', newMapInfo);
            // 解析
            // try {
            //     const mapData = base64decode(newMapInfo.mapData);
            //     newMapInfo.mapData = JSON.parse(mapData);

            //     if (!isNull(newMapInfo.areas)) {
            //         newMapInfo.areas = JSON.parse(newMapInfo.areas);
            //     } else {
            //         newMapInfo.areas = [];
            //     }
            // } catch (error) {
            //     logger.e("解析mapData错误: ", error);
            // }
            this.setMapGround(newMapInfo);
            this.mapModel = newMapInfo;
        },

        setMapScale(scale) {
            this.mapScale = scale;
        },

        setMapGround(newMapInfo) {
            const { minX, minY, sizeX, sizeY, map, lz4Len } = newMapInfo.mapData;

            if (newMapInfo.upload < this.mapModel?.upload) {
                logger.d('过滤渲染旧图', newMapInfo.upload, this.mapModel.upload);
                return;
            }

            const mapChanged = newMapInfo.begin != this.mapModel?.begin || newMapInfo.mapId != this.mapModel?.mapId;
            if (newMapInfo.upload === this.mapModel?.upload && !mapChanged) {
                logger.d('过滤渲染相同图', newMapInfo.mapId);
                return;
            }

            fetchMapImage({
                perfectScale: !this.mapModel ? 2 : 1, // 第一次,加载1倍图. 加快首页图速度
                mapId: newMapInfo.mapId,
                map,
                lz4Len,
                minX,
                minY,
                sizeX,
                sizeY,
                roomInfos: newMapInfo.roomInfos ?? []
            }).then((res) => {
                runInAction(() => {
                    logger.d('地图渲染', res);
                    this.mapBase64Image = res.base64Image;
                    this.mapBounds = [res.minPoint, res.maxPoint];
                })
            });
        },

        // get
        get mapBoundslatLng() {
            logger.d("1111", JSON.stringify(this.mapBounds));
            return L.latLngBounds([this.mapBounds[0].y, this.mapBounds[0].x], [this.mapBounds[1].y, this.mapBounds[1].x]);
        },
        // 基站位置 { x: 0, y: 0, a: 18000 }
        get chargePos() {
            const chargePos = this.mapModel?.chargePos ?? { x: 0, y: 0, a: 0 };
            return {
                latLng: L.latLng(chargePos.y, chargePos.x),
                angle: chargePos.a
            };
        },

        get robotPos() {
            const robotPos = this.mapModel?.robotPos ?? { x: 0, y: 0, a: 0 };
            return {
                latLng: L.latLng(robotPos.y, robotPos.x),
                angle: robotPos.a
            };
        },
    }));

    // 初始化 
    useEffect(() => {
        // TODO: test
        store.setMapModel(testData);

        return () => {

            // clearAreaLayers();
            // resetFunctionBtn();
            // 清空过期缓存
            storage.clearExpiredItems();
        }
    }, [])



    /** 事件 */
    function MapEventsHandle() {
        const map = useMapEvents({
            zoomstart: (e) => {
                mapReadyStatusRef.current = false;
            },
            zoomend: (e) => {
                mapReadyStatusRef.current = true;
                logger.d('map zoomend zoom:', e.target.getZoom());
                // mapTransRef.current.scale = e.target.getZoom();
                // store.setMapScale(mapTransRef.current.scale);
            },
            movestart: (e) => {
                onMapMoveStart && onMapMoveStart();
            },
            move: (e) => {
                mapReadyStatusRef.current = false;
                // 设置最大边界
                // setupMaxRect();
            },
            moveend: (e) => {
                mapReadyStatusRef.current = true;
                setTimeout(() => {
                    // mapRef.current && mapRef.current.dragging.enable();
                    onMapMoveEnd && onMapMoveEnd();
                }, 300);
            },
            load: (e) => {

            },
            error: (e) => {
                logger.d('map error:', e);
                onMapMoveEnd && onMapMoveEnd();
            }
        });
        return null;
    }
    /** private */

    // const BoundsPoint = () => {
    //     return <Observer>{() =>
    //         <>
    //             <Circle center={L.latLng(0, 0)} radius={1} fillOpacity={1} fillColor='#FF0000' color="#FF0000" />
    //             <Circle center={L.latLng(0, 600)} radius={1} fillOpacity={1} fillColor='#00FF00' color="#00FF00" />
    //             <Circle center={L.latLng(600, 0)} radius={1} fillOpacity={1} fillColor='#0000FF' color="#0000FF" />
    //             <Circle center={L.latLng(400, 400)} radius={1} fillOpacity={1} fillColor='#FF0000' color="#FF0000" />
    //             <Circle center={L.latLng(600, 600)} radius={1} fillOpacity={1} fillColor='#FF0000' color="#000000" />
    //         </>
    //     }</Observer>;
    // }

    return (
        <MapContainer
            zoomControl={true}
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
            zoomSnap={0.01}//缩放精度
            zoom={1}// 默认
            minZoom={-1}
            maxZoom={2}
            crs={L.CRS.Simple}// 笛卡尔坐标系 y上 x右
            editable={true}
            touchZoom={'center'}
            bounceAtZoomLimits={false}
            debounceMoveend={false}
            doubleClickZoom={false}
            easeLinearity={0.0}
            bounds={L.latLngBounds([0, 0], [800, 800])} //初始画布
            // center={L.latLng(400, 400)} // 初始中心点
            renderer={L.canvas({ padding: 0.05 })}
        >

            {/* 地图 */}
            <Observer>
                {() => <ImageOverlay
                    // url="http://www.lib.utexas.edu/maps/historical/newark_nj_1922.jpg"
                    url={store.mapBase64Image}
                    bounds={store.mapBoundslatLng}
                    opacity={0.5}
                    zIndex={MapZIndex.map}
                />
                }</Observer>
            {/* 轨迹 */}

            {/* 图标 */}
            {/* <RobotIconMarker position={store.robotPos.latLng} phi={store.robotPos.angle} zIndex={MapZIndex.robot} />
            <ChargeIconMarker position={store.chargePos.latLng} phi={store.chargePos.angle} zIndex={MapZIndex.chareBase} /> */}




            {/* <LocationMarker /> */}
            {/* 左下角 */}
            <Circle center={L.latLng(0, 0)} radius={10} fillOpacity={1} fillColor='blue' color="#FF0000" />
            {/* <Circle center={L.latLng(0, 800)} radius={10} fillOpacity={1} fillColor='#00FF00' color="#00FF00" />
            <Circle center={L.latLng(800, 0)} radius={10} fillOpacity={1} fillColor='#0000FF' color="#0000FF" /> */}
            <Circle center={L.latLng(400, 400)} radius={10} fillOpacity={1} fillColor='#FF0000' color="#FF0000" />
            <Circle center={L.latLng(800, 800)} radius={10} fillOpacity={1} fillColor='red' color="#000000" />
            <MapEventsHandle />
        </MapContainer>)

}

export default MapView;