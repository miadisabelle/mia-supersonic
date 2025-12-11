# RISE Specification: SuperSonic Core Architecture

**Session ID**: 01530a36-0d32-4166-a715-19843ca6560f
**Created**: 2025-12-11
**Component**: SuperSonic WASM Audio Engine
**Purpose**: Reverse-engineered specification of SuperSonic's OSC-to-audio synthesis pipeline

---

## 🎯 INTENT

SuperSonic enables browser-based audio synthesis using SuperCollider's scsynth engine compiled to WebAssembly. This spec documents the architecture for receiving OSC commands (from web or external sources) and routing them to the audio synthesis engine with sample-accurate timing.

**Primary Use Cases**:
- Interactive web-based music applications
- Network-controlled synthesis (iOS motion → browser audio)
- Real-time parameter modulation via OSC
- Scheduled musical sequences with sub-millisecond precision

---

## 🔍 REVERSE ENGINEERING

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     External Sources                         │
│  (iOS Apps, TouchOSC, MotionSender, Network Controllers)    │
└───────────────────────┬─────────────────────────────────────┘
                        │ OSC over UDP/WebSocket/HTTP
                        ↓
┌─────────────────────────────────────────────────────────────┐
│               JavaScript API Layer (supersonic.js)          │
│  • send(address, ...args) - High-level API                  │
│  • sendOSC(oscBytes) - Low-level binary OSC                 │
│  • Message encoding via osc.js library                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
    Immediate?                    Scheduled?
         │                             │
         ↓                             ↓
┌─────────────────┐          ┌──────────────────────┐
│ Direct Write    │          │ Prescheduler Worker  │
│ Ring Buffer     │          │ (Priority Queue)     │
│ (Fast Path)     │          │ • Binary min-heap    │
└────────┬────────┘          │ • 25ms poll interval │
         │                   └──────────┬───────────┘
         │                              │
         └──────────────┬───────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│          SharedArrayBuffer Ring Buffer (768KB IN)           │
│  • Atomic operations (CAS locks, sequence tracking)         │
│  • Message header: magic + length + sequence + padding      │
│  • Lock-free multi-producer, single-consumer design         │
└───────────────────────┬─────────────────────────────────────┘
                        │ Every 128 samples (~2.7ms @ 48kHz)
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              WASM Audio Worklet (audio_processor.cpp)       │
│  • Dequeue messages from ring buffer                        │
│  • Validate (magic, sequence, length)                       │
│  • Route to scheduler or immediate execution                │
│  • Max 32 messages/frame (prevent audio dropout)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│            scsynth Engine (SuperCollider C++)               │
│  • Process OSC commands (/s_new, /n_set, /n_free, etc.)   │
│  • Manage synth nodes, groups, buffers                      │
│  • Generate audio samples (128 per frame)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
                Audio Output Bus → Browser Audio API
```

---

## 📋 SPECIFICATIONS

### Component Breakdown

#### 1. **Ring Buffer Communication** (`shared_memory.h`)

**Purpose**: Lock-free, multi-producer, single-consumer message queue between JavaScript and WASM.

**Structure**:
```cpp
// Constants
IN_BUFFER_SIZE:        768KB (786432 bytes)
OUT_BUFFER_SIZE:       128KB (OSC replies)
DEBUG_BUFFER_SIZE:     64KB  (debug messages)
MESSAGE_HEADER_SIZE:   16 bytes
MESSAGE_MAGIC:         0xDEADBEEF (validation marker)

// Message Header Layout (16 bytes)
struct Message {
    uint32_t magic;      // 0xDEADBEEF
    uint32_t length;     // Payload size in bytes
    uint32_t sequence;   // Monotonic counter for gap detection
    uint32_t padding;    // Reserved (alignment)
    uint8_t  data[];     // OSC payload (variable length)
};

