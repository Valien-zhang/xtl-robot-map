import logger from './logger';
import { MATERIAL_TYPE } from "./constants";
import { md5 } from 'js-md5';
import base64js from 'base64-js';
import Lz4 from './lz4Util';
import { LatLng } from "leaflet";
import { LatLngBounds } from "leaflet";

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


export const SMapValueType = { simple: 0, cover: 1, negative: 2 }; // 地图值的类型
// 房间颜色值 - 109
export const SCCMapColor = { obstacle: -9, patch_carpet: -4, carpet: -3, patch: -2, wall: -1, background: 0, discover: 1, cover: 2, deepCover: 3, roomBegin: 10, roomEnd: 59, coverRoomBegin: 60, coverRoomEnd: 109, deepCoverRoomBegin: -109, deepCoverRoomEnd: -60, carpetRoomBegin: -109, carpetRoomEnd: -60, };

/**
 * 
 * @param {string} keyStr
 * @returns {string} Md5Key 
 */
export function generateMd5Key(keyStr) {
	return md5(keyStr);
}

/**
 * 获取地图上所有的栅格点
 * @param {*} map 
 * @param {*} lz4Len 
 * @returns 
 */
export function getMapDataPoints(map, lz4Len) {
	try {
		if (!lz4Len) {
			throw new Error('useMapPoints map pix is empty');
		}
		const decodedString = base64js.toByteArray(map);
		const data = Lz4.uncompress(decodedString, lz4Len);
		const uint8Array = new Uint8Array(data);
		logger.d('uint8Array in useMapPoints succ', uint8Array.length);
		return uint8Array;
	} catch (error) {
		logger.e('Error in useMapPoints:', error);
		return [];
	}
}

/**
 * u8Arr RGB数据转换为base64图片
 * @param {*} width 
 * @param {*} height 
 * @param {*} u8Arr 
 * @returns 
 */
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



// 获取两个世界坐标对应的屏幕上的距离。以当前的缩放比
// export function getPointDistanceByPixels(map, pixel1, pixel2) {
// 	logger.d(`pixel1:`, pixel1, pixel2);
// 	// let worldP1 = pixel2WorldObj(pixel1.x || pixel1.lng, pixel1.y || pixel1.lat, head);
// 	// let worldP2 = pixel2WorldObj(pixel2.x || pixel2.lng, pixel2.y || pixel2.lat, head);
// 	// logger.d(`worldP1:`, worldP1, worldP2);
// 	let leaflet1 = world2Leaflet(pixel1.x || pixel1.lng, pixel1.y || pixel1.lat);
// 	let leaflet2 = world2Leaflet(pixel2.x || pixel2.lng, pixel2.y || pixel2.lat);
// 	logger.d(`leaflet1:`, leaflet1, leaflet2);
// 	let point1 = map.latLngToContainerPoint({ lng: leaflet1[0], lat: leaflet1[1] });
// 	let point2 = map.latLngToContainerPoint({ lng: leaflet2[0], lat: leaflet2[1] });
// 	logger.d(`point1:`, point1, point2);
// 	let disatnce = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
// 	logger.d(`disatnce:`, disatnce);

// 	return disatnce;
// }

// 根据地图的缩放比,计算
export function getCorrectBound(mapZoonRect, bounds) {
	//<LatLngBounds> 
	logger.d(`bounds:`, bounds);
	let leftBottom = bounds.getSouthWest();
	let rightTop = bounds.getNorthEast();
	let width = Math.abs(leftBottom.lng - rightTop.lng);
	let height = Math.abs(leftBottom.lat - rightTop.lat);
	// width / (width + x) =  mapZoonRect.showRatio
	// (width + x) =  width /  mapZoonRect.showRatio
	// x = width / mapZoonRect.showRatio - width
	let offsetX = (width / mapZoonRect.showRatio - width) / 2.0;
	let offsetY = (height / mapZoonRect.showRatio - height) / 2.0;
	logger.d(`offsetXY:`, offsetX, offsetY, leftBottom.lat + offsetY, leftBottom.lng + offsetX);
	let newLeftBottom = new LatLng(leftBottom.lat - offsetY, leftBottom.lng - offsetX);
	let newRightTop = new LatLng(rightTop.lat + offsetY, rightTop.lng + offsetX);
	let result = new LatLngBounds(newLeftBottom, newRightTop);
	logger.d(`getCorrectBound bounds:`, result);
	return result;
}

