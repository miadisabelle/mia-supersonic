#!/bin/bash
. _env.sh
export SESSION_ID=01530a36-0d32-4166-a715-19843ca6560f
export session_id__ExploSupersonicOSC_2512102052
export session_id__ExploSupersonicOSC_2512102052__MCP_CONFIG
export session_id__ExploSupersonicOSC_2512102052__ADD_DIR
claude "this was just forked, I want to have fun and I think that it would be possible to have some music playing using my iPhone that sends OSC signal.  I never used this whole package.  knowing we have the RISE Framework, it might be relevant to create ./rispecs for some of the components/service/package/service/libraries or whatever that you find to make this happen.  I am expecting to be capable to sends specific signals like some sound when I rotate by phone, some other when I lift it up and down, something when I accelerate or something like that.

AS END-RESULTS:

* You do a ./rispecs/<....> (so in the future we would be capable to borrow from this full package we forked (either to implement and use what we found to use to use in our own project (as installed package that we use or to re-implement it our ways).  key this simple
* You have made me 1-2 examples based on what I asked you to explore for me in such a way that I am capable to have fun with it.
* You would keep memories in your CLAUDE.md and carefully and probably choose to create some additional ./rispecs/ that are related to master the different apps I have defined in my 'FACTS' section (TouchOSC, MotionSender, Wekinator) and as we progress, we will want probably some new specs about what we do with  via Open Sound Control (OSC).
* A new MCP (or many) that would be dedicated to inform other future sessions of terminal agents such as yourself of what we have accomplished.  The goal of this will be to expose tools/resources/prompts that would make creating more of what is implied in this huge aspiration here to re-iterate (ex.  Simple resources that informs on the various apps I have and how to use them', 'prompts that enable an understanding of what we created and make any new LLM session to be capable to fill in variables and jump into the current state we have achieved', 'tools to guide the setting up of everything needed for the musical and fun session (ex.  start the iOS PHyOSC (or MotionSender with Wekinator) etc etc then do this and that') - this whole thing here would ensure that as you work, everything that you generate will be used for later work.

-----
FACTS
-----
## I have on iOS apps:  
### TouchOSC for iOS 
#### which is : 
* 'a highly customizable app turning your iPhone or iPad into a powerful wireless control surface for music software (DAWs, synths) and hardware, using Open Sound Control (OSC) & MIDI protocols over Wi-Fi or USB. You design custom interfaces with faders, knobs, XY pads, and more using the free TouchOSC Editor on your computer, then sync them to your device to control virtually anything that understands OSC or MIDI, offering deep integration for your creative workflow. '

### PhyOSC - Physical OSC Transmitter
which is :
* 'PhyOSC is an iPhone app that uses OSC to control a DAW connected to the network through the movement of the Apple Watch.'
* more: https://phyosc.gridsystem.jp/howtouse.html

### MotionSender for iOS 
#### which is 
* 'MotionSender is an iOS app that captures your iPhone's motion data (accelerometer, gyroscope, attitude) and sends it via Open Sound Control (OSC) to software like the Wekinator, making it easy to create interactive art, music, or games using gestures and physical movement. It's a bridge for artists and developers to control other applications with their phone's motion, turning simple tilts and shakes into powerful inputs for creative projects. ￼'

#### How it Works:
1. Data Collection: The app uses your phone's built-in sensors to gather movement data.
2. OSC Transmission: It packages this data and sends it wirelessly over a local network using the OSC protocol.
3. Wekinator Integration: Wekinator (free machine learning software) receives this data, allowing you to map physical movements to computer responses without complex coding. 

----
ORGANIZATION of DATA during our conversation
----
* Our SessionID is $SESSION_ID which could be used to create a space to work on drafting what we would create, maybe in ./rispecs/$SESSION_ID/ ( I dont want that to become a place where you store other files that are making it a wasteland with status, implementation and whatever, that would just be for meaningful specs...)  We would have another directory for that in ./workdir-$SESSION_ID/

-----
Analyze carefully the whole sets of Milestone there is within this complex request.

" --mcp-config $session_id__ExploSupersonicOSC_2512102052__MCP_CONFIG --add-dir $session_id__ExploSupersonicOSC_2512102052__ADD_DIR --session-id $session_id__ExploSupersonicOSC_2512102052 \
	--model sonnet

#--permission-mode plan
