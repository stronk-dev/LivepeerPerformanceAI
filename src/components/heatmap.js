import React, { useState, useRef } from "react";
import "./heatmap.css";

const Heatmap = ({ data }) => {
  const [hoverInfo, setHoverInfo] = useState(null);
  const tooltipRef = useRef(null);

  if (!data) {
    return <div>Loading heatmap...</div>;
  }

  // Calculate cumulative scores for sorting models (combos)
  const comboScores = {};
  Object.entries(data).forEach(([job, { totalScore, model, pipeline }]) => {
    if (!comboScores[job]) {
      comboScores[job] = { totalScore: 0, model, pipeline };
    }
    comboScores[job].totalScore += totalScore;
  });

  // Sort model-pipeline combos by their cumulative impact (total score)
  const sortedCombos = Object.keys(comboScores).sort((a, b) => {
    const totalScoreA = comboScores[a].totalScore;
    const totalScoreB = comboScores[b].totalScore;
    return totalScoreB - totalScoreA; // Sort in descending order of total cumulative score
  });

  // Sort nodes by their total cumulative score
  const nodeScores = {};
  Object.entries(data).forEach(([job, { nodes }]) => {
    Object.entries(nodes).forEach(([node, { totalSuccessRate, totalRoundTrip }]) => {
      if (!nodeScores[node]) {
        nodeScores[node] = { totalScore: 0 };
      }
      nodeScores[node].totalScore += totalSuccessRate + totalRoundTrip;
    });
  });

  const sortedNodes = Object.keys(nodeScores).sort((a, b) => {
    const totalScoreA = nodeScores[a].totalScore;
    const totalScoreB = nodeScores[b].totalScore;
    return totalScoreB - totalScoreA; // Sort in descending order of total cumulative score
  });

  const handleMouseMove = (entry, e, node) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let tooltipWidth = 260; // Default tooltip width
    let tooltipHeight = 100; // Default tooltip height

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
      node,
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
              {sortedCombos.map((job) => (
                <th key={job}>
                  <span>{comboScores[job].model}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedNodes.map((node) => (
              <tr key={node}>
                <td className="sticky-node"><span>{node}</span></td>
                {sortedCombos.map((job) => {
                  const entry = data[job].nodes[node];
                  const averageScore = entry && entry.count > 0 ? entry.totalScore / entry.count : 0;

                  const cellStyle = entry
                    ? {
                      backgroundColor: interpolateColor(averageScore),
                    }
                    : {
                      backgroundColor: "#565f89",
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #7a7a7a 0, #7a7a7a 1px, #565f89 1px, #565f89 4px)",
                    };

                  return (
                    <td
                      key={`${node}-${job}`}
                      style={cellStyle}
                      onMouseMove={(e) =>
                        entry &&
                        handleMouseMove(
                          {
                            ...entry,
                            job,
                            model: comboScores[job].model,
                            pipeline: comboScores[job].pipeline,
                            scoreResults: entry.scoreResults,
                            successResults: entry.successResults,
                            roundTripResults: entry.roundTripResults,
                            averageScore,
                            totalSuccessRate: entry.totalSuccessRate,
                            totalRoundTrip: entry.totalRoundTrip,
                            count: entry.count,
                          },
                          e,
                          node
                        )
                      }
                      onMouseLeave={handleMouseLeave}
                    >
                      {entry && entry.count > 0 && averageScore > 0 ? `${(averageScore * 100).toFixed(0)}%` : ""}
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
            <span>{hoverInfo.node}</span>
          </div>
          <div className="heatmap-tooltip-row">
            <span className="heatmap-tooltip-row-label">Score:</span>
            <span className="heatmap-tooltip-row-value">
              {(hoverInfo.averageScore * 100).toFixed(0)}%
            </span>
          </div>
          {hoverInfo.scoreResults && hoverInfo.scoreResults.map((obj, idx) => (
            <div className="heatmap-tooltip-row" key={"score" + obj.region + idx}>
              <span className="heatmap-tooltip-row-label" style={{ fontSize: "10px", fontWeight: "normal" }}>{obj.region}</span>
              <span className="heatmap-tooltip-row-value" style={{ fontSize: "10px", fontWeight: "normal" }}>
                {(obj.value * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          <div className="heatmap-tooltip-divider" />
          <div className="heatmap-tooltip-body">
            <div className="heatmap-tooltip-row">
              <span className="heatmap-tooltip-row-label">Success Rate:</span>
              <span className="heatmap-tooltip-row-value">
                {(hoverInfo.totalSuccessRate / hoverInfo.count * 100).toFixed(0)}%
              </span>
            </div>
            {hoverInfo.successResults && hoverInfo.successResults.map((obj, idx) => (
              <div className="heatmap-tooltip-row" key={"successrate" + obj.region + idx}>
                <span className="heatmap-tooltip-row-label" style={{ fontSize: "10px", fontWeight: "normal" }}>{obj.region}</span>
                <span className="heatmap-tooltip-row-value" style={{ fontSize: "10px", fontWeight: "normal" }}>
                  {(obj.value * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            <div className="heatmap-tooltip-row">
              <span className="heatmap-tooltip-row-label">Round Trip:</span>
              <span className="heatmap-tooltip-row-value">
                {(hoverInfo.totalRoundTrip / hoverInfo.count * 100).toFixed(0)}%
              </span>
            </div>
            {hoverInfo.roundTripResults && hoverInfo.roundTripResults.map((obj, idx) => (
              <div className="heatmap-tooltip-row" key={"roundtrip" + obj.region + idx}>
                <span className="heatmap-tooltip-row-label" style={{ fontSize: "10px", fontWeight: "normal" }}>{obj.region}</span>
                <span className="heatmap-tooltip-row-value" style={{ fontSize: "10px", fontWeight: "normal" }}>
                  {(obj.value * 100).toFixed(0)}%
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
