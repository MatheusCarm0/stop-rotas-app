import { useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { theme } from "./theme";

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  moving?: boolean;
}

interface Props {
  points?: { lat: number; lng: number }[];
  markers?: MapMarker[];
  follow?: boolean;
  height: number;
  color?: string;
  center?: { lat: number; lng: number };
}

// Campinas como centro padrão até o GPS dar a primeira posição.
const DEFAULT_CENTER = { lat: -22.9099, lng: -47.0626 };

const HTML = `<!doctype html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<style>html,body,#map{height:100%;margin:0;background:#0d0c0b}
.lbl{background:#141210;color:#f0ebe1;border:1px solid #322e28;border-radius:6px;padding:2px 6px;font:700 11px system-ui;white-space:nowrap}</style>
</head><body><div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
var map = L.map('map', { zoomControl:false, attributionControl:false }).setView([__LAT__, __LNG__], 15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:20, subdomains:'abcd' }).addTo(map);
var routeColor = '__COLOR__';
var line = L.polyline([], { color: routeColor, weight: 5, opacity: 0.95, lineJoin:'round' }).addTo(map);
var here = null, startDot = null, mkLayer = L.layerGroup().addTo(map);
var firstFit = true;
function updatePoints(pts, follow){
  if(!pts || !pts.length) return;
  var latlngs = pts.map(function(p){ return [p.lat, p.lng]; });
  line.setLatLngs(latlngs);
  var last = latlngs[latlngs.length-1];
  if(!here){ here = L.circleMarker(last, {radius:7, color:'#fff', weight:2, fillColor:routeColor, fillOpacity:1}).addTo(map); }
  else here.setLatLng(last);
  if(!startDot){ startDot = L.circleMarker(latlngs[0], {radius:5, color:'#0d0c0b', weight:2, fillColor:'#34d17f', fillOpacity:1}).addTo(map); }
  if(follow){ map.setView(last, map.getZoom(), {animate:true}); }
  else if(firstFit && latlngs.length>1){ map.fitBounds(line.getBounds().pad(0.2)); firstFit=false; }
}
function setMarkers(mks){
  mkLayer.clearLayers();
  (mks||[]).forEach(function(m){
    var c = m.color || '#e1231c';
    L.circleMarker([m.lat,m.lng], {radius:8, color:'#fff', weight:2, fillColor:c, fillOpacity:1}).addTo(mkLayer);
    if(m.label){ L.marker([m.lat,m.lng], {icon:L.divIcon({className:'', html:'<div class=\\'lbl\\'>'+m.label+'</div>', iconAnchor:[-6,10]})}).addTo(mkLayer); }
  });
  if(mks && mks.length){
    var g = L.featureGroup(mks.map(function(m){return L.marker([m.lat,m.lng]);}));
    try{ map.fitBounds(g.getBounds().pad(0.3)); }catch(e){}
  }
}
window.setData = function(payload){
  try{
    var d = JSON.parse(payload);
    if(d.points) updatePoints(d.points, d.follow);
    if(d.markers) setMarkers(d.markers);
  }catch(e){}
};
window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;

export function LiveMap({ points = [], markers = [], follow = false, height, color = theme.red, center }: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const c = center || points[points.length - 1] || DEFAULT_CENTER;

  const html = HTML.replace("__LAT__", String(c.lat))
    .replace("__LNG__", String(c.lng))
    .replace("__COLOR__", color);

  function flush() {
    if (!ready.current) return;
    const payload = JSON.stringify({ points, markers, follow });
    ref.current?.injectJavaScript(`window.setData(${JSON.stringify(payload)});true;`);
  }

  useEffect(() => {
    flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, markers, follow]);

  return (
    <View style={{ height, borderRadius: 12, overflow: "hidden", backgroundColor: "#0d0c0b" }}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={() => {
          ready.current = true;
          flush();
        }}
        style={{ backgroundColor: "#0d0c0b" }}
      />
    </View>
  );
}
