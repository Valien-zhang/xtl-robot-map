// 机器清扫状态
export enum CLEAN_STATUS {
  None,//不处理无状态
  Idle,
  // 全屋 (边扫边建)
  FullClean,//2
  FullPause,//3
  FullResume,
  // 快速建图
  QMAP,//5
  QMAPPause,
  QMAPResume,
  // 房间
  AreaClean,
  AreaPause,
  AreaResume,
  // 划区
  ZoneClean,
  ZonePause,
  ZoneResume,
  // 地毯
  CarpetClean,
  CarpetPause,
  CarpetResume,
  // 定点
  SpotClean,
  SpotPause,
}

// 机器回冲状态
export enum RETURN_STATUS {
  None,//不处理无状态
  Idle,
  Run,// 回冲中
  Pause,
  Resume,//4
}

// 机器工作状态
export enum WORK_STATUS {
  None = 'None', // 无 - 此时使用 CleanStatus和 ReturnStatus判定
  Relocate = 'Relocate', // 重定位
  WashMop = 'WashMop', // 洗拖布中
  ClctDust = 'ClctDust', // 集尘中
  HotDry = 'HotDry', // 烘干中
  WindDry = 'WindDry', // 甩干中
  BackWashMop = 'BackWashMop', // 回洗拖布中
  BackWashPause = 'BackWashPause', // 回洗拖布暂停
  BackClctDust = 'BackClctDust', // 返回集尘中
  BackClctPause = 'BackClctPause', // 返回集尘 暂停
  BPReturn = 'BPReturn', // 返回基站
  BPPauseReturn = 'BPPauseReturn', // 返回基站 暂停
  Charging = 'Charging', // 充电中
  ChargeAsleep = 'ChargeAsleep', // 充电完成休眠
}


/**
 * 首页是否能进入划区编辑
 * 休眠中、待机、充电中、已充满、烘干中允许进入
 * @param ws 工作状态
 */
export function canEditHomeArea(model: string, ws: string) {
  // if (model !== WORK_MODE.area) return false;
  // return ws === WORK_STATE.sleep ||
  //   ws === WORK_STATE.stanby ||
  //   ws === WORK_STATE.charging ||
  //   ws === WORK_STATE.chargeFull ||
  //   ws === WORK_STATE.stoving;
}


/**
 * 虚拟墙页工作状态判断
 */
export const WORK_STATE_ARR = [
  // WORK_STATE.recharging, // 回充中
  // WORK_STATE.working, // 工作中
  // WORK_STATE.selfChecking, // 自检中
  // WORK_STATE.fastCreateMap, // 快速建图中
  // WORK_STATE.reposition, // 重定位中
  // WORK_STATE.backStation, // 回站中
  // WORK_STATE.pointRecharge, // 断点回站中
]

/**
 * 允许进入区域编辑的状态
 */
export const AREA_EDIT_ALLOW_STATE = [
  // WORK_STATE.sleep,
  // WORK_STATE.stanby,
  // WORK_STATE.complete,
  // WORK_STATE.charging,
  // WORK_STATE.chargeFull,
  // WORK_STATE.stoving,
  // WORK_STATE.trunOff
]

/**
 * 机器是否在回充状态
 * 包括回充中、回站中、断点回站中
 * @param state workState
 * @returns 
 */
export function isRecharging(state: string) {
  // return [
  //   WORK_STATE.recharging,
  //   WORK_STATE.backStation,
  //   WORK_STATE.pointRecharge
  // ].indexOf(state) > -1;
}

/**
 * 设备是否在工作中
 * 除了睡眠、待机、工作完成、充电、已充满、故障、关机、烘干之外，都属于工作中状态
 * @param state 
 * @returns 
 */
export function isWorking(state: string) {
  // return [
  //   WORK_STATE.sleep,
  //   WORK_STATE.stanby,
  //   WORK_STATE.complete,
  //   WORK_STATE.recharging,
  //   WORK_STATE.charging,
  //   WORK_STATE.chargeFull,
  //   WORK_STATE.fault,
  //   WORK_STATE.backStation,
  //   WORK_STATE.trunOff,
  //   WORK_STATE.stoving,
  // ].indexOf(state) === -1;
}

export function isCharging(state: string) {
  // return [
  //   WORK_STATE.charging,
  //   WORK_STATE.pointCharging,
  //   WORK_STATE.chargeFull
  // ].indexOf(state) > -1;
}

/**
 * 是否在运动中
 * @param state 
 * @returns true运动中，false静止
 */
export function isInMotion(state: string) {
  // return [
  //   WORK_STATE.working,
  //   WORK_STATE.recharging,
  //   WORK_STATE.fastCreateMap,
  //   WORK_STATE.reposition,
  //   WORK_STATE.backStation,
  //   WORK_STATE.pointRecharge
  // ].indexOf(state) > -1;
}

/**
 * 设备是否在站内（充电中，充电完成，断点充电中，清洗中，集尘中，烘干中，自检中）
 * @param state 
 * @returns 
 */
