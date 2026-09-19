const $=id=>document.getElementById(id);
const statusEl=$("status"),joinCard=$("joinCard"),meeting=$("meeting");
const hostTab=$("hostTab"),guestTab=$("guestTab"),hostPanel=$("hostPanel"),guestPanel=$("guestPanel"),modeTabs=$("modeTabs");
const joinHeading=$("joinHeading"),joinSubheading=$("joinSubheading");
const startHostBtn=$("startHostBtn"),hostStep1=$("hostStep1"),hostStep2=$("hostStep2"),inviteLink=$("inviteLink"),copyInviteBtn=$("copyInviteBtn"),shareInviteBtn=$("shareInviteBtn"),replyInput=$("replyInput"),finishHostBtn=$("finishHostBtn");
const guestInviteInput=$("guestInviteInput"),guestManualBox=$("guestManualBox"),linkedInviteBox=$("linkedInviteBox"),joinBtn=$("joinBtn"),guestReplyBox=$("guestReplyBox"),guestReplyCode=$("guestReplyCode"),copyReplyBtn=$("copyReplyBtn");
const remoteVideo=$("remoteVideo"),remoteEmpty=$("remoteEmpty"),localShareBox=$("localShareBox"),localShareVideo=$("localShareVideo");
const micBtn=$("micBtn"),shareBtn=$("shareBtn"),playSoundBtn=$("playSoundBtn"),requestControlBtn=$("requestControlBtn"),hangupBtn=$("hangupBtn");
const controlRequest=$("controlRequest"),allowControlBtn=$("allowControlBtn"),denyControlBtn=$("denyControlBtn"),remotePointer=$("remotePointer"),remoteControlBadge=$("remoteControlBadge");
const messages=$("messages"),chatInput=$("chatInput"),sendBtn=$("sendBtn");

let pc=null,micStream=null,micTrack=null,screenStream=null,remoteStream=null,dataChannel=null;
let screenVideoSender=null,screenAudioSender=null,primaryAudioSender=null;
let micEnabled=true,canSendPointer=false,allowPointer=false,isHost=false;
let inviteFromLink="";

const rtcConfig={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};

function setStatus(text,mode=""){statusEl.textContent=text;statusEl.className="status"+(mode?" "+mode:"")}
function showMeeting(){joinCard.classList.add("hidden");meeting.classList.remove("hidden")}
function systemMessage(text){const p=document.createElement("p");p.className="system";p.textContent=text;messages.appendChild(p);messages.scrollTop=messages.scrollHeight}
function chatMessage(text,me=false){const p=document.createElement("p");p.className="msg"+(me?" me":"");p.textContent=(me?"You: ":"Peer: ")+text;messages.appendChild(p);messages.scrollTop=messages.scrollHeight}

function selectHost(){
  hostTab.classList.add("active");guestTab.classList.remove("active");
  hostPanel.classList.add("active");guestPanel.classList.remove("active");
}
function selectGuest(){
  guestTab.classList.add("active");hostTab.classList.remove("active");
  guestPanel.classList.add("active");hostPanel.classList.remove("active");
}
hostTab.onclick=selectHost;
guestTab.onclick=selectGuest;

function loadInviteFromUrl(){
  const hash=location.hash.startsWith("#")?location.hash.slice(1):location.hash;
  const params=new URLSearchParams(hash);
  const raw=params.get("invite");
  if(!raw)return;
  try{
    inviteFromLink=decodeURIComponent(raw);
    decode(inviteFromLink);
    guestInviteInput.value=inviteFromLink;
    selectGuest();
    modeTabs.classList.add("hidden");
    guestManualBox.classList.add("hidden");
    linkedInviteBox.classList.remove("hidden");
    joinHeading.textContent="You are invited";
    joinSubheading.textContent="Learn With Champak Meet • Audio and screen sharing";
    joinBtn.textContent="Join This Meeting";
    setStatus("Invite received");
  }catch{
    inviteFromLink="";
    setStatus("Invalid invite");
  }
}

async function getMicrophone(){
  if(micStream)return;
  try{
    micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    micTrack=micStream.getAudioTracks()[0]||null;
    micBtn.textContent=micTrack?"Mute":"Mic unavailable";
  }catch(e){
    micStream=null;micTrack=null;micBtn.textContent="Mic unavailable";micBtn.disabled=true;
    systemMessage("Microphone was not enabled. You can still receive sound and share your screen.");
  }
}

function setupPeer(){
  if(pc)pc.close();
  pc=new RTCPeerConnection(rtcConfig);
  remoteStream=new MediaStream();
  remoteVideo.srcObject=remoteStream;

  if(micTrack)primaryAudioSender=pc.addTrack(micTrack,micStream);
  else primaryAudioSender=pc.addTransceiver("audio",{direction:"sendrecv"}).sender;

  screenVideoSender=pc.addTransceiver("video",{direction:"sendrecv"}).sender;
  screenAudioSender=pc.addTransceiver("audio",{direction:"sendrecv"}).sender;

  pc.ontrack=e=>{
    if(!remoteStream.getTracks().some(t=>t.id===e.track.id))remoteStream.addTrack(e.track);
    if(e.track.kind==="video"){
      remoteEmpty.classList.add("hidden");
      requestControlBtn.disabled=false;
    }
    remoteVideo.play().catch(()=>{playSoundBtn.textContent="Click to Play Sound"});
  };
  pc.ondatachannel=e=>{dataChannel=e.channel;bindDataChannel()};
  pc.onconnectionstatechange=refreshConnection;
  pc.oniceconnectionstatechange=refreshConnection;
}

