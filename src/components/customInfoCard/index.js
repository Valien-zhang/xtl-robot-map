import React from 'react';
import {
  WIND_LEVEL,
  CLEAN_TIMES,
  WATER_LEVEL,
  SWEEP_MODE
} from '../../utils/constants';
import './index.less';

/**
 * 房间定制清扫，地图里面的定制信息展示卡片
 * @param {*} num 清扫序号 
 * @param {*} name 房间名称
 * @param {*} cleanTimes 清扫次数（1次/2次）
 * @param {*} wind 风力等级
 * @returns 
 */
// function CustomInfoCard(props) {
//   return (
//     <div className="customInfocardcontainer">
//       <div className="name">
//         <div className="numIcon">{props.num}</div>
//         <span>{props.name}</span>
//       </div>
//       <div className="info">
//         <img
//           className="img"
//           alt=""
//           src={
//             props.cleanTimes === CLEAN_TIMES.Two ?
//               ('./images/clean_times_2_min.png') :
//               ('./images/clean_times_1_min.png')
//           }
//         />
//         <img
//           className="img"
//           alt=""
//           src={getWindRes(props.wind)}
//         />
//       </div>
//     </div>
//   )
// }
// export default CustomInfoCard;

/**
 * 获取模式图标
 */
function getSweepModeRes(level) {
  switch (level) {
    case SWEEP_MODE.Sweep:
      return ('./images/cleaning_mode_sweep_min.png');
    case SWEEP_MODE.SweepMop:
      return ('./images/cleaning_mode_sweep_mop_min.png');
    case SWEEP_MODE.Mop:
      return ('./images/cleaning_mode_mop_min.png');
    case SWEEP_MODE.SweepThenMop:
      return ('./images/cleaning_mode_sweep_then_mop_min.png');
    default:
      return null;
  }
}

/**
 * 获取风力图标
 */
function getWindRes(level) {
  switch (level) {
    case WIND_LEVEL.Quiet:
      return ('./images/wind_1_min.png');
    case WIND_LEVEL.Auto:
      return ('./images/wind_2_min.png');
    case WIND_LEVEL.Strong:
      return ('./images/wind_3_min.png');
    case WIND_LEVEL.Max:
      return ('./images/wind_4_min.png');
    default:
      return null;
  }
}

/**
 * 获取水量图标
 */
function getWaterRes(level) {
  switch (level) {
    case WATER_LEVEL.Low:
      return ('./images/water_3_min.png');
    case WATER_LEVEL.Mid:
      return ('./images/water_2_min.png');
    case WATER_LEVEL.High:
      return ('./images/water_1_min.png');
    default:
      return null;
  }
}


function initHtml(name, num, sweepMode, cleanTimes, wind, water) {
  return `<div class="customInfocardcontainer">
            <div class="name">
              <div class="numIcon">${num}</div>
              <span>${name}</span>
              <span class="times">${cleanTimes === CLEAN_TIMES.Two ? '2x' : '1x'}</span>
            </div>
            <div class="info">
              <img
                class="img"
                src=${getSweepModeRes(sweepMode)}
              />
              ${sweepMode === SWEEP_MODE.mop ? '' : `<img
                class="img"
                src=${getWindRes(wind)}
              />`}
              ${sweepMode === SWEEP_MODE.sweep ? '' : `<img
                class="img"
                src=${getWaterRes(water)}
              />`}
            </div>
          </div>`

}
export default initHtml;

