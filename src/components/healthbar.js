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
    const deduplicatedNodes = Object.entries(nodes).map(([node, tests]) => {
      const avg = (key) => tests.reduce((sum, test) => sum + test[key], 0) / tests.length;
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
        node.averageSuccessRate > 0.85 &&
        node.averageScore > 0.85
    ).length;

    return {
      model,
      nodes: deduplicatedNodes.length,
      performingNodes: redundancy,
      averageSuccessRate: avg("averageSuccessRate"),
      averageRoundTrip: avg("averageRoundTrip"),
      averageScore: avg("averageScore"),
      discoveryStats: rawData.models[model]
    };
  }).sort((a, b) => b.nodes - a.nodes); // Sort by number of nodes in descending order
};

const Bar = ({ model, nodes, averageSuccessRate, averageRoundTrip, averageScore, performingNodes, discoveryStats }) => {
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
  const scoreColor = calculateColor(averageRoundTrip * averageRoundTrip);
  const successColor = calculateColor(averageSuccessRate * averageSuccessRate);
  const performingNodesColor = calculateColor(Math.max(0, Math.min(1, performingNodes * 0.2)));

  const gradientStartColor = `rgba(${performingNodesColor}, 1)`;
  const gradientMidColor = `rgba(${successColor}, 1)`;
  const gradientEndColor = `rgba(${scoreColor}, 1)`;

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
              <span className="expanded-info-key">Average Score:</span>
              <span className="expanded-info-value">{(averageRoundTrip * 100).toFixed(0)}%</span>
            </div>
            <div className="expanded-info-row">
              <span className="expanded-info-key">Average Success Rate:</span>
              <span className="expanded-info-value">{(averageSuccessRate * 100).toFixed(0)}%</span>
            </div>
            <span className="expanded-info-key">Discovery results:</span>
            <span className="expanded-info-row">Warm ({discoveryStats["Warm"].length}):</span>
            {discoveryStats["Warm"].map((val) => (
              <div className="expanded-info-row" key={val + model + "cold"}>
                <span className="expanded-info-key">{val}</span>
              </div>
            ))}
            <span className="expanded-info-row">Cold ({discoveryStats["Cold"].length}):</span>
            {discoveryStats["Cold"].map((val) => (
              <div className="expanded-info-row" key={val + model + "warm"}>
                <span className="expanded-info-key" >{val}</span>
              </div>
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
        ({ model, nodes, averageSuccessRate, averageRoundTrip, performingNodes, averageScore, discoveryStats }, i) => {
          return (
            <Bar key={model + i} model={model} nodes={nodes} averageRoundTrip={averageRoundTrip} performingNodes={performingNodes} averageScore={averageScore} averageSuccessRate={averageSuccessRate} discoveryStats={discoveryStats} />
          );
        }
      )}
    </div>
  );
};

export default HealthBar;
