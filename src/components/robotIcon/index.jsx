import React, { useMemo } from "react";
import './index.less';
import { observer } from 'mobx-react-lite';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { Images } from '../../assets';


const RobotIconMarker = observer(({ position, phi, zIndex }) => {
  const icon = useMemo(() => {
    return L.divIcon({
      html: `<div class="rootView" style="transform: rotate(${phi}deg);">
                    <img class="img" src=${Images.robotIcon} alt="icon"/>
                </div>`,
      className: 'divicon',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, [phi]);


  return (
    <Marker position={position} icon={icon} zIndexOffset={zIndex} />
  );
});


export default RobotIconMarker;
