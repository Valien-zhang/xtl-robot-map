import logger from './logger';
import { MATERIAL_TYPE } from "./constants";
import { md5 } from 'js-md5';

export const SMapValueType = { simple: 0, cover: 1, negative: 2 }; // 地图值的类型
// 房间颜色值 - 109
export const SCCMapColor = { obstacle: -9, patch_carpet: -4, carpet: -3, patch: -2, wall: -1, background: 0, discover: 1, cover: 2, deepCover: 3, roomBegin: 10, roomEnd: 59, coverRoomBegin: 60, coverRoomEnd: 109, deepCoverRoomBegin: -109, deepCoverRoomEnd: -60, carpetRoomBegin: -109, carpetRoomEnd: -60, };

// export function Uint8ToPNGBase64(width, height, u8Arr) {
// 	return new Promise((resolve, reject) => {
// 		var image = new Jimp(width, height, function (err, image) {
// 			let buffer = image.bitmap.data;
// 			for (let i = 0; i < u8Arr.length; i++) {
// 				buffer[i] = u8Arr[i];
// 			}
// 			image.getBase64Async(image.getMIME()).then(res => {
// 				// logger.d('getBase64Async res:', res);
// 				resolve(res);
// 			}).catch(error => {
// 				logger.d('getBase64Async error:', error);
// 				reject(error);
// 			});
// 		})
// 	});
// }

export function Uint8ToPNGBase64(width, height, u8Arr) {
	return new Promise((resolve, reject) => {
		try {
			// 创建 Canvas 元素
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');

			// 将 Uint8Array 转换为 ImageData 对象
			const imageData = new ImageData(new Uint8ClampedArray(u8Arr), width, height);
			ctx.putImageData(imageData, 0, 0);

			// 获取 Base64 编码的 PNG 图片
			const base64PNG = canvas.toDataURL('image/png');
			resolve(base64PNG);
		} catch (error) {
			reject(error);
		}
	});
}


function encodeData(data) {
	var strData = "";
	if (typeof data == "string") {
		strData = data;
	} else {
		var aData = data;
		for (var i = 0; i < aData.length; i++) {
			strData += String.fromCharCode(aData[i]);
		}
	}
	return btoa(strData);
}

