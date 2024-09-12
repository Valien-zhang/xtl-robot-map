import React from "react";
import './index.less';
import robotImg from '../../assets/img/jiqiren.png';

export default function getRobotIcon(phi) {
  return `
    <div class="rootView">
      <img
        class="img"
        style="transform: rotate(${phi - 90}deg)"
        src=${robotImg}
    </div>
  `
}
