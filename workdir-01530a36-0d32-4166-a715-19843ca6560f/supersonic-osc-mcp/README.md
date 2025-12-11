# SuperSonic OSC MCP Server

Model Context Protocol (MCP) server providing tools, resources, and prompts for working with SuperSonic and iOS motion-to-sound workflows.

**Session ID**: 01530a36-0d32-4166-a715-19843ca6560f

## Features

### 🛠️ Tools

- **get_ios_app_info**: Detailed info about PhyOSC, MotionSender, TouchOSC
- **get_osc_mapping_suggestions**: Sensor→sound parameter mapping ideas
- **generate_osc_bridge_setup**: Network setup instructions for iOS apps
- **get_supersonic_commands**: OSC command reference with examples
- **create_smoothing_code**: Generate sensor smoothing/filtering code

### 📚 Resources

- **SuperSonic Core Architecture**: Complete RISE specification
- **iOS Motion Apps Specification**: Documentation of all three apps
- **Example: Rotation-Based Sound**: Interactive rotation→frequency mapping
- **Example: Accelerometer Triggers**: Gesture-based sound triggering
- **OSC Bridge Server**: Node.js forwarding server
- **Sensor Data Characteristics**: Technical specs for motion sensors

### 💬 Prompts

- **setup-motion-synthesis**: Complete setup guide for iOS→SuperSonic
- **debug-osc-connection**: Troubleshoot OSC connection issues
- **create-custom-mapping**: Design custom sensor mappings

## Installation

```bash
cd supersonic-osc-mcp
npm install
```

## Usage

### As Claude Code MCP Server

Add to your Claude Code MCP configuration (`~/.config/claude-code/mcp.json`):

```json
{
  "mcpServers": {
    "supersonic-osc": {
      "command": "node",
      "args": ["/path/to/supersonic-osc-mcp/index.js"]
    }
  }
}
```

### Standalone Testing

```bash
npm start
```

## Example Interactions

### Get iOS App Information

```javascript
// Tool call
{
  "name": "get_ios_app_info",
  "arguments": {
    "appName": "motionSender"
  }
}

// Returns detailed info about MotionSender including:
// - OSC addresses
// - Features
// - Pros/cons
// - Wekinator integration
```

### Get Mapping Suggestions

```javascript
// Tool call
{
  "name": "get_osc_mapping_suggestions",
  "arguments": {
    "sensor": "gyroscope",
    "synthParameter": "freq"
  }
}

// Returns suggestions like:
// - Roll → freq (exponential mapping, pitch sweep)
```

### Generate Setup Instructions

```javascript
// Tool call
{
  "name": "generate_osc_bridge_setup",
  "arguments": {
    "iosApp": "phyosc",
    "targetPort": 8000
  }
}

// Returns complete setup guide:
// - Bridge server commands
// - iOS app configuration steps
// - Network setup
// - Firewall configuration
```

### Create Smoothing Code

```javascript
// Tool call
{
  "name": "create_smoothing_code",
  "arguments": {
    "algorithm": "exponential",
    "alpha": 0.3
  }
}

// Returns ready-to-use JavaScript smoothing class
```

## Knowledge Base

The MCP server contains comprehensive knowledge about:

- **iOS Apps**: PhyOSC, MotionSender, TouchOSC
  - Features, OSC addresses, pros/cons
  - Configuration steps
  - Use case recommendations

- **SuperSonic Architecture**:
  - Ring buffer communication
  - OSC command reference
  - Build requirements
  - Example implementations

- **Sensor Characteristics**:
  - Accelerometer, gyroscope, attitude data
  - Ranges, units, noise levels
  - Axis definitions

- **Motion-to-Sound Mappings**:
  - Proven sensor→parameter mappings
  - Scaling functions (linear, exponential, threshold)
  - Smoothing algorithms

## File References

This MCP server references the following files created in this session:

- `rispecs/01530a36-0d32-4166-a715-19843ca6560f/supersonic-core-architecture.rise.md`
- `rispecs/01530a36-0d32-4166-a715-19843ca6560f/ios-motion-apps.rise.md`
- `workdir-01530a36-0d32-4166-a715-19843ca6560f/osc-bridge-server.js`
- `workdir-01530a36-0d32-4166-a715-19843ca6560f/example-rotation-sound.html`
- `workdir-01530a36-0d32-4166-a715-19843ca6560f/example-accelerometer-triggers.html`

## Future Extensions

Potential additions:

- **Tool**: `generate_synthdef_mapping` - Create SuperCollider synthdefs optimized for motion control
- **Tool**: `analyze_gesture_data` - Record and analyze gesture patterns for threshold tuning
- **Resource**: Wekinator training datasets for common gestures
- **Prompt**: `optimize-latency` - Guide for minimizing motion-to-sound latency

## License

MIT

## Author

Created during Session 01530a36-0d32-4166-a715-19843ca6560f