// 把json格式的地图数据进行转换
export function convertJson(mapData, carpeDisplayStatus, testJson) {
	// logger.d('dataJSON:', mapData);
	try {
		// let data = testJson;
		let data = mapData;

		// logger.d('开始convertJson 传入的1: ', data);
		// 把json数据，更新到原来的probuf模型上， 方便下面方法的统一使用工具类的方法
		let robotMap = {};

		robotMap.mapType = data.type;
		robotMap.mapExtInfo = {
			taskBeginDate: data.ext.begin,
			mapUploadDate: data.ext.upload,
			mapValid: data.ext.valid,
			radian: data.ext.radian,
			force: data.ext.force,
			cleanPath: data.ext.path,
			boudaryInfo: data.ext.boudaryInfo,
			mapVersion: data.ext.mapVersion,
			mapValueType: data.ext.mapValueType,
		};
		// logger.d('dataJSON: 1');
		robotMap.mapHead = {
			mapHeadId: data.head.id,
			sizeX: data.head.size[0],
			sizeY: data.head.size[1],
			minX: data.head.min[0],
			minY: data.head.min[1],
			resolution: data.head.ratio,
		};
		// 解析全图，是因为地图数据在3D上有显示，要通过真实的图来确认
		let pointArr = convertHex16ToUint8Array(data.data.map, data.head.size[0] * data.head.size[1]);
		robotMap.mapData = {
			mapData: pointArr,
			wifiData: null
		};
		if (data.historyPose) {
			robotMap.historyPose = {
				poseId: data.historyPose.id,
				points: [],
				pathType: data.historyPose.PTY
			};
			for (let m of data.historyPose.PTS) {
				let p = { x: m.x, y: m.y, update: m.tie };
				robotMap.historyPose.points.push(p);
			}
		} else {
			robotMap.historyPose = null;
		}
		if (data.chargeStation) {
			robotMap.chargeStation = {
				x: data.chargeStation.x,
				y: data.chargeStation.y,
				phi: data.chargeStation.phi,
				roomId: data.chargeStation.RI,
			};
		} else {
			robotMap.chargeStation = null;
		}
		// logger.d(`999999:`, robotMap.chargeStation);
		// logger.d('66666:   4');
		if (data.currentPose) {
			robotMap.currentPose = {
				poseId: data.currentPose.id,
				x: data.currentPose.x,
				y: data.currentPose.y,
				phi: data.currentPose.phi
			};
		} else {
			robotMap.currentPose = null;
		}
		// logger.d('66666:   5');
		robotMap.virtualWalls = [];
		if (data.virtualWalls_v2 instanceof Array) {
			for (let w of data.virtualWalls_v2) {
				let wall = { status: w.ST, type: w.TY, areaIndex: w.AI };
				wall.points = [];
				for (let p of w.PTS) {
					wall.points.push({ x: p.x, y: p.y });
				}
				robotMap.virtualWalls.push(wall);
			}
		}
		// logger.d('66666:   6');
		// TEST
		// let vall_1 = { status: 0, type: 2, areaIndex: 0, points:[ {x:-5,y:-5},{x:-5,y:-5},{x:0,y:0},{x:0,y:0} ] };
		// let vall_2 = { status: 0, type: 3, areaIndex: 0, points:[ {x:0,y:0}, {x:3,y:0},{x:3,y:3},{x:0,y:3} ] };
		// let vall_3 = { status: 0, type: 6, areaIndex: 0, points:[ {x:4,y:0}, {x:6,y:0},{x:6,y:3},{x:4,y:3} ] };
		// robotMap.virtualWalls = [vall_1, vall_2, vall_3];

		// logger.d('66666:   7');
		robotMap.areasInfo = [];
		if (data.areasInfo_v2 instanceof Array) {
			for (let w of data.areasInfo_v2) {
				let wall = { status: w.ST, type: w.TY, areaIndex: w.AI };
				wall.points = [];
				for (let p of w.PTS) {
					wall.points.push({ x: p.x, y: p.y });
				}
				robotMap.areasInfo.push(wall);
			}
		}

		// let vall_2 = { status: 0, type: 3, areaIndex: 0, points:[ {x:0,y:0}, {x:3,y:0},{x:3,y:3},{x:0,y:3} ] };
		// let vall_3 = { status: 0, type: 6, areaIndex: 0, points:[ {x:4,y:0}, {x:6,y:0},{x:6,y:3},{x:4,y:3} ] };
		// robotMap.areasInfo = [vall_2, vall_3];

		// logger.d('66666:   8');
		// robotMap.navigationPoints = [];
		// if (data.navigationPoints instanceof Array) {
		// 	for(let n of data.navigationPoints){ 
		// 		robotMap.navigationPoints.push({ pointId: n.id, status: n.ST, pointType: n.PT, x:n.x, y: n.y, phi: n.phi });
		// 	}
		// }
		// logger.d('66666:   9');
		robotMap.roomDataInfo = [];
		if (data.roomInfo instanceof Array) {
			for (let r of data.roomInfo) {
				let room = { roomId: r.id, roomName: r.RN, roomTypeId: r.RT, meterialId: r.MID, cleanState: r.CS, roomClean: r.RC, roomCleanIndex: r.RCI, roomNamePost: { x: r.x, y: r.y }, colorid: r.CI };
				room.cleanPerfer = { cleanMode: r.CM, waterLevel: r.WL, windPower: r.WP, twiceClean: r.TC };
				robotMap.roomDataInfo.push(room);
			}
		}
		// robotMap.roomDataInfo[2].cleanState = 2; // TEST
		// logger.d('66666:   10');
		// robotMap.roomMatrix = null; // TT--TT
		// robotMap.roomChain = [];
		// // logger.d('66666:   11');
		// if (data.roomChain instanceof Array){
		// 	for(let w of data.roomChain ){ 
		// 		let chain = { roomId: w.id };
		// 		chain.points = [];
		// 		for(let p of w.PTS ){ 
		// 			chain.points.push({ x: p.x, y: p.y, value: p.v });
		// 		} 
		// 	}
		// }
		// logger.d('66666:   12');
		// robotMap.objects = [];
		// if (data.objects instanceof Array){
		// 	for(let o of data.objects ){ 
		// 		robotMap.objects.push({ objectId: o.id, objectTypeId: o.tid, objectName: o.ON, confirm: o.CF, x: o.x, y: o.y, url:o.url, notShow: o.NS });
		// 	}
		// }

		// let furn = {};
		// furn.id = 3333;
		// furn.typeId = 1511;
		// // repeated DevicePointInfo points = 3;
		// // furn.points = [
		// //   {x: 0, y: 0}, {x: 0, y: 4}, {x: 4, y: 4},{x: 4, y: 0}
		// // ];

		// robotMap.furnitureInfo = [furn];
		// logger.d('66666:   13');
		robotMap.furnitureInfo = [];
		if (data.furnitures) {
			if (data.furnitures instanceof Array) {
				for (let f of data.furnitures) {
					let furn = { id: f.id, typeId: f.tid, url: f.url, status: f.ST, };
					furn.points = [];
					for (let p of f.PTS) {
						furn.points.push({ x: p.x, y: p.y });
					}
					furn.react = [];  // TT--TT
					robotMap.furnitureInfo.push(furn);
				}
			}
		}


		// // TEST
		// let line0 = {
		//   type: 0,
		//   begin: { x: 4.3, y: 3.8 },
		//   end : { x: 0, y: 3.8 }
		// }
		// let line1 = {
		//   tyep: 1,
		//   begin: { x: 4.3, y: 0 },
		//   end : { x: 0, y: 0 }
		// }
		// let line2 = {
		//   tyep: 2,
		//   begin: { x: 4.3, y: 0 },
		//   end : { x: 0, y: 3.8 }
		// }
		// let threeInfoRoom = {
		//   roomId: 10,
		//   lines: [line0, line1, line2]
		// };
		// robotMap.threeInfo = {};
		// robotMap.threeInfo.rooms = [threeInfoRoom];
		// logger.d('robotMap.threeInfo:', robotMap.threeInfo);
		// logger.d('66666:   14');

		// 先解析threeInfo，如果和之前的渲染过的一致，就不再更新，直接
		if (data.threeInfo) {
			robotMap.threeInfo = { rooms: [] };
			if (data.threeInfo instanceof Array) {
				for (let thr of data.threeInfo) {
					let room = { roomId: thr.id, lines: [] };
					for (let li of thr.Lines) {
						let line = { type: li.TY };
						line.begin = { x: li.BPT.x, y: li.BPT.y };
						line.end = { x: li.EPT.x, y: li.EPT.y };
						room.lines.push(line);
					}
					robotMap.threeInfo.rooms.push(room);
				}
			}
		}
		// logger.d('dataJSON: 2');

		// logger.d('robotMap：', robotMap);
		let threeMd5 = md5.update(JSON.stringify(robotMap.threeInfo)).digest('hex');
		let areaMd5 = md5.update(JSON.stringify(robotMap.areasInfo)).digest('hex');
		let wallMd5 = md5.update(JSON.stringify(robotMap.virtualWalls)).digest('hex');
		let poseMd5 = md5.update(JSON.stringify(robotMap.currentPose)).digest('hex');
		let charMd5 = md5.update(JSON.stringify(robotMap.chargeStation)).digest('hex');
		return [robotMap, { threeMd5, areaMd5, wallMd5, poseMd5, charMd5 }];
	} catch (error) {
		logger.d(`convertJson error:`, error);
		return [];
	}
}


