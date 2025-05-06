# 🌱 Synth Garden

Synth Garden is an interactive visual and auditory experience that simulates the growth of a digital plant using real-time data from a potentiometer connected to an Arduino. It features animated visuals in p5.js, sound synthesis with Tone.js, and serial communication via Node.js.

## Features

- Live hardware input through Arduino
- Real-time plant growth animation
- Flashing LED's corresponding to the plant's distance from the sun 
- Dynamic sound based on environmental conditions
- Win/lose state tracking and ambiance

## How it Works

1. User Input: A potentiometer connected to an Arduino reads analog light input.
2. Serial Communication: Arduino sends sensor data via USB to a Node.js server (server.js).
3. p5.js Display: The sketch in sketch.js renders plant growth, background, and visual effects based on sensor data.
4. Sound Feedback: Ambient tones and reactive sound play based on plant health status using Tone.js logic embedded in the sketch.


## How to Run

1. Start the Arduino with `pdmfinalproj.ino` uploaded.
2. Run `node server.js` to start the serial server.
3. Open `index.html` in a browser or host with GitHub Pages.

## Future Enhancements

- Multiplayer garden sync and difficulty levels 
- Seasonal visual changes
- More sounds for different actions
- Maybe the ability to control more than one plant 

## Unlisted Youtube Video of the project

https://youtu.be/19cs-EK8v88



