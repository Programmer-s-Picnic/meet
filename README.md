# Learn With Champak Meet

A static, GitHub Pages-ready **audio-first 1-to-1 WebRTC meeting app**.

## Current design

Camera has been removed from the joining flow. A meeting can be created or joined with microphone audio only, and it still continues if microphone permission is denied.

### Features

- Microphone sound, with mute/unmute
- Receive remote sound
- Screen sharing
- Requests available tab/system audio while screen sharing
- Text chat over a WebRTC data channel
- Simple Host / Join wizard
- Permission-based remote pointer on the shared-screen preview
- No application backend
- GitHub Pages compatible

## Joining

### Host

1. Select **Start a Meeting**.
2. Press **Start Meeting**.
3. Send the generated invite code.
4. Receive the reply code.
5. Paste the reply and press **Connect**.

### Guest

1. Select **Join a Meeting**.
2. Paste the invite code.
3. Press **Join Meeting**.
4. Send the generated reply code back to the host.
5. Keep the page open until connected.

The small two-way code exchange is still required because GitHub Pages cannot run a rendezvous/signalling server.

## Screen sound

The app calls `getDisplayMedia({ video: true, audio: true })` and requests available system/tab audio. Whether system sound is actually supplied depends on the browser, operating system, and the share source selected by the user. In Chrome, sharing a browser tab is commonly the most reliable way to include tab audio.

## Remote control limitation

A normal web page is not permitted to inject trusted mouse or keyboard input into another application or the operating system. Therefore a pure GitHub Pages site cannot provide Zoom-style full desktop remote control.

This version implements an explicit request/allow **remote pointer** channel. The remote participant can point and click on the shared-screen preview so the sharer can see exactly where they are referring to.

True mouse/keyboard control of the desktop would require a separately installed desktop helper/native application. That helper can still use this WebRTC data channel for control messages.

## Networking

The app uses:

`stun:stun.l.google.com:19302`

STUN assists peer discovery; it does not host the page or store the meeting. Some restrictive networks still require a TURN relay server.
