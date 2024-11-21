import React, { useState, useEffect, useRef } from "react";
import DvdLogo from "../components/DvdLogo";
import LoadingScreen from "../components/loadingScreen";
import { getCapabilities, getJobPerformance } from "../util/api";
import "./home.css";
import Heatmap from "../components/heatmap"; //< Performance heatmap - per node
import HealthBar from "../components/healthbar"; //< Health bar - per model

const Home = () => {
  const [isError, setError] = useState(false);
  const [rawData, setData] = useState(null);
  const rootContainerRef = useRef(null);

  /*
    TODO: ENS names! Let's use the subgraph?
          We can probably just query all active Orchs -> Get ENS name for each of 'em
            then map this on render
    TODO: the table should really be draggable... Scrolling horizontally is blergh
  */

  const batchProcessData = async (apiResponse) => {
    try {
      const fetchPromises = apiResponse.flatMap(({ id, models }) =>
        models.map((model) =>
          getJobPerformance(id, model)
            .then((response) => response)
            .then((data) => ({
              id,
              model,
              data,
            }))
            .catch((error) => ({
              id,
              model,
              error: error.message,
            }))
        )
      );
      const results = await Promise.all(fetchPromises);
      return results;
    } catch (error) {
      console.error("Error in batch processing:", error);
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("Getting capabilities...");
        const capas = await getCapabilities();
        console.log("Batch processing model results...");
        batchProcessData(capas)
          .then((combinedResults) => {
            console.log("Done! Unloading the loading screen...");
            setData(combinedResults);
          })
          .catch((error) => {
            console.error("Batch processing failed:", error);
            setError(true);
          });
      } catch (error) {
        console.error("Error loading data:", error);
        setError(true);
      }
    };
    loadData();
  }, []);

  if (!rawData || isError) {
    return <LoadingScreen isError={isError} className={`loading-screen ${isError ? 'error' : ''}`} />;
  }

  const preprocessData = (rawData) => {
    const flattened = [];
    const uniquePipelines = new Set();
    const uniqueRegions = new Set();

    rawData.forEach((pipeline) => {
      const { id: pipelineId, model, data } = pipeline;
      uniquePipelines.add(pipelineId);

      Object.entries(data).forEach(([node, regions]) => {
        Object.entries(regions).forEach(([region, stats]) => {
          uniqueRegions.add(region);
          flattened.push({
            node,
            pipeline: pipelineId,
            model,
            region,
            ...stats,
          });
        });
      });
    });

    return {
      data: flattened,
      pipelines: Array.from(uniquePipelines),
      regions: Array.from(uniqueRegions),
    };
  };

  const processedData = preprocessData(rawData);

  return (
    <div ref={rootContainerRef}>
      <DvdLogo parentRef={rootContainerRef} />
      <div className="healthbar-container">
        <h4>Model Health</h4>
        <HealthBar rawData={processedData} />
      </div>
      <div className="hr" />
      <div className="heatmap-wrapper">
        <h4>Performance Heatmap</h4>
        <Heatmap rawData={processedData} />
      </div>
    </div>
  );
};

export default Home;
