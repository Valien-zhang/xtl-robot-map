
// 地图层级
export const MapZIndex = {
  map: -1,              // 底部的图片
  path: 100,            // 路径
  roomsGroup: 200,      // 房间的选中轮廓 包括了轮廓 + 填充
  iconName: 300,        // 房间名字
  chareBase: 400,       // 充电座
  robot: 600,           // 机器人 + 动效
  virtualWall: 700,     // 虚拟墙
  area: 800,            // 划区
  zoomMarker: 900,      // 划区缩放控件
  setArearect: 1000,    // 划区添加的控件
  carpetArea: 599,      // 地毯专清
  carpetAreaBg: 600,      // 地毯专清点阵背景
  carpetAreaRectEdit: 710,  // 地毯专清方框编辑状态（需要比按钮低一点）
  carpetAreaEdit: 711,  // 地毯专清编辑状态
  carpetAreaEditBg: 713,  // 地毯专清编辑状态点阵背景
  carpetAreaNum: 722,   // 地毯专清序号
}