//地图数据解码
function convertHex16ToUint8Array(b64Data) {
	//base64解码
	const str = window.atob(b64Data);
	// 转成int8
	let buffer = new Int8Array(str.length);
	for (let i = 0; i < buffer.length; i++) {
		buffer[i] = str.charCodeAt(i);
	}
	const mapArr = Array.from(buffer);
	return mapArr
}

// 获取家具的方向，中心点
export function getCenterAndWH(points) {
	if (points && points.length == 4) {
		let phi = 0;
		let width = 0;
		let heigth = 0;

		if (points[0].x == points[1].x && points[0].y > points[1].y) { // 没有旋转  
			/*    0    3
						1    2  
			phi = 0  床头在左侧     
			*/
			phi = 0;
			width = points[3].x - points[0].x;
			heigth = points[0].y - points[1].y;
		} else if (points[0].x < points[1].x && points[0].y == points[1].y) {
			/*    3    2
						0    1  
			phi = -Math.PI / 2;  床头在下
			*/
			phi = -Math.PI / 2;
			heigth = points[1].x - points[0].x;
			width = points[3].y - points[0].y;
		} else if (points[0].x == points[1].x && points[0].y < points[1].y) {
			/*    2    1
						3    0  
			phi = Math.PI;  床头在右
			*/
			phi = Math.PI;
			width = points[1].x - points[2].x;
			heigth = points[1].y - points[0].y;
		} else if (points[0].x > points[1].x && points[0].y == points[1].y) {
			/*    1    0
						2    3  
			phi = Math.PI / 2;  床头在上
			*/
			phi = Math.PI / 2;
			heigth = points[0].x - points[1].x;
			width = points[1].y - points[2].y;
		}
		let xT = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
		let yT = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
		return { x: xT, y: yT, width: width, heigth: heigth, phi: phi };
	}
	return { x: 1100, y: 1100, width: 0, height: 0, phi: 0 };
}

