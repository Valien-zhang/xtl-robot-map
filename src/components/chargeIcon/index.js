import React from "react";
import './index.less';
import chargeImg from '../../assets/img/chongdianzhuang.png';

export default function getChargeIcon(phi) {
  return `
    <div class="rootView">
      <img
        class="img"
        style="transform: rotate(${phi - 90}deg)"
        src=${chargeImg}
    </div>
  `
}


