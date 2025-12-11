#!/usr/bin/env node

/**
 * SuperSonic OSC MCP Server
 *
 * Model Context Protocol server providing tools, resources, and prompts
 * for working with SuperSonic and iOS motion-to-sound workflows.
 *
 * Session: 01530a36-0d32-4166-a715-19843ca6560f
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Knowledge base
const KNOWLEDGE_BASE = {
  iosApps: {
    phyosc: {
      name: 'PhyOSC - Physical OSC Transmitter',
      platform: 'iPhone + Apple Watch',
      url: 'https://phyosc.gridsystem.jp/',
      features: [
        'Apple Watch motion sensors',
        'iPhone accelerometer/gyroscope',
        'Web-based configuration UI',
        'Low latency UDP transmission'
      ],
      oscAddresses: {
        watch: {
          accel: '/watch/accel/x, /watch/accel/y, /watch/accel/z',
          gyro: '/watch/gyro/x, /watch/gyro/y, /watch/gyro/z',
          attitude: '/watch/attitude/roll, /watch/attitude/pitch, /watch/attitude/yaw'
        },
        phone: {
          accel: '/phone/accel/x, /phone/accel/y, /phone/accel/z',
          gyro: '/phone/gyro/x, /phone/gyro/y, /phone/gyro/z'
        }
      },
      pros: ['Wearable control', 'Hands-free', 'Stable Wi-Fi'],
      cons: ['Requires Apple Watch', 'No gesture recognition', 'Raw sensor data only']
    },
    motionSender: {
      name: 'MotionSender (GyrOSC)',
      platform: 'iPhone/iPad',
      github: 'https://github.com/wekinator/MotionSender',
      features: [
        'iPhone/iPad CoreMotion sensors',
        'Wekinator ML integration',
        'Bundle mode (20 simultaneous parameters)',
        'Touch input support'
      ],
      oscAddresses: {
        gyro: '/gyrosc/gyro [x, y, z]',
        accel: '/gyrosc/accel [x, y, z]',
        gravity: '/gyrosc/grav [x, y, z]',
        motion: '/gyrosc/motion [x, y, z]',
        attitude: '/gyrosc/attitude [roll, pitch, yaw]',
        mag: '/gyrosc/mag [x, y, z]',
        heading: '/gyrosc/heading',
        button: '/gyrosc/button (0 or 1)'
      },
      pros: ['Free and open source', 'Wekinator ML', 'Bundle mode', 'Touch input'],
      cons: ['Dated UI', 'Requires Wekinator for gestures', 'No built-in smoothing']
    },
    touchOsc: {
      name: 'TouchOSC',
      platform: 'iPhone/iPad/Android',
      url: 'https://hexler.net/touchosc',
      price: '$14.99',
      features: [
        'Customizable multi-touch interface',
        'Device motion sensors',
        'Bidirectional OSC',
        'Lua scripting',
        'MIDI + OSC simultaneous'
      ],
      oscAddresses: 'User-defined (fully customizable)',
      pros: ['Professional UI', 'Multi-touch', 'Bidirectional', 'Scripting', 'Cross-platform'],
      cons: ['Paid app', 'Requires layout design', 'Learning curve']
    }
  },

  supersonic: {
    architecture: {
      ringBuffer: {
        inBufferSize: '768KB (786432 bytes)',
        outBufferSize: '128KB',
        debugBufferSize: '64KB',
        messageHeaderSize: '16 bytes',
        messageMagic: '0xDEADBEEF'
      },
      oscCommands: {
        '/s_new': 'Create + play synth (synthdef_name, node_id, add_action, target_id, ...params)',
        '/n_set': 'Set synth parameters (node_id, param_name, value, ...)',
        '/n_free': 'Stop synth (node_id)',
        '/g_new': 'Create group (group_id, add_action, target_id)',
        '/d_recv': 'Load synthdef (synthdef_bytes)',
        '/b_allocPtr': 'Allocate buffer (buffer_id, frames, channels)',
        '/b_setn': 'Fill buffer (buffer_id, offset, [values...])',
        '/notify': 'Enable notifications (1=on, 0=off)'
      },
      buildRequirements: {
        emscripten: 'Required for WASM compilation',
        node: 'v16+ for build scripts',
        esbuild: 'JavaScript bundler',
        headers: 'COOP: same-origin, COEP: require-corp'
      }
    },
    examples: {
      rotation: {
        file: 'example-rotation-sound.html',
        description: 'Rotation-based sound modulation',
        mappings: {
          roll: 'freq (100-1000 Hz, exponential)',
          pitch: 'amp (0.0-0.8, linear)',
          yaw: 'pan (-1.0 to 1.0, stereo)'
        }
      },
      accelerometer: {
        file: 'example-accelerometer-triggers.html',
        description: 'Accelerometer-triggered synthesis',
        gestures: {
          shake: 'Rapid acceleration → sonic-pi-beep',
          tiltUp: 'Upward motion → sonic-pi-prophet (high note)',
          tiltDown: 'Downward motion → sonic-pi-dsaw (low note)',
          rotate: 'Z-axis rotation → sonic-pi-tb303'
        }
      }
    }
  },

  sensorMappings: {
    accelerometer: {
      range: '-2g to +2g (typical)',
      units: 'm/s²',
      axes: {
        x: 'Left (-) to Right (+)',
        y: 'Bottom (-) to Top (+)',
        z: 'Down (-) to Up (+), gravity = +9.81 m/s²'
      },
      noise: '~0.01 m/s² (smoothing recommended)'
    },
    gyroscope: {
      range: '±35 rad/s',
      units: 'rad/s',
      axes: {
        x: 'Pitch (tilt forward/back)',
        y: 'Roll (tilt left/right)',
        z: 'Yaw (rotate flat)'
      },
      noise: '~0.02 rad/s'
    },
    attitude: {
      range: '-π to π radians',
      units: 'radians',
      angles: {
        roll: 'Rotation around longitudinal axis',
        pitch: 'Rotation around lateral axis',
        yaw: 'Rotation around vertical axis'
      },
      noise: 'Low (Kalman-filtered)'
    }
  }
};

// Create server
const server = new Server(
  {
    name: 'supersonic-osc-mcp',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_ios_app_info',
        description: 'Get detailed information about iOS motion apps (PhyOSC, MotionSender, TouchOSC)',
        inputSchema: {
          type: 'object',
          properties: {
            appName: {
              type: 'string',
              enum: ['phyosc', 'motionSender', 'touchOsc', 'all'],
              description: 'Which app to get info about (or "all" for all apps)'
            }
          },
          required: ['appName']
        }
      },
      {
        name: 'get_osc_mapping_suggestions',
        description: 'Get suggestions for mapping iOS motion sensors to SuperSonic synth parameters',
        inputSchema: {
          type: 'object',
          properties: {
            sensor: {
              type: 'string',
              enum: ['accelerometer', 'gyroscope', 'attitude', 'all'],
              description: 'Which sensor to get mappings for'
            },
            synthParameter: {
              type: 'string',
              description: 'Optional: specific synth parameter (freq, amp, cutoff, etc.)'
            }
          },
          required: ['sensor']
        }
      },
      {
        name: 'generate_osc_bridge_setup',
        description: 'Generate setup instructions for OSC bridge server and network configuration',
        inputSchema: {
          type: 'object',
          properties: {
            iosApp: {
              type: 'string',
              enum: ['phyosc', 'motionSender', 'touchOsc'],
              description: 'Which iOS app to configure'
            },
            targetPort: {
              type: 'number',
              description: 'UDP port for OSC messages (default: 8000)',
              default: 8000
            }
          },
          required: ['iosApp']
        }
      },
      {
        name: 'get_supersonic_commands',
        description: 'Get SuperSonic OSC command reference with examples',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Specific command to get info about (e.g., /s_new, /n_set), or leave empty for all'
            }
          }
        }
      },
      {
        name: 'create_smoothing_code',
        description: 'Generate JavaScript smoothing/filtering code for sensor data',
        inputSchema: {
          type: 'object',
          properties: {
            algorithm: {
              type: 'string',
              enum: ['exponential', 'moving-average', 'kalman'],
              description: 'Smoothing algorithm to use',
              default: 'exponential'
            },
            alpha: {
              type: 'number',
              description: 'Smoothing factor (0.0-1.0, lower = smoother)',
              default: 0.3
            }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_ios_app_info': {
      const { appName } = args;

      if (appName === 'all') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(KNOWLEDGE_BASE.iosApps, null, 2)
          }]
        };
      }

      const app = KNOWLEDGE_BASE.iosApps[appName];
      if (!app) {
        throw new Error(`Unknown app: ${appName}. Use: phyosc, motionSender, touchOsc, or all`);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(app, null, 2)
        }]
      };
    }

    case 'get_osc_mapping_suggestions': {
      const { sensor, synthParameter } = args;

      const mappings = {
        accelerometer: [
          { from: 'X-axis (-1 to 1)', to: 'pan', mapping: 'linear', description: 'Stereo position' },
          { from: 'Y-axis (-1 to 1)', to: 'amp', mapping: 'linear', description: 'Volume (tilt up = louder)' },
          { from: 'Z-axis (-1 to 1)', to: 'cutoff', mapping: 'exponential', description: 'Filter brightness' },
          { from: 'Magnitude', to: 'trigger', mapping: 'threshold', description: 'Shake detection' }
        ],
        gyroscope: [
          { from: 'Roll (-π to π)', to: 'freq', mapping: 'exponential', description: 'Pitch sweep' },
          { from: 'Pitch (-π/2 to π/2)', to: 'resonance', mapping: 'linear', description: 'Filter emphasis' },
          { from: 'Yaw (-π to π)', to: 'detune', mapping: 'linear', description: 'Chorus/phase' },
          { from: 'Z-axis magnitude', to: 'trigger', mapping: 'threshold', description: 'Spin gesture' }
        ],
        attitude: [
          { from: 'Roll', to: 'freq', mapping: 'exponential', description: 'Continuous pitch control' },
          { from: 'Pitch', to: 'amp', mapping: 'linear', description: 'Tilt = volume' },
          { from: 'Yaw', to: 'pan', mapping: 'linear', description: 'Compass = stereo' }
        ]
      };

      if (sensor === 'all') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(mappings, null, 2)
          }]
        };
      }

      const sensorMappings = mappings[sensor];
      if (!sensorMappings) {
        throw new Error(`Unknown sensor: ${sensor}. Use: accelerometer, gyroscope, attitude, or all`);
      }

      if (synthParameter) {
        const filtered = sensorMappings.filter(m => m.to === synthParameter);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(filtered, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(sensorMappings, null, 2)
        }]
      };
    }

    case 'generate_osc_bridge_setup': {
      const { iosApp, targetPort = 8000 } = args;

      const setup = {
        bridgeServer: {
          command: 'node osc-bridge-server.js',
          oscPort: targetPort,
          wsPort: 8080,
          npm: ['osc', 'ws']
        },
        iosAppConfig: {},
        networkSetup: {
          requirement: 'iOS device and computer on same Wi-Fi network',
          findIosIp: 'Settings → Wi-Fi → (i) icon → IP Address',
          findComputerIp: 'Run: ifconfig | grep "inet " | grep -v 127.0.0.1',
          firewall: `Allow UDP port ${targetPort} in firewall settings`
        }
      };

      switch (iosApp) {
        case 'phyosc':
          setup.iosAppConfig = {
            steps: [
              'Open PhyOSC app on iPhone',
              'Note displayed IP (e.g., http://192.168.1.50:8080)',
              'Open that URL in browser on computer',
              'Set Target IP to computer IP',
              `Set Target Port to ${targetPort}`
            ]
          };
          break;

        case 'motionSender':
          setup.iosAppConfig = {
            steps: [
              'Open MotionSender app',
              'Tap Settings gear icon',
              'Set Destination IP to computer IP',
              `Set Destination Port to ${targetPort}`,
              'Enable desired sensors',
              'Toggle Bundle Mode (recommended: ON)'
            ]
          };
          break;

        case 'touchOsc':
          setup.iosAppConfig = {
            steps: [
              'Open TouchOSC app',
              'Tap Connections (chain icon)',
              'Add new OSC connection',
              'Set Host to computer IP',
              `Set Port (outgoing) to ${targetPort}`,
              'Optional: Enable Send Accelerometer in settings'
            ]
          };
          break;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(setup, null, 2)
        }]
      };
    }

    case 'get_supersonic_commands': {
      const { command } = args;

      if (!command) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(KNOWLEDGE_BASE.supersonic.architecture.oscCommands, null, 2)
          }]
        };
      }

      const commandInfo = KNOWLEDGE_BASE.supersonic.architecture.oscCommands[command];
      if (!commandInfo) {
        throw new Error(`Unknown command: ${command}`);
      }

      const examples = {
        '/s_new': `sonic.send('/s_new', 'sonic-pi-beep', -1, 0, 0, 'note', 60, 'amp', 0.5);`,
        '/n_set': `sonic.send('/n_set', 1000, 'freq', 440.0, 'cutoff', 8000);`,
        '/n_free': `sonic.send('/n_free', 1000);`
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            command,
            description: commandInfo,
            example: examples[command] || 'No example available'
          }, null, 2)
        }]
      };
    }

    case 'create_smoothing_code': {
      const { algorithm = 'exponential', alpha = 0.3 } = args;

      let code = '';

      switch (algorithm) {
        case 'exponential':
          code = `
class Smoother {
  constructor(alpha = ${alpha}) {
    this.alpha = alpha; // Lower = smoother (0.0-1.0)
    this.value = null;
  }

  update(newValue) {
    if (this.value === null) {
      this.value = newValue;
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  reset() {
    this.value = null;
  }
}

// Usage:
const freqSmoother = new Smoother(${alpha});
const smoothedFreq = freqSmoother.update(rawFreq);
`;
          break;

        case 'moving-average':
          code = `
class MovingAverageSmoother {
  constructor(windowSize = 10) {
    this.windowSize = windowSize;
    this.values = [];
  }

  update(newValue) {
    this.values.push(newValue);
    if (this.values.length > this.windowSize) {
      this.values.shift();
    }

    const sum = this.values.reduce((a, b) => a + b, 0);
    return sum / this.values.length;
  }

  reset() {
    this.values = [];
  }
}

// Usage:
const freqSmoother = new MovingAverageSmoother(10);
const smoothedFreq = freqSmoother.update(rawFreq);
`;
          break;

        case 'kalman':
          code = `
class KalmanSmoother {
  constructor(processNoise = 0.01, measurementNoise = 0.1) {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    this.estimate = null;
    this.errorCovariance = 1.0;
  }

  update(measurement) {
    if (this.estimate === null) {
      this.estimate = measurement;
      return this.estimate;
    }

    // Prediction
    const predictedEstimate = this.estimate;
    const predictedErrorCovariance = this.errorCovariance + this.processNoise;

    // Update
    const kalmanGain = predictedErrorCovariance / (predictedErrorCovariance + this.measurementNoise);
    this.estimate = predictedEstimate + kalmanGain * (measurement - predictedEstimate);
    this.errorCovariance = (1 - kalmanGain) * predictedErrorCovariance;

    return this.estimate;
  }

  reset() {
    this.estimate = null;
    this.errorCovariance = 1.0;
  }
}

// Usage:
const freqSmoother = new KalmanSmoother(0.01, 0.1);
const smoothedFreq = freqSmoother.update(rawFreq);
`;
          break;
      }

      return {
        content: [{
          type: 'text',
          text: code
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'supersonic://specs/core-architecture',
        name: 'SuperSonic Core Architecture Spec',
        mimeType: 'text/markdown',
        description: 'Complete RISE specification of SuperSonic OSC-to-audio pipeline'
      },
      {
        uri: 'supersonic://specs/ios-apps',
        name: 'iOS Motion Apps Specification',
        mimeType: 'text/markdown',
        description: 'Documentation of PhyOSC, MotionSender, and TouchOSC'
      },
      {
        uri: 'supersonic://examples/rotation-sound',
        name: 'Example: Rotation-Based Sound',
        mimeType: 'text/html',
        description: 'Interactive example mapping phone rotation to synthesis parameters'
      },
      {
        uri: 'supersonic://examples/accelerometer-triggers',
        name: 'Example: Accelerometer Triggers',
        mimeType: 'text/html',
        description: 'Gesture-based sound triggering (shake, tilt, rotate)'
      },
      {
        uri: 'supersonic://bridge/server',
        name: 'OSC Bridge Server',
        mimeType: 'application/javascript',
        description: 'Node.js server forwarding OSC from iOS to browser'
      },
      {
        uri: 'supersonic://knowledge/sensor-characteristics',
        name: 'Sensor Data Characteristics',
        mimeType: 'application/json',
        description: 'Technical specs for accelerometer, gyroscope, attitude data'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'supersonic://knowledge/sensor-characteristics':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(KNOWLEDGE_BASE.sensorMappings, null, 2)
        }]
      };

    case 'supersonic://specs/core-architecture':
      return {
        contents: [{
          uri,
          mimeType: 'text/markdown',
          text: 'See: /home/mia/workspace/supersonic/rispecs/01530a36-0d32-4166-a715-19843ca6560f/supersonic-core-architecture.rise.md'
        }]
      };

    case 'supersonic://specs/ios-apps':
      return {
        contents: [{
          uri,
          mimeType: 'text/markdown',
          text: 'See: /home/mia/workspace/supersonic/rispecs/01530a36-0d32-4166-a715-19843ca6560f/ios-motion-apps.rise.md'
        }]
      };

    default:
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: `Resource ${uri} content reference (file-based)`
        }]
      };
  }
});

// Register prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'setup-motion-synthesis',
        description: 'Guide user through complete setup of iPhone motion → SuperSonic synthesis',
        arguments: [
          {
            name: 'iosApp',
            description: 'Which iOS app to use (phyosc, motionSender, touchOsc)',
            required: true
          }
        ]
      },
      {
        name: 'debug-osc-connection',
        description: 'Troubleshoot OSC connection issues between iOS and computer',
        arguments: []
      },
      {
        name: 'create-custom-mapping',
        description: 'Design a custom sensor-to-sound mapping',
        arguments: [
          {
            name: 'musicalGoal',
            description: 'What musical effect do you want to create?',
            required: true
          }
        ]
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'setup-motion-synthesis':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to set up iPhone motion control for SuperSonic synthesis using ${args.iosApp}. Guide me through the complete setup process including network configuration, OSC bridge server, and example code.`
            }
          }
        ]
      };

    case 'debug-osc-connection':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `My iPhone is not sending OSC messages to my computer. Help me debug the connection by checking: network configuration, firewall settings, iOS app configuration, and OSC bridge server status.`
            }
          }
        ]
      };

    case 'create-custom-mapping':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to create a custom motion-to-sound mapping for: ${args.musicalGoal}. Suggest sensor mappings, scaling functions, and provide implementation code.`
            }
          }
        ]
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SuperSonic OSC MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
