import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import { Observer } from 'mobx-react-lite';
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
    isMaterialXY
} from './utils/util_function';

import './index.less';
import './Path.Drag';
import { Images } from './assets';

const areaColor = {
    fill: 'rgba(255,255,255,0.39)', // 划区框颜色
    border: 'white', // 划区框边框颜色
}
const useOldmap = 0;
const PATH_WEIGHT_LIMIT = 0.5; // 路径最小线宽

let map = null;
let mapReadyStatus = true;
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
        mapId = '',
        workState,
        isShowPath = false,
        isShowDevice = true,
        pathData,
        isAddNewArea,
        carpeDisplayStatus,
        isAreaEdit = false,
        isCustom = false,
        shouldDrawArea = false, // 是否需要绘制地图数据里面的划区框
        addVirType, // 新增虚拟墙或禁区 消息
        isEditVirtual = false, // 是否是虚拟墙编辑页
        isCleaningPlan = false, // 是否清洁方案
        isEditCarpetAreaPage = false, // 是否是地毯专清页面
        newCarpetCleanAreaTag = 0, // 新增地毯清扫区域
        showMutilAreaView, // 是否显示多区域划区框
        onMapMoveStart,
        onMapMoveEnd
    } = props;


    /** 禁区 */

    /** 划区 */

    /** 房间 */

    /** 图标位置 */

    /** 轨迹 */

    /** 地图 */


    return (<div className="mapBox">
        <div id="map" style={{ width: '100%', height: '100%', left: 0, top: 0 }}
        // <div id="map" style={{ width: '100%', height: '100%', }}
        />
    </div>);

}

export default MapView;