export function parseNewCharge(robotMap, chargeInfo) {
	if (robotMap.chargeStation == null) {
		logger.d('充电座位置:nil');
	} else {
		chargeInfo.x = robotMap.chargeStation.x;
		chargeInfo.y = robotMap.chargeStation.y;
		chargeInfo.phi = getValidPhi(robotMap.chargeStation.phi);
	}
	return chargeInfo;
}

export function parseNewPoint(robotMap, pointInfo) {
	try {
		// logger.d('6666:1', pointInfo);
		if (!robotMap.currentPose) {
			logger.d('机器人位置:nil');
		} else {
			pointInfo = robotMap.currentPose;
		}
		// logger.d('6666:2', pointInfo);
		let nP;
		if (robotMap.historyPose) {
			if (robotMap.historyPose.points && robotMap.historyPose.points.length > 0) {
				nP = robotMap.historyPose.points[robotMap.historyPose.points.length - 1];
			} else if (robotMap != null) {
				nP = robotMap.currentPose;
			}
		}
		// logger.d('6666:3', pointInfo);
		// logger.d('6666:4', nP);
		if (nP && nP.poseId > pointInfo.poseId) {
			pointInfo = { ...pointInfo, ...nP };
		}
		pointInfo.phi = getValidPhi(pointInfo.phi);
		logger.d('绘制使用的机器人位置:', pointInfo);
		return pointInfo;
	} catch (error) {
		logger.d('parseNewPoint error:', error);
		return pointInfo;
	}
}

export function parseNewNavi(robotMap, spotInfo) {
	if (robotMap.navigationPoints.length > 0) {
		spotInfo.pose_id = robotMap.navigationPoints[0].pointId;
		spotInfo.status = robotMap.navigationPoints[0].status;
		spotInfo.x = robotMap.navigationPoints[0].x;
		spotInfo.y = robotMap.navigationPoints[0].y;
		spotInfo.phi = robotMap.navigationPoints[0].phi;
	} else {
		spotInfo.x = 1100;  // 让其无限远
		spotInfo.y = 1100;
	}
	return spotInfo;
}

