// Updated home.js
import React, { useRef } from "react";
import DvdLogo from "../components/DvdLogo";
import LoadingScreen from "../components/loadingScreen";
import useProcessedData from "../hooks/useProcessedData";
import Heatmap from "../components/heatmap";
import HealthBar from "../components/healthbar";
import "./home.css";

const Home = () => {
  const rootContainerRef = useRef(null);
  const { isLoading, isError, processedData } = useProcessedData();

  if (isLoading || isError) {
    return (
      <LoadingScreen
        isError={isError}
        className={`loading-screen ${isError ? "error" : ""}`}
      />
    );
  }

  return (
    <div ref={rootContainerRef}>
      <DvdLogo parentRef={rootContainerRef} />
      <div className="healthbar-container">
        <h4>Model Health</h4>
        <HealthBar data={processedData} />
      </div>
      <div className="hr" />
      <div className="heatmap-wrapper">
        <h4>Performance Heatmap</h4>
        <Heatmap data={processedData} />
      </div>
    </div>
  );
};

export default Home;
