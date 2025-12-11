# RISE Specification: iOS Motion-to-OSC Applications

**Session ID**: 01530a36-0d32-4166-a715-19843ca6560f
**Created**: 2025-12-11
**Component**: iOS Motion Sensor Apps (PhyOSC, MotionSender, TouchOSC)
**Purpose**: Documentation of iOS applications capable of transmitting device motion as OSC messages

---

## 🎯 INTENT

Enable iPhone/iPad hardware sensors (accelerometer, gyroscope, touch) to control audio synthesis remotely via Open Sound Control (OSC) protocol. These apps transform physical gestures into musical expression without requiring custom iOS development.

**Primary Use Cases**:
- Gesture-based instrument control (tilt, rotate, shake → sound modulation)
- Real-time parameter automation (walking, dancing → dynamic synthesis)
- Multi-device orchestration (multiple phones → polyphonic control)
- Accessibility (motion-based music creation without visual/tactile interfaces)

---

## 🔍 REVERSE ENGINEERING

### iOS Motion Sensor APIs

All three apps leverage **CoreMotion** framework:

```
iOS Device Sensors
    ├─ Accelerometer (linear acceleration, m/s²)
    ├─ Gyroscope (angular velocity, rad/s)
    ├─ Magnetometer (magnetic field, μT)
    └─ Device Motion (fused sensor data)
           ├─ Attitude (roll, pitch, yaw in radians)
           ├─ Rotation Rate (angular velocity)
           ├─ Gravity (separated from user acceleration)
           └─ User Acceleration (device motion minus gravity)
```

**Update Frequency**: 10-100 Hz (configurable)

---

## 📋 SPECIFICATIONS

### App 1: PhyOSC - Physical OSC Transmitter

**Platform**: iPhone + Apple Watch
**Official Site**: https://phyosc.gridsystem.jp/

#### Features
- **Primary Input**: Apple Watch motion sensors
- **Secondary Input**: iPhone accelerometer/gyroscope
- **Transmission**: OSC over Wi-Fi (UDP)
- **Configuration**: Web-based UI (hosted on iPhone)

#### OSC Address Structure

**Apple Watch Sensors**:
```
/watch/accel/x    Float (-2.0 to 2.0 typical, g-forces)
/watch/accel/y    Float
/watch/accel/z    Float
/watch/gyro/x     Float (rad/s)
/watch/gyro/y     Float
/watch/gyro/z     Float
/watch/attitude/roll   Float (-π to π)
/watch/attitude/pitch  Float
/watch/attitude/yaw    Float
```

**iPhone Sensors** (if enabled):
```
/phone/accel/x    Float
/phone/accel/y    Float
/phone/accel/z    Float
/phone/gyro/x     Float
/phone/gyro/y     Float
/phone/gyro/z     Float
```

#### Configuration

**Default Settings**:
- Target IP: `192.168.1.100` (configurable via web UI)
- Target Port: `8000`
- Update Rate: 30 Hz
- Bundle Mode: Individual messages (no bundles)

**Web UI Access**:
1. Connect iPhone to same Wi-Fi network as control computer
2. Open PhyOSC app
3. Note displayed IP address (e.g., `http://192.168.1.50:8080`)
4. Open browser on computer → navigate to iPhone IP
5. Configure target IP/port for OSC destination

#### Pros/Cons

**Advantages**:
- ✅ Apple Watch = wearable controller (hands-free)
- ✅ Low latency (direct UDP)
- ✅ Stable connection (Wi-Fi)
- ✅ Simple web configuration

**Limitations**:
- ❌ Requires Apple Watch
- ❌ No gesture recognition (raw sensor data only)
- ❌ Limited to motion sensors (no touch/screen input)

---

### App 2: MotionSender (aka GyrOSC)

**Platform**: iPhone/iPad
**GitHub**: https://github.com/wekinator/MotionSender

#### Features
- **Primary Input**: iPhone/iPad CoreMotion sensors
- **Transmission**: OSC over Wi-Fi (UDP)
- **Target**: Wekinator (machine learning for gesture recognition)
- **Configuration**: In-app settings

#### OSC Address Structure

**Standard Addresses** (20 parameters):
```
/gyrosc/gyro     Float[3]   Angular velocity (x, y, z) in rad/s
/gyrosc/accel    Float[3]   Raw acceleration (x, y, z) in g
/gyrosc/grav     Float[3]   Gravity vector (x, y, z)
/gyrosc/motion   Float[3]   User acceleration (accel - gravity)
/gyrosc/attitude Float[3]   Roll, pitch, yaw in radians
/gyrosc/mag      Float[3]   Magnetic field (x, y, z) in μT
/gyrosc/heading  Float      Magnetic heading (0-360°)
/gyrosc/button   Int        Touch event (1=pressed, 0=released)
```