// 获取 -pi ~ pi 之间的phi值
function getValidPhi(oldPhi) {
	if (oldPhi >= -Math.PI && oldPhi <= Math.PI) {
		return oldPhi;
	}
	let newPhi = oldPhi;
	while (!(newPhi >= -Math.PI && newPhi <= Math.PI)) {
		if (newPhi > Math.PI) {
			newPhi -= 2 * Math.PI;
		} else if (newPhi < -Math.PI) {
			newPhi += 2 * Math.PI;
		}
	}
	return newPhi;
}


/**
 * 获取瓷砖的纹理色值点数组
 * @param {number} type
 */
export function getCeramicTilePoints(ceramic_tile_width, ceramic_tile_height, type) {
	let array = [];
	for (let i = 0; i < ceramic_tile_height; i++) {
		for (let k = 0; k < ceramic_tile_width; k++) {
			// if (i == ceramic_tile_height - 1 || k == ceramic_tile_width - 1) {
			if (i == 0 || k == 0) {
				array.push(type + 60);
			} else {
				array.push(type);
			}
		}
	}
	return array;
}

/**
 * 获取瓷砖的纹理色值点数组
 * @param {number} type 
 */
export function getWoodFloorPoints(wood_floor_width, wood_floor_height, type) {
	let array = [];
	for (let i = 0; i < wood_floor_height; i++) {
		for (let k = 0; k < wood_floor_width; k++) {
			/*
					111111
					1    1  
					1    111111
					1    1
					1    1
					横线上线(左边)  横线中线(右边)
					竖线上线(最左边)  竖线中线(中间)
			*/
			if ((i == 0 && k < wood_floor_width / 2)
				|| (i == wood_floor_height / 2 && k > wood_floor_width / 2)
				|| (k == 0 || k == wood_floor_width / 2)
			) {
				array.push(type + 60);
			} else {
				array.push(type);
			}
		}
	}
	return array;
}


/**
 * 获取木地板纹理色值点类型
 * @param {*} row 行
 * @param {*} col 列
 * @param {*} type 
 */
export function getWoodFloorTextureType(row, col, type, woodFloorTexture, wood_floor_width, wood_floor_height) {
	const rowMod = row % wood_floor_height;
	const colMod = col % wood_floor_width;
	const index = colMod + rowMod * wood_floor_width;
	const array = woodFloorTexture[type];
	return array[index];
}

/**
 * 获取瓷砖纹理色值点类型
 * @param {*} row 行
 * @param {*} col 列
 * @param {*} type 
 */
export function getCeramicTileTextureType(row, col, type, ceramicTileTexture, ceramic_tile_width, ceramic_tile_height) {
	const rowMod = row % ceramic_tile_height;
	const colMod = col % ceramic_tile_width;
	const index = colMod + rowMod * ceramic_tile_width;
	const array = ceramicTileTexture[type];
	return array[index];
}

/**
 * 获取房间材质类型
 * 1:水泥地面 2:瓷砖 3:木地板 30:其他
 * @param {*} type 
 */
export function getRoomMeteriaType(robotMap, type) {
	// logger.d("robotMap.roomDataInfo ", robotMap.roomDataInfo );
	if (robotMap.roomDataInfo != undefined && robotMap.roomDataInfo != null && robotMap.roomDataInfo.length > 0) {
		for (const room of robotMap.roomDataInfo) {
			if (room.roomId == type) {
				return room.meterialId;
			}
		}
	}
	return type;
}

export function getRoomCleanState(robotMap, roomId) {
	// logger.d("robotMap.roomDataInfo ", robotMap.roomDataInfo );
	if (robotMap.roomDataInfo && robotMap.roomDataInfo.length > 0) {
		for (const room of robotMap.roomDataInfo) {
			if (room.roomId == roomId) {
				// 状态类型 0：未清扫；1：正在一次清扫；2：已经一次清扫；3：正在二次清扫；4：已经二次清扫
				return room.cleanState === 2 || room.cleanState === 4; // //状态类型 0：未清扫；1：正在清扫；2：已经清扫
			}
		}
	}
	return false;
}


