# Session 01530a36-0d32-4166-a715-19843ca6560f

**iPhone Motion → SuperSonic Sound Synthesis**

## 🎯 Deliverables Created

### ✅ RISE Framework Specifications

1. **SuperSonic Core Architecture** (`rispecs/.../supersonic-core-architecture.rise.md`)
   - Complete reverse-engineering of OSC-to-audio pipeline
   - Ring buffer communication (768KB IN, 128KB OUT)
   - Message routing (direct vs scheduled paths)
   - Audio worklet processing (~2.7ms/frame)
   - OSC command reference (/s_new, /n_set, /n_free, etc.)
   - Build requirements & performance metrics

2. **iOS Motion Apps Specification** (`rispecs/.../ios-motion-apps.rise.md`)
   - PhyOSC: Apple Watch + iPhone, wearable control
   - MotionSender: CoreMotion + Wekinator ML integration
   - TouchOSC: Customizable multi-touch + motion ($14.99)
   - OSC address structures for each app
   - Sensor characteristics (accel, gyro, attitude)
   - Network configuration & troubleshooting

### ✅ Working Examples

3. **OSC Bridge Server** (`osc-bridge-server.js`)
   - Forwards OSC (UDP port 8000) → WebSocket (port 8080)
   - Real-time logging, connection management
   - Auto-detects local IP addresses
   - Status monitoring (message count, clients, activity)
   - Usage: `npm install osc ws && node osc-bridge-server.js`

4. **Example 1: Rotation-Based Sound** (`example-rotation-sound.html`)
   - Continuous sound modulation via phone rotation
   - Mappings:
     - Roll (-π to π) → freq (100-1000 Hz, exponential)
     - Pitch (-π/2 to π/2) → amp (0.0-0.8, linear)
     - Yaw (-π to π) → pan (-1.0 to 1.0, stereo)
   - 3D phone visualization with CSS transforms
   - Exponential smoothing (α=0.3) for jitter-free control
   - Real-time sensor display

5. **Example 2: Accelerometer Triggers** (`example-accelerometer-triggers.html`)
   - Gesture-based sound triggering
   - Detects: Shake, Tilt Up, Tilt Down, Rotate
   - Threshold-based detection with debouncing (500ms)
   - Visual feedback animations (ripple effects)
   - Adjustable sensitivity sliders
   - Maps gestures to different synths:
     - Shake → sonic-pi-beep (random note)
     - Tilt Up → sonic-pi-prophet (high note)
     - Tilt Down → sonic-pi-dsaw (low note)
     - Rotate → sonic-pi-tb303

### ✅ MCP Server for Knowledge Continuity

6. **SuperSonic OSC MCP** (`supersonic-osc-mcp/`)
   - Model Context Protocol server for future LLM sessions
   - **5 Tools**:
     - `get_ios_app_info`: Detailed app documentation
     - `get_osc_mapping_suggestions`: Sensor→parameter ideas
     - `generate_osc_bridge_setup`: Network setup instructions
     - `get_supersonic_commands`: OSC command reference
     - `create_smoothing_code`: Algorithm code generation
   - **6 Resources**:
     - SuperSonic architecture specs
     - iOS app specifications
     - Example implementations
     - Sensor characteristics
     - OSC bridge server code
   - **3 Prompts**:
     - Setup motion synthesis workflow
     - Debug OSC connection issues
     - Create custom mappings
   - Installation: Add to `~/.config/claude-code/mcp.json`

### ✅ Documentation

7. **CLAUDE.md Updated** (project-level documentation)
   - Complete "iOS Motion-to-Sound Integration" section
   - Architecture diagram
   - Quick start guide (5 steps)
   - Sensor-to-sound mapping reference table
   - Network troubleshooting
   - MCP server installation instructions
   - Next steps & potential extensions

## 📂 File Structure

