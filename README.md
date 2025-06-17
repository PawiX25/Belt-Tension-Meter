# 3D Printer Belt Tension Meter

A simple, browser-based tool to help you accurately tension the belts on your 3D printer using your device's microphone.

## Why I Made This

When I was tensioning the belts on my Prusa Core 3D printer, I ran into a frustrating problem: none of the existing tools seemed to work for me. The official Prusa app wasn't compatible with my phone, and the web-based solutions I found gave strange and unreliable readings, often showing bizarre values like `--121Hz`.

I needed a straightforward, reliable tool that just worked. So, I built this.

This project is a simple, no-fuss belt tension meter that runs directly in your web browser. It listens to the sound of your belt being plucked and provides a clear frequency reading, helping you dial in the perfect tension.


## Features

*   **Real-time Frequency Analysis:** Get instant feedback as you adjust your belts.
*   **Visual Gauge:** A simple visual indicator helps you see if the tension is too loose, too tight, or just right.
*   **No Installation Needed:** Runs entirely in your browser.
*   **Simple & Clean UI:** No distractions, just the information you need.

## Technical Details

The tool uses the Web Audio API to access your microphone and analyze the incoming audio stream. It performs a frequency analysis to find the fundamental frequency of the sound produced when you pluck the belt.
