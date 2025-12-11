@@ -0,0 +1,43 @@
# SuperSonic

SuperSonic is a port of SuperCollider's scsynth audio engine to work within the strict constraints of a web audioworklet.

This means that:

1. It is compiled from c++ to WASM
2. It has to comply with the strict requirements of Audioworklets:
   * No thread spawning
   * No malloc
   * No IO
   * No main() entry point
   * No automatic C++ intialiser calls
3. It has to be a static library that gets called via process() from the audioworklet's high priority thread.

The original scsynth was multi-threaded. It had a separate thread for IO vs the audio graph calculations. This was all well coordinated with queue between the threads for passing OSC messages, etc.

We have had to bypass all of this. Instead we have SharedBuffer memory that can be accessed by both the WASM audioworklet code and JS. We use this to ship OSC in and out of our wasm scsynth in addition to shipping debug IO messages for development and info.

We have successfully managed to make sounds using some of the sonic pi synths such as sonic-pi_prophet and sonic-pi_beep. We're currently working on the audio buffer integration.


## Building

You can build SuperSonic with:

./build.sh

This compiles all the assets and places the results in the dist dir.

## Running

There's a test webserver implemented in Ruby that sets the correct headers. Run:

ruby example/server.rb


## Example

We have a nice demo example in example/demo.html which has a BOOT button to initialise scsynth, a text area for writing ascii OSC (with initial timestamps) and three other boxes - Debug Info (showing debug output from scsynth), OSC In and OSC Out showing OSC in and out of scsynth.

---

## 🎵 iOS Motion-to-Sound Integration

**Session ID**: 01530a36-0d32-4166-a715-19843ca6560f
**Created**: 2025-12-11

### Overview

Complete implementation enabling iPhone/iPad motion sensors (accelerometer, gyroscope, attitude) to control SuperSonic synthesis via Open Sound Control (OSC).

### iOS Applications

Three iOS apps available for motion → OSC transmission:

1. **PhyOSC** - Apple Watch + iPhone motion sensors, web configuration
2. **MotionSender (GyrOSC)** - iPhone/iPad sensors, Wekinator ML integration
3. **TouchOSC** - Customizable multi-touch interface + motion sensors ($14.99)

See: `rispecs/01530a36-0d32-4166-a715-19843ca6560f/ios-motion-apps.rise.md`

### Architecture

```
iOS App (motion sensors)
    ↓ OSC over UDP (port 8000)
Node.js Bridge Server (osc-bridge-server.js)
    ↓ WebSocket (port 8080)
Browser (SuperSonic + example HTML)
    ↓ Ring buffer → WASM
scsynth Audio Engine
```

### Files Created

#### RISE Specifications
- `rispecs/01530a36-0d32-4166-a715-19843ca6560f/supersonic-core-architecture.rise.md`
  - Complete reverse-engineering of SuperSonic OSC pipeline
  - Ring buffer communication, message routing, timing architecture
  - OSC command reference, type system, performance metrics

- `rispecs/01530a36-0d32-4166-a715-19843ca6560f/ios-motion-apps.rise.md`
  - Documentation of PhyOSC, MotionSender, TouchOSC
  - OSC address structures, configuration steps
  - Sensor characteristics (accelerometer, gyroscope, attitude)
  - Network setup, integration patterns

#### Working Examples
- `workdir-01530a36-0d32-4166-a715-19843ca6560f/osc-bridge-server.js`
  - Node.js server forwarding OSC (UDP) → WebSocket
  - Real-time message logging, client connection management
  - Usage: `node osc-bridge-server.js` (requires: `npm install osc ws`)

- `workdir-01530a36-0d32-4166-a715-19843ca6560f/example-rotation-sound.html`
  - **Example 1**: Rotation-based continuous sound modulation
  - Mappings: Roll→freq (100-1000Hz), Pitch→amp, Yaw→pan
  - 3D phone visualization, real-time sensor display
  - Exponential frequency scaling, smoothing filters (α=0.3)

- `workdir-01530a36-0d32-4166-a715-19843ca6560f/example-accelerometer-triggers.html`
  - **Example 2**: Gesture-triggered synthesis
  - Detects: Shake, Tilt Up, Tilt Down, Rotate
  - Threshold-based triggering with debouncing
  - Visual feedback, adjustable sensitivity

#### MCP Server
- `workdir-01530a36-0d32-4166-a715-19843ca6560f/supersonic-osc-mcp/`
  - Model Context Protocol server for future sessions
  - **Tools**: iOS app info, mapping suggestions, setup instructions, smoothing code generation
  - **Resources**: RISE specs, examples, sensor characteristics
  - **Prompts**: Setup guides, debugging, custom mapping creation
  - Install MCP in Claude Code config to access this knowledge in future sessions

