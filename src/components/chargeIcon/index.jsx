import React, { useMemo } from "react";
import './index.less';
import { observer } from 'mobx-react-lite';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { Images } from '../../assets';

const ChargeIconMarker = observer(({ position, phi, zIndex }) => {
  const icon = useMemo(() => {
    return L.divIcon({
      html: `<div class="rootView">
                    <img 
                    class="img" 
                    style="transform: rotate(${phi - 90}deg)"
                    src=${Images.chargeIcon} 
                    alt="icon"/>
                </div>`,
      iconSize: [24, 30],
      fillOpacity: 1,
      iconAnchor: [16, 32],
    });
  }, [phi]);


  return (
    <Marker position={position} icon={icon} zIndexOffset={zIndex} />
  );
});


export default ChargeIconMarker;



