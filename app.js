const $=id=>document.getElementById(id);
const statusEl=$("status"),joinCard=$("joinCard"),meeting=$("meeting");
const hostTab=$("hostTab"),guestTab=$("guestTab"),hostPanel=$("hostPanel"),guestPanel=$("guestPanel"),modeTabs=$("modeTabs");
const joinHeading=$("joinHeading"),joinSubheading=$("joinSubheading");
const startHostBtn=$("startHostBtn"),hostStep1=$("hostStep1"),hostStep2=$("hostStep2"),inviteLink=$("inviteLink"),copyInviteBtn=$("copyInviteBtn"),shareInviteBtn=$("shareInviteBtn"),whatsappInviteBtn=$("whatsappInviteBtn"),replyInput=$("replyInput"),finishHostBtn=$("finishHostBtn");
const guestInviteInput=$("guestInviteInput"),guestManualBox=$("guestManualBox"),linkedInviteBox=$("linkedInviteBox"),joinBtn=$("joinBtn"),guestReplyBox=$("guestReplyBox"),guestReplyCode=$("guestReplyCode"),copyReplyBtn=$("copyReplyBtn"),whatsappReplyBtn=$("whatsappReplyBtn");
const remoteVideo=$("remoteVideo"),remoteEmpty=$("remoteEmpty"),localShareBox=$("localShareBox"),localShareVideo=$("localShareVideo");
const micBtn=$("micBtn"),shareBtn=$("shareBtn"),playSoundBtn=$("playSoundBtn"),requestControlBtn=$("requestControlBtn"),requestBrowserControlBtn=$("requestBrowserControlBtn"),hangupBtn=$("hangupBtn");
const controlRequest=$("controlRequest"),allowControlBtn=$("allowControlBtn"),denyControlBtn=$("denyControlBtn"),remotePointer=$("remotePointer"),remoteControlBadge=$("remoteControlBadge");
const browserControlRequest=$("browserControlRequest"),allowBrowserControlBtn=$("allowBrowserControlBtn"),denyBrowserControlBtn=$("denyBrowserControlBtn"),browserControlState=$("browserControlState");
const workspaceFrame=$("workspaceFrame"),workspaceUrl=$("workspaceUrl"),workspaceTarget=$("workspaceTarget"),workspaceGoBtn=$("workspaceGoBtn"),workspaceNewTabBtn=$("workspaceNewTabBtn"),workspaceBackBtn=$("workspaceBackBtn"),workspaceForwardBtn=$("workspaceForwardBtn"),workspaceReloadBtn=$("workspaceReloadBtn");
const messages=$("messages"),chatInput=$("chatInput"),sendBtn=$("sendBtn");

let pc=null,micStream=null,micTrack=null,screenStream=null,remoteStream=null,dataChannel=null;
let screenVideoSender=null,screenAudioSender=null,primaryAudioSender=null;
let micEnabled=true,canSendPointer=false,allowPointer=false,isHost=false;
let canControlRemoteBrowser=false,allowRemoteBrowserControl=false;
let workspaceHistory=["https://editor.learnwithchampak.live/python-starter/editor/super/"],workspaceIndex=0;
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
    chatInput.disabled=false;sendBtn.disabled=false;requestBrowserControlBtn.disabled=false;
    systemMessage("Private chat/control channel connected.");
  };
  dataChannel.onclose=()=>{chatInput.disabled=true;sendBtn.disabled=true;canSendPointer=false;requestControlBtn.disabled=true;requestBrowserControlBtn.disabled=true;canControlRemoteBrowser=false;workspaceTarget.options[1].disabled=true};
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
    if(packet.type==="browser-control-request")browserControlRequest.classList.remove("hidden");
    if(packet.type==="browser-control-granted"){
      canControlRemoteBrowser=true;
      workspaceTarget.options[1].disabled=false;
      workspaceTarget.value="remote";
      requestBrowserControlBtn.textContent="Browser Control Granted";
      browserControlState.textContent="Remote control available";
      browserControlState.className="workspace-state allowed";
      systemMessage("Remote browser workspace control granted.");
    }
    if(packet.type==="browser-control-denied"){
      canControlRemoteBrowser=false;
      workspaceTarget.options[1].disabled=true;
      workspaceTarget.value="local";
      requestBrowserControlBtn.textContent="Request Browser Control";
      systemMessage("Browser control request was declined.");
    }
    if(packet.type==="browser-control-revoked"){
      canControlRemoteBrowser=false;
      workspaceTarget.options[1].disabled=true;
      workspaceTarget.value="local";
      requestBrowserControlBtn.textContent="Request Browser Control";
      browserControlState.textContent="Local control";
      browserControlState.className="workspace-state";
      systemMessage("Remote browser control ended.");
    }
    if(packet.type==="browser-command"&&allowRemoteBrowserControl)applyBrowserCommand(packet.command);
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

function openWhatsApp(message){
  const whatsappUrl="https://wa.me/?text="+encodeURIComponent(message);
  window.open(whatsappUrl,"_blank","noopener,noreferrer");
}

function sendInviteOnWhatsApp(){
  const url=inviteLink.value.trim();
  if(!url)return;
  const message=[
    "Learn With Champak Meet",
    "",
    "Please join my meeting using this link:",
    url,
    "",
    "No camera is required. Open the link and press Join This Meeting."
  ].join("\n");
  openWhatsApp(message);
}

function sendReplyOnWhatsApp(){
  const reply=guestReplyCode.value.trim();
  if(!reply)return;
  const message=[
    "Learn With Champak Meet",
    "",
    "I opened your meeting invite. Here is my reply code:",
    "",
    reply,
    "",
    "Paste this into the meeting page and press Connect."
  ].join("\n");
  openWhatsApp(message);
}