// Control Pointers (Atomics in SharedArrayBuffer)
in_head:         Write position (JS main thread / prescheduler)
in_tail:         Read position (WASM audio worklet)
in_sequence:     Message counter (detect drops)
in_write_lock:   Spinlock (0=unlocked, 1=locked)
```

**Operations**:
- **Write**: Try-lock → CAS(0→1) → Write header + payload → Advance head → Unlock → Store(0)
- **Read**: Load tail → Validate magic/sequence → Parse → Advance tail
- **Overflow Handling**: Drop message, increment `messages_dropped` metric

---

#### 2. **Message Routing Pathways**

##### Path A: Direct Ring Buffer Write (Fast Path)
**Conditions**:
- Non-bundle messages
- Bundles with timetag 0 or 1 (immediate)
- Bundles within 200ms lookahead

**Flow**:
```javascript
// supersonic.js:930-932
if (shouldBypassPrescheduler(data) && tryDirectWrite(data)) {
  metrics.preschedulerBypassed++;
  return; // Message written directly to ring buffer
}
```

**Latency**: ~0-5ms (depends on contention)

##### Path B: Prescheduler Worker (Scheduled Path)
**Conditions**:
- Bundles with future NTP timestamps (> now + 200ms)

**Components**:
- **Worker**: `osc_out_prescheduler_worker.js`
- **Data Structure**: Binary min-heap (priority queue sorted by timetag)
- **Poll Interval**: 25ms
- **Max Scheduled Events**: 512 slots × 1024 bytes = 512KB

**Flow**:
```javascript
// Worker polls every 25ms
while (queue.peek().time <= currentTime + 200ms) {
  const bundle = queue.pop();
  writeToRingBuffer(bundle);
}
```

**Features**:
- Tag-based cancellation (cancel scheduled events by ID)
- Retry queue (if ring buffer full)
- Sample-accurate timing via NTP timestamps

---

#### 3. **WASM Audio Worklet Processing** (`audio_processor.cpp:402-600`)

**Execution Context**: Real-time audio thread (highest priority)

**Per-Frame Loop** (128 samples, ~2.7ms @ 48kHz):
```cpp
1. Load in_head, in_tail (atomic)
2. While (in_head != in_tail && messages_this_frame < 32):
   a. Read message header
   b. Validate magic number (0xDEADBEEF)
   c. Check sequence (detect gaps)
   d. Validate length (<= MAX_MESSAGE_SIZE)
   e. Parse OSC (bundle vs message)
   f. If bundle with future timetag:
        → Add to C++ BundleScheduler
      Else:
        → Execute immediately via scsynth
   g. Advance in_tail (atomic)
3. Process audio (scsynth → output bus)
4. Flush scheduled bundles (if time reached)
```

**Constraints**:
- **No malloc**: Fixed memory pool
- **No I/O**: All communication via SharedArrayBuffer
- **No threads**: Single-threaded execution
- **Max 32 messages/frame**: Prevent audio glitches

---

#### 4. **OSC Command Reference**

| Command | Purpose | Arguments |
|---------|---------|-----------|
| `/s_new` | Create + play synth | `synthdef_name, node_id, add_action, target_id, param1, val1, ...` |
| `/n_set` | Set synth parameters | `node_id, param_name, value, [...]` |
| `/n_free` | Stop synth | `node_id` |
| `/g_new` | Create group | `group_id, add_action, target_id` |
| `/d_recv` | Load synthdef | `synthdef_bytes` (binary blob) |
| `/b_allocPtr` | Allocate audio buffer | `buffer_id, frames, channels` |
| `/b_setn` | Fill buffer samples | `buffer_id, offset, [values...]` |
| `/notify` | Enable notifications | `1` (on) or `0` (off) |

**Example**:
```javascript
// Load synthdef first
await sonic.loadSynthDef('sonic-pi-prophet');

// Trigger synth
sonic.send('/s_new', 'sonic-pi-prophet', -1, 0, 0, 'note', 60, 'amp', 0.5);

// Modulate parameters
sonic.send('/n_set', 1000, 'freq', 440.0, 'resonance', 0.8);