```
supersonic/
├── rispecs/
│   └── 01530a36-0d32-4166-a715-19843ca6560f/
│       ├── supersonic-core-architecture.rise.md
│       └── ios-motion-apps.rise.md
├── workdir-01530a36-0d32-4166-a715-19843ca6560f/
│   ├── README.md (this file)
│   ├── osc-bridge-server.js
│   ├── example-rotation-sound.html
│   ├── example-accelerometer-triggers.html
│   └── supersonic-osc-mcp/
│       ├── package.json
│       ├── index.js
│       └── README.md
└── CLAUDE.md (updated with iOS integration section)
```

## 🚀 Quick Test (After Building SuperSonic)

1. **Terminal 1**: OSC Bridge
   ```bash
   cd workdir-01530a36-0d32-4166-a715-19843ca6560f
   npm install osc ws
   node osc-bridge-server.js
   # Note the computer IP displayed
   ```

2. **Terminal 2**: SuperSonic Server
   ```bash
   cd /home/mia/workspace/supersonic
   ruby example/server.rb
   ```

3. **iPhone**: Configure MotionSender
   - Settings → Wi-Fi → Note iPhone IP
   - MotionSender → Settings
   - Destination IP: <computer-ip-from-bridge>
   - Destination Port: 8000
   - Enable Bundle Mode

4. **Browser**: Open Example
   - http://localhost:8003/workdir-01530a36-0d32-4166-a715-19843ca6560f/example-rotation-sound.html
   - Boot SuperSonic
   - Start Synth
   - Rotate your phone! 🎵

## 🎛️ Sensor Mappings Reference

| Motion | Range | Synth Param | Mapping | Effect |
|--------|-------|-------------|---------|--------|
| Roll | -180° to 180° | freq | Exponential | Pitch sweep |
| Pitch | -90° to 90° | amp | Linear | Tilt = volume |
| Yaw | -180° to 180° | pan | Linear | Stereo position |
| Shake | >2g | Trigger | Threshold | New note |
| Spin | >5 rad/s | Trigger | Threshold | Gesture detect |

## 🧠 Knowledge Preserved in MCP

Future sessions can query:
- "What iOS apps work with SuperSonic?" → PhyOSC, MotionSender, TouchOSC details
- "How do I map gyroscope to frequency?" → Exponential scaling suggestions
- "Generate smoothing code with α=0.2" → Ready-to-use JavaScript class
- "Setup instructions for PhyOSC" → Network config, firewall, app settings
- "What OSC commands trigger synths?" → /s_new, /n_set, /n_free examples

Install MCP server to enable these queries in all future sessions!

## 📊 Technical Achievements

- **Zero-Latency Architecture**: Ring buffer + atomic operations
- **Sample-Accurate Timing**: NTP timestamps, 25ms prescheduler polling
- **Jitter-Free Control**: Exponential smoothing (α=0.3)
- **Robust Communication**: Sequence gap detection, overflow handling
- **Cross-Platform**: Works with 3 iOS apps, extensible to Android (TouchOSC)
- **Future-Proof**: MCP server captures all knowledge for re-entry

## 🎨 Visual Highlights

- **Example 1**: 3D rotating phone visualization (CSS perspective transforms)
- **Example 2**: Ripple animation on gesture triggers
- **Both**: Real-time sensor bars, status indicators, message counters
- **Bridge Server**: Colored console output (🟢 ACTIVE / 🔴 IDLE)

## 🔗 External Resources Documented

- SuperCollider OSC: https://doc.sccode.org/Reference/Server-Command-Reference.html
- PhyOSC: https://phyosc.gridsystem.jp/
- TouchOSC: https://hexler.net/touchosc/
- Wekinator: http://www.wekinator.org/
- OSC Spec: http://opensoundcontrol.org/spec-1_0

## 🌟 Next Extensions (Ideas)

- Wekinator ML gesture training workflow
- Multi-device orchestration (3+ iPhones → chord/rhythm patterns)
- Custom synthdefs optimized for motion (velocity-sensitive, gesture envelopes)
- WebRTC direct iOS→browser (eliminate bridge server latency)
- Gesture recording/playback (JSON sequence export)
- TouchOSC layout templates (ready-to-use for common synths)

---

**Status**: ✅ All deliverables complete
**Date**: 2025-12-11
**Session ID**: 01530a36-0d32-4166-a715-19843ca6560f