**Bundle Format** (single bundle with all 20 values):
```
OSC Bundle (timetag: immediate)
    /gyrosc/rrate    x, y, z      Rotation rate
    /gyrosc/accel    x, y, z      Accelerometer
    /gyrosc/grav     x, y, z      Gravity
    /gyrosc/motion   x, y, z      User motion
    /gyrosc/attitude roll, pitch, yaw
    /gyrosc/mag      x, y, z      Magnetometer
    /gyrosc/heading  heading      Compass
    /gyrosc/button   state        Touch state
```

#### Configuration

**In-App Settings**:
- **Destination IP**: Target computer IP (e.g., `192.168.1.100`)
- **Destination Port**: Default `8000` (configurable)
- **Update Rate**: 10-100 Hz (slider)
- **Bundle Mode**: On/Off (bundle all sensors vs individual messages)
- **Sensor Selection**: Enable/disable individual sensors

#### Integration with Wekinator

**Wekinator Workflow**:
1. Launch Wekinator (Java app)
2. Set input port to `6448` (default)
3. MotionSender sends to `localhost:6448`
4. Train gesture classifier:
   - Record "shake" gesture → Output 1
   - Record "tilt left" → Output 2
   - Record "circle motion" → Output 3
5. Wekinator outputs classification → Send to SuperSonic

**Example Wekinator Setup**:
```
Inputs: 20 (all MotionSender sensors)
Outputs: 4 (gesture classes: none, shake, tilt, circle)
Algorithm: Neural Network (MLP)
Training: Record 10-20 examples per gesture
```

**Wekinator → SuperSonic Bridge**:
```javascript
// Receive Wekinator classification output
oscServer.on('/wek/outputs', (msg) => {
  const gesture = msg.args[0]; // 0-3

  switch(gesture) {
    case 1: // Shake
      sonic.send('/s_new', 'sonic-pi-beep', -1, 0, 0, 'note', 60);
      break;
    case 2: // Tilt
      sonic.send('/n_set', currentNodeId, 'cutoff', 8000);
      break;
    case 3: // Circle
      sonic.send('/n_set', currentNodeId, 'freq', 440);
      break;
  }
});
```

#### Pros/Cons

**Advantages**:
- ✅ Free and open source
- ✅ Bundle mode (efficient for 20 simultaneous parameters)
- ✅ Wekinator integration (ML gesture recognition)
- ✅ Touch input (button address)

**Limitations**:
- ❌ UI is dated (iOS 7 era)
- ❌ Requires Wekinator for gesture recognition
- ❌ No built-in smoothing/filtering

---

### App 3: TouchOSC

**Platform**: iPhone/iPad/Android
**Official Site**: https://hexler.net/touchosc
**Price**: $14.99 (one-time)

#### Features
- **Primary Input**: Multi-touch screen (custom layouts)
- **Secondary Input**: Device motion (accelerometer/gyroscope)
- **Transmission**: OSC + MIDI over Wi-Fi/USB
- **Configuration**: Built-in editor + desktop editor

#### OSC Address Structure

**User-Defined** (fully customizable):
```
/1/fader1      Float (0.0 to 1.0)   Vertical fader
/1/rotary1     Float (0.0 to 1.0)   Rotary knob
/1/toggle1     Int (0 or 1)         Toggle button
/1/xy          Float, Float         XY pad (x, y)
/1/multifader  Float[8]             Multi-fader array
/accel/xyz     Float[3]             Accelerometer
/gyro/xyz      Float[3]             Gyroscope
```

**Example Layout for Synth Control**:
```
Page 1: Synth Parameters
    /synth/note      Fader (0-127, MIDI note)
    /synth/freq      Rotary (20-20000 Hz, logarithmic)
    /synth/amp       Fader (0.0-1.0, linear)
    /synth/cutoff    Fader (100-8000 Hz, logarithmic)
    /synth/resonance Fader (0.0-1.0)
    /synth/attack    Fader (0.01-2.0 seconds)
    /synth/release   Fader (0.1-5.0 seconds)
    /synth/trigger   Button (momentary, sends 1 on press)

Page 2: XY Performance
    /perf/xy         XY Pad (x=pan, y=reverb)
    /perf/motion     Accelerometer (tilt control)
```