export function getMapValue(value) {
	if (value >= SCCMapColor.coverRoomBegin && value <= SCCMapColor.coverRoomEnd) {
		return { value: value - 50, type: SMapValueType.cover };
	}
	if (value >= SCCMapColor.deepCoverRoomBegin && value <= SCCMapColor.deepCoverRoomEnd) {
		return { value: -value - 50, type: SMapValueType.negative };
	}
	return { value: value, type: SMapValueType.simple };
}

export function isCarpet(value, x, y) {
	return value == SCCMapColor.patch_carpet || value == SCCMapColor.carpet;
}

export function isCarpetXY(x, y) {
	return (x % 4 == 0 && y % 4 == 0) || (x % 4 == 2 && y % 4 == 2);
	// return x % 3 == 0 && y % 3 == 0 && x > 300 && x < 500;
}

export function isMaterialXY(type, x, y) {
	if (type === MATERIAL_TYPE.ceramicTile) {
		return isMaterialCeramicTileXY(x, y);
	} else if (type === MATERIAL_TYPE.wood) {
		return isMaterialWoodXY(x, y);
	} else {
		return false;
	}
}

/**
 * 瓷砖材质
 * 12 * 12的正方形
 * 绘制右边跟下边组合成
 * 
 *      |
 *      |
 * _____|
 */
export function isMaterialCeramicTileXY(x, y) {
	return (x % 12 == 0 && y % 12 < 12) || (x % 12 < 12 && y % 12 == 0);
}

/**
 * 木板材质
 * 16 * 30的U形加右边中横
 * 
 * |    |
 * |    |____
 * |    |
 * |____|
 */
export function isMaterialWoodXY(x, y) {
	const xv = x % 16;
	const yv = y % 30;
	return (xv == 0 && yv < 30)
		|| (xv == 8 && yv < 30)
		|| (xv < 8 && yv == 0)
		|| (xv >= 8 && yv == 15);
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


// 地图插值  800 -> 1600   升分辨率
export function perfectMapData(mapData, sizeX, sizeY, mapPerfectScale) {
	try {
		if (mapPerfectScale == 1) { return mapData; }
		//logger.d(`开始对地图进行插值扩充，倍数:${ mapPerfectScale }`);
		const scale = mapPerfectScale;
		const width = sizeX;
		const height = sizeY;
		let array = [];
		for (let i = 0; i < width * height * 4 * scale; i++) {
			array.push(-10);
		}
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let ind = y * width + x;
				const value1 = mapData[ind * 4 + 0];
				const value2 = mapData[ind * 4 + 1];
				const value3 = mapData[ind * 4 + 2];
				const value4 = mapData[ind * 4 + 3];

				for (let mY = 0; mY < scale; mY++) {
					for (let mX = 0; mX < scale; mX++) {
						// const index = (y * 4 * scale + mY * 4) * width * scale + x * 4 * scale + mX * 4;
						const index = (y * scale + mY) * width * scale + x * scale + mX;
						array[index * 4 + 0] = value1;
						array[index * 4 + 1] = value2;
						array[index * 4 + 2] = value3;
						array[index * 4 + 3] = value4;
					}
				}
			}
		}
		return array;
	} catch (error) {
		logger.d(`perfectMapData error:`, error);
		return [];
	}
}

export function isNull(variable) {
	if (variable === null || variable === undefined) {
		return true;
	}
	if (typeof variable === 'string' && variable.trim() === '') {
		return true;
	}
	if (Array.isArray(variable) && variable.length === 0) {
		return true;
	}
	if (typeof variable === 'object' && Object.keys(variable).length === 0) {
		return true;
	}
	return false;
}

export function isNumber(obj) {
	return typeof obj === 'number' && !isNaN(obj);
}