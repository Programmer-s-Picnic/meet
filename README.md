# Learn With Champak Meet

A static, GitHub Pages-ready **audio-first 1-to-1 WebRTC meeting app**.

## Current design

Camera is not required. The app supports microphone audio, screen sharing, available tab/system sound, chat, and a permission-based remote pointer.

## Invite-link joining

The host no longer sends a raw WebRTC invite code.

1. Host presses **Start Meeting**.
2. The app creates a clickable **invite link**.
3. Host presses **Send on WhatsApp**. WhatsApp opens with the meeting message and link already filled in; the host chooses the student/contact and sends it.
4. Guest opens the link and sees **Join This Meeting**.
5. Guest presses it and sends the generated reply code back to the host.
6. Host pastes the reply code and presses **Connect**.

The WebRTC offer is placed in the URL fragment after `#invite=`. The fragment is processed by the browser and is not sent to GitHub Pages as part of the HTTP request.

The host must keep the original meeting tab open because the invite link represents the live WebRTC offer created by that tab.

A reply code is still required in this pure-GitHub version. Eliminating the return step entirely would require a signalling/rendezvous service.

## Features

- Clickable invite link
- **Send on WhatsApp** button with a pre-filled meeting message
- **Send Reply on WhatsApp** button for the guest's return code
- Web Share API button where supported
- Microphone sound, mute/unmute
- Meeting still usable when microphone permission is denied
- Receive remote audio
- Screen sharing
- Requests available tab/system audio
- Text chat
- Permission-based remote pointer
- No application backend
- GitHub Pages compatible

## Screen sound

The app requests `getDisplayMedia({ video: true, audio: true })`. Whether system sound is supplied depends on browser, operating system, and the selected share source. Sharing a browser tab in Chrome is commonly the most reliable route for tab audio.

## Remote control limitation

A normal webpage cannot inject trusted mouse or keyboard input into another desktop application. The pure GitHub version therefore provides a remote pointer. Full desktop control would require a separately installed native helper.

## Networking

The app uses `stun:stun.l.google.com:19302` for WebRTC peer discovery. Some restrictive networks still require a TURN relay server.


## WhatsApp behavior

The website uses WhatsApp's share URL with a pre-filled message. A normal web page cannot silently send a WhatsApp message on the user's behalf: WhatsApp still requires the user to choose a recipient (or chat) and press Send. This keeps sending under the user's control.