#### Configuration

**Connection Setup**:
1. Open TouchOSC → **Connections**
2. Add OSC connection:
   - **Host**: Target IP (e.g., `192.168.1.100`)
   - **Port (outgoing)**: `8000`
   - **Port (incoming)**: `9000` (for bidirectional control)
3. Enable **Send Accelerometer** (if needed)

**Layout Editor**:
- **Desktop Editor**: Free download (Mac/Windows/Linux)
- **In-App Editor**: iOS 13+ (limited features)

**Control Types**:
- Faders (vertical/horizontal)
- Rotary knobs
- XY pads
- Multi-touch (multiple fingers)
- Buttons (momentary/toggle)
- Labels (display values)
- Multi-faders (arrays)
- LEDs (feedback indicators)

#### Advanced Features

**Bidirectional OSC**:
```javascript
// Send value from SuperSonic to TouchOSC (update fader position)
oscClient.send('/synth/amp', currentAmplitude);
```

**Scripting** (Lua):
```lua
-- TouchOSC script: Map fader to exponential frequency
function onValueChanged(key)
  if key == '/1/fader1' then
    local linear = getValue('/1/fader1')
    local freq = 20 * math.pow(1000, linear) -- 20Hz to 20kHz
    sendOSC('/synth/freq', freq)
  end
end
```

**Templates** (community layouts):
- Ableton Live, Logic Pro, Reaper templates
- Synth templates (Moog, Prophet, FM synthesis)
- MIDI controller emulation

#### Pros/Cons

**Advantages**:
- ✅ Professional-grade UI (highly customizable)
- ✅ Multi-touch (10+ simultaneous controls)
- ✅ Bidirectional OSC (feedback from DAW/synth)
- ✅ Scripting support (Lua for complex mappings)
- ✅ MIDI + OSC simultaneous
- ✅ Cross-platform (iOS/Android/desktop)

**Limitations**:
- ❌ Paid app ($14.99)
- ❌ Requires layout design upfront
- ❌ Learning curve (complex editor)

---

## 🚀 EXPORTATION

### Recommended App Selection Matrix

| Use Case | Recommended App | Rationale |
|----------|-----------------|-----------|
| **Wearable control (hands-free)** | PhyOSC | Apple Watch integration |
| **Gesture recognition (ML)** | MotionSender | Wekinator integration |
| **Precise parameter control** | TouchOSC | Multi-touch faders/knobs |
| **Rapid prototyping** | MotionSender | No layout design needed |
| **Production performance** | TouchOSC | Professional UI, bidirectional |
| **Budget-conscious** | PhyOSC / MotionSender | Free apps |

---

### Network Configuration

#### Wi-Fi Setup (Recommended)

**Requirements**:
- iOS device and computer on same Wi-Fi network
- No router firewall blocking UDP port 8000

**Find iOS Device IP**:
```
Settings → Wi-Fi → (i) icon → IP Address
Example: 192.168.1.42
```

**Find Computer IP**:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

**Firewall Rules** (if needed):
```bash
# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /path/to/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /path/to/node

# Linux (ufw)
sudo ufw allow 8000/udp

# Windows Firewall
# Control Panel → System and Security → Windows Defender Firewall
# → Advanced Settings → Inbound Rules → New Rule → Port → UDP 8000
```

#### USB Connection (Lower Latency)

**Not directly supported** by iOS apps (Wi-Fi only). Workaround:

```bash
# Forward iOS USB traffic to UDP (using pymobiledevice3)
pip install pymobiledevice3
pymobiledevice3 remote tunnel start
```

---

### OSC Receiver Implementation (Node.js)

**Bridge Server** (`osc-bridge.js`):
```javascript
const osc = require('osc');
const WebSocket = require('ws');

// UDP server (receive from iOS apps)
const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 8000,
  metadata: true // Include timetag + type info
});

// WebSocket server (forward to browser)
const wss = new WebSocket.Server({ port: 8080 });

udpPort.on('message', (oscMsg, timeTag, info) => {
  console.log(`[${oscMsg.address}]`, oscMsg.args);

  // Forward to all connected browsers
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        address: oscMsg.address,
        args: oscMsg.args.map(arg => arg.value),
        source: info.address // iOS device IP
      }));
    }
  });
});

udpPort.on('error', (err) => {
  console.error('OSC Error:', err);
});

udpPort.open();
console.log('OSC Bridge listening on UDP port 8000');
console.log('WebSocket server on port 8080');
```

**Run**:
```bash
npm install osc ws
node osc-bridge.js
```

