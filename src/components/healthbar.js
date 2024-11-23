import React, { useState, useEffect } from "react";
import "./healthbar.css";

const Bar = ({ model, metrics }) => {
  const {
    totalSuccessRate = 0,
    totalRoundTrip = 0,
    count = 1,
    nodes = {},
  } = metrics;

  // Calculate averages safely
  const averageSuccessRate = totalSuccessRate / count || 0;
  const averageRoundTrip = totalRoundTrip / count || 0;

  const [hovered, setHovered] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [tooltipVisible, setTooltipVisible] = useState(false);
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
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisible(false);
    setTimeout(() => setHovered(false), 200);
    setTooltipStyle({});
  };

  
  const roundTripScore = averageRoundTrip;
  const roundTripColor = `rgba(${calculateColor(roundTripScore)}, 1)`;
  const successRateScore = averageSuccessRate * averageSuccessRate;
  const successColor = `rgba(${calculateColor(successRateScore)}, 1)`;
  const goodNodes = getGoodNodes(nodes);
  const redundancyScore = Math.max(0, Math.min(1, goodNodes.size * 0.2));
  const redundancyColor = `rgba(${calculateColor(redundancyScore)}, 1)`;
  const totalScoreValue = (roundTripScore + successRateScore + redundancyScore) / 3;
  const totalScoreColor = `rgba(${calculateColor(totalScoreValue)}, 1)`;

  // Gradient colors
  const defaultGradient = `linear-gradient(to right, ${redundancyColor}, ${successColor}, ${roundTripColor})`;
  const rotatingGradient = `${defaultGradient.replace('to right', `${rotationDegree}deg`)}`;

  return (
    <div
      className={`model-wrapper ${hovered ? 'hovered' : ''}`}
      style={{ '--gradient-border': rotatingGradient }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="model-container">
        <div className="model-title-container">
          <div className="model-title">{model}</div>
        </div>
        <div className="model-subtitle">Good Nodes: {goodNodes.size}</div>
        <div
          className={`expanded-info tooltip ${tooltipVisible ? 'visible' : ''}`}
          style={tooltipStyle}
        >
          <div className="expanded-info-row">
            <span className="expanded-info-key">Total score:</span>
            <span className="expanded-info-value" style={{ color: totalScoreColor }}>
              {(totalScoreValue * 100).toFixed(0)}%
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
            <span className="expanded-info-key">Success rate score:</span>
            <span className="expanded-info-value" style={{ color: successColor }}>
              {(successRateScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="expanded-info-row">
            <span className="expanded-info-key">Good nodes score:</span>
            <span className="expanded-info-value" style={{ color: redundancyColor }}>
              {(redundancyScore * 100).toFixed(0)}%
            </span>
          </div>
          {Array.from(goodNodes, value => (
            <div key={`${value}-val}`} className="expanded-info-row-smoll">
              {value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HealthBar = ({ data, isLoading, isError }) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading data.</div>;
  }

  if (!data || Object.keys(data).length === 0) {
    return <div>No data available.</div>;
  }

  // Sort models by total score in descending order
  const sortedData = Object.entries(data).sort(
    ([, aData], [, bData]) => {
      return bData.totalScore - aData.totalScore;
    }
  );

  return (
    <div className="health-bar-container">
      {sortedData.map(([job, modelData], index) => (
        <Bar
          key={`${job}-${index}`}
          model={modelData.model}
          metrics={modelData}
        />
      ))}
    </div>
  );
};

// Function to deduplicate and count good nodes
const getGoodNodes = (nodes) => {
  const uniqueGoodNodes = new Set();

  Object.entries(nodes).forEach(([node, metrics]) => {
    const avgSuccessRate = metrics.totalSuccessRate / metrics.count || 0;
    const avgRoundTrip = metrics.totalRoundTrip / metrics.count || 0;

    if (avgSuccessRate > 0.8 && avgRoundTrip > 0.75) {
      uniqueGoodNodes.add(node);
    }
  });

  return uniqueGoodNodes;
};

export default HealthBar;