function refreshConnection(){
  if(!pc)return;
  const s=pc.connectionState||pc.iceConnectionState;
  if(s==="connected"||s==="completed"){
    setStatus("Connected","connected");
    showMeeting();
    if(location.hash)history.replaceState(null,"",location.pathname+location.search);
  }else if(["new","checking","connecting"].includes(s))setStatus("Connecting…","connecting");
  else if(["failed","disconnected","closed"].includes(s))setStatus(s[0].toUpperCase()+s.slice(1));
}

function bindDataChannel(){
  if(!dataChannel)return;
  dataChannel.onopen=()=>{
    chatInput.disabled=false;sendBtn.disabled=false;
    systemMessage("Private chat/control channel connected.");
  };
  dataChannel.onclose=()=>{chatInput.disabled=true;sendBtn.disabled=true;canSendPointer=false;requestControlBtn.disabled=true};
  dataChannel.onmessage=e=>{
    let packet;
    try{packet=JSON.parse(e.data)}catch{packet={type:"chat",text:e.data}}
    if(packet.type==="chat")chatMessage(packet.text);
    if(packet.type==="control-request")controlRequest.classList.remove("hidden");
    if(packet.type==="control-granted"){
      canSendPointer=true;remoteControlBadge.textContent="Remote pointer enabled";remoteControlBadge.classList.remove("hidden");
      requestControlBtn.textContent="Remote Pointer Active";systemMessage("Remote pointer permission granted.");
    }
    if(packet.type==="control-denied"){canSendPointer=false;requestControlBtn.textContent="Request Remote Pointer";systemMessage("Remote pointer request was declined.")}
    if(packet.type==="control-revoked"){canSendPointer=false;requestControlBtn.textContent="Request Remote Pointer";remoteControlBadge.classList.add("hidden");systemMessage("Remote pointer permission ended.")}
    if(packet.type==="pointer"&&allowPointer)showRemotePointer(packet);
  };
}

function sendPacket(packet){if(dataChannel?.readyState==="open")dataChannel.send(JSON.stringify(packet))}
function encode(desc){return btoa(unescape(encodeURIComponent(JSON.stringify(desc))))}
function decode(text){return JSON.parse(decodeURIComponent(escape(atob(text.trim()))))}
function waitForIce(){
  if(pc.iceGatheringState==="complete")return Promise.resolve();
  return new Promise(resolve=>{
    const done=()=>{if(pc.iceGatheringState==="complete"){pc.removeEventListener("icegatheringstatechange",done);resolve()}};
    pc.addEventListener("icegatheringstatechange",done);
  });
}

function makeInviteLink(offer){
  const base=location.href.split("#")[0];
  return base+"#invite="+encodeURIComponent(offer);
}

async function startHost(){
  startHostBtn.disabled=true;setStatus("Preparing audio…","connecting");isHost=true;
  await getMicrophone();
  try{
    setupPeer();
    dataChannel=pc.createDataChannel("meet-data");bindDataChannel();
    await pc.setLocalDescription(await pc.createOffer());
    setStatus("Creating invite link…","connecting");
    await waitForIce();
    const offer=encode(pc.localDescription);
    inviteLink.value=makeInviteLink(offer);
    hostStep1.classList.add("hidden");hostStep2.classList.remove("hidden");
    setStatus("Invite link ready");
  }catch(e){
    startHostBtn.disabled=false;setStatus("Ready");
    alert("Could not start meeting: "+e.message);
  }
}

async function joinMeeting(){
  const invite=inviteFromLink||guestInviteInput.value.trim();
  if(!invite)return alert("Open an invite link or paste the invite data first.");
  joinBtn.disabled=true;setStatus("Preparing audio…","connecting");isHost=false;
  await getMicrophone();
  try{
    setupPeer();
    await pc.setRemoteDescription(decode(invite));
    await pc.setLocalDescription(await pc.createAnswer());
    setStatus("Creating reply…","connecting");
    await waitForIce();
    guestReplyCode.value=encode(pc.localDescription);
    guestReplyBox.classList.remove("hidden");
    joinBtn.classList.add("hidden");
    linkedInviteBox.classList.add("hidden");
    setStatus("Send reply code to host");
  }catch(e){
    joinBtn.disabled=false;setStatus("Invite error");
    alert("This invite link could not be used. Ask the host to create a new meeting link.\n\n"+e.message);
  }
}

async function finishHost(){
  if(!replyInput.value.trim())return alert("Paste the reply code first.");
  try{
    await pc.setRemoteDescription(decode(replyInput.value));
    setStatus("Connecting…","connecting");
    showMeeting();
  }catch(e){
    alert("That reply code could not be used. Make sure it was copied completely.\n\n"+e.message);
  }
}