// Stop synth
sonic.send('/n_free', 1000);
```

---

#### 5. **Type System (OSC.js Encoding)**

**Auto-detection** (`supersonic.js:850-900`):
```javascript
function encodeValue(value) {
  if (Number.isInteger(value)) return { type: 'i', value };  // Int32
  if (typeof value === 'number') return { type: 'f', value }; // Float32
  if (typeof value === 'string') return { type: 's', value }; // String
  if (value instanceof Uint8Array) return { type: 'b', value }; // Blob
  throw new Error(`Unsupported type: ${typeof value}`);
}
```

**Type Tags**:
- `i`: 32-bit integer
- `f`: 32-bit float
- `s`: Null-terminated string
- `b`: Binary blob (length-prefixed)

---

#### 6. **Performance Metrics**

**Available via** `sonic.getMetrics()`:
```javascript
{
  mainMessagesSent: Number,       // Total messages sent from JS
  mainBytesSent: Number,          // Total payload bytes
  preschedulerPending: Number,    // Current scheduled events
  preschedulerPeak: Number,       // Max scheduled events (watermark)
  workletProcessCount: Number,    // Audio frames processed
  messagesProcessed: Number,      // Total OSC messages handled
  messagesDropped: Number,        // Lost messages (overflow)
  sequenceGaps: Number,           // Detected sequence discontinuities
  statusFlags: Number             // Bitmask (fragmented, overflow, etc.)
}
```

---

## 🚀 EXPORTATION

### Integration Patterns

#### Pattern A: Web-Only (Direct JavaScript)
```javascript
import { SuperSonic } from './dist/supersonic.js';

const sonic = new SuperSonic({
  workerBaseURL: './dist/workers/',
  wasmBaseURL: './dist/wasm/',
  synthdefBaseURL: 'https://unpkg.com/supersonic-scsynth-synthdefs@latest/synthdefs/',
  sampleBaseURL: 'https://unpkg.com/supersonic-scsynth-samples@latest/samples/'
});

await sonic.init();
await sonic.loadSynthDefs(['sonic-pi-beep', 'sonic-pi-prophet']);

// Immediate trigger
sonic.send('/s_new', 'sonic-pi-beep', -1, 0, 0, 'note', 60);

// Scheduled bundle (1 second in future)
const ntpTime = sonic.currentNTPTime() + 1.0;
const bundle = sonic.createBundle(ntpTime, [
  { address: '/s_new', args: ['sonic-pi-beep', -1, 0, 0, 'note', 60] },
  { address: '/s_new', args: ['sonic-pi-beep', -1, 0, 0, 'note', 64] }
]);
sonic.sendOSC(bundle);
```

#### Pattern B: External OSC Bridge (iOS → Browser)

**Architecture**:
```
iOS App (MotionSender/PhyOSC)
    ↓ OSC over UDP (port 8000)
Node.js Bridge Server
    ↓ WebSocket or HTTP POST
Browser (SuperSonic)
```

**Bridge Server** (`bridge-server.js`):
```javascript
const osc = require('osc');
const WebSocket = require('ws');

// UDP server (receive from iOS)
const udpPort = new osc.UDPPort({ localPort: 8000 });

// WebSocket server (send to browser)
const wss = new WebSocket.Server({ port: 8080 });

udpPort.on('message', (oscMsg) => {
  // Forward to all connected browsers
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(oscMsg));
    }
  });
});

udpPort.open();
```

**Browser Client** (`motion-receiver.js`):
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const oscMsg = JSON.parse(event.data);

  // Forward to SuperSonic
  sonic.send(oscMsg.address, ...oscMsg.args);
};
```

#### Pattern C: HTTP Polling (Simpler, Higher Latency)

**iOS sends HTTP POST**:
```javascript
// iOS app (JavaScript bridge)
fetch('http://laptop.local:3000/osc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: '/n_set', args: [1000, 'freq', 440.0] })
});
```

