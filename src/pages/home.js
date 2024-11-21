import React, { useState, useEffect, useRef } from "react";
import DvdLogo from "../components/DvdLogo";
import LoadingScreen from "../components/loadingScreen";
import { getCapabilities, getJobPerformance, getDiscoveryStats } from "../util/api";
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
  */

  const processDiscoveryresults = (discoveryStats) => {
    const modelStatusMapping = {};

    // Loop through each orchestrator
    discoveryStats.orchestrators.forEach(orchestrator => {
      const address = orchestrator.address;

      // Loop through each pipeline in the orchestrator
      orchestrator.pipelines.forEach(pipeline => {
        pipeline.models.forEach(model => {
          const modelName = model.name;
          const { Cold, Warm } = model.status;

          // Initialize the model entry if it doesn't exist
          if (!modelStatusMapping[modelName]) {
            modelStatusMapping[modelName] = { Cold: [], Warm: [] };
          }

          // Add the address to the appropriate status arrays
          if (Cold > 0) {
            modelStatusMapping[modelName].Cold.push(address);
          }
          if (Warm > 0) {
            modelStatusMapping[modelName].Warm.push(address);
          }
        });
      });
    });

    return modelStatusMapping;
  }

  const batchProcessData = async (apiResponse, discoveryStats) => {
    try {
      const fetchPromises = apiResponse.flatMap(({ id, models }) =>
        models.map((model) =>
          getJobPerformance(id, model)
            .then((response) => response)
            .then((data) => ({
              id,
              model,
              discoveryStats: discoveryStats[model] || { warm: [], cold: [] },
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
        console.log("Getting discovery stats...");
        const discoveryStats = processDiscoveryresults(await getDiscoveryStats());
        console.log("Getting capabilities...");
        const capas = await getCapabilities();
        console.log("Batch processing model results...");
        batchProcessData(capas, discoveryStats)
          .then((combinedResults) => {
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
    const uniqueModels = {}
    const uniqueRegions = new Set();

    rawData.forEach((pipeline) => {
      const { id: pipelineId, model, data, discoveryStats } = pipeline;
      uniquePipelines.add(pipelineId);
      uniqueModels[model] = discoveryStats;

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
      models: uniqueModels,
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