const APPROVED_HOSTS=[
  "editor.learnwithchampak.live",
  "learnwithchampak.live",
  "dsa.learnwithchampak.live",
  "aiml.learnwithchampak.live",
  "angular.learnwithchampak.live",
  "react.learnwithchampak.live",
  "search.learnwithchampak.live",
  "programmer-s-picnic.github.io"
];

function normalizeWorkspaceUrl(raw){
  let value=(raw||"").trim();
  if(!value)return null;
  if(!/^https?:\/\//i.test(value))value="https://"+value;
  try{
    const u=new URL(value);
    if(u.protocol!=="https:")return null;
    const host=u.hostname.toLowerCase();
    const ok=APPROVED_HOSTS.includes(host)||host.endsWith(".learnwithchampak.live");
    return ok?u.href:null;
  }catch{return null}
}

function setWorkspaceUrl(url,push=true){
  const safe=normalizeWorkspaceUrl(url);
  if(!safe){
    alert("Only approved Learn With Champak / Programmer's Picnic HTTPS pages can open in this workspace.");
    return;
  }
  workspaceUrl.value=safe;
  workspaceFrame.src=safe;
  if(push){
    workspaceHistory=workspaceHistory.slice(0,workspaceIndex+1);
    workspaceHistory.push(safe);
    workspaceIndex=workspaceHistory.length-1;
  }
}

function sendOrApplyBrowserCommand(command){
  if(workspaceTarget.value==="remote"){
    if(!canControlRemoteBrowser)return alert("Request browser control first.");
    sendPacket({type:"browser-command",command});
  }else{
    applyBrowserCommand(command);
  }
}

function applyBrowserCommand(command){
  if(!command||typeof command!=="object")return;
  if(command.action==="open")setWorkspaceUrl(command.url,true);
  if(command.action==="reload")workspaceFrame.src=workspaceFrame.src;
  if(command.action==="back"&&workspaceIndex>0){
    workspaceIndex--;
    workspaceUrl.value=workspaceHistory[workspaceIndex];
    workspaceFrame.src=workspaceHistory[workspaceIndex];
  }
  if(command.action==="forward"&&workspaceIndex<workspaceHistory.length-1){
    workspaceIndex++;
    workspaceUrl.value=workspaceHistory[workspaceIndex];
    workspaceFrame.src=workspaceHistory[workspaceIndex];
  }
  if(command.action==="newtab"){
    const safe=normalizeWorkspaceUrl(command.url||workspaceUrl.value);
    if(safe)window.open(safe,"_blank","noopener,noreferrer");
  }
}

function requestBrowserControl(){
  if(dataChannel?.readyState!=="open")return alert("The control channel is not connected yet.");
  sendPacket({type:"browser-control-request"});
  requestBrowserControlBtn.textContent="Browser Control Requested…";
}

allowBrowserControlBtn.onclick=()=>{
  allowRemoteBrowserControl=true;
  browserControlRequest.classList.add("hidden");
  browserControlState.textContent="Peer may control workspace";
  browserControlState.className="workspace-state remote";
  sendPacket({type:"browser-control-granted"});
  systemMessage("Remote participant may now control approved browser-workspace navigation.");
};

denyBrowserControlBtn.onclick=()=>{
  allowRemoteBrowserControl=false;
  browserControlRequest.classList.add("hidden");
  sendPacket({type:"browser-control-denied"});
};

workspaceGoBtn.onclick=()=>sendOrApplyBrowserCommand({action:"open",url:workspaceUrl.value});
workspaceNewTabBtn.onclick=()=>sendOrApplyBrowserCommand({action:"newtab",url:workspaceUrl.value});
workspaceBackBtn.onclick=()=>sendOrApplyBrowserCommand({action:"back"});
workspaceForwardBtn.onclick=()=>sendOrApplyBrowserCommand({action:"forward"});
workspaceReloadBtn.onclick=()=>sendOrApplyBrowserCommand({action:"reload"});
workspaceUrl.addEventListener("keydown",e=>{if(e.key==="Enter")sendOrApplyBrowserCommand({action:"open",url:workspaceUrl.value})});
document.querySelectorAll(".editorShortcut").forEach(btn=>{
  btn.addEventListener("click",()=>sendOrApplyBrowserCommand({action:"open",url:btn.dataset.url}));
});

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
  if(allowRemoteBrowserControl)sendPacket({type:"browser-control-revoked"});
  try{dataChannel?.close()}catch{} try{pc?.close()}catch{}
  micStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop());
  location.href=location.href.split("#")[0];
}

startHostBtn.onclick=startHost;
joinBtn.onclick=joinMeeting;
finishHostBtn.onclick=finishHost;
copyInviteBtn.onclick=()=>copyTextValue(inviteLink.value,copyInviteBtn);
shareInviteBtn.onclick=shareInvite;
whatsappInviteBtn.onclick=sendInviteOnWhatsApp;
copyReplyBtn.onclick=()=>copyTextValue(guestReplyCode.value,copyReplyBtn);
whatsappReplyBtn.onclick=sendReplyOnWhatsApp;
micBtn.onclick=toggleMic;
shareBtn.onclick=shareScreen;
playSoundBtn.onclick=playRemoteSound;
requestControlBtn.onclick=requestPointer;
requestBrowserControlBtn.onclick=requestBrowserControl;
hangupBtn.onclick=hangUp;
sendBtn.onclick=sendChat;
chatInput.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat()});
window.addEventListener("beforeunload",()=>{pc?.close();micStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop())});

loadInviteFromUrl();