export function isInStation(state: string) {
  // return [
  //   WORK_STATE.charging,
  //   WORK_STATE.chargeFull,
  //   WORK_STATE.pointCharging,
  //   WORK_STATE.cleaning,
  //   WORK_STATE.dustCollection,
  //   WORK_STATE.stoving,
  //   WORK_STATE.selfChecking,
  // ].indexOf(state) !== -1;
}

/**
 * 是否正在回充的路上
 * 回充中、回站中、断点回站中
 * @param state 
 * @returns 
 */
export function isReturning(state: string) {
  // return [
  //   WORK_STATE.recharging,
  //   WORK_STATE.backStation,
  //   WORK_STATE.pointRecharge
  // ].indexOf(state) !== -1;
}

/**
 * 是否校验真的没有地图数据
 */
export function isValidateEmptyMap(state: string) {
  // return [
  //   WORK_STATE.working,
  //   WORK_STATE.pause,
  //   WORK_STATE.pointCharging,
  //   WORK_STATE.selfChecking,
  //   WORK_STATE.fastCreateMap,
  //   WORK_STATE.reposition,
  //   WORK_STATE.upgrading,
  //   WORK_STATE.pointRecharge
  // ].indexOf(state) !== -1;
}

// 工作模式
export const WORK_MODE = {
  idle: '1', // 空闲模式
  global: '2', // 规划清扫（全局）
  edge: '3', // 沿边清扫
  mop: '5', // 拖地模式
  recharge: '6', // 回充模式
  control: '7', // 手动控制
  area: '12', // 划区清扫
  fastCreate: '13', // 探索清扫（快速建图）
  appointment: '17', // 预约清扫
  custom: '19' // 自定义清扫
}

/**
 * 是否为全局
 * 非自定义，并且非划区，就判定为全局
 * @param mode 
 * @returns 
 */
export function isGlobal(mode: string) {
  // return mode !== WORK_MODE.area && mode !== WORK_MODE.custom;
}

// 地图颜色
export const MAP_COLOR = {
  normal: '#78B4F0', // 房间颜色
  wall: '#000000', // 墙体色  
  unknown: '#B8C7D7', // 未知区域
  selected: 'rgba(17, 75, 148, 0.25)', // 选中'#114B94'
  selected1: 'rgba(83, 119, 186, 0.25)', // 选中'#5377BA'
  border: '#EDF3F9', // 房间边界颜色

  path: 'rgba(255, 255, 255, 0.86)', // 路径'#2183E3'

  virtualWall: 'rgba(227,55,37,0.2)', // 虚拟墙
  sweep: 'rgba(227,55,37,0.2)', // 扫地禁区
  sweepBorder: '#E33725', // 扫地禁区边界

  mop: 'rgba(255,171,71,0.2)', // 拖地禁区
  mopBorder: '#FFAB47', // 拖地禁区边界

  zone: 'rgba(50, 207, 206, 0.2)', // 划区
  zoneBorder: '#32CFCE', // 划区边界

  carpet: '#FF0000',
  background: 'rgba(255,255,255,0)',
}

export const SMapColorConfig = {
  wallColor: [237, 243, 249, 255],
  bgColor: [255, 255, 255, 0],
  discoverColor: [180, 195, 207, 127], // B4C3CF 50%
  roomColor: [120, 180, 240, 255], // 78B4F0
  selectedColor: [17, 75, 148, 64], // 114B94 25%
  carpetColor: [255, 255, 255, 127],
  patchColor: [255, 255, 255, 255],
  roomColors: [
    [120, 180, 240, 255], // '#78B4F0'
    // [109, 165, 255, 255], // '#6DA5FF'
    [141, 161, 255, 255], // '#8DA1FF'
    [126, 222, 220, 255], // '#7EDEDC'
    [169, 223, 188, 255], // '#A9DFBC'
  ],
  // 不同房间的材质颜色不一样
  roomMaterialColors: [
    [112, 175, 238, 255], // '#70AFEE'
    [101, 158, 250, 255], // '#659EFA'
    [134, 154, 250, 255], // '#869AFA'
    [113, 212, 210, 255], // '#71D4D2'
    [155, 214, 176, 255], // '#9BD6B0'
  ]
};

/**
 * 材质类型: 1:水泥地面 2:瓷砖 3:木地板 30:其他
 */
export const MATERIAL_TYPE = {
  cement: 3001,
  ceramicTile: 3002,
  wood: 3003,
  other: 3030
}

// 虚拟墙/禁区类型
export const VIRTUAL_TYPE = {
  sweep: 1, // 扫地禁区
  wall: 2, // 虚拟墙
  mop: 6 // 拖地禁区
}