---

### Browser Client (`motion-client.js`)

```javascript
const ws = new WebSocket('ws://localhost:8080');

// Connect to SuperSonic
import { SuperSonic } from './dist/supersonic.js';
const sonic = new SuperSonic({ /* config */ });
await sonic.init();

// Load synth
await sonic.loadSynthDefs(['sonic-pi-prophet']);
let currentNodeId = null;

// Smoothing filters
const smoothers = {
  freq: new Smoother(0.3),
  amp: new Smoother(0.5),
  cutoff: new Smoother(0.4)
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  const { address, args } = msg;

  // Route based on OSC address
  switch(address) {
    case '/gyrosc/attitude': {
      const [roll, pitch, yaw] = args;

      // Map roll (-π to π) to frequency (100-1000 Hz)
      const freq = expScale(roll, -Math.PI, Math.PI, 100, 1000);
      const smoothFreq = smoothers.freq.update(freq);

      // Map pitch to amplitude
      const amp = scale(pitch, -Math.PI/2, Math.PI/2, 0.0, 0.8);
      const smoothAmp = smoothers.amp.update(amp);

      if (currentNodeId) {
        sonic.send('/n_set', currentNodeId, 'freq', smoothFreq, 'amp', smoothAmp);
      }
      break;
    }

    case '/gyrosc/button':
      if (args[0] === 1) { // Button pressed
        // Trigger new synth
        currentNodeId = Math.floor(Math.random() * 10000);
        sonic.send('/s_new', 'sonic-pi-prophet', currentNodeId, 0, 0, 'note', 60);
      } else { // Button released
        sonic.send('/n_free', currentNodeId);
        currentNodeId = null;
      }
      break;

    case '/synth/trigger': // TouchOSC button
      if (args[0] === 1.0) {
        sonic.send('/s_new', 'sonic-pi-beep', -1, 0, 0, 'note', 60);
      }
      break;

    case '/synth/cutoff': // TouchOSC fader
      const cutoff = scale(args[0], 0, 1, 100, 8000);
      const smoothCutoff = smoothers.cutoff.update(cutoff);
      if (currentNodeId) {
        sonic.send('/n_set', currentNodeId, 'cutoff', smoothCutoff);
      }
      break;
  }
};

// Utility functions
function scale(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function expScale(value, inMin, inMax, outMin, outMax) {
  const normalized = (value - inMin) / (inMax - inMin);
  return outMin * Math.pow(outMax / outMin, normalized);
}

class Smoother {
  constructor(alpha = 0.3) {
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
```

---

## 📊 Sensor Data Characteristics

### Accelerometer

**Range**: -2g to +2g typical (can spike to ±8g with violent motion)
**Units**: Meters per second squared (m/s²)
**Noise**: ~0.01 m/s² (require smoothing)

**Axes** (iPhone flat on table, screen up):
- **X**: Left (-) to Right (+)
- **Y**: Bottom (-) to Top (+)
- **Z**: Down (-) to Up (+), gravity = +9.81 m/s²

### Gyroscope

**Range**: -2000°/s to +2000°/s (±35 rad/s)
**Units**: Radians per second (rad/s)
**Noise**: ~0.02 rad/s

**Axes**:
- **X**: Pitch (tilt forward/back)
- **Y**: Roll (tilt left/right)
- **Z**: Yaw (rotate flat)

### Attitude (Fused Sensor Data)

**Range**: -π to π radians (-180° to 180°)
**Units**: Radians
**Noise**: Low (Kalman-filtered by CoreMotion)

**Euler Angles**:
- **Roll**: Rotation around longitudinal axis (device tilt left/right)
- **Pitch**: Rotation around lateral axis (device tilt forward/back)
- **Yaw**: Rotation around vertical axis (compass direction)

---

## 🔗 Resources

### Official Documentation
- **PhyOSC**: https://phyosc.gridsystem.jp/howtouse.html
- **TouchOSC**: https://hexler.net/touchosc/manual
- **Wekinator**: http://www.wekinator.org/

### OSC Libraries
- **Node.js**: `osc` (https://github.com/colinbdclark/osc.js)
- **Python**: `python-osc` (https://pypi.org/project/python-osc/)
- **Browser**: Included in SuperSonic (`osc.js`)

### Community Templates
- **TouchOSC Community**: https://hexler.net/touchosc/community
- **Wekinator Examples**: http://www.wekinator.org/examples/

---

**Status**: ✅ Complete iOS app specification
**Next Steps**: Create motion-to-sound example implementations
