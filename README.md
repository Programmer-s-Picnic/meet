# Learn With Champak Meet

A lightweight **1-to-1 WebRTC meeting app** designed for Learn With Champak and hosted as a static GitHub Pages site.

## Features

- Camera and microphone
- Mute/unmute
- Camera on/off
- Screen sharing
- Peer-to-peer audio/video
- Peer-to-peer text chat
- Responsive mobile/desktop interface
- No application backend
- Manual WebRTC offer/answer exchange

## How to use

1. Both teacher and student open the site and press **Start Camera**.
2. The teacher presses **Create Meeting Offer** and sends the generated text to the student.
3. The student pastes the offer and presses **Create Answer**.
4. The student sends the answer back to the teacher.
5. The teacher pastes the answer and presses **Connect Using Answer**.

## GitHub Pages

The app consists only of static HTML, CSS, and JavaScript, so it can be served directly from GitHub Pages.

## Networking note

The page uses the public STUN endpoint `stun:stun.l.google.com:19302` to assist WebRTC peer discovery. Audio/video is intended to travel directly between the two browsers. Some restrictive networks cannot establish a direct connection and would require a TURN relay server.

## Next upgrades

- QR-based offer/answer exchange
- Compact meeting codes
- Participant names
- Better classroom layout
- Optional signalling service for one-click joining
