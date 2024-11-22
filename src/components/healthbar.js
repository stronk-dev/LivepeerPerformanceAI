import React, { useState, useEffect } from "react";
import "./healthbar.css";

const parseAPIData = (rawData) => {
  const modelMetrics = {};

  rawData.data.forEach(({ model, node, success_rate, round_trip_score, score }) => {
    if (!modelMetrics[model]) modelMetrics[model] = {};
    if (!modelMetrics[model][node]) modelMetrics[model][node] = [];
    modelMetrics[model][node].push({ success_rate, round_trip_score, score });
  });

  return Object.entries(modelMetrics).map(([model, nodes]) => {
    const modelNodes = []
    const deduplicatedNodes = Object.entries(nodes).map(([node, tests]) => {
      const avg = (key) => tests.reduce((sum, test) => sum + test[key], 0) / tests.length;
      if (avg("success_rate") > 0.80 && avg("round_trip_score") > 0.75) {
        modelNodes.push(node);
      }
      return {
        node,
        averageSuccessRate: avg("success_rate"),
        averageRoundTrip: avg("round_trip_score"),
        averageScore: avg("score"),
      };
    });

    const avg = (key) =>
      deduplicatedNodes.reduce((sum, node) => sum + node[key], 0) / deduplicatedNodes.length;

    const redundancy = deduplicatedNodes.filter(
      (node) =>
        node.averageSuccessRate > 0.80 &&
        node.averageRoundTrip > 0.75
    ).length;

    return {
      model,
      nodes: deduplicatedNodes.length,
      performingNodes: redundancy,
      averageSuccessRate: avg("averageSuccessRate"),
      averageRoundTrip: avg("averageRoundTrip"),
      averageScore: avg("averageScore"),
      modelNodes: modelNodes
    };
  }).sort((a, b) => b.nodes - a.nodes); // Sort by number of nodes in descending order
};

const Bar = ({ model, nodes, averageSuccessRate, averageRoundTrip, averageScore, performingNodes, modelNodes }) => {
  const [hovered, setIsHovered] = useState(false);

  // State to manage the rotating degree
  const [rotationDegree, setRotationDegree] = useState(() => {
    const currentTime = new Date().getTime();
    return (currentTime / 500) % 360;
  });

  // Effect to rotate the gradient continuously at a slower pace
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = new Date().getTime();
      setRotationDegree((currentTime / 500) % 360);
    }, 1000); // Update every 1 second for a smoother but less frequent rotation

    return () => clearInterval(interval);
  }, []);

  // Function to calculate color based on percentage (0 = red, 1 = green)
  const calculateColor = (percentage) => {
    const red = Math.round(255 * (1 - percentage));
    const green = Math.round(255 * percentage);
    return `${red}, ${green}, 0`; // RGB format
  };

  // Calculate colors for average score and performing nodes
  const roundTripScore = averageRoundTrip * averageRoundTrip;
  const roundTripColor = `rgba(${calculateColor(roundTripScore)}, 1)`;
  const successRateScore = averageSuccessRate * averageSuccessRate;
  const successColor = `rgba(${calculateColor(successRateScore)}, 1)`;
  const redundancyScore = Math.max(0, Math.min(1, performingNodes * 0.2));
  const redundancyColor = `rgba(${calculateColor(redundancyScore)}, 1)`;

  const totalScore = (roundTripScore + successRateScore + redundancyScore) / 3;
  const totalScoreColor = `rgba(${calculateColor(totalScore)}, 1)`;

  const gradientStartColor = redundancyColor;
  const gradientMidColor = successColor;
  const gradientEndColor = roundTripColor;

  // Define the gradient using calculated colors
  const defaultGradient = `linear-gradient(to right, ${gradientStartColor}, ${gradientMidColor}, ${gradientEndColor})`;
  const rotatingGradient = `${defaultGradient.replace('to right', `${rotationDegree}deg`)}`;

  return (
    <div
      className={`model-wrapper ${hovered ? 'hovered' : ''}`}
      style={{ '--gradient-border': rotatingGradient }}
      onMouseEnter={(e) => {
        e.currentTarget.hoverTimeout = setTimeout(() => {
          setIsHovered(true);
        }, 400); // Delay before shake and grow
      }}
      onMouseLeave={(e) => {
        clearTimeout(e.currentTarget.hoverTimeout);
        setIsHovered(false);
      }}
    >
      <div className="model-container">
        <div className="model-container-border"></div>
        <div className="model-title-container"><div className="model-title">{model}</div></div>
        <div className="model-subtitle">Good Nodes: {performingNodes}</div>
        {hovered && (
          <div className="expanded-info">
            <div className="expanded-info-row">
              <span className="expanded-info-key">Total Score:</span>
              <span className="expanded-info-value" style={{ color: totalScoreColor }}>{(totalScore * 100).toFixed(0)}%</span>
            </div>
            <hr />
            <div className="expanded-info-row">
              <span className="expanded-info-key">Average Roundtrip time:</span>
              <span className="expanded-info-value" style={{ color: roundTripColor }}>{(averageRoundTrip * 100).toFixed(0)}%</span>
            </div>
            <div className="expanded-info-row">
              <span className="expanded-info-key">Average Success Rate:</span>
              <span className="expanded-info-value" style={{ color: successColor }}>{(averageSuccessRate * 100).toFixed(0)}%</span>
            </div>
            <div className="expanded-info-row">
              <span className="expanded-info-key">Good nodes:</span>
              <span className="expanded-info-value" style={{ color: redundancyColor }}>{(redundancyScore * 100).toFixed(0)}%</span>
            </div>
            {modelNodes.map((val) => (
              <span className="expanded-info-row" key={val + model + "stat"}>
                {val}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const HealthBar = ({ rawData }) => {
  const processedData = parseAPIData(rawData);

  return (
    <div className="health-bar-container">
      {processedData.map(
        ({ model, nodes, averageSuccessRate, averageRoundTrip, performingNodes, averageScore, modelNodes }, i) => {
          return (
            <Bar key={model + i} model={model} nodes={nodes} averageRoundTrip={averageRoundTrip} performingNodes={performingNodes} averageScore={averageScore} averageSuccessRate={averageSuccessRate} modelNodes={modelNodes} />
          );
        }
      )}
    </div>
  );
};

export default HealthBar;
