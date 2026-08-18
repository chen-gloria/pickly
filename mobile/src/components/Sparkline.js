// A tiny price trend line — the evidence that sits next to the verdict.
//
// A verdict on its own is an assertion. This is the proof, compressed small
// enough to sit on a feed card so people believe the call without having to
// tap through to a full chart.
import React from "react";
import { View } from "react-native";
import Svg, { Polyline, Circle, Line } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";

export default function Sparkline({
  series = [],
  width = 64,
  height = 20,
  color,
  showLowMarker = true,
}) {
  const { colors } = useTheme();
  const lineColor = color || colors.saving;

  // One point is not a trend — drawing a flat line off a single observation
  // would imply we know more than we do.
  if (!series || series.length < 2) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const pad = 2;
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (series.length - 1);

  const points = series.map((v, i) => {
    const x = pad + i * stepX;
    // Invert: lower price sits lower on screen, which is what people expect
    // from a price chart.
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y];
  });

  const lowIndex = series.indexOf(min);
  const [lastX, lastY] = points[points.length - 1];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Baseline at the historic low — the line people are judging against. */}
        {showLowMarker && (
          <Line
            x1={0}
            y1={height - pad}
            x2={width}
            y2={height - pad}
            stroke={colors.border}
            strokeWidth={1}
          />
        )}
        <Polyline
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Mark the cheapest point and where we are now. */}
        <Circle cx={points[lowIndex][0]} cy={points[lowIndex][1]} r={2} fill={colors.accent} />
        <Circle cx={lastX} cy={lastY} r={2.4} fill={lineColor} />
      </Svg>
    </View>
  );
}