### Quick Start

1. **Build SuperSonic** (requires Emscripten):
   ```bash
   ./build.sh
   ```

2. **Start OSC Bridge Server**:
   ```bash
   cd workdir-01530a36-0d32-4166-a715-19843ca6560f
   npm install osc ws
   node osc-bridge-server.js
   ```

3. **Configure iOS App** (example: MotionSender):
   - Settings → Wi-Fi → Note iPhone IP
   - Open MotionSender → Settings
   - Set Destination IP to computer IP (shown by bridge server)
   - Set Destination Port to 8000
   - Enable Bundle Mode

4. **Start SuperSonic Server**:
   ```bash
   ruby example/server.rb
   ```

5. **Open Example** in browser:
   - http://localhost:8003/workdir-01530a36-0d32-4166-a715-19843ca6560f/example-rotation-sound.html
   - Click "🚀 Boot SuperSonic"
   - Click "▶️ Start Synth"
   - Move your iPhone!

### Sensor-to-Sound Mappings

#### Recommended Mappings

| Sensor | Range | Parameter | Mapping | Effect |
|--------|-------|-----------|---------|--------|
| Roll | -π to π | `freq` | Exponential | Pitch sweep (100-1000 Hz) |
| Pitch | -π/2 to π/2 | `amp` | Linear | Tilt = volume (0.0-0.8) |
| Yaw | -π to π | `pan` | Linear | Stereo position (-1 to 1) |
| Accel X | -2g to 2g | `cutoff` | Exponential | Filter brightness |
| Accel magnitude | >2g threshold | Trigger | Threshold | Shake detection |
| Gyro Z | >5 rad/s | Trigger | Threshold | Spin gesture |

#### Smoothing (Essential for Jitter-Free Control)

```javascript
class Smoother {
  constructor(alpha = 0.3) { // Lower = smoother
    this.alpha = alpha;
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
}

// Usage:
const freqSmoother = new Smoother(0.3);
const smoothFreq = freqSmoother.update(rawFreq);
sonic.send('/n_set', nodeId, 'freq', smoothFreq);
```

### SuperSonic OSC Commands

```javascript
// Create and play synth
sonic.send('/s_new', 'sonic-pi-prophet', -1, 0, 0, 'note', 60, 'amp', 0.5);

// Modify synth parameters
sonic.send('/n_set', nodeId, 'freq', 440.0, 'cutoff', 8000, 'resonance', 0.8);

// Stop synth
sonic.send('/n_free', nodeId);

// Load synthdef
await sonic.loadSynthDefs(['sonic-pi-beep', 'sonic-pi-prophet', 'sonic-pi-tb303']);
```

### Network Troubleshooting

**Firewall** (if OSC messages not received):
```bash
# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node

# Linux (ufw)
sudo ufw allow 8000/udp

# Windows
# Control Panel → Windows Defender Firewall → Advanced Settings
# → Inbound Rules → New Rule → Port → UDP 8000
```

**Find IP Addresses**:
```bash
# Computer IP (macOS/Linux)
ifconfig | grep "inet " | grep -v 127.0.0.1

# iPhone IP
# Settings → Wi-Fi → (i) icon next to network name
```

### MCP Server Installation

Add to `~/.config/claude-code/mcp.json`:

```json
{
  "mcpServers": {
    "supersonic-osc": {
      "command": "node",
      "args": ["/home/mia/workspace/supersonic/workdir-01530a36-0d32-4166-a715-19843ca6560f/supersonic-osc-mcp/index.js"]
    }
  }
}
```

Future LLM sessions can then query:
- iOS app capabilities and OSC addresses
- Sensor-to-sound mapping suggestions
- Setup instructions for specific apps
- Smoothing algorithm code generation
- Access to RISE specifications

### Resources

- **SuperCollider OSC Commands**: https://doc.sccode.org/Reference/Server-Command-Reference.html
- **PhyOSC Documentation**: https://phyosc.gridsystem.jp/howtouse.html
- **TouchOSC Manual**: https://hexler.net/touchosc/manual
- **Wekinator (ML for gestures)**: http://www.wekinator.org/
- **OSC Specification**: http://opensoundcontrol.org/spec-1_0

### Next Steps

Potential extensions:
- Wekinator integration for ML gesture recognition
- Multi-device orchestration (multiple iPhones → polyphonic control)
- Custom SuperCollider synthdefs optimized for motion control
- Recording/playback of gesture sequences
- WebRTC for lower-latency iOS→browser communication