export const MapZIndex = {
  //地图图层
  mapLayer: 0,
  //充电桩图层
  chargeStationLayer: 100,
  // 虚拟墙图层
  virtualWallsLayer: 200,
  //划区图层
  areasLayer: 100,
  // 房间名称图层
  roomNameLayer: 100,
  //房间组图层
  roomsGroupLayer: 100,
  //房间图层
  roomsLayer: 100,
  //路径图层
  lastPathLayer: 100,
  //动画图层
  animatedMarker: 100,
  //设置的划区图层
  setArearect: 100,
}

/**
 * 网络请求超时时间15秒
 */
export const NETWORK_TIMEOUT = 15;


/**
 * 设备真实的工作状态
 */
export const REAL_WORK_MODE = {
  APP_MODE_UNKNOW: -1,
  APP_MODE_IDLE: 0,
  APP_MODE_AUTO: 1,
  APP_MODE_MANUAL: 2,
  APP_MODE_AREA_USELESS: 3,
  APP_MODE_AUTO_PAUSE: 4,
  APP_MODE_GO_HOME: 5,
  APP_MODE_FIX_POINT: 6,
  APP_MODE_NAVIGATE: 7,
  APP_MODE_AREA_PAUSE_USELESS: 8,
  APP_MODE_NAVIGATE_PAUSE: 9,
  APP_MODE_GLOBAL_GO_HOME: 10,
  APP_MODE_GLOBAL_BROKEN: 11,
  APP_MODE_NAVIGATE_GO_HOME: 12,
  APP_MODE_FIX_POINT_GO_HOME: 13,
  APP_MODE_NAVIGATE_IDLE: 14,
  APP_MODE_SCREW_CLEAN: 20,
  APP_MODE_SCREW_CLEAN_GO_HOME: 21,
  APP_MODE_PONIT_IDLE: 22,
  APP_MODE_SCREW_IDLE: 23,

  APP_MODE_CORNERS_CLEAN: 25,
  APP_MODE_CORNERS_CLEAN_GO_HOME: 26,
  APP_MODE_CORNERS_CLEAN_PAUSE: 27,
  APP_MODE_CORNERS_CLEAN_BROKEN: 28,
  APP_MODE_CORNERS_CLEAN_IDLE: 29,
  APP_MODE_AREA_CLEAN: 30,
  APP_MODE_AREA_PAUSE: 31,
  APP_MODE_AREA_GO_HOME: 32,
  APP_MODE_AREA_BROKEN: 33,
  APP_MODE_AREA_IDLE: 35,

  APP_MODE_MOPPING_CLEAN: 36,
  APP_MODE_MOPPING_PAUSE: 37,
  APP_MODE_MOPPING_GO_HOME: 38,
  APP_MODE_MOPPING_BROKEN: 39,
  APP_MODE_MOPPING_IDLE: 40,


  // APP_MODE_CUSTOM_CLEAN          : 40,
  // APP_MODE_CUSTOM_PAUSE          : 41,
  // APP_MODE_CUSTOM_GO_HOME        : 42,
  // APP_MODE_CUSTOM_BROKEN         : 43,
  // APP_MODE_CUSTOM_IDLE           : 44,
  APP_MODE_EXPLORE_CLEAN: 45,
  APP_MODE_EXPLORE_PAUSE: 46,
  APP_MODE_EXPLORE_GO_HOME: 47,
  APP_MODE_EXPLORE_BROKEN: 48,
  APP_MODE_EXPLORE_IDLE: 49,

  APP_MODE_RANDOM_CLEAN: 50,
  APP_MODE_RANDOM_GO_HOME: 52,
  APP_MODE_RANDOM_IDLE: 55,

  APP_MODE_GRYO_CLEAN: 56,
  APP_MODE_GRYO_PAUSE: 57,
  APP_MODE_GRYO_GO_HOME: 58,
  APP_MODE_GRYO_BROKEN: 59,
  APP_MODE_GRYO_IDLE: 60,

  APP_MODE_TWICE_CLEAN: 61,
  APP_MODE_TWICE_PAUSE: 62,
  APP_MODE_TWICE_GO_HOME: 63,
  APP_MODE_TWICE_BROKEN: 64,
  APP_MODE_TWICE_IDLE: 65
}

// export const AI_TYPE = {
//   socks: 1001, // 袜子
//   shoes: 1002, // 鞋子
//   wire: 1003, // 电线
//   bar: 1004, // 吧台底座
//   dog: 1006, // 狗
//   cat: 1007, // 猫
//   leg: 1015, // 人腿
//   scale: 1017, // 体重秤
//   dustbin: 2222, // 垃圾桶
// }


/**
 * 2024-05-11
 * 本地缓存有效时间（默认15分钟）
 * 首页信息（包含电量、清扫信息、工作状态、地图）及地图列表
 * 原来是1分钟，海尔特别强调要15分钟，主要关注首页地图加载速度
 */
export const LOCAL_CACHE_VALID_TIME = 15000;

export function isIOS() {
  let u = navigator.userAgent;
  return Boolean(u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/));
}


export const bottomBarHeight = isIOS() ? 120 : 94; // 底部的按钮栏高度