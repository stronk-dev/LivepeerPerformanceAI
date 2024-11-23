import React, { useState, useRef, useEffect } from "react";
import "./heatmap.css";

const Heatmap = ({ rawData }) => {
  const [hoverInfo, setHoverInfo] = useState(null);
  const tooltipRef = useRef(null);
  const data = rawData.data;
  const uniqueCombos = {};

  // Extract unique pipeline + model combinations from the data
  data.forEach((entry) => {
    if (!uniqueCombos[`${entry.pipeline}-${entry.model}`]) {
      uniqueCombos[`${entry.pipeline}-${entry.model}`] = {
        short: entry.model,
        long: `${entry.model} (${entry.pipeline})`,
      };
    }
  });

  const aggregatedData = data.reduce((acc, entry) => {
    const job = `${entry.pipeline}-${entry.model}`;
    const ethAddr = entry.node;

    if (!acc[ethAddr]) {
      acc[ethAddr] = { totalNodeScore: 0, combos: {} };
    }

    if (!acc[ethAddr].combos[job]) {
      acc[ethAddr].combos[job] = {
        model: entry.model,
        pipeline: entry.pipeline,
        ethAddr: ethAddr,
        totalScore: 0,
        scoreResults: [],
        totalSuccessRate: 0,
        successResults: [],
        totalRoundTrip: 0,
        roundTripResults: [],
        count: 0,
      };
    }

    acc[ethAddr].combos[job].totalScore += entry.score;
    acc[ethAddr].combos[job].scoreResults.push({ region: entry.region, value: entry.score });
    acc[ethAddr].combos[job].totalSuccessRate += entry.success_rate;
    acc[ethAddr].combos[job].successResults.push({ region: entry.region, value: entry.success_rate });
    acc[ethAddr].combos[job].totalRoundTrip += entry.round_trip_score;
    acc[ethAddr].combos[job].roundTripResults.push({ region: entry.region, value: entry.round_trip_score });
    acc[ethAddr].combos[job].count += 1;

    acc[ethAddr].totalNodeScore += entry.score;

    return acc;
  }, {});

  const comboScores = {};
  Object.values(aggregatedData).forEach(({ combos }) => {
    Object.entries(combos).forEach(([combo, { totalScore, count }]) => {
      if (!comboScores[combo]) {
        comboScores[combo] = 0;
      }
      comboScores[combo] += totalScore / count;
    });
  });

  const groupedData = Object.entries(aggregatedData)
    .map(([node, { combos, totalNodeScore }]) => ({
      node,
      totalNodeScore,
      combos: Object.entries(combos).map(
        ([combo, { totalScore, totalRoundTrip, totalSuccessRate, model, ethAddr, pipeline, count, successResults, roundTripResults, scoreResults }]) => ({
          combo,
          ethAddr: ethAddr,
          model: model,
          pipeline: pipeline,
          totalScore: totalScore,
          scoreResults: scoreResults,
          successResults: successResults,
          roundTripResults: roundTripResults,
          averageScore: totalScore / count,
          averageSuccessRate: totalSuccessRate / count,
          averageRoundTrip: totalRoundTrip / count,
        })
      ),
    }))
    .sort((a, b) => b.totalNodeScore - a.totalNodeScore);

  const sortedCombos = Object.keys(uniqueCombos).sort(
    (a, b) => comboScores[b] - comboScores[a]
  );

  const handleMouseMove = (entry, e) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    var tooltipWidth = 260; // Default as fallback
    var tooltipHeight = 100; // Default as fallback

    let x = e.clientX + 15; // Default offset
    let y = e.clientY + 15;

    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      tooltipWidth = rect.width;
      tooltipHeight = rect.height;
    }

    // Adjust for viewport boundaries
    if (x + tooltipWidth > viewportWidth) x = viewportWidth - tooltipWidth - 15;
    if (y + tooltipHeight > viewportHeight) y = viewportHeight - tooltipHeight - 15;

    setHoverInfo({
      ...entry,
      x,
      y,
    });
  };

  const handleMouseLeave = () => setHoverInfo(null);

  const interpolateColor = (score) => {
    const startColor = [86, 95, 137];
    const endColor = [26, 27, 38];
    const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * score);
    const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * score);
    const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * score);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="heatmap-container">
      <div className="heatmap-table-wrapper">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th>Node</th>
              {sortedCombos.map((key) => (
                <th key={key}><span>{uniqueCombos[key].short}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedData.map(({ node, combos }) => (
              <tr key={node}>
                <td className="sticky-node"><span>{node}</span></td>
                {sortedCombos.map((key) => {
                  const entry = combos.find((c) => c.combo === key);
                  const cellStyle = entry
                    ? {
                      backgroundColor: interpolateColor(entry.averageScore),
                    }
                    : {
                      backgroundColor: "#565f89",
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #7a7a7a 0, #7a7a7a 1px, #565f89 1px, #565f89 4px)",
                    };

                  return (
                    <td
                      key={`${node}-${key}`}
                      style={cellStyle}
                      onMouseMove={(e) => entry && handleMouseMove(entry, e)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {entry?.averageScore ? `${(entry.averageScore * 100).toFixed(0)}%` : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hoverInfo && (
        <div
          ref={tooltipRef}
          className="heatmap-tooltip"
          style={{
            top: `${hoverInfo.y}px`,
            left: `${hoverInfo.x}px`,
          }}
        >
          <div className="heatmap-tooltip-header">
            <span>{hoverInfo.pipeline}</span>
          </div>
          <div className="heatmap-tooltip-subheader">
            <span>{hoverInfo.model}</span>
          </div>
          <div className="heatmap-tooltip-subsubheader">
            <span>{hoverInfo.ethAddr}</span>
          </div>
          <div className="heatmap-tooltip-row">
            <span className="heatmap-tooltip-row-label">Score:</span>
            <span className="heatmap-tooltip-row-value">
              {hoverInfo.averageScore.toFixed(2) * 100}%
            </span>
          </div>
            {hoverInfo.scoreResults.map((obj, idx) => (
              <div className="heatmap-tooltip-row" key={"score" + obj.value + idx}>
                <span className="heatmap-tooltip-row-label" style={{ fontSize: "10px", fontWeight: "normal" }}>{obj.region}</span>
                <span className="heatmap-tooltip-row-value" style={{ fontSize: "10px", fontWeight: "normal" }}>
                  {obj.value.toFixed(2) * 100}%
                </span>
              </div>
            ))}
          <div className="heatmap-tooltip-divider" />
          <div className="heatmap-tooltip-body">
            <div className="heatmap-tooltip-row">
              <span className="heatmap-tooltip-row-label">Success Rate:</span>
              <span className="heatmap-tooltip-row-value">
                {hoverInfo.averageSuccessRate.toFixed(2) * 100}%
              </span>
            </div>
            {hoverInfo.successResults.map((obj, idx) => (
              <div className="heatmap-tooltip-row" key={"successrate" + obj.value + idx}>
                <span className="heatmap-tooltip-row-label" style={{ fontSize: "10px", fontWeight: "normal" }}>{obj.region}</span>
                <span className="heatmap-tooltip-row-value" style={{ fontSize: "10px", fontWeight: "normal" }}>
                  {obj.value.toFixed(2) * 100}%
                </span>
              </div>
            ))}
            <div className="heatmap-tooltip-row">
              <span className="heatmap-tooltip-row-label">Round Trip:</span>
              <span className="heatmap-tooltip-row-value">
                {hoverInfo.averageRoundTrip.toFixed(2) * 100}%
              </span>
            </div>
            {hoverInfo.roundTripResults.map((obj, idx) => (
              <div className="heatmap-tooltip-row" key={"roundtrip" + obj.value + idx}>
                <span className="heatmap-tooltip-row-label" style={{ fontSize: "10px", fontWeight: "normal" }}>{obj.region}</span>
                <span className="heatmap-tooltip-row-value" style={{ fontSize: "10px", fontWeight: "normal" }}>
                  {obj.value.toFixed(2) * 100}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Heatmap;
