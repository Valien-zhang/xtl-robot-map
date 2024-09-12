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
function CustomInfoCard(props) {
  return (
    <div className="customInfocardcontainer">
      <div className="name">
        <div className="numIcon">{props.num}</div>
        <span>{props.name}</span>
      </div>
      <div className="info">
        <img
          className="img"
          alt=""
          src={
            props.cleanTimes === CLEAN_TIMES.t2 ?
              import('./images/clean_times_2_min.png') :
              import('./images/clean_times_1_min.png')
          }
        />
        <img
          className="img"
          alt=""
          src={getWindRes(props.wind)}
        />
      </div>
    </div>
  )
}
// export default CustomInfoCard;

/**
 * 获取模式图标
 */
function getSweepModeRes(level) {
  switch (level) {
    case SWEEP_MODE.sweep:
      return import('./images/cleaning_mode_sweep_min.png');
    case SWEEP_MODE.sweepMop:
      return import('./images/cleaning_mode_sweep_mop_min.png');
    case SWEEP_MODE.mop:
      return import('./images/cleaning_mode_mop_min.png');
    case SWEEP_MODE.sweepThenMop:
      return import('./images/cleaning_mode_sweep_then_mop_min.png');
    default:
      return null;
  }
}

/**
 * 获取风力图标
 */
function getWindRes(level) {
  switch (level) {
    case WIND_LEVEL.l1:
      return import('./images/wind_1_min.png');
    case WIND_LEVEL.l2:
      return import('./images/wind_2_min.png');
    case WIND_LEVEL.l3:
      return import('./images/wind_3_min.png');
    case WIND_LEVEL.l4:
      return import('./images/wind_4_min.png');
    default:
      return null;
  }
}

/**
 * 获取水量图标
 */
function getWaterRes(level) {
  switch (level) {
    case WATER_LEVEL.l1:
      return import('./images/water_3_min.png');
    case WATER_LEVEL.l2:
      return import('./images/water_2_min.png');
    case WATER_LEVEL.l3:
      return import('./images/water_1_min.png');
    default:
      return null;
  }
}


function initHtml(num, name, sweepMode, cleanTimes, wind, water) {
  return `<div class="customInfocardcontainer">
            <div class="name">
              <div class="numIcon">${num}</div>
              <span>${name}</span>
              <span class="times">${cleanTimes === CLEAN_TIMES.t2 ? '2x' : '1x'}</span>
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

