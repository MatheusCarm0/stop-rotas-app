import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";
import { projectPoints, type Pt } from "./geo";
import { theme } from "./theme";

interface Props {
  points: Pt[];
  deliveries?: Pt[];
  width: number;
  height: number;
  color?: string;
  showMarkers?: boolean;
}

export function RouteMap({ points, deliveries = [], width, height, color = theme.orange, showMarkers = true }: Props) {
  const proj = projectPoints(points, width, height, 18);
  const delivProj = projectPoints(
    [...points, ...deliveries],
    width,
    height,
    18
  ).slice(points.length); // projeta entregas no mesmo referencial
  const line = proj.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // grade sutil de "quarteirões"
  const grid = [];
  for (let x = 0; x < width; x += 28) grid.push(<Line key={`vx${x}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />);
  for (let y = 0; y < height; y += 28) grid.push(<Line key={`hy${y}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />);

  return (
    <View style={{ width, height, backgroundColor: "#0d0c0b", borderRadius: 12, overflow: "hidden" }}>
      <Svg width={width} height={height}>
        {grid}
        {delivProj.map((d, i) => (
          <Rect key={`d${i}`} x={d.x - 3} y={d.y - 3} width={6} height={6} fill="rgba(255,255,255,0.9)" />
        ))}
        {proj.length > 1 && (
          <Polyline points={line} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {showMarkers && proj.length > 0 && (
          <>
            <Circle cx={proj[0].x} cy={proj[0].y} r={5} fill={theme.green} />
            <Circle cx={proj[proj.length - 1].x} cy={proj[proj.length - 1].y} r={5} fill={color} />
          </>
        )}
      </Svg>
    </View>
  );
}
