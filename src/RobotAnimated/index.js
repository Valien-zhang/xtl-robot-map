import React from "react";
import './index.less';

/**
 * 机器人状态动画
 * @param {*} props 
 * @returns 
 */
// export default function RobotAnimated(props) {
//   return (
//     <div className="box">
//       <div className="cir1"/>
//       <div className="cir2"/>
//       <div className="cir3"/>
//       <div className="cir4"/>
//     </div>
//   )
// }

export default function robotAnimated(status, phi) {
  // console.log('机器人角度---------------', phi)
  //<div class="cir1 ${getColor(status)}"/>
  return `
    <div class="rootView">
      <div class="divBox">
        <div class="cir1 "/>
      </div>
      <img
        class="img"
        style="transform: rotate(${phi}deg)"
        src=${'../assets/img/jiqiren.png'}
      />
    </div>
  `
}

