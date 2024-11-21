
/// @brief Returns a list of all Livepeer regions.
/// @return object containing key "regions", listing each regions' id (shortname), name and job type.
export const getRegions = async () => {
  try {
    const response = await fetch("https://leaderboard-api.livepeer.cloud/api/regions");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.regions;
  } catch (error) {
    console.error("Error fetching regions:", error);
    throw error;
  }
};
// (output excerpt for reference)
// {
//   "regions": [
//     {
//       "id": "SIN",
//       "name": "Singapore",
//       "type": "transcoding"
//     },
//     {
//       "id": "SEA",
//       "name": "Seattle",
//       "type": "ai"
//     }
//   ]
// }

/// @brief Returns extensive info on each AI pipeline part of the job tester
/// @return object containing key "pipelines", listing each pipelines' id (name), models and regions.
export const getCapabilities = async () => {
  try {
    const response = await fetch("https://leaderboard-api.livepeer.cloud/api/pipelines");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.pipelines;
  } catch (error) {
    console.error("Error fetching capabilities:", error);
    throw error;
  }
};

// (output excerpt for reference)
// {
//   "pipelines": [
//     {
//       "id": "Text to image",
//       "models": [
//         "black-forest-labs/FLUX.1-dev",
//         "black-forest-labs/FLUX.1-schnell",
//         "ByteDance/SDXL-Lightning",
//         "kandinsky-community/kandinsky-3",
//         "SG161222/RealVisXL_V4.0",
//         "SG161222/RealVisXL_V4.0_Lightning",
//         "stabilityai/stable-diffusion-3.5-large",
//         "stabilityai/stable-diffusion-3.5-medium",
//         "stabilityai/stable-diffusion-3-medium-diffusers"
//       ],
//       "regions": [
//         "FRA",
//         "MDW",
//         "SEA"
//       ]
//     }
//   ]
// }

// model+pipeline specific results
export const getJobPerformance = async (pipeline, model) => {
  try {
    // https://leaderboard-api.livepeer.cloud/api/aggregated_stats?model=Salesforce/blip-image-captioning-large&pipeline=Image%20to%20text
    const response = await fetch(`https://leaderboard-api.livepeer.cloud/api/aggregated_stats?pipeline=${pipeline}&model=${model}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching capabilities:", error);
    throw error;
  }
};
// (output excerpt for reference)
// {
//   "0x10742714f33f3d804e3fa489618b5c3ca12a6df7": {
//     "FRA": {
//       "success_rate": 1,
//       "round_trip_score": 0.656097128092694,
//       "score": 0.879633994832443
//     },
//     "MDW": {
//       "success_rate": 1,
//       "round_trip_score": 0.826936593141029,
//       "score": 0.93942780759936
//     },
//     "SEA": {
//       "success_rate": 1,
//       "round_trip_score": 0.891098901709114,
//       "score": 0.96188461559819
//     }
//   }
// }

// Which nodes have which models warm/cold
export const getDiscoveryStats = async () => {
  try {
    const response = await fetch(`https://dream-gateway.livepeer.cloud/getOrchestratorAICapabilities`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching capabilities:", error);
    throw error;
  }
};
// (output excerpt for reference)
// {
//   "orchestrators": [
//       {
//           "address": "0x847791cbf03be716a7fe9dc8c9affe17bd49ae5e",
//           "pipelines": [
//               {
//                   "type": "Image to video",
//                   "models": [
//                       {
//                           "name": "stabilityai/stable-video-diffusion-img2vid-xt-1-1",
//                           "status": {
//                               "Cold": 0,
//                               "Warm": 1
//                           }
//                       }
//                   ]
//               },
//               {
//                   "type": "Text to image",
//                   "models": [
//                       {
//                           "name": "ByteDance/SDXL-Lightning",
//                           "status": {
//                               "Cold": 0,
//                               "Warm": 1
//                           }
//                       },
//                       {
//                           "name": "black-forest-labs/FLUX.1-dev",
//                           "status": {
//                               "Cold": 0,
//                               "Warm": 1
//                           }
//                       },
//                       {
//                           "name": "black-forest-labs/FLUX.1-schnell",
//                           "status": {
//                               "Cold": 0,
//                               "Warm": 1
//                           }
//                       }
//                   ]
//               }
//           ]
//       },
//     ]
// }