async function copyTextValue(value,btn){
  try{
    await navigator.clipboard.writeText(value);
    const old=btn.textContent;btn.textContent="Copied!";
    setTimeout(()=>btn.textContent=old,1200);
  }catch{
    const temp=document.createElement("textarea");
    temp.value=value;document.body.appendChild(temp);temp.select();document.execCommand("copy");temp.remove();
  }
}

async function shareInvite(){
  const url=inviteLink.value;
  if(!url)return;
  if(navigator.share){
    try{
      await navigator.share({title:"Learn With Champak Meet",text:"Join my Learn With Champak meeting",url});
      return;
    }catch(e){
      if(e.name==="AbortError")return;
    }
  }
  await copyTextValue(url,shareInviteBtn);
}

function toggleMic(){
  if(!micTrack)return;
  micEnabled=!micEnabled;micTrack.enabled=micEnabled;micBtn.textContent=micEnabled?"Mute":"Unmute";
}

async function shareScreen(){
  if(screenStream)return stopSharing();
  try{
    screenStream=await navigator.mediaDevices.getDisplayMedia({
      video:true,audio:true,systemAudio:"include",surfaceSwitching:"include",selfBrowserSurface:"exclude"
    });
    const v=screenStream.getVideoTracks()[0],a=screenStream.getAudioTracks()[0];
    await screenVideoSender.replaceTrack(v);
    if(a)await screenAudioSender.replaceTrack(a);
    localShareVideo.srcObject=screenStream;
    localShareBox.classList.remove("hidden");
    shareBtn.textContent="Stop Sharing";
    v.onended=stopSharing;
    if(!a)systemMessage("Screen shared. No system/tab audio track was provided by the browser for this share source.");
    else systemMessage("Screen and available share audio are being sent.");
  }catch(e){if(e.name!=="NotAllowedError")alert("Screen sharing failed: "+e.message)}
}

async function stopSharing(){
  if(!screenStream)return;
  screenStream.getTracks().forEach(t=>t.stop());
  screenStream=null;
  await screenVideoSender?.replaceTrack(null);
  await screenAudioSender?.replaceTrack(null);
  localShareVideo.srcObject=null;localShareBox.classList.add("hidden");shareBtn.textContent="Share Screen + Sound";
  if(allowPointer){allowPointer=false;remotePointer.classList.add("hidden");sendPacket({type:"control-revoked"})}
}

function requestPointer(){
  if(dataChannel?.readyState!=="open")return alert("The control channel is not connected yet.");
  sendPacket({type:"control-request"});requestControlBtn.textContent="Pointer Requested…";
}
allowControlBtn.onclick=()=>{allowPointer=true;controlRequest.classList.add("hidden");sendPacket({type:"control-granted"});systemMessage("Remote pointer allowed. You can revoke it by stopping screen sharing or hanging up.")};
denyControlBtn.onclick=()=>{allowPointer=false;controlRequest.classList.add("hidden");sendPacket({type:"control-denied"})};

function pointerPacket(e,action){
  if(!canSendPointer||!remoteEmpty.classList.contains("hidden"))return;
  const r=remoteVideo.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
  const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
  sendPacket({type:"pointer",x,y,action});
}
remoteVideo.addEventListener("pointermove",e=>pointerPacket(e,"move"));
remoteVideo.addEventListener("click",e=>pointerPacket(e,"click"));

function showRemotePointer(p){
  if(localShareBox.classList.contains("hidden"))return;
  remotePointer.style.left=(p.x*100)+"%";remotePointer.style.top=(p.y*100)+"%";remotePointer.classList.remove("hidden");
  if(p.action==="click"){remotePointer.classList.remove("click");void remotePointer.offsetWidth;remotePointer.classList.add("click")}
}

function sendChat(){
  const text=chatInput.value.trim();if(!text)return;
  sendPacket({type:"chat",text});chatMessage(text,true);chatInput.value="";
}

async function playRemoteSound(){
  remoteVideo.muted=false;remoteVideo.volume=1;
  try{await remoteVideo.play();playSoundBtn.textContent="Sound On"}catch{playSoundBtn.textContent="Play Sound"}
}

function hangUp(){
  try{dataChannel?.close()}catch{} try{pc?.close()}catch{}
  micStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop());
  location.href=location.href.split("#")[0];
}

startHostBtn.onclick=startHost;
joinBtn.onclick=joinMeeting;
finishHostBtn.onclick=finishHost;
copyInviteBtn.onclick=()=>copyTextValue(inviteLink.value,copyInviteBtn);
shareInviteBtn.onclick=shareInvite;
copyReplyBtn.onclick=()=>copyTextValue(guestReplyCode.value,copyReplyBtn);
micBtn.onclick=toggleMic;
shareBtn.onclick=shareScreen;
playSoundBtn.onclick=playRemoteSound;
requestControlBtn.onclick=requestPointer;
hangupBtn.onclick=hangUp;
sendBtn.onclick=sendChat;
chatInput.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat()});
window.addEventListener("beforeunload",()=>{pc?.close();micStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop())});

loadInviteFromUrl();