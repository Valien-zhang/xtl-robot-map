// 定义房间的清扫偏好类型
export type RoomPreference = {
    mode: number; // 清扫模式
    water: number; // 水量
    wind: number; // 吸力
    count: number; // 清扫次数
    order: number; // 清扫顺序
};

// 定义房间信息类型
export type RoomInfo = {
    id: number; // 房间 ID
    name: string; // 房间名称
    centerX: number; // 房间中心 X 坐标
    centerY: number; // 房间中心 Y 坐标
    neibs: number[]; // 相邻的房间 ID
    type: number; // 房间类型
    status: number; // 清扫状态 0-未清扫 1- 正在清扫 2-已经清扫
    material: number; // 房间材质 0未知 1水泥地 2瓷砖 3 木板 ...
    color: number; // 房间颜色
    prefer?: RoomPreference; // 清扫偏好（可选）
};

// 定义轨迹点类型
export type PathPoint = {
    x: number; // 注意:此处的 x, y 为 全图(默认800*800，会扩充)中的行和列，左下为(0, 0)
    y: number;
    v: number; // 是否门
    break: number, // 是否隔断
    type: number; // 动作类型 - 1 弓字
    mode: number; // 工作模式 0 扫地，1 拖地，2扫拖
};

// 定义房间边界类型
export type RoomBoundary = {
    traceId: number;
    lz4Len: number;
    start: number;
    totalCount: number;
    trace: string; // base64 编码字符串
    // PTS: PathPoint[]
};

// 定义虚拟类型
export type VirtualArea = {
    id: number;
    type: number; // // 0-划区 1-扫地禁区 2-拖地禁区 3-门槛 4-障碍 5- 定点清扫/ 虚拟线或区域, 包含 虚拟墙, 划区, 扫地禁区,拖地禁区 , 同类型的ID 不同
    status: number; // 是否生效
    PTS: PathPoint[]; // 虚拟墙的边界点
};

// 定义地图数据类型
export type MapData = {
    map: string; // 地图的 base64 编码字符串
    lz4Len: number;
    direction: number; // 地图方向
    totalWidth: number; // 地图总宽度
    totalHeight: number; // 地图总高度
    sizeX: number; // 显示区域的宽度
    sizeY: number; // 显示区域的高度
    minX: number; // 最小 X 坐标
    minY: number; // 最小 Y 坐标
    resolution: number; // 地图像素分辨率
};

export type CarpetPrefer = {
    id: number;
    prefer: number;
    twice: boolean;
    boost: boolean;
    first: boolean;
}

// 定义整个地图对象的类型
export type MapInfo = {
    mapId: number; // 地图 ID，0 表示临时图
    name: string;
    saved: number; // 是否已保存
    full: number; // 是否为全图
    status: number; // 地图使用状态
    angle: number; // 地图旋转角度，单位弧度
    upload: number; // 地图上传时间戳
    begin: number; // 任务开始时间戳
    mapData: MapData; // 地图数据    // 地图更新, 时间戳一定也更新了, 但时间戳更新,地图不一定更新 (十几秒) // 解码: base64js.toByteArray, Lz4.uncompress.
    chargePos: { x: number; y: number; a: number }; // 充电座位置
    robotPos: { x: number; y: number; a: number }; // 机器人位置
    pathData: any[]; // 轨迹数据，具体类型待定
    roomInfos: RoomInfo[]; // 房间信息列表
    roomChain: RoomBoundary[]; // 房间边界信息
    virtualAreas: VirtualArea[]; // 虚拟列表
    carpetPrefer: CarpetPrefer[];// 地毯清洁偏好
    three: any[]; // 3D AI 信息，类型不详
};


export enum CleanModeType {
    Idle = 'idle',
    Smart = 'smart',
    Room = 'room',
    Zoning = 'zoning',
    Building = 'building',
    Spot = 'spot'
}

// * 1. 普通tip : icon-name
// * 2. 选中进行分割合并
// * 3. 分类命名:  o-name  选中 未选中
// * 4. 设置顺序 ,  +  序号
//  选中 未选中的显示iconName
export enum RoomTipType {
    None = 0,                  // 无
    IconName = 1,              // 图标名称
    None_Selected = 2,          // 无 + 选中
    IconName_Selected = 3,      // 图标 + 图标名称已选中
    SequenceNumber = 4,        // 序号
}

export enum RoomIconType {
    DEFAULT = 0, // 默认
    KE_TING = 1, // 客厅
    WEI_YU = 2, // 卫浴
    WO_SHI = 3, // 卧室
    CHU_FANG = 4, // 厨房
    YANG_TAI = 5, // 阳台
    CAN_TING = 6, // 餐厅
    SHU_FANG = 7, // 书房
    JIAN_SHEN_FANG = 8, // 健身房
    ZOU_LANG = 9, // 走廊
    YANG_GUANG_FANG = 10, // 阳光房
    ER_TONG_FANG = 11, // 儿童房
    CHU_CAN_SHI = 12, // 储藏室
    XIU_XI_SHI = 13, // 休息室
    XI_YI_FANG = 14 // 洗衣房
}
