import React, { useState } from "react";
import "./heatmap.css";

const Heatmap = ({ rawData }) => {
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

  // Group data by node and aggregate the scores for each unique combination
  const aggregatedData = data.reduce((acc, entry) => {
    const job = `${entry.pipeline}-${entry.model}`;
    const ethAddr = entry.node;

    if (!acc[ethAddr]) {
      acc[ethAddr] = { totalNodeScore: 0, combos: {} };
    }

    if (!acc[ethAddr].combos[job]) {
      acc[ethAddr].combos[job] = {
        totalScore: 0,
        totalSuccessRate: 0,
        totalRoundTrip: 0,
        count: 0,
      };
    }

    acc[ethAddr].combos[job].totalScore += entry.score;
    acc[ethAddr].combos[job].totalSuccessRate += entry.success_rate;
    acc[ethAddr].combos[job].totalRoundTrip += entry.round_trip_score;
    acc[ethAddr].combos[job].count += 1;

    acc[ethAddr].totalNodeScore += entry.score;

    return acc;
  }, {});

  // Calculate cumulative scores for sorting columns
  const comboScores = {};
  Object.values(aggregatedData).forEach(({ combos }) => {
    Object.entries(combos).forEach(([combo, { totalScore, count }]) => {
      if (!comboScores[combo]) {
        comboScores[combo] = 0;
      }
      comboScores[combo] += totalScore / count;
    });
  });

  // Sort nodes by cumulative score
  const groupedData = Object.entries(aggregatedData)
    .map(([node, { combos, totalNodeScore }]) => ({
      node,
      totalNodeScore,
      combos: Object.entries(combos).map(
        ([combo, { totalScore, totalRoundTrip, totalSuccessRate, count }]) => ({
          combo,
          totalScore: totalScore,
          averageScore: totalScore / count,
          averageSuccessRate: totalSuccessRate / count,
          averageRoundTrip: totalRoundTrip / count,
        })
      ),
    }))
    .sort((a, b) => b.totalNodeScore - a.totalNodeScore);

  // Sort unique combos by cumulative score
  const sortedCombos = Object.keys(uniqueCombos).sort(
    (a, b) => comboScores[b] - comboScores[a]
  );

  // Hover event handlers
  const [hoverInfo, setHoverInfo] = useState(null);

  const handleMouseMove = (entry, e) => {
    setHoverInfo({
      ...entry,
      x: e.clientX + 15, // Add offset to avoid overlapping cursor
      y: e.clientY + 15,
    });
  };

  const handleMouseLeave = () => setHoverInfo(null);

  // Color interpolation between #565f89 and #1a1b26 based on score
  const interpolateColor = (score) => {
    const startColor = [86, 95, 137]; // RGB of #565f89
    const endColor = [26, 27, 38]; // RGB of #1a1b26
    const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * score);
    const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * score);
    const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * score);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="heatmap-container">
      {/* Heatmap Table */}
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

      {/* Tooltip */}
      {hoverInfo && (
        <div
          className="tooltip"
          style={{
            top: `${hoverInfo.y}px`,
            left: `${hoverInfo.x}px`,
          }}
        >
          <p>
            <strong>{hoverInfo.combo.replace("-", " (") + ")"}</strong>
          </p>
          <p>
            <strong>Average Score:</strong> {hoverInfo.averageScore.toFixed(2)}
          </p>
          <p>
            <strong>Average Success Rate:</strong> {hoverInfo.averageSuccessRate.toFixed(2)}
          </p>
          <p>
            <strong>Average Round Trip:</strong> {hoverInfo.averageRoundTrip.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
};

export default Heatmap;
