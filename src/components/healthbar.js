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
    const modelNodes = [];
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
      modelNodes: modelNodes,
    };
  }).sort((a, b) => b.nodes - a.nodes);
};

const Bar = ({ model, nodes, averageSuccessRate, averageRoundTrip, averageScore, performingNodes, modelNodes }) => {
  const [hovered, setIsHovered] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [tooltipVisible, setTooltipVisible] = useState(false); // Manage tooltip visibility
  const [rotationDegree, setRotationDegree] = useState(() => {
    const currentTime = new Date().getTime();
    return (currentTime / 500) % 360;
  });

  // Rotate gradient continuously
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = new Date().getTime();
      setRotationDegree((currentTime / 500) % 360);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const calculateColor = (percentage) => {
    const red = Math.round(255 * (1 - percentage));
    const green = Math.round(255 * percentage);
    return `${red}, ${green}, 0`;
  };

  const handleMouseEnter = (e) => {
    const tooltip = e.currentTarget.querySelector('.expanded-info');
    if (!tooltip) return;

    const { top, left, width, height } = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const newStyle = {};

    if (left + width + 25 > viewportWidth) {
      newStyle.left = `${viewportWidth - (left + width + 25)}px`;
    }
    if (left < 0) {
      newStyle.left = `${-left}px`;
    }
    if (top + height > viewportHeight) {
      newStyle.top = `${viewportHeight - (top + height)}px`;
    }
    if (top < 0) {
      newStyle.top = `${-top}px`;
    }

    setTooltipStyle(newStyle);
    setTooltipVisible(true);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisible(false); // Hide immediately
    setTimeout(() => setIsHovered(false), 200); // Allow fade-out
    setTooltipStyle({});
  };

  const roundTripScore = averageRoundTrip;
  const roundTripColor = `rgba(${calculateColor(roundTripScore)}, 1)`;
  const successRateScore = averageSuccessRate * averageSuccessRate;
  const successColor = `rgba(${calculateColor(successRateScore)}, 1)`;
  const redundancyScore = Math.max(0, Math.min(1, performingNodes * 0.2));
  const redundancyColor = `rgba(${calculateColor(redundancyScore)}, 1)`;
  const totalScore = (roundTripScore + successRateScore + redundancyScore) / 3;
  const totalScoreColor = `rgba(${calculateColor(totalScore)}, 1)`;

  // Gradient colors
  const defaultGradient = `linear-gradient(to right, ${redundancyColor}, ${successColor}, ${roundTripColor})`;
  const rotatingGradient = `${defaultGradient.replace('to right', `${rotationDegree}deg`)}`;

  return (
    <div
      className={`model-wrapper ${hovered ? 'hovered' : ''}`}
      style={{ '--gradient-border': rotatingGradient }} // Apply rotating gradient
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="model-container">
        <div className="model-title-container">
          <div className="model-title">{model}</div>
        </div>
        <div className="model-subtitle">Good Nodes: {performingNodes}</div>
        <div
          className={`expanded-info tooltip ${tooltipVisible ? 'visible' : ''}`}
          style={tooltipStyle}
        >
          <div className="expanded-info-row">
            <span className="expanded-info-key">Total Score:</span>
            <span className="expanded-info-value" style={{ color: totalScoreColor }}>
              {(totalScore * 100).toFixed(0)}%
            </span>
          </div>
          <hr />
          <div className="expanded-info-row">
            <span className="expanded-info-key">Roundtrip score:</span>
            <span className="expanded-info-value" style={{ color: roundTripColor }}>
              {(roundTripScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="expanded-info-row">
            <span className="expanded-info-key">Success Rate score:</span>
            <span className="expanded-info-value" style={{ color: successColor }}>
              {(successRateScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="expanded-info-row">
            <span className="expanded-info-key">Good nodes:</span>
            <span className="expanded-info-value" style={{ color: redundancyColor }}>
              {(redundancyScore * 100).toFixed(0)}%
            </span>
          </div>
          {modelNodes.map((val) => (
            <span className="expanded-info-row" key={val + model + "stat"}>
              {val}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const HealthBar = ({ rawData }) => {
  const processedData = parseAPIData(rawData);

  return (
    <div className="health-bar-container">
      {processedData.map(
        ({ model, nodes, averageSuccessRate, averageRoundTrip, performingNodes, averageScore, modelNodes }, i) => (
          <Bar
            key={model + i}
            model={model}
            nodes={nodes}
            averageRoundTrip={averageRoundTrip}
            performingNodes={performingNodes}
            averageScore={averageScore}
            averageSuccessRate={averageSuccessRate}
            modelNodes={modelNodes}
          />
        )
      )}
    </div>
  );
};

export default HealthBar;