**Express server** forwards to browser via Server-Sent Events or WebSocket.

---

### File Locations Reference

| Component | Path |
|-----------|------|
| Main API | `/js/supersonic.js` |
| Shared Memory Layout | `/src/shared_memory.h` |
| Audio Processor | `/src/audio_processor.cpp` |
| Ring Buffer Writer | `/js/lib/ring_buffer_writer.js` |
| Prescheduler Worker | `/js/workers/osc_out_prescheduler_worker.js` |
| OSC In Worker | `/js/workers/osc_in_worker.js` |
| Bundle Scheduler | `/src/scheduler/BundleScheduler.h` |
| Demo Example | `/example/demo.html` |
| Demo App Logic | `/example/assets/app.js` |

---

### Build Requirements

**Emscripten Flags** (from `build.sh:90-138`):
```bash
emcc audio_processor.cpp [sources...] \
  -sSTANDALONE_WASM \
  -pthread \
  -sINITIAL_MEMORY=<FIXED_MEMORY> \
  -sALLOW_MEMORY_GROWTH=0 \
  -Wl,--import-memory,--shared-memory \
  -O3 -flto -msimd128 -fwasm-exceptions \
  -o dist/wasm/scsynth-nrt.wasm
```

**Critical Flags**:
- `--import-memory,--shared-memory`: Enable SharedArrayBuffer
- `-sALLOW_MEMORY_GROWTH=0`: Fixed memory (required for SharedArrayBuffer)
- `-pthread`: Enable atomics/wait/notify
- `-sSTANDALONE_WASM`: No JS glue code

**Runtime Requirements**:
- **Headers**: `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
- **Browser**: Chrome/Edge 92+, Firefox 89+, Safari 16.4+
- **Node.js**: v16+ (for build scripts)

---

## 🎼 Motion-to-Sound Mapping Guidelines

### iOS Sensor → OSC Parameter Mappings

| Sensor | Range | OSC Parameter | Synth Effect |
|--------|-------|---------------|--------------|
| **Accelerometer X** | -1.0 to 1.0 | `pan` | Stereo position |
| **Accelerometer Y** | -1.0 to 1.0 | `amp` | Volume (tilt up = louder) |
| **Accelerometer Z** | -1.0 to 1.0 | `cutoff` | Filter brightness |
| **Gyroscope Roll** | -π to π | `freq` | Pitch (rotation = frequency sweep) |
| **Gyroscope Pitch** | -π to π | `resonance` | Filter emphasis |
| **Gyroscope Yaw** | -π to π | `detune` | Chorus/phase effect |
| **Altitude** | 0-2 meters | `reverb` | Spatial depth |
| **Gesture: Shake** | Threshold | Trigger `/s_new` | New note/sound |

### Scaling Functions

```javascript
// Linear scaling
function scale(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

// Exponential (better for frequency)
function expScale(value, inMin, inMax, outMin, outMax) {
  const normalized = (value - inMin) / (inMax - inMin);
  return outMin * Math.pow(outMax / outMin, normalized);
}

// Smoothing (prevent jitter)
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

## 📦 Dependencies

**Runtime**:
- `osc.js`: OSC encoding/decoding (bundled)
- `SharedArrayBuffer`: Browser API (requires secure context + headers)
- `AudioWorklet`: Web Audio API

**Build**:
- `emscripten`: C++ to WASM compiler
- `esbuild`: JavaScript bundler
- `node.js`: Build scripts

**External**:
- SuperCollider synthdefs (`.scsyndef` files)
- Audio samples (`.flac`, `.wav` files)

---

## 🔗 References

- SuperCollider OSC Communication: https://doc.sccode.org/Reference/Server-Command-Reference.html
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- SharedArrayBuffer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- OSC 1.0 Specification: http://opensoundcontrol.org/spec-1_0

---

**Status**: ✅ Complete reverse-engineering specification
**Next Steps**: Implement motion-to-sound examples using this architecture
