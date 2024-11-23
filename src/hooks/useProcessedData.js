import { useState, useEffect } from "react";
import { getCapabilities, getJobPerformance } from "../util/api";

const useProcessedData = () => {
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);
  const [processedData, setProcessedData] = useState(null);

  const preprocessData = (rawData) => {
    const flattened = [];
    const uniqueCombos = new Set();

    rawData.forEach((pipeline) => {
      const { id: pipelineId, model, data } = pipeline;

      Object.entries(data).forEach(([node, regions]) => {
        Object.entries(regions).forEach(([region, stats]) => {
          uniqueCombos.add(`${pipelineId}-${model}`);
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
      combos: Array.from(uniqueCombos),
    };
  };

  const processUnifiedData = (data) => {
    const unifiedData = {};

    data.forEach(({ model, pipeline, node, region, score = 0, success_rate = 0, round_trip_score = 0 }) => {
      const job = `${pipeline}-${model}`;

      if (!unifiedData[job]) {
        unifiedData[job] = {
          model,
          pipeline,
          totalScore: 0,
          totalSuccessRate: 0,
          totalRoundTrip: 0,
          count: 0,
          nodes: {},
        };
      }

      if (!unifiedData[job].nodes[node]) {
        unifiedData[job].nodes[node] = {
          totalSuccessRate: 0,
          totalRoundTrip: 0,
          totalScore: 0,
          count: 0,
          scoreResults: [],
          successResults: [],
          roundTripResults: [],
        };
      }

      // Update metrics for each node in the job
      unifiedData[job].totalScore += score;
      unifiedData[job].totalSuccessRate += success_rate;
      unifiedData[job].totalRoundTrip += round_trip_score;
      unifiedData[job].count += 1;

      // Update node-specific metrics
      const nodeData = unifiedData[job].nodes[node];
      nodeData.totalSuccessRate += success_rate;
      nodeData.totalRoundTrip += round_trip_score;
      nodeData.totalScore += score;
      nodeData.count += 1;
      nodeData.scoreResults.push({ region, value: score });
      nodeData.successResults.push({ region, value: success_rate });
      nodeData.roundTripResults.push({ region, value: round_trip_score });
    });

    return unifiedData;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const capabilities = await getCapabilities();
        const results = await Promise.all(
          capabilities.flatMap(({ id, models }) =>
            models.map((model) =>
              getJobPerformance(id, model).then((data) => ({
                id,
                model,
                data,
              }))
            )
          )
        );
        const preprocessed = preprocessData(results);
        setProcessedData(processUnifiedData(preprocessed.data));
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  console.log(processedData)

  return { isLoading, isError, processedData };
};

export default useProcessedData;
